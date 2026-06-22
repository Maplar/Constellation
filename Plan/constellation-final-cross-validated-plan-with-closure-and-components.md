# Constellation：加入前后端闭环与组件计划后的最终交叉比对方案

> 本文件是在 `constellation-final-cross-validated-plan.md` 与 `constellation-final-cross-validated-plan-with-ui-components.md` 基础上，继续加入以下实施计划后的最终校准：
>
> - `2026-06-10-constellation-frontend-backend-closure.md`
> - `2026-06-14-dashboard-calendar-dense-layout.md`
> - `2026-06-14-reference-capsule-symbols.md`
> - `2026-06-14-source-collection-color-calibration.md`
> - `2026-06-14-unified-folder-palette.md`
> - `2026-06-14-visual-markdown-editor-toolbar.md`
> - `2026-06-15-current-file-topics.md`
> - `2026-06-15-editor-markup-context-menus.md`
> - `2026-06-15-quick-note-continuation-insights.md`
> - `2026-06-15-split-color-palettes.md`
>
> 核心新增判断：这些文件大多数是“UI 校准计划”或“v4 完整闭环计划”，不能直接等同于 1.0 范围。最终需要把它们拆进 1.0 / 2.0 / 3.0 的版本边界中。

---

## 0. 最终一句话

Constellation 的最终方案应统一为：

```text
版本确认方案：决定 1.0 / 2.0 / 3.0 分别做什么
前后端闭环计划：决定完整 v4 如何真实接后端
UI 校准台和 UI 实施计划：决定组件从哪里抽取、长什么样、交互状态如何
AGENTS / README：决定事实源、架构、版权、安全和 UI 红线
```

最终路线保持：

```text
1.0：真实文件工作区 + 快捷捕获 + 当前 Markdown 编辑 + 搜索 + AI 整理建议 + 用户确认写入
  ↓
2.0：知识树 + 来源化引用图谱 + JSON Canvas + 仪表盘 + 有来源的语义搜索 / 问答
  ↓
3.0：稳定 API + 权限 + 审计 + 回滚 + 插件 + AI Agent + 自动化工作流
```

但实施资源来自同一个 v4 组件池：

```text
constellation-v4-ui-calibration.html
+ frontend-backend-closure phased plan
+ visual editor / quick note / reference capsule / palette / dashboard / context menu calibration plans
```

一句话：

> **组件可以提前校准，功能不能提前越界。1.0、2.0、3.0 都从同一个 UI 校准台取组件，但按 feature flag 和服务成熟度分批启用。**

---

## 1. 文件优先级重新排序

### P0：版权与许可证红线

来源：`AGENTS.md`。

任何阶段都必须保留：

```text
floral-notepaper MIT 许可证
Achilng 原版权声明
Maplar 修改版权声明
根 LICENSE 不得改写
新增代码版权头
不复制 Obsidian / FlClash 专有资产
```

### P1：事实源与 Core Engine 红线

来源：`AGENTS.md`、1.0 / 2.0 / 3.0 confirmed plans、前后端闭环计划。

最高事实源仍然是：

```text
Markdown 文件
.mindmap.md 知识树 Markdown
标准 .canvas JSON Canvas
附件
真实文件夹
```

`.constellation/` 只允许保存：

```text
配置
布局
建议状态
缓存
索引
诊断结果
迁移记录
操作状态
```

前端只能通过：

```text
src/core-client/
  ↓
Typed Tauri API
  ↓
Rust Core Engine
```

不得直接扫描全库正文、绕过 Core 写文件、在 React Store 里维护另一份事实源。

### P2：1.0 / 2.0 / 3.0 最终确认方案

版本边界仍以三份 final confirmed plan 为准。

### P3：前后端闭环实施计划

`2026-06-10-constellation-frontend-backend-closure.md` 是完整 v4 的真实后端闭环方案，不是 1.0 范围本身。

它的正确用法是：

```text
拆分 Phase 到 1.0 / 2.0 / 3.0
不把完整 10 类 UI 入口一次性塞进 1.0
用它定义契约、错误、Job、Canvas、Dashboard、AI、迁移和发布门
```

### P4：UI 校准台与 UI 计划

这些文件提供组件和交互契约：

