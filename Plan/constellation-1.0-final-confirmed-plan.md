# Constellation 1.0：最终确认方案

> 版本定位：最小正式可用版 / Core Slice  
> 核心闭环：Capture → Suggestion → Confirmed Write  
> 当前状态：方案层面已确认，代码层面尚未完成底层架构更改  
> 原项目关系：保留 floral-notepaper 的轻量桌面捕获体验，替换其便签数据模型为真实工作区架构

---

## 1. 最终结论

Constellation 1.0 的目标不是完整知识管理系统，也不是继续在 floral-notepaper 的 `NoteStore / metadata.json / category / notes_*` 模型上堆功能。

1.0 的最终目标是：

```text
快速捕获碎片
  ↓
保存为真实 Markdown 文件
  ↓
在真实文件树中可见
  ↓
搜索相关内容
  ↓
AI 生成整理建议
  ↓
用户预览 / diff / 确认
  ↓
写入目标笔记或新建笔记
  ↓
原始碎片保留并可追溯
```

一句话：

> Constellation 1.0 是“碎片整理闭环版”：保留 floral-notepaper 的随手记体验，但底层改为真实文件工作区，并通过 AI 建议和用户确认把碎片整理进正式 Markdown 知识库。

---

## 2. 与 floral-notepaper 的关系

### 2.1 保留的原项目资产

floral-notepaper 已经具备的能力中，以下部分应保留：

```text
Tauri 桌面壳
React 前端基础
快捷便签窗口
全局快捷键 / 托盘入口
磁贴窗口
Markdown 编辑 / 预览基础
本地应用配置
桌面窗口管理
```

这些是 Constellation 的“轻快入口”，不能因为重构成知识库而丢掉。

### 2.2 必须替换的原项目底层模型

floral-notepaper 当前更接近便签应用架构：

```text
NoteStore
metadata.json
notes/
category
notes_* API
categories_* API
```

Constellation 1.0 不能继续扩大这套模型。它必须改为：

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

### 2.3 最终原则

```text
保留桌面体验
替换数据模型
保留快捷捕获
替换 notes_* 主链路
保留 Markdown 编辑基础
改为真实工作区文件读写
```

---

## 3. 1.0 产品范围

Constellation 1.0 包含：

```text
真实文件树
当前 Markdown 编辑
快捷捕获
全文搜索
AI 整理建议
用户确认写入
最小引用 / 反链
```

Constellation 1.0 不包含：

```text
完整图谱
知识树编辑器
JSON Canvas
自由卡片仪表盘
插件系统
AI Agent
自动整理
多工作区
高级同步
复杂所见即所得编辑器
```

---

## 4. 核心架构

### 4.1 新架构主链路

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

前端不得绕过 `src/core-client/` 直接调用文件系统，也不得自己扫描全库 Markdown 正文。

---

## 5. 事实源原则

### 5.1 Markdown 是唯一正文事实源

用户知识正文必须保存为真实 Markdown 文件。

允许：

```text
快捷便签/2026-06-17-某个想法.md
01 研究/哲学/认识论/经验主义.md
02 项目/Constellation/架构判断.md
```

禁止：

```text
用 metadata.json 保存正文事实源
用数据库保存正文事实源
用 localStorage 保存正文
用隐藏 JSON 保存正文
为 Inbox 单独设计未来要废弃的私有格式
```

### 5.2 `.constellation/` 的职责

`.constellation/` 只能保存：

```text
配置
布局
建议状态
缓存
可重建索引
迁移记录
```

不能保存用户正文事实源。

---

## 6. 1.0 服务边界

### 6.1 WorkspaceService

负责：

```text
打开工作区
校验工作区路径
初始化必要目录
读取真实文件树
提供文件树变更事件
```

1.0 至少初始化：

```text
快捷便签/
.constellation/
.constellation/cache/
```

### 6.2 DocumentService

负责：

```text
创建 Markdown 文件
读取当前文件
保存当前文件
revision 检测
内容 hash
原子写入
重命名
移动
删除到回收站
```

所有正文写入必须经过 DocumentService。

### 6.3 SearchService

负责：

```text
文件名搜索
正文搜索
标签搜索
为 AI 整理提供候选相关笔记
```

1.0 可以先用简单实现，但接口要稳定，后续可升级为 Tantivy、中文分词、混合检索或向量检索。

### 6.4 AiService

负责：

```text
调用 OpenAI-compatible / 后续 AI 供应商
控制输入上下文范围
支持取消请求
返回结构化整理建议
```

AiService 不直接写文件。

### 6.5 SuggestionService

负责：

```text
保存 AI 建议状态
展示 pending / accepted / rejected
应用建议
拒绝建议
记录建议是否已处理
```

建议状态可以保存到：

```text
.constellation/suggestions.json
```

但它不是正文事实源。

### 6.6 ReferenceServiceLite

1.0 只实现最小引用能力：

```text
解析 [[Wiki-Link]]
解析 [文字](相对路径.md)
显示当前文件 outgoing links
显示当前文件 incoming backlinks
```

暂不做完整图谱。

### 6.7 WatcherServiceLite

负责：

```text
监听外部文件变化
刷新当前文件
刷新文件树
提示 revision 冲突
```

---

## 7. 1.0 界面组成

