# Constellation M0：项目的最小化可行性构建软件

> 本文用于定义 Constellation 的最小正式可用版本。M0 不是临时 Demo，而是基于现有 v4 架构零件组装出的第一个可运行、可正式使用、可继续扩展的核心切片。

## 1. 背景与目标

Constellation 的核心需求是：帮助用户整理碎片化知识。

用户可能来自以下场景：

- 看科普视频后的即时想法。
- 读书时产生的摘录、批注和思考。
- 学习数学、哲学、计算机等复杂学科时形成的概念片段。
- 日常灵感、问题、判断、联想和待整理材料。

M0 的目标不是一次性实现完整知识管理系统，而是先跑通最关键的闭环：

```text
快速记录碎片
  ↓
保存为真实 Markdown 文件
  ↓
AI 给出整理建议
  ↓
用户确认
  ↓
写入目标笔记或新建笔记
  ↓
原始碎片保留并可追溯
```

M0 需要满足两个要求：

1. **能正式使用**：用户可以真正用它记录和整理知识，而不是只看静态原型。
2. **不阻碍后续扩展**：后续知识树、JSON Canvas、图谱、仪表盘、语义搜索、批量 AI 整理等能力，都可以接到 M0 的架构上，而不是推倒重写。

---

## 2. M0 的产品定位

M0 可以被理解为：

```text
Constellation v4 的第一个最小正式版本
= 真实文件树
+ 当前 Markdown 编辑
+ 快捷捕获
+ 全文搜索
+ AI 整理建议
+ 用户确认写入
+ 最小引用 / 反链
```

它不是：

- 临时 Demo。
- 静态 UI 原型。
- 独立于 v4 架构的新系统。
- 为了快速验证而写出的临时数据模型。

M0 应该直接使用未来正式版本的核心服务边界，只是暂时关闭复杂功能。

---

## 3. 核心原则

### 3.1 Markdown 是唯一正文事实源

用户的知识正文必须保存为真实 Markdown 文件。

允许：

```text
快捷便签/某条碎片.md
01 研究/哲学/认识论/经验主义.md
```

禁止：

```text
用数据库保存笔记正文
用 localStorage 保存正文
用隐藏 JSON 保存正文
为 Inbox 单独设计未来要废弃的专用格式
```

`.constellation/` 只能保存配置、建议状态、缓存和可重建索引，不保存用户正文事实源。

### 3.2 AI 只给建议，不直接写文件

AI 的角色是辅助整理，而不是自动代理。

AI 可以生成：

- 建议标题。
- 建议摘要。
- 建议标签。
- 建议目标路径。
- 建议关联笔记。
- 建议写入内容。

AI 不可以：

- 未经用户确认直接修改正文。
- 未经用户确认移动文件。
- 未经用户确认改 frontmatter。
- 未经用户确认添加引用。
- 自动删除原始碎片。

正确流程：

```text
AI 输出 OrganizeSuggestion
  ↓
前端展示预览 / diff
  ↓
用户确认
  ↓
DocumentService 执行写入
```

### 3.3 前端不得绕过 Core Engine

前端只能通过 `src/core-client/` 调用后端公开能力。

禁止：

- React 组件直接读写文件系统。
- React 组件扫描全库 Markdown 正文。
- 前端自己建立搜索索引、引用索引或图谱索引。
- 前端绕过 `core-client` 直接拼 Tauri 命令。

正确结构：

```text
React UI
  ↓
src/core-client/
  ↓
Tauri IPC
  ↓
Rust Core Engine
  ↓
WorkspaceService / DocumentService / SearchService / AiService / SuggestionService
  ↓
真实文件系统
```

### 3.4 M0 是正式架构的垂直切片

M0 不做所有功能，但它做的每个功能都必须按正式架构写。

这意味着：

- 可以少做。
- 不可以乱做。
- 可以留空接口。
- 不可以写未来必删的临时代码。

---

## 4. M0 启用的架构零件

M0 只启用以下服务：

```text
WorkspaceService
DocumentService
SearchService
AiService
SuggestionService
ReferenceServiceLite
WatcherServiceLite
SettingsServiceLite
```