```text
constellation-v4-ui-calibration.html
visual editor toolbar
quick note continuation
current file topics
context menu
reference capsule symbols
source collection colors
folder palette
split color palettes
dashboard calendar dense layout
```

它们决定“怎么长、怎么点、怎么校准”，不决定“哪个版本必须启用”。

---

## 2. 前后端闭环计划的版本拆分

`frontend-backend-closure` 的 Phase 不能整体归入 1.0。最终拆分如下。

### 2.1 归入 1.0 的部分

```text
Phase 0：契约、测试护栏与目录骨架
Phase 1：CoreState、JobManager 基础与工作区生命周期的最小必要部分
Phase 2：工作区、文档与旧 notes_* 接口硬切换
Phase 3：搜索、ReferenceServiceLite、最小反链、保存后增量更新的基础部分
Phase 6：AI 整理建议所需的最小 provider、取消、结构化建议和确认写入
Phase 8：只验收 1.0 启用入口，不能验收完整 10 类 v4 入口
```

1.0 必须从这个闭环计划中拿走：

```text
CoreError 四字段
WorkspaceEntry
DocumentRecord
expectedRevision
contentHash
workspace generation
CoreState 当前工作区
DocumentService 原子写入
SearchService 基础查询
SuggestionService 受控应用
前端统一 core-client
禁用直接 invoke
旧 notes_* / categories_* / metadata.json 主链路删除
```

1.0 可以暂缓：

```text
完整 JobManager UI
完整 GraphService
完整 CanvasService
完整 DashboardService
完整 VectorService
完整 SourceService
完整 10 类 UI 操作矩阵
WebDAV / Git / Backup / Migration 全闭环
```

### 2.2 归入 2.0 的部分

```text
Phase 3：完整 ReferenceService、GraphService、局部 / 全局图谱、AI similarity 分离
Phase 4：JSON Canvas 1.0 完整基础编辑
Phase 5：DashboardService 后端持久化与 13 类卡片
Phase 6：语义搜索、RAG 问答、来源引用、Anthropic/OpenAI-compatible 完整适配
Phase 7：备份、迁移、诊断、WebDAV、Git 中与知识库维护强相关的部分
Phase 8：完整 10 类 UI 入口矩阵中的 2.0 入口验收
```

2.0 必须从闭环计划中拿走：

```text
CanvasDocument 标准 tagged union
ReferenceEdge 完整行列范围
SearchHit 结构化返回
AiStreamEvent: sources -> delta -> coverage -> done
DashboardService .constellation/dashboard.json
GraphService 后端查询
VectorService / SourceService
JobManager 长任务统一进度
```

### 2.3 归入 3.0 的部分

闭环计划本身还没有真正展开插件、Agent 和 Automation，但它提供了 3.0 的前置基础：

```text
Stable API
CoreError
JobStatus
workspace generation
权限前置点
审计和回滚可接入点
公共 service boundaries
```

3.0 应在这些稳定后再新增：

```text
PluginService
PluginPermissionService
PluginRuntime
AgentService
AgentToolRegistry
AutomationService
AuditService
RollbackService
WorkflowService
MarketplaceService
```

---

## 3. UI 组件池总表

### 3.1 组件来源原则

所有版本组件都从 `constellation-v4-ui-calibration.html` 和对应 UI 实施计划抽取，但要分三类：

```text
基础组件：1.0 就可抽取并复用
业务组件：按 1.0 / 2.0 / 3.0 分批启用
校准组件：暂时只作为静态视觉契约，不进入运行时
```

### 3.2 基础组件，1.0 起就应该抽取

```text
AppShell
Topbar
LeftAppSidebar
ViewButton
IconButton
TextButton
PrimaryButton
SegmentedControl
StatusChip
Switch
Toast
SurfaceOverlay
FloatingPanel
Popover
ContextMenuShell
CreationForm
Card
TreeRow
FileTreeNode
CommandGroup
SettingsGroup
```

这些组件不直接绑定业务能力，只负责视觉、主题、密度、交互外壳。

### 3.3 业务组件分配

