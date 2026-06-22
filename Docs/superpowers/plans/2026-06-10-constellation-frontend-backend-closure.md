# Constellation 前后端闭环实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重设计已确认 UI 的前提下，将 Constellation v4 一次性硬切换到统一 Rust Core Engine，使 10 类 UI 入口全部执行真实后端操作，并补齐 JSON Canvas 1.0、后台任务、AI 供应商、仪表盘持久化、迁移和发布合规闭环。

**Architecture:** Rust 以 `CoreState` 持有当前工作区、领域服务、索引注册表、Watcher 和 `JobManager`；文件写入与外部变更统一进入增量派生数据管线。前端仅经 `src/core-client/` 使用 Typed Tauri API，UI Store 只保存视图和会话状态，不再保存另一份正文、索引或全库扫描结果。

**Tech Stack:** Tauri 2、Rust、React 19、TypeScript、Zustand、Tantivy、rusqlite、HNSW、notify、Pixi.js、Web Worker、Vitest。

---

## 1. 已确认范围与当前基线

### 1.1 已锁定决策

- UI 视觉、页面布局和主要交互保持现状，只修复闭环、错误反馈和缺失状态。
- 验收覆盖 10 类入口：编辑器/文件树/Tab、引用、图谱、Canvas、仪表盘、AI、右键菜单、快捷便签、磁贴、设置与高级工具。
- JSON Canvas v1 实现完整基础编辑：四类标准节点与标准边、拖拽、缩放、框选、复制粘贴、撤销/重做、保存冲突和文件节点跳转。
- 旧 `notes_*`、`categories_*`、Rust `NoteStore`、前端旧 Note API 和 `metadata.json` 运行依赖采用单次硬切换，不提供长期兼容桥。
- AI 不保存聊天历史，不下载网页离线快照，不实现 Ollama 原生协议。
- 所有新增或修改代码遵守 `AGENTS.md` 版权头要求；根 `LICENSE` 不修改。

### 1.2 仓库事实基线

- 已有 Rust 文档、工作区、引用、Tantivy、向量、建议、诊断、备份、迁移、WebDAV 和 Git 快照基础实现。
- 当前仍存在 `notes_*`、`categories_*`、`metadata.json`、`default_store()` 和多处绕过 `src/core-client/` 的直接 `invoke`。
- 当前搜索仍保留前端 Fuse fallback；部分卡片在前端基于元数据计算。
- 13 类仪表盘卡片已存在，但布局仍写入浏览器 `localStorage`，尚未写入 `.constellation/dashboard.json`。
- JSON Canvas 后端、前端工作区、统一 `JobManager`、统一四字段错误和 Anthropic 适配尚未实现。
- 2026-06-10 基线验证：Vitest 27 项通过；Rust 52 项通过，10,000 文档性能测试为 ignored。

## 2. 统一契约

所有 Rust 序列化类型使用 `#[serde(rename_all = "camelCase")]`；TypeScript 不维护手写别名字段。公共 JSON 值使用 `JsonValue`，时间使用 RFC 3339 UTC 字符串，路径统一为 `/` 分隔的工作区相对路径。

```ts
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
```

### 2.1 CoreError

```ts
export interface CoreError {
  code: string;
  message: string;
  details: Record<string, JsonValue> | null;
  retryable: boolean;
}
```

- `message` 只承载可展示摘要，结构化冲突信息不得再编码进字符串。
- 固定错误码至少包括：`invalidPath`、`notFound`、`conflict`、`revisionConflict`、`workspaceBusy`、`workspaceChanged`、`invalidCanvas`、`credentialUnavailable`、`providerUnavailable`、`cancelled`、`io`、`indexUnavailable`。
- 前端统一通过 `normalizeCoreError()` 解析 invoke、Channel 和领域事件错误；不得 `String(error)` 后静默吞掉。

### 2.2 WorkspaceEntry

