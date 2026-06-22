# Constellation 1.0：最小正式可用版

> 版本定位：最小正式可用版 / Core Slice  
> 核心闭环：Capture → Suggestion → Confirmed Write  
> 目标：先让 Constellation 成为可以每天真实使用的碎片化知识整理软件，而不是只停留在 UI 原型或临时 Demo。

---

## 1. 版本结论

Constellation 1.0 的目标不是实现完整知识管理系统，而是跑通最关键的正式使用闭环：

```text
快速记录碎片
  ↓
保存为真实 Markdown 文件
  ↓
搜索和定位相关内容
  ↓
AI 给出整理建议
  ↓
用户预览和确认
  ↓
写入目标笔记或新建笔记
  ↓
原始碎片保留并可追溯
```

1.0 必须能正式使用，也必须为后续 2.0、3.0 留出稳定接口。它可以少做，但不能乱做；可以关闭复杂功能，但不能引入未来要推倒重写的临时模型。

---

## 2. 产品定位

Constellation 1.0 是：

```text
真实文件树
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
- Obsidian、Word、Notion 或脑图软件的复刻。

1.0 的核心价值是：

> 把碎片化想法可靠落盘，并通过 AI 建议和用户确认，将碎片逐步整理进真实 Markdown 知识库。

---

## 3. 1.0 必须坚持的原则

### 3.1 Markdown 是唯一正文事实源

用户知识正文必须保存为真实 Markdown 文件。

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

### 3.2 AI 只给建议，不自动执行

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

### 3.4 1.0 是正式架构的垂直切片

1.0 不做所有功能，但它做的每个功能都必须按正式架构写。

这意味着：

- 可以少做。
- 不可以乱做。
- 可以留空接口。
- 不可以写未来必删的临时代码。

---

## 4. 1.0 启用的服务

1.0 只启用以下服务：

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

1.0 至少初始化：

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

所有正文写入都必须经过 DocumentService。

### 4.3 SearchService

负责：

- 文件名搜索。
- 正文搜索。
- 标签搜索。
- 为 AI 整理提供候选相关笔记。

1.0 可以先做简单实现，但接口必须稳定，后续可以升级为 Tantivy、中文分词、混合检索或向量检索。

### 4.4 AiService

负责：

- 调用 OpenAI-compatible 或后续支持的 AI 供应商。
- 管理 AI 请求。
- 返回结构化整理建议。
- 支持取消。
- 控制输入上下文范围。

AiService 不直接写文件。

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

1.0 只实现最小引用能力：

- 解析 `[[Wiki-Link]]`。
- 解析 `[文字](相对路径.md)`。
- 显示当前文件 outgoing links。
- 显示当前文件 incoming backlinks。

暂不实现完整局部图谱、全局图谱、AI 相似关系、来源证据包。

### 4.7 WatcherServiceLite

1.0 只需要监听外部文件变化并刷新当前文件或文件树。

暂不做复杂增量索引管线，但接口要为后续 WatcherService 保留空间。

---

## 5. 1.0 界面组成

1.0 只需要四个主要区域。

### 5.1 左侧：真实文件树

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

### 5.2 中间：当前 Markdown 编辑器

1.0 只允许一个当前文件。

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
- 源码 / 预览双栏常驻。

### 5.3 右侧：AI 整理建议与引用信息

右侧面板包含：

- AI 整理按钮。
- 整理建议结果。
- 写入预览。
- 确认应用。
- 拒绝建议。
- 当前文件引用。
- 当前文件反链。

### 5.4 快捷捕获入口

可以是：

- 底部输入框。
- 右下角浮窗。
- 快捷键打开的小窗口。

保存后生成真实 Markdown 文件。

---

## 6. 快捷捕获设计

### 6.1 输入字段

1.0 只需要：

```text
标题：可选
正文：必填
来源：可选
标签：可选
```

### 6.2 保存位置

默认保存到：

```text
快捷便签/
```

示例：

```text
快捷便签/2026-06-16-经验主义的一个问题.md
```

### 6.3 文件格式

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

### 6.4 整理后的追踪

原始碎片不自动删除。AI 整理后只更新状态，不抹除原始内容。

整理后的 frontmatter 示例：

```yaml
status: organized
organized_to: "../01 研究/哲学/认识论/经验主义.md"
organized_at: "2026-06-16T00:00:00Z"
```

---

## 7. AI 整理建议设计

### 7.1 用户操作

用户在当前碎片页面点击：

```text
整理这条碎片
```

### 7.2 AI 输入上下文

AiService 可以读取：

- 当前碎片正文。
- 当前文件路径。
- 文件树摘要。
- SearchService 找到的候选相关笔记。
- 可选 `.mindmap.md` 框架文本。

1.0 必须限制上下文数量，避免拖慢软件。

建议限制：

```text
候选笔记最多 20 条
每条候选只给标题、路径、摘要或片段
AI 输入总 token 设置上限
```

### 7.3 AI 输出格式

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

### 7.4 建议状态

建议进入 pending 状态：

```ts
status: "pending" | "accepted" | "rejected"
```

未经用户确认，不得写入目标文件。

---

## 8. 建议确认与写入流程

### 8.1 前端展示

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

### 8.2 应用建议

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

### 8.3 失败处理

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

## 9. 最小引用与反链

1.0 只支持两种引用：

```markdown
[[文件名]]
[显示文字](相对路径.md)
```

当前文件右侧显示：

```text
本文引用了哪些文件
哪些文件引用了本文
```

1.0 不做图谱，但引用数据结构要能被后续 GraphService 复用。

---

## 10. 功能开关

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
  aiAgent: false,
};
```

注意：

- 这不是付费墙。
- 不得使用本地 `isPro` 之类的虚假权限锁。
- 这里只表示功能成熟度和当前版本范围。

---

## 11. 1.0 禁止事项

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

## 12. 实施顺序

### 阶段 0：冻结 1.0 范围

创建并维护本文件，明确：

- 1.0 做什么。
- 1.0 不做什么。
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

## 13. 1.0 验收标准

1.0 只验收以下能力：

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

只要以上流程跑通，1.0 就可以作为正式可用版本。

---

## 14. 与 2.0、3.0 的关系

1.0 是地基。

2.0 的图谱、知识树、JSON Canvas、仪表盘、语义搜索都必须接到 1.0 的事实源和服务边界上，而不是另建一套系统。

3.0 的插件系统和 AI Agent 必须建立在 1.0 的权限、确认、回滚、审计和服务 API 稳定之后。

一句话：

> 1.0 负责让产品活起来，2.0 负责让知识结构化和可视化，3.0 负责让系统生态化和自动化。

---

## 15. 版权与许可提醒

本项目基于 floral-notepaper 二次开发。floral-notepaper 原始代码采用 MIT 许可证，原始版权归 Achilng 所有；Constellation 修改部分版权归 Maplar 所有。开发和发布时必须保留 LICENSE 及源码中的版权声明。