| 组件 | 1.0 | 2.0 | 3.0 |
|---|---:|---:|---:|
| AppShell / Topbar / Sidebar | 启用 | 复用 | 复用 |
| FilePanel / FileTree | 启用 | 增强 `.mindmap.md` / `.canvas` | 插件扩展点 |
| QuickNotePanel / QuickNotepadSurface | 启用 | 批量整理增强 | 自动化触发器 |
| TileNoteSurface | 启用或保留 | 复用 | 插件可扩展 |
| MarkdownEditor / EditorShell | 启用最小版 | 完整 AST/视觉编辑增强 | 插件扩展 |
| VisualToolbar | 启用保守子集 | 完整标注、引用、附件 | 插件命令注入 |
| RelationPanelLite | 启用最小引用/反链 | 完整来源、图谱跳转 | Agent/插件入口 |
| ReferenceChipLocal | 启用 | URL / AI / Source capsule 完整启用 | 插件不得破坏 |
| GraphView | 隐藏 | 启用 | 插件图谱筛选器 |
| KnowledgeTreeView | 隐藏 | 启用 | Agent 结构建议 |
| CanvasView | 隐藏 | 启用 | 插件 Canvas 辅助 |
| DashboardView | 隐藏 | 启用 | 插件卡片 |
| AiSourceView | 仅整理建议 | 语义问答/来源 | Agent 控制台 |
| SettingsView | 基础设置 | AI/来源/备份/诊断 | 插件权限/自动化 |
| PaletteSurface | 可选文件夹色 | 文件夹/来源颜色拆分 | 插件只能继承 |
| ContextMenu | Lite 安全动作 | 对象自适应完整菜单 | 插件扩展菜单 |

---

## 4. 1.0 最终组件与后端范围

### 4.1 1.0 目标

1.0 只验收一个正式闭环：

```text
快速捕获
  ↓
真实 Markdown 落盘
  ↓
搜索候选
  ↓
AI 生成整理建议
  ↓
预览 / diff
  ↓
用户确认
  ↓
DocumentService 写入
  ↓
原始碎片保留并标记 organized
```

### 4.2 1.0 前端组件

1.0 启用：

```text
AppShell
Topbar
LeftAppSidebar，但只显示 Editor / Search / Settings 必要入口
FilePanel
FileTree
CreateNoteForm
CreateFolderForm
QuickNotePanel
QuickNotepadSurface
TileNoteSurface
EditorShell
EditorTitle
MarkdownEditor
VisualToolbarLite
AdvancedSourceMode
RelationPanelLite
ReferenceChipLocal
BacklinkList
SearchPill
SuggestionPanel
SuggestionPreview
SuggestionDiff
ConfirmApplyButton
RejectSuggestionButton
BasicSettingsPanel
Toast
ContextMenuLite
```

1.0 隐藏：

```text
GraphView
KnowledgeTreeView
CanvasView
DashboardView
完整 AiSourceView
来源证据包工作流
URL / AI 来源集合管理
完整 PaletteSurface
完整 ContextMenu matrix
ActivityCalendar
Advanced Diagnostics
Job dashboard
Plugin / Agent / Automation
```

### 4.3 1.0 后端服务

1.0 启用：

```text
WorkspaceService
DocumentService
SearchService
AiService minimal
SuggestionService
ReferenceServiceLite
WatcherServiceLite
SettingsServiceLite
CoreError
CoreState minimal
core-client typed transport
```

1.0 必须完成的硬切换：

```text
删除运行时 notes_* / categories_* 主链路
删除 metadata.json 正文事实源依赖
删除前端 Fuse 全文 fallback
统一当前文件 session
快捷便签与磁贴共享同一 DocumentRecord
所有保存携带 expectedRevision
所有正文写入走 DocumentService
```

### 4.4 1.0 对 UI 计划的取舍

#### Visual Markdown Editor Toolbar

1.0 可以使用其外观，但只启用保守能力：

```text
正文 / H2 / H3
粗体 / 斜体 / 删除线 / 行内代码
列表 / 引用 / 分割线
链接 / 本地引用
源码高级入口
```

1.0 暂缓：

```text
完整 WYSIWYG AST 双向转换
复杂选区标注
感悟脚注正式持久化
图片 / 附件高级管理
```

#### Quick Note Continuation

1.0 应采用：

```text
快捷便签保存到可见 快捷便签/ 目录
允许多个未整理草稿
同一时间一个活动草稿
关闭窗口不删除草稿
整理必须用户确认移动或写入
```

#### Current File Topics