```ts
export type WorkspaceEntryKind = "folder" | "markdown" | "canvas" | "attachment";

export interface WorkspaceEntry {
  entryId: string;
  kind: WorkspaceEntryKind;
  name: string;
  relativePath: string;
  parentPath: string;
  documentId: string | null;
  revision: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  modifiedAt: string;
}
```

- `entryId` 只用于当前工作区 UI 定位；Markdown 的永久身份使用 `documentId`。
- 文件树按父路径分页/按需读取，不返回全库正文，也不返回递归正文树。

### 2.3 DocumentRecord

```ts
export interface DocumentRecord {
  kind: "markdown";
  documentId: string;
  relativePath: string;
  title: string;
  content: string;
  frontmatter: Record<string, JsonValue>;
  revision: string;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
}
```

- `documentId` 对应 `constellation_id` UUID v7，移动和重命名不变。
- 保存请求必须携带 `expectedRevision`；冲突时 `CoreError.details` 返回 `currentRevision` 和 `conflictCopyPath`。
- 读取和写入 frontmatter 必须保留未知字段。

### 2.4 CanvasDocument

```ts
export interface CanvasNodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
  extra: Record<string, JsonValue>;
}

export type CanvasNode =
  | (CanvasNodeBase & { type: "text"; text: string })
  | (CanvasNodeBase & {
      type: "file";
      file: string;
      subpath: string | null;
    })
  | (CanvasNodeBase & { type: "link"; url: string })
  | (CanvasNodeBase & {
      type: "group";
      label: string | null;
      background: string | null;
      backgroundStyle: "cover" | "ratio" | "repeat" | null;
    });

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide: "top" | "right" | "bottom" | "left" | null;
  fromEnd: "none" | "arrow" | null;
  toNode: string;
  toSide: "top" | "right" | "bottom" | "left" | null;
  toEnd: "none" | "arrow" | null;
  color: string | null;
  label: string | null;
  extra: Record<string, JsonValue>;
}

export interface CanvasDocument {
  kind: "canvas";
  relativePath: string;
  revision: string;
  contentHash: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  extra: Record<string, JsonValue>;
  updatedAt: string;
}
```

- 节点为 JSON Canvas 1.0 `text`、`file`、`link`、`group` tagged union。
- 节点和边均保留未知字段到内部 `extra`；序列化时 flatten 回原层级，不在文件中写入名为 `extra` 的私有字段。
- `file` 节点路径必须为工作区相对路径；`subpath` 原样保存并用于标题/块跳转。
- Canvas 文件身份以规范化相对路径和 revision 定位，不向文件写入私有永久 ID。

### 2.5 ReferenceEdge 与 SearchHit

```ts
export interface TextRange {
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

export interface ReferenceEdge {
  sourceDocumentId: string;
  sourcePath: string;
  targetDocumentId: string | null;
  targetPath: string;
  relationType: "wiki" | "markdown" | "embed";
  sourceRange: TextRange;
  targetSubpath: string | null;
  label: string | null;
  rawText: string;
  resolved: boolean;
}

export interface SearchHit {
  documentId: string;
  path: string;
  title: string;
  heading: string | null;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  revision: string;
  score: number;
  matchKind: "keyword" | "semantic" | "hybrid";
}
```

- 引用索引保存源行列范围、目标标题/块和未解析目标，不再只保存 source/target ID。
- 搜索过滤统一由 Rust 执行：文件夹、标签、引用类型和 match kind。

### 2.6 AiStreamEvent

```ts
export interface AiSourceCitation {
  citationId: string;
  documentId: string;
  path: string;
  title: string;
  heading: string | null;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  revision: string;
  score: number;
  retrievalKinds: Array<"keyword" | "semantic" | "title" | "link">;
}

export interface AiCoverage {
  level: "sufficient" | "partial" | "insufficient";
  grounded: boolean;
  sourceCount: number;
  message: string;
}

export type AiStreamEvent =
  | { type: "sources"; requestId: string; sources: AiSourceCitation[] }
  | { type: "delta"; requestId: string; delta: string }
  | { type: "coverage"; requestId: string; coverage: AiCoverage }
  | {
      type: "done";
      requestId: string;
      status: "completed" | "cancelled" | "failed";
      error: CoreError | null;
    };
```