### 4.1 WorkspaceService

负责：

- 打开工作区。
- 校验工作区路径。
- 获取真实文件树。
- 初始化必要目录。

M0 必须至少初始化：

```text
快捷便签/
.constellation/
.constellation/cache/
```

### 4.2 DocumentService

负责：

- 创建 Markdown 文件。
- 读取当前文件。
- 保存当前文件。
- revision 检测。
- 原子写入。
- 重命名、移动、删除到回收站。

M0 中所有正文写入都必须经过 DocumentService。

### 4.3 SearchService

负责：

- 文件名搜索。
- 正文搜索。
- 标签搜索。
- 为 AI 整理提供候选相关笔记。

M0 阶段可以先做简单实现，但接口必须稳定，后续可以替换为 Tantivy、混合检索或向量检索。

### 4.4 AiService

负责：

- 调用 OpenAI-compatible 或其他后续支持的 AI 供应商。
- 管理 AI 请求。
- 返回结构化整理建议。
- 支持取消。
- 控制输入上下文范围。

M0 中 AiService 不直接写文件。

### 4.5 SuggestionService

负责：

- 保存 AI 整理建议状态。
- 应用建议。
- 拒绝建议。
- 记录建议是否已处理。

建议状态可以保存到：

```text
.constellation/suggestions.json
```

但建议状态不是正文事实源。

### 4.6 ReferenceServiceLite

M0 只实现最小引用能力：

- 解析 `[[Wiki-Link]]`。
- 解析 `[文字](相对路径.md)`。
- 显示当前文件 outgoing links。
- 显示当前文件 incoming backlinks。

暂不实现完整局部图谱、全局图谱、AI 相似关系、来源证据包。

### 4.7 WatcherServiceLite

M0 只需要监听外部文件变化并刷新当前文件或文件树。

暂不做复杂增量索引管线，但接口要为后续正式 WatcherService 保留空间。

---

## 5. M0 暂不启用的功能

以下功能在 M0 中不实现，避免扩大范围：

```text
完整知识树编辑器
JSON Canvas 1.0 编辑器
局部知识图谱
全局知识图谱
自由卡片仪表盘
语义搜索 / 向量索引
批量 AI 整理
AI Agent
自动移动 / 自动链接 / 自动改写
WebDAV
Git 快照
多工作区
插件系统
移动端
多人协作
```

但 M0 不应破坏这些功能未来接入的空间。

后续扩展关系：

```text
知识树       → KnowledgeTreeService
JSON Canvas  → CanvasService
图谱         → ReferenceService + GraphService
仪表盘       → DashboardService
语义搜索     → VectorService
批量 AI 整理 → SuggestionService
后台任务     → JobManager
备份迁移     → BackupService / MigrationService
```

---

## 6. M0 的界面组成

M0 只需要四个主要区域。

### 6.1 左侧：真实文件树

显示：

- 真实文件夹。
- Markdown 文件。
- 快捷便签目录。
- 当前选中文件。

支持：

- 新建文件。
- 新建文件夹。
- 重命名。
- 移动。
- 删除到回收站。

暂不显示：

- 图谱入口。
- Canvas 入口。
- 仪表盘入口。
- 复杂专题系统。
- 同步协作状态。

### 6.2 中间：当前 Markdown 编辑器

M0 只允许一个当前文件。

支持：

- 打开当前文件。
- 编辑 Markdown。
- 自动保存。
- 手动保存。
- 保存状态显示。
- revision 冲突提示。

暂不做：

- 多 Tab。
- 复杂所见即所得编辑器。
- 高级排版工具栏。
- 源码 / 预览双栏。

### 6.3 右侧：AI 整理建议与引用信息

右侧面板包含：

- AI 整理按钮。
- 整理建议结果。
- 写入预览。
- 确认应用。
- 拒绝建议。
- 当前文件引用。
- 当前文件反链。

### 6.4 快捷捕获入口

可以是：

- 底部输入框。
- 右下角浮窗。
- 快捷键打开的小窗口。