1.0 采用其中的“唯一当前文件”原则：

```text
无 Tab
文件树选中项是唯一上下文
右侧关系栏默认可折叠
顶部文件标题是唯一 H1
```

但专题面板完整能力可以后置到 2.0。

#### Context Menu

1.0 只做 Lite：

```text
文件：打开 / 重命名 / 移动 / 删除到回收站
编辑器：复制 / 粘贴 / 链接 / 本地引用
快捷便签：整理 / 转磁贴 / 删除到回收站
```

不做图谱、知识树、Canvas、仪表盘、AI 来源的完整对象菜单。

---

## 5. 2.0 最终组件与后端范围

### 5.1 2.0 目标

2.0 从“碎片整理闭环”升级到“知识结构系统”：

```text
严格知识树
  ↓
来源化引用与图谱
  ↓
标准 JSON Canvas
  ↓
知识库维护仪表盘
  ↓
有来源的语义搜索与问答
```

### 5.2 2.0 启用组件

```text
GraphView
KnowledgeTreeView
CanvasView
DashboardView
AiSourceView full
SourceReferenceWorkflow
ReferenceCapsule local/url/ai
SourcePreviewBox
FolderColorPalette
SourceColorPalette
ActivityCalendarCard
DashboardDenseGrid
ContextMenu full object-aware matrix
AdvancedSettings
JobStatusPanel
DiagnosticsCard
```

### 5.3 2.0 后端服务

```text
ReferenceService full
GraphService
KnowledgeTreeService
CanvasService
DashboardService
VectorService
SourceService
JobManager full
BackupService
DiagnosticsService
MigrationService relevant parts
```

### 5.4 UI 计划归入 2.0 的内容

#### Reference Capsule Symbols

2.0 启用三类引用胶囊：

```text
local：本地文件，继承目标文件夹颜色
url：URL 来源集合，继承 source-collections 颜色
ai：AI 来源集合，继承 source-collections 颜色
```

圆标采用“实心来源色 + 表面色挖空图案”。本地文件、URL、AI 分别使用独立 SVG mask，不用字体字形代替。

#### Source Collection Color Calibration

2.0 启用：

```text
本地文件夹颜色 → .constellation/folders.json
URL / AI 来源集合颜色 → .constellation/source-collections.json
引用胶囊 / 竖线 / 内容框 / 图谱节点 / 显式来源边同源同色
AI 来源引用与 AI 相似关系分开
```

#### Unified Folder Palette + Split Color Palettes

最终不是“统一调色盘”，而是：

```text
文件夹颜色
来源颜色
```

文件夹颜色只管理本地文件夹；来源颜色内部再分：

```text
URL 来源集合
AI 来源集合
```

共享一套色环、原始色 / UI 安全色、最近颜色和高级取色设置，但目标列表必须分离。

#### Dashboard Calendar Dense Layout

2.0 仪表盘启用：

```text
.grid-auto-flow: dense
12 列卡片布局
活动日历热力图
最近编辑
未整理碎片
失效引用
AI 建议
冲突文件
诊断摘要
```

活动日历初期可以用本地保存事件，后续接 Git 历史；不得让前端扫描全库或 Git 仓库自行统计。

#### Visual Toolbar / Context Menu / Current File Topics 完整化

2.0 完整启用：

```text
文字选区浮动工具条
普通下划线
文字感悟
对象自适应右键菜单
专题面板
关系栏完整来源化
图谱 / 知识树 / Canvas / 仪表盘对象菜单
```

但这些菜单不得越过边界：

```text
图谱菜单只浏览 / 筛选 / 跳转
知识树移除节点不得删除真实文件
仪表盘移除卡片不得删除笔记
AI 建议不得绕过 diff 直接写入
```

---

## 6. 3.0 最终组件与后端范围

### 6.1 3.0 目标

3.0 不是继续堆 UI，而是让系统进入受控生态和自动化：

```text
Stable API
  ↓
Permission Model
  ↓
Audit / Rollback
  ↓
Plugin System
  ↓
AI Agent
  ↓
Automation Workflow
```

### 6.2 3.0 可复用 2.0 组件

```text
SettingsView
DashboardCard
ContextMenu
SurfaceOverlay
AiSourceView
SuggestionInbox
JobStatusPanel
DiagnosticsCard
GraphView
KnowledgeTreeView
CanvasView
```