- 正常和取消路径都保持 `sources -> delta* -> coverage -> done`；取消通过 `done.status = "cancelled"` 表示。
- `citationId` 在单次请求内唯一；来源跳转使用 path、line range 和 revision，不使用 snippet 反查位置。
- 依据不足时 `coverage.grounded = false`，并给出用户可读说明；不得无来源生成确定性回答。

### 2.7 JobStatus

```ts
export type JobState =
  | "queued"
  | "running"
  | "cancelling"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobStatus {
  jobId: string;
  kind: string;
  workspaceId: string;
  state: JobState;
  phase: string;
  completedUnits: number;
  totalUnits: number | null;
  unit: string | null;
  message: string | null;
  startedAt: string | null;
  updatedAt: string;
  finishedAt: string | null;
  error: CoreError | null;
}
```

- 索引重建、向量重建、迁移、备份/恢复、WebDAV、Git 恢复和大型诊断均返回 `jobId`。
- 公共命令为 `jobs_get`、`jobs_list`、`jobs_cancel`；状态更新通过统一 Core 事件发送。

## 3. Rust Core 结构与数据流

### 3.1 CoreState

`src-tauri/src/engine/` 新建：

- `state.rs`：`CoreState`、当前 `WorkspaceContext`、workspace generation。
- `error.rs`：唯一 `CoreError` 定义及领域错误转换。
- `events.rs`：统一事件 envelope、事件序列号和 Tauri emitter。
- `pipeline.rs`：应用内保存和 watcher 共用的增量更新入口。

`CoreState` 持有：

- 当前工作区的 canonical root、workspace ID 和 generation。
- `DocumentService`、`CanvasService`、`ReferenceService`、`GraphService`、`SearchService`、`VectorService`、`DashboardService`。
- `WatcherService` 与按工作区隔离的索引实例注册表。
- `JobManager` 和取消令牌。

除工作区注册、迁移源/目标、备份目录等明确的外部路径操作外，领域命令不再接收 `notesDir`。命令从 `CoreState` 获取当前工作区，避免 UI 传入任意根路径。

### 3.2 Core 领域事件

统一 Channel/事件名称为 `core://event`，payload 为：

```ts
export interface CoreEvent {
  sequence: number;
  workspaceId: string;
  workspaceGeneration: number;
  occurredAt: string;
  type:
    | "workspace.changed"
    | "entry.changed"
    | "document.indexed"
    | "conflict.created"
    | "job.updated"
    | "settings.changed";
  payload: JsonValue;
}
```

- 前端只注册一个 Core 事件监听器并按 tagged union 分发。
- `notepad:activate`、窗口关闭等纯设备窗口事件继续由 desktop 层管理，不进入知识库事件流。
- 旧 `notes-changed`、`workspace-index-updated` 等知识库事件在硬切换阶段删除。

### 3.3 增量更新管线

应用内保存、移动、重命名、删除和 watcher 外部变更统一转换为 `WorkspaceMutation`：

1. 校验 workspace generation、路径和 expected revision。
2. 原子写入或执行文件操作。
3. 计算新 revision/content hash。
4. 将 mutation 提交给 `IndexCoordinator`。
5. 增量更新文档摘要、引用 SQLite、Tantivy、向量待处理队列和诊断状态。
6. 发出 `entry.changed`；索引完成后发出 `document.indexed`。

保存命令不等待向量嵌入完成。全文与引用更新使用高优先级增量任务；向量更新可延迟，但不要求用户再次保存。Watcher 收到应用自身写入时以 revision/content hash 去重。

## 4. 分阶段实施