保存后生成真实 Markdown 文件。

---

## 7. 快捷捕获设计

### 7.1 输入字段

M0 只需要：

```text
标题：可选
正文：必填
来源：可选
标签：可选
```

### 7.2 保存位置

默认保存到：

```text
快捷便签/
```

示例：

```text
快捷便签/2026-06-16-经验主义的一个问题.md
```

### 7.3 文件格式

```markdown
---
constellation_id: "uuid-v7"
created: "2026-06-16T00:00:00Z"
status: inbox
tags: []
source: ""
---

# 经验主义的一个问题

这里是原始碎片内容。
```

### 7.4 规则

- 每条碎片都是一个真实 Markdown 文件。
- 原始碎片不自动删除。
- AI 整理后只更新状态，不抹除原始内容。
- 后续可以通过 `organized_to` 追踪它被整理到了哪里。

整理后的 frontmatter 示例：

```yaml
status: organized
organized_to: "../01 研究/哲学/认识论/经验主义.md"
organized_at: "2026-06-16T00:00:00Z"
```

---

## 8. AI 整理建议设计

### 8.1 用户操作

用户在当前碎片页面点击：

```text
整理这条碎片
```

### 8.2 AI 输入上下文

AiService 可以读取：

- 当前碎片正文。
- 当前文件路径。
- 文件树摘要。
- SearchService 找到的候选相关笔记。
- 可选 `.mindmap.md` 框架文本。

M0 必须限制上下文数量，避免拖慢软件。

建议限制：

```text
候选笔记最多 20 条
每条候选只给标题、路径、摘要或片段
AI 输入总 token 设置上限
```

### 8.3 AI 输出格式

AI 必须输出结构化建议。

```json
{
  "title": "经验主义中的观察与归纳问题",
  "summary": "这条碎片讨论了观察经验如何支持知识判断，以及归纳推理的局限。",
  "target_path": "01 研究/哲学/认识论/经验主义.md",
  "action": "create_or_append",
  "tags": ["哲学", "认识论", "经验主义"],
  "links": ["休谟问题", "科学方法"],
  "proposed_markdown": "## 2026-06-16 想法\n\n整理后的内容……"
}
```

### 8.4 建议状态

建议进入 pending 状态：

```ts
status: "pending" | "accepted" | "rejected"
```

未经用户确认，不得写入目标文件。

---

## 9. 建议确认与写入流程

### 9.1 前端展示

SuggestionPanel 展示：

```text
建议标题
建议目标路径
建议动作：新建 / 追加
建议摘要
建议标签
建议关联
写入预览
```

用户可以：

```text
确认应用
拒绝建议
复制建议内容
```

### 9.2 应用建议

用户点击确认后：

```text
applySuggestion(suggestionId)
```

后端执行：

1. 读取 suggestion。
2. 校验目标路径在工作区内。
3. 检查目标文件是否存在。
4. 如果不存在，创建 Markdown。
5. 如果存在，按规则追加内容。
6. 更新原碎片 frontmatter：`status: organized`。
7. 写入 `organized_to` 和 `organized_at`。
8. 更新 suggestion 状态为 `accepted`。

### 9.3 失败处理

必须处理：

- 路径穿越。
- 目标文件 revision 冲突。
- 原碎片已被外部修改。
- AI 输出 JSON 非法。
- 用户取消 AI 请求。
- 写入失败。
- 目标路径重名。

失败时不得半写入。

---

## 10. 搜索与相关笔记

### 10.1 M0 搜索范围

M0 支持：

- 文件名搜索。
- 正文搜索。
- 标签搜索。
- 当前碎片相关候选。

### 10.2 前端限制

前端不得全库扫描。

正确方式：

```text
SearchBox
  ↓
core-client/search.ts
  ↓
SearchService
  ↓
返回分页结果
```

### 10.3 后续扩展

M0 的 SearchService 可以先简单实现，但接口要能平滑升级到：

- Tantivy 全文索引。
- 中文分词。
- 语义搜索。
- 混合检索。
- 大型库优化。