新增组件应包括：

```text
PluginManagerView
PluginPermissionDialog
PluginAuditLog
AgentConsole
AgentPlanPreview
AgentToolCallTimeline
AutomationWorkflowBuilder
RollbackPanel
MarketplaceView，后置
```

### 6.3 3.0 绝对前置条件

必须等以下稳定：

```text
DocumentService
ReferenceService
SearchService
GraphService
KnowledgeTreeService
CanvasService
DashboardService
SuggestionService
CoreError
JobManager
权限模型
审计模型
回滚模型
```

插件和 Agent 不能绕过 Core Engine，也不能直接读写文件系统。

---

## 7. 最终实施路线

### 7.1 先做 1.0，不被 v4 完整闭环拖偏

```text
1.0-0 冻结版本范围和 feature flags
1.0-1 建立 CoreError / core-client / CoreState minimal
1.0-2 硬切 WorkspaceService + DocumentService
1.0-3 快捷便签真实 Markdown 落盘
1.0-4 当前文件编辑和 revision 保存
1.0-5 SearchService 基础搜索和候选笔记
1.0-6 AiService 结构化整理建议
1.0-7 SuggestionService 预览 / diff / 确认写入
1.0-8 ReferenceServiceLite outgoing / backlinks
1.0-9 只验收 1.0 启用组件，无假按钮
```

### 7.2 再做 2.0，把 UI 校准能力真实接后端

```text
2.0-0 ReferenceService full
2.0-1 KnowledgeTreeService + KnowledgeTreeView
2.0-2 Source-aware local graph
2.0-3 DashboardService + dense dashboard + calendar card
2.0-4 CanvasService + JSON Canvas 1.0
2.0-5 Global Graph + performance
2.0-6 SourceService + source evidence + source colors
2.0-7 VectorService + semantic / hybrid search
2.0-8 Grounded QA + AiStreamEvent
2.0-9 Batch AI suggestions + suggestion inbox
```

### 7.3 最后做 3.0

```text
3.0-1 Stable public service API
3.0-2 Permission model
3.0-3 Audit and rollback
3.0-4 Local plugin runtime
3.0-5 Read-only Agent
3.0-6 Suggestion Agent
3.0-7 Authorized execution Agent
3.0-8 Automation workflows
3.0-9 Plugin marketplace，后置
```

---

## 8. 最终 feature flags

### 8.1 1.0

```ts
export const featureFlags10 = {
  capture: true,
  quickNotes: true,
  tileNotes: true,
  workspaceTree: true,
  markdownEditor: true,
  visualToolbarLite: true,
  sourceModeAdvanced: true,
  search: true,
  aiOrganize: true,
  suggestions: true,
  confirmedWrite: true,
  backlinksLite: true,
  contextMenuLite: true,

  localGraph: false,
  globalGraph: false,
  knowledgeTree: false,
  canvas: false,
  dashboard: false,
  sourceReferences: false,
  sourceColors: false,
  vectorSearch: false,
  semanticQa: false,
  batchAiSuggestions: false,
  pluginSystem: false,
  aiAgent: false,
  automationWorkflows: false,
};
```

### 8.2 2.0

```ts
export const featureFlags20 = {
  capture: true,
  quickNotes: true,
  tileNotes: true,
  workspaceTree: true,
  markdownEditor: true,
  visualToolbarFull: true,
  search: true,
  aiOrganize: true,
  suggestions: true,
  backlinks: true,

  localGraph: true,
  globalGraph: true,
  knowledgeTree: true,
  canvas: true,
  dashboard: true,
  dashboardCalendar: true,
  sourceReferences: true,
  folderColors: true,
  sourceColors: true,
  vectorSearch: true,
  semanticQa: true,
  batchAiSuggestions: true,
  diagnostics: true,
  backup: true,

  pluginSystem: false,
  aiAgent: false,
  automationWorkflows: false,
  autoRewrite: false,
  autoMove: false,
  autoDelete: false,
};
```

### 8.3 3.0