### Phase 0：契约、测试护栏与目录骨架

**目标：** 先建立唯一契约和可验证入口，不改变用户行为。

- [ ] 新建 `engine/error.rs`、`engine/state.rs`、`engine/events.rs`、`jobs/` 和 `api/` 薄命令层。
- [ ] 在 `src/core-client/types.ts` 定义本计划公共类型，在 `transport.ts` 封装唯一 `invoke`/Channel 入口。
- [ ] 为 Rust/TypeScript 契约添加固定 JSON fixture，分别做 serde 与 TypeScript shape 测试。
- [ ] 添加静态检查，禁止 `src/core-client/`、窗口控制白名单之外的前端文件导入 `@tauri-apps/api/core`。
- [ ] 将现有 `AppError` 转为 `CoreError`，先保留命令行为，消除“JSON 塞进 message”。
- [ ] 建立 Core 事件监听器，但在本阶段同时适配旧事件，硬切换时删除旧适配。

**退出门：**

- 所有现有测试通过。
- 新错误 fixture 在 Rust 和 TypeScript 中字段、枚举、可空性一致。
- 新增直接 `invoke` 会被检查脚本拒绝。

### Phase 1：CoreState、JobManager 与工作区生命周期

**目标：** 去除全局 `default_store()` 对知识库根目录的所有权。

- [ ] `WorkspaceService` 打开工作区时创建 `WorkspaceContext`，初始化 `.constellation/`，启动 watcher 和索引服务。
- [ ] `JobManager` 为每个 job 记录 workspace ID/generation、进度、取消令牌和终态。
- [ ] Job 状态写入 Tauri app data 的 `jobs.json`；应用重启后将遗留 `queued/running/cancelling` 标记为 retryable `failed`，错误码为 `interruptedByRestart`，本阶段不自动续跑。
- [ ] 将索引重建、迁移、备份/恢复、WebDAV、Git 恢复接入 job 生命周期。
- [ ] 工作区切换协议固定为：前端 flush 所有脏文档 -> Core 取消旧 workspace jobs -> 等待终态 -> 停止 watcher -> 切换 context -> 启动新 watcher/index -> 发出 `workspace.changed`。
- [ ] Core 最多等待旧工作区任务 5 秒进入终态；任一脏文档保存失败或任务超时未停止时，切换返回 retryable `workspaceBusy` 并保持原工作区，不得半切换。
- [ ] 将设备状态持久化集中到 Tauri app data：Tab 会话、便签尺寸、磁贴位置和窗口坐标。

**退出门：**

- 进行中的索引、AI、同步或迁移不会在切换后写入新工作区。
- 工作区切换失败可重试，原编辑会话和文件内容保持不变。
- job 状态可以在设置、高级工具和仪表盘中统一显示及取消。

### Phase 2：工作区、文档与旧接口硬切换

**目标：** 主编辑器、快捷便签、磁贴和文件树只使用 Document/Workspace API。

后端命令：

- `workspace_entries`、`workspace_create_folder`、`workspace_rename_entry`
- `workspace_move_entry`、`workspace_trash_entry`、`workspace_restore_entry`
- `workspace_import_attachment`
- `documents_list`、`documents_read`、`documents_create`、`documents_update`
- `documents_move`、`documents_trash`、`documents_restore`、`documents_undo_last`

前端改造：

- [ ] 用 `useWorkspaceEntriesStore` 管理文件树摘要和 Optimistic UI。
- [ ] 用 `useDocumentSessionStore` 管理按 `documentId` 共享的正文、revision、dirty、saving 和 error 状态。
- [ ] 主编辑器、快捷便签和磁贴都订阅同一文档 session；独立窗口只投影同一事实源。
- [ ] 文件夹创建、行内重命名、拖拽移动、删除和恢复先乐观更新，失败时恢复原快照并展示 `CoreError` 操作建议。
- [ ] 应用内导入 Markdown/附件使用 `WorkspaceDirectoryBrowser`，复制进工作区后再打开；移除任意路径直接读写命令。
- [ ] Tab 恢复时按 relative path 重新解析 document ID；文件已删除时显示可关闭的缺失状态。