---

## 11. 最小引用与反链

M0 只支持两种引用：

```markdown
[[文件名]]
[显示文字](相对路径.md)
```

当前文件右侧显示：

```text
本文引用了哪些文件
哪些文件引用了本文
```

M0 不做图谱，但引用数据结构要能被后续 GraphService 复用。

---

## 12. 前端目录建议

```text
src/
├─ app/
│  ├─ AppShell.tsx
│  └─ routes.ts
├─ core-client/
│  ├─ workspace.ts
│  ├─ documents.ts
│  ├─ search.ts
│  ├─ ai.ts
│  ├─ suggestions.ts
│  └─ references.ts
├─ workspace/
│  ├─ WorkspaceSidebar.tsx
│  ├─ FileTree.tsx
│  └─ FileActions.tsx
├─ editor/
│  ├─ CurrentEditor.tsx
│  ├─ EditorToolbar.tsx
│  └─ SaveStatus.tsx
├─ capture/
│  ├─ QuickCaptureButton.tsx
│  ├─ QuickCapturePanel.tsx
│  └─ CaptureDraft.tsx
├─ ai/
│  ├─ OrganizeButton.tsx
│  ├─ SuggestionPanel.tsx
│  ├─ SuggestionPreview.tsx
│  └─ AiSettings.tsx
├─ references/
│  ├─ BacklinkPanel.tsx
│  └─ LinkList.tsx
├─ search/
│  ├─ SearchBox.tsx
│  └─ SearchResults.tsx
└─ design-system/
   ├─ tokens.css
   └─ components/
```

原则：

- 新代码进入领域目录。
- 不继续扩大无边界的 `components/`、`utils/`。
- UI 不绕过 `core-client`。
- 共享模块只放稳定基础能力。

---

## 13. 核心 IPC 契约

### 13.1 Workspace

```ts
openWorkspace(path: string): Promise<WorkspaceState>
getWorkspaceTree(): Promise<FileTreeNode[]>
```

### 13.2 Documents

```ts
createMarkdownFile(input: CreateMarkdownInput): Promise<DocumentMeta>
readDocument(path: string): Promise<DocumentReadResult>
saveDocument(input: SaveDocumentInput): Promise<DocumentMeta>
moveDocument(input: MoveDocumentInput): Promise<DocumentMeta>
deleteDocument(path: string): Promise<void>
```

### 13.3 Capture

```ts
createCaptureNote(input: CaptureNoteInput): Promise<DocumentMeta>
```

### 13.4 Search

```ts
searchDocuments(input: SearchInput): Promise<SearchResult[]>
findCandidateNotes(input: CandidateInput): Promise<CandidateNote[]>
```

### 13.5 AI

```ts
requestOrganizeSuggestion(input: OrganizeRequest): Promise<OrganizeSuggestion>
cancelAiRequest(requestId: string): Promise<void>
```

### 13.6 Suggestions

```ts
saveSuggestion(suggestion: OrganizeSuggestion): Promise<SuggestionMeta>
applySuggestion(suggestionId: string): Promise<ApplySuggestionResult>
rejectSuggestion(suggestionId: string): Promise<void>
```

### 13.7 References

```ts
parseDocumentLinks(path: string): Promise<LinkInfo[]>
getBacklinks(path: string): Promise<BacklinkInfo[]>
```

---

## 14. 核心类型草案

### 14.1 CaptureNoteInput

```ts
type CaptureNoteInput = {
  title?: string;
  body: string;
  source?: string;
  tags?: string[];
};
```

### 14.2 OrganizeSuggestion

```ts
type OrganizeSuggestion = {
  id: string;
  sourcePath: string;
  targetPath: string;
  action: "create" | "append" | "create_or_append";
  title: string;
  summary: string;
  tags: string[];
  links: string[];
  proposedMarkdown: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};
```

### 14.3 SaveDocumentInput

```ts
type SaveDocumentInput = {
  path: string;
  content: string;
  expectedRevision: string;
};
```

### 14.4 SearchInput