### 7.1 左侧：真实文件树

显示：

```text
真实文件夹
Markdown 文件
快捷便签目录
当前选中文件
```

支持：

```text
新建文件
新建文件夹
重命名
移动
删除到回收站
```

暂不显示：

```text
图谱入口
Canvas 入口
仪表盘入口
复杂专题系统
同步协作状态
```

### 7.2 中间：当前 Markdown 编辑器

1.0 只允许一个当前文件。

支持：

```text
打开当前文件
编辑 Markdown
自动保存
手动保存
保存状态显示
revision 冲突提示
```

暂不做：

```text
多 Tab
复杂 WYSIWYG
高级排版工具栏
源码 / 预览双栏常驻
```

### 7.3 右侧：AI 整理建议与引用信息

包含：

```text
AI 整理按钮
整理建议结果
写入预览
确认应用
拒绝建议
当前文件引用
当前文件反链
```

### 7.4 快捷捕获入口

可以是：

```text
底部输入框
右下角浮窗
快捷键打开的小窗口
```

保存后生成真实 Markdown 文件。

---

## 8. 快捷捕获设计

### 8.1 输入字段

```text
标题：可选
正文：必填
来源：可选
标签：可选
```

### 8.2 默认保存位置

```text
快捷便签/
```

示例：

```text
快捷便签/2026-06-17-经验主义的一个问题.md
```

### 8.3 文件格式

```markdown
---
constellation_id: "uuid-v7"
created: "2026-06-17T00:00:00Z"
status: inbox
tags: []
source: ""
---

# 经验主义的一个问题

这里是原始碎片内容。
```

### 8.4 整理后的追踪

原始碎片不自动删除。AI 整理后只更新状态。

```yaml
status: organized
organized_to: "../01 研究/哲学/认识论/经验主义.md"
organized_at: "2026-06-17T00:00:00Z"
```

---

## 9. AI 整理建议流程

### 9.1 输入上下文

AiService 可以读取：

```text
当前碎片正文
当前文件路径
文件树摘要
SearchService 找到的候选相关笔记
可选 .mindmap.md 框架文本
```

1.0 必须限制上下文数量：

```text
候选笔记最多 20 条
每条候选只给标题、路径、摘要或片段
AI 输入总 token 设置上限
```

### 9.2 输出格式

AI 必须输出结构化建议：

```json
{
  "title": "经验主义中的观察与归纳问题",
  "summary": "这条碎片讨论了观察经验如何支持知识判断，以及归纳推理的局限。",
  "target_path": "01 研究/哲学/认识论/经验主义.md",
  "action": "create_or_append",
  "tags": ["哲学", "认识论", "经验主义"],
  "links": ["休谟问题", "科学方法"],
  "proposed_markdown": "## 2026-06-17 想法\n\n整理后的内容……"
}
```

### 9.3 确认写入

```text
AI 输出 OrganizeSuggestion
  ↓
前端展示预览 / diff
  ↓
用户确认
  ↓
DocumentService 执行写入
  ↓
SuggestionService 更新状态
```

未经用户确认，不得写入目标文件。

---

## 10. 必须处理的失败情况

```text
路径穿越
目标文件 revision 冲突
原碎片已被外部修改
AI 输出 JSON 非法
用户取消 AI 请求
写入失败
目标路径重名
保存中应用退出
```

失败时不得半写入。

---

## 11. 功能开关

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

这些开关表示功能成熟度，不是付费墙。

---

## 12. 1.0 实施顺序

### 阶段 0：冻结范围

确认：

```text
1.0 做什么
1.0 不做什么
核心 IPC 契约
数据格式
验收标准
```

### 阶段 1：硬切 DocumentService

将以下能力统一接入 WorkspaceService / DocumentService：

```text
文件树
当前编辑器
快捷便签
保存逻辑
```

目标：不再依赖旧 `notes_* / categories_*` 运行模型。

### 阶段 2：快捷捕获

```text
createCaptureNote
QuickCapturePanel
快捷便签/ 真实落盘
```

### 阶段 3：当前文件编辑器

```text
readDocument
saveDocument
revision
保存状态
dirty state
冲突提示
```

### 阶段 4：搜索和候选笔记

```text
searchDocuments
findCandidateNotes
```

### 阶段 5：AI 整理建议

```text
requestOrganizeSuggestion
SuggestionPanel
SuggestionPreview
AI 输出结构化校验
```

### 阶段 6：确认写入

```text
applySuggestion
rejectSuggestion
原碎片 organized 标记
目标文件 create / append
```

### 阶段 7：最小引用与反链

```text
parseDocumentLinks
getBacklinks
```

---

## 13. 1.0 验收标准

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

---

## 14. 与 2.0、3.0 的关系

```text
1.0 负责让产品活起来。
2.0 负责让知识结构化和可视化。
3.0 负责让系统生态化和自动化。
```

2.0 和 3.0 都必须建立在 1.0 的真实文件事实源和服务边界之上。

---

## 15. 版权与许可提醒

本项目基于 floral-notepaper 二次开发。floral-notepaper 原始代码采用 MIT 许可证，原始版权归 Achilng 所有；Constellation 修改部分版权归 Maplar 所有。开发和发布时必须保留 LICENSE 及源码中的版权声明。