硬切换清理：

- [ ] 删除 Rust `notes.rs` 中 Note CRUD、MetadataFile、NoteStore 和旧 watcher。
- [ ] 删除 `notes_*`、`categories_*`、`read_external_file`、`save_external_file` 命令注册。
- [ ] 删除前端 `modules/notes/api` 旧 CRUD、旧 `useNoteStore` 正文/搜索职责和 `metadata.json` 兼容代码。
- [ ] 删除 `fuse.js` 依赖、前端全文 fallback 和全库正文扫描。
- [ ] 保留设备设置能力，但将原 `config.json` 中工作区所有权迁移到 Workspace registry/CoreState。

**退出门：**

- `rg "notes_|categories_|metadata\\.json|Fuse"` 不再命中运行时代码；迁移识别和文档说明允许命中。
- 主编辑器、便签、磁贴打开同一文档时，任一处保存后其他视图收到同一 revision。
- 文件夹和文件操作均不调用系统原生文件管理器或打开/保存弹窗。

### Phase 3：引用、图谱、搜索与统一增量管线

**目标：** 消除保存路径和 watcher 路径的重复索引逻辑。

- [ ] 引用解析器记录 Wiki-Link、Markdown 相对链接、嵌入、行列范围、label 和 target subpath。
- [ ] 未解析引用保留在索引中，供诊断和 UI 展示，不静默丢弃。
- [ ] `GraphService` 只从引用索引查询局部 1-2 跳和全局图，不读取全库正文。
- [ ] AI similarity 使用独立 `similarity_*` 查询和独立渲染开关，默认关闭，不写入引用图。
- [ ] Tantivy schema 增加 folder、tags、relation types、revision 和段落 line end。
- [ ] 搜索 API 接收结构化过滤器，统一返回 `SearchHit`。
- [ ] TopBar、AI 搜索面板、引用面板和图谱全部改用 core-client 查询；客户端不再将 Rust hit 与旧 NoteMetadata 二次拼接。
- [ ] 图谱使用 Pixi.js/Canvas 和 Worker 布局；React DOM 只承载工具栏、Tooltip、筛选和错误状态。

**退出门：**

- 应用内保存和外部编辑同一文件会产生相同引用、搜索和图谱结果。
- 删除 `.constellation/cache/` 后可以完整重建引用、Tantivy 和向量索引。
- 删除或移动文档后旧引用和搜索结果不残留。

### Phase 4：JSON Canvas 1.0 完整基础编辑

**后端：**

- [ ] 新建 `CanvasService`，实现 create/read/save/move/trash/restore。
- [ ] 使用结构化 serde tagged union 解析标准节点和边，所有层级用 flatten map 保留未知字段。
- [ ] 校验节点/边 ID 唯一、坐标和尺寸有限、边端点存在、枚举合法、file path 不越界。
- [ ] 保存使用 expected revision、临时文件、fsync 和原子替换；冲突生成双方保留的 conflict copy。
- [ ] `canvas_link_metadata_fetch` 只在用户点击后请求 URL，将 title/siteName/summary/fetchedAt 写入 `.constellation/cache/link-metadata.json`。
- [ ] URL 缓存失败不得修改 `.canvas`；缓存可删除、可重建、不参与同步。

**前端：**

- [ ] 新建独立 `src/canvas/` 工作区，不复用 graph store、graph edge 或旧 mindmap 模型。
- [ ] 文件树和 Tab 将 `.canvas` 作为正式文件类型打开。
- [ ] 实现 text/file/link/group 节点和标准边的创建、编辑、删除。
- [ ] 实现平移、缩放、拖拽、框选、多选移动、复制粘贴、撤销/重做。
- [ ] Undo/redo 只存当前前端会话；成功保存后更新 revision，不把历史写入文件。
- [ ] file 节点点击后通过工作区路由打开 Markdown/Canvas/附件；subpath 跳到标题或块。
- [ ] 保存冲突显示“重新载入、保留当前为冲突副本、比较后再保存”，不得自动覆盖。