```ts
type SearchInput = {
  query: string;
  limit?: number;
  offset?: number;
};
```

---

## 15. 工作区目录结构

M0 建议工作区结构：

```text
MyKnowledge/
├─ 快捷便签/
│  └─ 2026-06-16-xxx.md
├─ 01 研究/
│  ├─ 哲学/
│  └─ 数学/
├─ Sources/
│  ├─ records/
│  └─ assets/
└─ .constellation/
   ├─ suggestions.json
   ├─ folders.json
   └─ cache/
      ├─ references.sqlite
      └─ tantivy/
```

M0 可以暂不启用 `Sources/`，但可以保留目录语义，方便后续来源证据包接入。

---

## 16. 功能开关

M0 可以设置能力开关，用于明确哪些能力启用，哪些能力暂时关闭。

```ts
export const featureFlags = {
  capture: true,
  markdownEditor: true,
  aiOrganize: true,
  suggestions: true,
  search: true,
  backlinks: true,

  knowledgeTree: false,
  canvas: false,
  graph: false,
  dashboard: false,
  vectorSearch: false,
  webdav: false,
  gitSnapshot: false,
  multiWorkspace: false,
  pluginSystem: false,
};
```

注意：

- 这不是付费墙。
- 不得使用本地 `isPro` 之类的虚假权限锁。
- 这里只表示功能成熟度和当前版本范围。

---

## 17. 性能边界

M0 必须从一开始避免拖慢软件。

### 17.1 加载边界

- 当前编辑器只加载当前文件。
- 文件树只加载必要 metadata。
- 搜索结果分页返回。
- AI 候选上下文限制数量。
- 前端不得加载全库正文。

### 17.2 AI 边界

- AI 只在用户点击整理时触发。
- AI 请求必须可取消。
- AI 输入必须有 token 上限。
- AI 输出必须结构化校验。
- AI 失败不得影响记录、编辑、搜索。

### 17.3 写入边界

- 所有写入必须经过 revision 检测。
- 所有写入必须尽量原子化。
- 写入失败不得留下半成品。
- 冲突时保留用户数据，不静默覆盖。

---

## 18. 风险与防御

### 18.1 架构冲突风险

风险：为了快速 Demo，新建一套临时 note API。

防御：所有文件操作必须通过 DocumentService。

### 18.2 AI 乱写风险

风险：AI 直接修改正文、路径、标签、引用。

防御：AI 只能生成 Suggestion，用户确认后才写入。

### 18.3 性能风险

风险：前端扫描全库正文，导致大库卡顿。

防御：搜索和候选笔记由 SearchService 提供，前端分页展示。

### 18.4 数据污染风险

风险：Inbox 使用数据库或隐藏 JSON 保存正文。

防御：Inbox 就是 `快捷便签/` 中的真实 Markdown 文件。

### 18.5 史山代码风险

风险：所有逻辑塞进一个大组件。

防御：按 `workspace/`、`editor/`、`capture/`、`ai/`、`suggestions/`、`search/`、`references/` 分领域组织。

---

## 19. 禁止事项

M0 开发中禁止：

```text
React 组件直接 fs.readFile / fs.writeFile
前端扫描全库 Markdown 正文
AI 返回结果后直接写文件
用正则强改 frontmatter 和 Markdown 结构
为 Inbox 单独建数据库
新建一套与 DocumentService 重复的 notes_v2 API
把碎片状态存在 localStorage
把 API Key 写进工作区
让 UI 按钮先假装可用
为了 Demo 引入后续必删的数据格式
```

---

## 20. 实施顺序

### 阶段 0：冻结 M0 范围

创建文档：

```text
Docs/plans/constellation-m0-core-slice.md
```

明确：

- M0 做什么。
- M0 不做什么。
- 核心 IPC 契约。
- 数据格式。
- 验收标准。

### 阶段 1：硬切 DocumentService

把以下功能统一接到 WorkspaceService / DocumentService：

- 文件树。
- 当前编辑器。
- 快捷便签。
- 保存逻辑。

目标：不再依赖旧 `notes_*` / `categories_*` 运行模型。