```ts
export const featureFlags30 = {
  capture: true,
  markdownEditor: true,
  search: true,
  suggestions: true,
  backlinks: true,
  localGraph: true,
  globalGraph: true,
  knowledgeTree: true,
  canvas: true,
  dashboard: true,
  sourceReferences: true,
  vectorSearch: true,
  semanticQa: true,

  pluginSystem: true,
  localPlugins: true,
  pluginMarketplace: false,
  aiAgent: true,
  automationWorkflows: true,

  autoRewrite: false,
  autoMove: false,
  autoDelete: false,
  realtimeCollaboration: false,
};
```

---

## 9. 最终冲突处理

### 冲突 1：frontend-backend-closure 提到 10 类 UI 入口全部真实后端操作

处理：

```text
这是完整 v4 闭环目标，不是 1.0 目标。
1.0 只验收启用入口。
2.0 再验收 Graph / Canvas / Dashboard / Source / Semantic QA。
3.0 再验收 Plugin / Agent / Automation。
```

### 冲突 2：HTML 里已有 Graph / KnowledgeTree / Canvas / Dashboard

处理：

```text
HTML 是组件池。
1.0 隐藏这些入口。
2.0 按服务成熟度启用。
```

### 冲突 3：HTML 里仍有“统一调色盘”，split-color-palettes 要拆成两个入口

处理：

```text
最终以 split-color-palettes 为准。
UI 校准台现状可视为旧状态。
正式实现必须拆成“文件夹颜色”和“来源颜色”。
```

### 冲突 4：Visual Toolbar 很完整，但 1.0 不应被复杂编辑器拖慢

处理：

```text
1.0 使用外观和基础命令。
正式 AST 双向转换是必须方向，但可以分阶段。
不得用 innerHTML 或第二份正文状态保存。
```

### 冲突 5：Quick Note 计划强调多个草稿，1.0 confirmed plan 只强调快捷捕获

处理：

```text
多个未整理草稿 + 一个活动草稿 与 1.0 不冲突。
它是快捷捕获的 UI 行为细化，应进入 1.0。
```

### 冲突 6：Current File Topics 提到专题面板

处理：

```text
唯一当前文件、无 Tab、右栏折叠进入 1.0。
专题完整功能后置到 2.0。
```

### 冲突 7：Context Menu 计划覆盖所有页面

处理：

```text
1.0 只做 ContextMenuLite。
2.0 做完整对象自适应菜单。
3.0 允许插件扩展菜单，但受权限约束。
```

---

## 10. 最终验收口径

### 10.1 1.0 验收

只验收：

```text
真实工作区
真实文件树
快捷便签真实 Markdown
当前文件编辑
revision 保存
搜索候选
AI 整理建议
预览 / diff
用户确认写入
原碎片 organized 标记
最小引用和反链
AI 关闭后核心记录编辑搜索可用
无旧 notes_* 主链路
无假按钮和静默失败
```

### 10.2 2.0 验收

验收：

```text
ReferenceService full
KnowledgeTreeService
GraphService local/global
CanvasService JSON Canvas 1.0
DashboardService + dashboard.json
SourceService + evidence
VectorService + semantic QA
Source-aware reference visuals
Folder/source colors
Object-aware context menu
Dashboard dense layout + calendar
Batch AI suggestion inbox
单模块失败不白屏
缓存删除后可重建
```

### 10.3 3.0 验收

验收：

```text
Plugin API
权限声明
插件启用/禁用/卸载
插件失败隔离
Agent 只读分析
Agent 批量建议
授权执行前计划 / 范围 / 风险展示
审计记录
回滚机制
自动化工作流
外发正文前授权
API Key 不进入工作区或插件可读范围
```

---

## 11. 最终结论

加入这批文件后，最终方案不是变得更大，而是变得更清晰：

```text
1.0 不是完整 v4。
2.0 才是 UI 校准台大部分能力真实落地的版本。
3.0 才允许插件和 Agent。
frontend-backend-closure 是完整 v4 的实施蓝图。
UI 校准计划是组件契约。
confirmed plans 是版本边界。
AGENTS 是不可越过的红线。
```

最终执行判断：

> **先用 UI 校准台抽取 1.0 必需组件，按前后端闭环计划的 Phase 0–2 硬切真实 Core；等 1.0 的真实文件、搜索、AI 建议和确认写入稳定后，再把图谱、知识树、Canvas、仪表盘、来源和语义问答按 2.0 启用；最后在稳定 API、权限、审计和回滚上建设 3.0。**