**退出门：**

- 四类节点和标准边跨应用往返不丢字段。
- 损坏 JSON、悬空边、重复 ID、路径穿越和 revision 冲突均返回结构化错误。
- Canvas 与图谱状态、Store、命令和文件格式完全分离。

### Phase 5：仪表盘后端持久化与 13 类卡片

**布局：**

- [ ] `DashboardService` 读写 `.constellation/dashboard.json`，schema 含 version、cards、order、size 和 card options。
- [ ] 首次读取时迁移当前 workspace 对应的 localStorage 布局；成功写入后删除该 workspace legacy key。
- [ ] 所有布局修改使用防抖保存和 revision；冲突时保留双方并提示重新加载。

**卡片查询：**

统一 `dashboard_query_card({ cardType, options })` 返回 tagged union。映射如下：

| 卡片 | 后端来源 |
|---|---|
| 全局知识图谱 | `GraphService.global` |
| 快速记录 | `DocumentService.create` 动作入口 |
| 最近编辑 | `DashboardService.recentDocuments` |
| 随机漫游 | `DashboardService.randomDocument` |
| 待串联碎片 | `GraphService.orphans` |
| AI 数据库状态 | Search/Vector/Ai provider status |
| AI 建议收件箱 | `SuggestionService.list` |
| 知识库诊断 | `DiagnosticsService.summary` |
| 文件夹分布 | `DashboardService.folderDistribution` |
| 引用排行 | `GraphService.referenceRanking` |
| 笔记统计 | `DashboardService.documentStats` |
| 链接统计 | `GraphService.linkStats` |
| 统计概览 | `DashboardService.summary` |

- [ ] 每张卡独立发起查询、显示 loading/empty/error/retry。
- [ ] 任一卡失败只影响该卡，错误边界不得重置整个仪表盘。
- [ ] 卡片不得读取全库正文、直接访问文件或用前端元数据推导后端统计。

**退出门：**

- 重启应用和切换设备后，工作区布局从 `.constellation/dashboard.json` 恢复。
- 13 类卡片都有真实查询或真实动作，未配置能力显示可恢复配置错误。

### Phase 6：AI 供应商、来源与建议闭环

**供应商：**

- [ ] `AiProviderKind` 固定为 `openAiCompatible | anthropic`。
- [ ] 两类 provider 配置、连接测试、模型列表和凭据 account 分开存储。
- [ ] OpenAI-compatible 可选 embeddings endpoint；未配置 embeddings 时自动退化为 Tantivy。
- [ ] Anthropic 只走 Messages API 和 Tantivy 来源，不调用向量服务。
- [ ] API Key、Anthropic Key 和 WebDAV 密码只进入系统 keyring；配置 API 只返回 `hasCredential`。

**授权与问答：**

- [ ] 首次外发正文前记录 provider kind、endpoint origin、允许文件夹和确认时间。
- [ ] 供应商、endpoint 或允许文件夹变化后重新确认。
- [ ] 检索生成 `AiSourceCitation`，再发送 `sources -> delta* -> coverage -> done`。
- [ ] 取消令牌贯穿检索、HTTP 流和 Channel；取消后不得继续发送 delta。
- [ ] UI 来源可按 path、heading、line range 和 revision 跳转；revision 已变化时提示来源已更新。

**建议：**

- [ ] 摘要、标签、分类、移动和链接建议统一进入建议收件箱。
- [ ] 单项和批量应用都重新校验 expected revision、路径和目标存在性。
- [ ] 部分失败返回逐项结果；成功项不回滚，失败项保留并可重试。
- [ ] 未经确认不写 frontmatter、正文、路径或引用。