### 阶段 2：快捷捕获

实现：

```text
createCaptureNote
QuickCapturePanel
快捷便签/ 真实落盘
```

### 阶段 3：当前文件编辑器

实现：

```text
readDocument
saveDocument
revision
保存状态
dirty state
冲突提示
```

### 阶段 4：搜索和候选笔记

实现：

```text
searchDocuments
findCandidateNotes
```

### 阶段 5：AI 整理建议

实现：

```text
requestOrganizeSuggestion
SuggestionPanel
SuggestionPreview
AI 输出结构化校验
```

### 阶段 6：确认写入

实现：

```text
applySuggestion
rejectSuggestion
原碎片 organized 标记
目标文件 create / append
```

### 阶段 7：最小引用与反链

实现：

```text
parseDocumentLinks
getBacklinks
```

---

## 21. M0 验收标准

M0 只验收以下能力：

```text
1. 能打开一个工作区。
2. 能看到真实文件树。
3. 能创建快捷碎片。
4. 碎片保存为真实 Markdown。
5. 能编辑当前 Markdown。
6. 自动保存不阻塞输入。
7. 能搜索文件。
8. 能点击 AI 整理。
9. AI 返回结构化建议。
10. 用户能预览写入结果。
11. 用户确认后才写入目标文件。
12. 原始碎片保留并标记 organized。
13. 能看到当前文件的基础引用和反链。
14. 关闭 AI 后，记录、编辑、搜索仍可用。
15. 路径穿越、revision 冲突、AI JSON 非法、写入失败都有可恢复错误。
```

只要以上流程跑通，M0 就可以作为正式可用版本。

---

## 22. 给 Codex 的任务提示词

可以直接使用以下提示词开启开发：

```text
本任务不是临时 Demo，而是 Constellation v4 的最小正式可用版本 M0：Capture → AI Suggestion → Confirmed Write。

目标：用现有 v4 架构零件组装一个可以正式使用的最小软件，用于记录碎片知识，并通过 AI 整理建议写入知识框架。

必须遵守：
1. Markdown 是唯一正文事实源。
2. 快捷碎片保存到真实“快捷便签/”目录。
3. 前端不得直接读写文件系统，不得扫描全库正文。
4. 所有文件操作必须通过 src/core-client 调用 Rust DocumentService。
5. AI 只能生成 OrganizeSuggestion，不能直接改正文、frontmatter、路径或引用。
6. 用户确认后，才允许 applySuggestion 写入目标文件。
7. 原始碎片不得删除，只能标记 organized 并记录 organized_to。
8. 不得新增临时数据库保存正文。
9. 不得新增与 DocumentService 重复的 note API。
10. 不实现 JSON Canvas、完整图谱、仪表盘、多工作区、WebDAV、Git、插件和自动 Agent。
11. 所有新增代码必须放入对应领域目录，不得继续扩大 components/utils。
12. 必须包含失败路径：路径穿越、revision 冲突、AI JSON 非法、用户取消、写入失败。
13. 新代码文件必须带项目版权头。
14. 更新 README 中的模块完成度和功能说明。

实施顺序：
1. 先完成 M0 类型契约和 IPC 契约。
2. 再完成 WorkspaceService / DocumentService 的最小闭环。
3. 再实现快捷捕获。
4. 再实现当前文件编辑和保存。
5. 再实现搜索和候选笔记。
6. 再实现 AI 整理建议。
7. 最后实现用户确认写入和最小引用反链。
```

---

## 23. 最终结论

M0 的价值在于：

- 它能马上服务真实使用场景。
- 它只保留最核心的知识整理闭环。
- 它不为了 Demo 牺牲正式架构。
- 它为后续知识树、Canvas、图谱、仪表盘、语义搜索和批量 AI 整理保留清晰接口。

一句话总结：

> **Constellation M0 是以现有 v4 架构为零件组装出的最小正式可用软件：它先跑通“碎片记录 → AI 整理建议 → 用户确认写入 → Markdown 知识沉淀”的核心闭环，并为后续功能扩展保留稳定接口。**