**退出门：**

- 禁用 AI 后记录、编辑、全文搜索、引用和图谱完整可用。
- OpenAI-compatible、Anthropic、无 embeddings、取消、无来源、限流和网络中断均有确定行为。
- 前端、日志、workspace 文件和错误 details 中不出现明文凭据。

### Phase 7：高级服务与迁移闭环

- [ ] WebDAV sync、Git restore、backup/restore、migration 和大型 diagnostics 全部接入 JobManager。
- [ ] WebDAV 网络中断进入 retryable failed/cancelled 终态，不留下半写文件；冲突始终保留双方。
- [ ] 备份使用 Argon2id + XChaCha20-Poly1305，错误密码与损坏包使用不同错误码。
- [ ] v3 迁移执行前先创建并验证备份，再复制到新目标，源目录保持只读。
- [ ] 迁移用结构化解析识别合法 JSON Canvas 1.0；合法文件原路径复制。
- [ ] `.xmind`、`.mm`、旧脑图和无法确认的 `.canvas` 复制到 `_legacy/mindmaps/`，不得删除源文件。
- [ ] 迁移 manifest 记录 source path/hash、target path、document ID mapping 和结果，使重复执行幂等。
- [ ] 输出机器可读 JSON 和用户可读 Markdown 报告，列出成功、冲突、归档和未迁移项。

**退出门：**

- 所有长任务可查询、取消并归属于正确工作区。
- 重复迁移不会生成无限副本；无法判断的冲突保留双方。

### Phase 8：UI 全量验收、清理与发布合规

#### 10 类 UI 操作矩阵

| 入口 | 必须验收的真实动作 |
|---|---|
| 编辑器/文件树/Tab | 新建、打开、保存、自动保存、重命名、移动、拖拽、删除、恢复、撤销、Tab 恢复、冲突 |
| 引用 | Wiki/Markdown/embed 跳转、反向链接、悬浮预览、失效引用 |
| 图谱 | 局部 1/2 跳、全局图、筛选、节点跳转、AI similarity 开关 |
| Canvas | 创建、四类节点、边、框选、复制粘贴、undo/redo、保存、冲突、文件跳转 |
| 仪表盘 | 13 卡查询、添加、删除、排序、尺寸、恢复默认、持久化、单卡失败 |
| AI | provider 配置、授权、全文/混合问答、来源跳转、取消、建议确认 |
| 右键菜单 | 文件/文件夹/Tab/磁贴可见操作均执行或显示结构化错误 |
| 快捷便签 | 创建、自动保存、关闭保存、转磁贴、失败恢复 |
| 磁贴 | 打开同一正文、位置/尺寸设备持久化、关闭、回到编辑器 |
| 设置与高级工具 | 工作区、主题、AI、同步、备份、迁移、Git、诊断、job 进度与取消 |

- [ ] 删除所有无 handler、空 handler、只 `console.log`、硬编码成功状态和 catch 后无反馈的入口。
- [ ] 保留明确的 disabled 状态时必须展示禁用原因和恢复动作。
- [ ] 清理旧路由、Store、类型、IPC、测试、依赖和 README 描述。
- [ ] 更新 README 功能、完成度、架构、目录、删除/Lab 和版权章节。

## 5. 测试计划

### 5.1 Rust

- CoreError：所有领域错误序列化为四字段，details 保持结构化。
- 路径：绝对路径、`..`、符号链接逃逸、Canvas file path、附件导入越界。
- 文档：UUID v7、未知 frontmatter、revision 冲突、冲突副本、原子替换失败注入、撤销。
- 增量管线：保存/watcher 等价、应用自身事件去重、移动、删除、缓存清空重建。
- Canvas：四类节点/边往返、未知字段、重复 ID、悬空边、损坏 JSON、NaN/无限坐标、revision 冲突。
- 搜索/引用：中文、folder/tag/relation filter、行范围、未解析引用、删除重建。
- AI：provider 路由、凭据隔离、事件顺序、无来源 coverage、取消后无 delta、网络中断。
- Jobs：进度、取消、失败、重启恢复策略、workspace generation 隔离。
- WebDAV/备份/迁移：中断、错误密码、损坏包、冲突双方保留、迁移幂等和合法 Canvas 分类。

### 5.2 前端

- core-client：命令参数、返回类型、CoreError normalization 和 Channel 事件顺序。
- Store：Optimistic UI 成功与回滚、同文档多窗口 revision 同步、工作区切换 flush。
- 组件：10 类入口的每个可点击动作；loading/empty/error/retry/disabled reason。
- Dashboard：13 类 tagged response、单卡错误边界、布局迁移和后端保存。
- Canvas：选择、框选、拖拽、复制粘贴、undo/redo、冲突选择。
- AI：来源先于 delta、coverage、取消和 stale revision 提示。

### 5.3 集成与性能

- 使用临时真实工作区运行 Rust command integration，不以假数据替代文件写入、索引和查询。
- Tauri 桌面冒烟按 10 类矩阵逐项执行，记录操作、预期、实际和截图/日志。
- 运行 ignored 的 10,000 Markdown 文档 Tantivy 基准，并增加引用索引、全局图查询和 Worker 布局基准。
- 性能发布门以同一参考机器历史基线比较，索引、查询和图谱阶段不得回退超过 20%；若硬件变化则记录新基线而非伪造通过。
- 验证前端不会加载 10,000 文件正文；仅打开文档和引用预览按需读取内容。

## 6. 发布与合规验收

按以下顺序串行执行，避免 Windows/Vite 构建产物竞争：

```powershell
npm.cmd run test
npm.cmd run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml indexes_and_queries_ten_thousand_documents --release -- --ignored --nocapture
cargo fmt --manifest-path src-tauri/Cargo.toml --check
git diff --check
npm.cmd run tauri build
```

- [ ] `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 版本和 MIT 许可证元数据一致。
- [ ] 新增 `scripts/generate-third-party-licenses.mjs`，读取 Node 已安装包 metadata 和 `cargo metadata`，生成第三方许可证清单。
- [ ] 清单生成遇到 GPL、AGPL、SSPL、空许可证或来源不明依赖时失败，进入人工兼容性审查。
- [ ] 检查根 `LICENSE` hash 未变化。
- [ ] 检查 NSIS 打包资源包含原始 `LICENSE`，关于页/README 保留 Achilng、Maplar 和 MIT 声明。
- [ ] 不复制 Obsidian/FlClash 专有代码、资产、Logo、截图、帮助文案或品牌配色组合。

## 7. 提交边界与完成定义

建议按 Phase 独立提交，提交前均运行该 Phase 相关测试；只有用户确认后才执行 commit/push。

建议提交信息：

1. `refactor(core): establish typed state errors and jobs`
2. `refactor(documents): hard switch ui to workspace core`
3. `feat(references): unify incremental indexing pipeline`
4. `feat(canvas): add json canvas 1.0 workspace`
5. `feat(dashboard): persist layouts and query cards`
6. `feat(ai): add provider adapters and grounded stream events`
7. `feat(operations): unify jobs backup sync and migration`
8. `test(release): close ui matrix and license gates`

只有同时满足以下条件才可宣布闭环完成：

- 旧双轨运行时代码和前端全库 Fuse 扫描已删除。
- 10 类 UI 入口和 13 类卡片无假按钮、假状态或静默失败。
- Markdown、Canvas、附件和文件夹均由 Rust Core 安全管理。
- 应用内保存和外部 watcher 共用同一增量派生数据管线。
- AI 来源、取消、建议确认和供应商凭据边界全部通过测试。
- 工作区/设备状态分离、迁移、冲突、备份和长任务均有失败路径。
- README、版本、许可证元数据、第三方清单和安装包资源全部同步。
