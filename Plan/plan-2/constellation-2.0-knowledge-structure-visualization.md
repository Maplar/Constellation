# Constellation 2.0：知识结构与可视化版

> 版本定位：知识结构化、关系可视化与长期维护版  
> 核心扩展：Graph → Knowledge Tree → JSON Canvas → Dashboard → Semantic Retrieval  
> 前置条件：Constellation 1.0 的真实文件、当前编辑、搜索、AI 建议、确认写入、最小引用反链已经稳定。

---

## 1. 版本结论

Constellation 2.0 的目标是把 1.0 中已经能记录和整理的碎片知识，进一步组织成可导航、可观察、可回顾的知识系统。

2.0 的核心升级是：

```text
显式引用关系
  ↓
局部 / 全局图谱
  ↓
严格知识树
  ↓
自由 JSON Canvas
  ↓
仪表盘回顾与维护
  ↓
语义搜索与知识库问答
```

2.0 不应该推翻 1.0，而应该接在 1.0 的事实源和服务边界上。

---

## 2. 产品定位

Constellation 2.0 是：

```text
知识结构与可视化版
= 局部图谱
+ 全局图谱
+ 知识树
+ JSON Canvas
+ 自由卡片仪表盘
+ 来源引用
+ 语义搜索
+ 知识库问答
+ 批量 AI 整理建议
```

它解决的问题是：

```text
我记录了很多碎片之后，它们之间到底有什么关系？
我的某个主题有没有形成结构？
数学、哲学、计算机这类学科如何分层整理？
哪些笔记是孤岛？
哪些来源失效了？
哪些内容需要继续整理？
```

2.0 的核心价值是：

> 从“能记录和整理碎片”，升级为“能构建知识体系”。

---

## 3. 2.0 必须坚持的边界

### 3.1 不新增正文事实源

2.0 不能因为引入图谱、知识树、Canvas、仪表盘，就新增隐藏正文存储。

正文事实源仍然是：

```text
Markdown 文件
.mindmap.md 知识树 Markdown 文件
标准 .canvas JSON Canvas 文件
附件
真实文件夹
```

`.constellation/` 仍然只保存配置、布局、建议状态和可重建索引。

### 3.2 图谱、知识树、Canvas 职责必须分离

三者不能互相抢职责：

```text
知识图谱：浏览自动派生的显式关系和知识簇
知识树：表达严格父子层级
JSON Canvas：表达自由摆放、任意标准边和资料拼贴
```

禁止：

- 把图谱做成编辑器。
- 把知识树做成自由画布。
- 把 Canvas 变成图谱或脑图专用格式。
- 自动把知识树转换成 Canvas。
- 自动把 Canvas 转换成知识树。

### 3.3 AI 仍然先建议后写入

2.0 可以增强 AI 能力，但不能突破用户确认原则。

AI 可以：

- 推荐相关笔记。
- 生成知识树分支建议。
- 诊断图谱孤岛。
- 建议 Canvas 资料分组。
- 批量生成整理建议。
- 回答知识库问题。

AI 不可以：

- 未经确认改写 Markdown。
- 未经确认修改 `.mindmap.md`。
- 未经确认移动 Canvas 节点并保存。
- 未经确认批量添加链接。
- 未经确认移动文件。

---

## 4. 2.0 启用的核心服务

2.0 在 1.0 服务基础上新增或增强：

```text
GraphService
KnowledgeTreeService
CanvasService
DashboardService
VectorService
ReferenceService
SourceService
JobManager
BackupService
DiagnosticsService
```

### 4.1 GraphService

负责：

- 局部图谱查询。
- 全局图谱查询。
- 图谱筛选。
- 显式引用关系可视化。
- AI 相似关系可选展示。

图谱数据来源：

- `[[Wiki-Link]]`
- Markdown 相对链接
- 内容嵌入
- 来源记录链接
- 可选 AI 相似关系

图谱只负责浏览和跳转，不负责编辑正文。

### 4.2 KnowledgeTreeService

负责：

- 解析 `.mindmap.md`。
- 校验严格树结构。
- 读写 H1 根节点和嵌套列表。
- 节点提升、降级、移动、排序。
- 查询分支子树。
- 维护知识树结构关系索引。

知识树是严格层级，不是自由脑图。

### 4.3 CanvasService

负责：

- 读取标准 JSON Canvas 1.0 文件。
- 校验 `text`、`file`、`link`、`group` 节点。
- 校验标准 edges。
- 校验工作区相对路径。
- 保留未知字段。
- revision 冲突和原子保存。

Canvas 是独立 `.canvas` 文件，不与图谱或知识树共用业务模型。

### 4.4 DashboardService

负责：

- 保存 `.constellation/dashboard.json`。
- 提供卡片查询接口。
- 维护布局持久化。
- 隔离单卡错误。

仪表盘只通过公开查询接口获取数据，不直接扫描或修改文件。

### 4.5 VectorService

负责：

- 段落切块。
- 嵌入生成。
- HNSW 或后续向量索引。
- 语义检索。
- 混合检索。

VectorService 是 SearchService 的增强，不替代 Markdown 事实源。

### 4.6 SourceService

负责：

- URL 来源集合。
- AI 来源集合。
- `.source.md` 证据记录。
- 最小证据包。
- 来源可访问性和定位校验。
- 来源失效保全。

来源证据属于知识资产，不进入可删除重建的 cache。

---

## 5. 2.0 功能范围

### 5.1 局部图谱

定位：

> 以当前文件为中心，展示当前笔记的一到二跳关系。

必须支持：

- 当前文件中心节点。
- 出链。
- 反链。
- 一跳 / 二跳切换。
- 点击跳转。
- 文件夹颜色。
- 来源节点颜色。
- 显式关系和 AI 相似关系分离。

不做：

- 图谱里直接改正文。
- 图谱变成知识树编辑器。
- 图谱变成 Canvas。

### 5.2 全局图谱

定位：

> 观察整个知识库的显式引用网络、知识簇、孤岛和高连接节点。

必须支持：

- 全库显式引用关系。
- 文件夹颜色。
- 关系类型筛选。
- 孤岛节点提示。
- 高连接节点提示。
- AI 相似关系默认关闭。

性能要求：

- 使用后端查询接口。
- 使用 Worker / Canvas / Pixi.js 等高密度渲染方案。
- 前端不得全库扫描 Markdown 正文。

### 5.3 知识树

定位：

> 用 `.mindmap.md` 严格树结构梳理数学、哲学等复杂学科。

文件格式：

```yaml
---
constellation_id: "uuid-v7"
constellation_type: mindmap
learning_overlay: false
created: "2026-06-16T00:00:00Z"
---

# 哲学

- 形而上学
  - [[存在论]]
  - [[因果性]]
- 认识论
  - [[经验主义]]
  - [[理性主义]]
- 伦理学
```

必须支持：

- 横向树编辑。
- 放射概览。
- 面包屑。
- 聚焦分支。
- 搜索节点。
- 拖拽改变父级。
- 会话内撤销 / 重做。
- 结构节点提升为 Markdown 笔记。
- 子树入口链接 `.mindmap.md`。
- 可选学习覆盖层。

禁止：

- 自由坐标。
- 任意跨节点连线。
- 装饰节点。
- 网页卡片。
- 私有脑图 JSON。
- `.xmind` / `.mm` 兼容层。

### 5.4 JSON Canvas

定位：

> 用标准 `.canvas` 文件组织自由卡片、资料拼贴、论证草图和研究桌面。

必须支持 JSON Canvas 1.0：

```text
text node
file node
link node
group node
standard edge
```

必须支持：

- 创建 `.canvas` 文件。
- 打开 `.canvas` 文件。
- 添加标准节点。
- 移动节点。
- 调整节点大小。
- 创建标准边。
- 原子保存。
- revision 冲突处理。
- 尽量保留未知字段。

禁止：

- 私有 Canvas 节点格式替代标准格式。
- 自动抓取整页网页正文。
- 把 Canvas 当作图谱缓存。
- 把知识树改写成 Canvas。

### 5.5 自由卡片仪表盘

定位：

> 用于回顾、维护和发现知识库状态，而不是装饰首页。

必须支持：

- 最近编辑。
- 未整理快捷便签。
- 失效引用。
- 冲突文件。
- 搜索入口。
- AI 建议收件箱。
- 活动日历摘要。
- 卡片添加、删除、拖拽、缩放。
- 布局保存到 `.constellation/dashboard.json`。

卡片规则：

- 卡片只能调用公开查询接口。
- 卡片不得直接扫描文件系统。
- 单卡失败不得导致仪表盘白屏。

### 5.6 语义搜索与知识库问答

定位：

> 在全文搜索基础上增加语义召回和有来源的知识库问答。

必须支持：

- 段落切块。
- 标题权重。
- 链接权重。
- 关键词 + 语义混合检索。
- 回答来源文件。
- 引用段落。
- 可跳转位置。
- 依据不足提示。
- 取消请求。

AI 回答不能把知识树层级本身当作事实来源，回答证据必须落到真实 Markdown 段落。

### 5.7 批量 AI 整理建议

定位：

> 在 1.0 单条碎片整理基础上，扩展为批量建议，但仍然用户确认后写入。

可以支持：

- 批量摘要建议。
- 批量标签建议。
- 批量归类建议。
- 批量链接建议。
- 知识树补分支建议。

必须支持：

- 建议收件箱。
- 差异预览。
- 单条确认。
- 批量确认。
- 拒绝指纹。
- 回滚或撤销策略。

---

## 6. 2.0 界面入口

2.0 应在最左侧应用图标栏提供常驻入口：

```text
编辑器
图谱
知识树
JSON Canvas
仪表盘
AI / 搜索
设置
```

注意：

- 文件树仍然只显示真实文件和真实文件夹。
- 图谱不是文件，不能伪装成文件树节点。
- `.mindmap.md` 和 `.canvas` 是真实文件，按文件类型打开。
- 仪表盘是工作区视图，不是某个 Markdown 文件。

---

## 7. 功能开关

```ts
export const featureFlags = {
  capture: true,
  markdownEditor: true,
  aiOrganize: true,
  suggestions: true,
  search: true,
  backlinks: true,

  localGraph: true,
  globalGraph: true,
  knowledgeTree: true,
  canvas: true,
  dashboard: true,
  vectorSearch: true,
  sourceReferences: true,
  batchAiSuggestions: true,

  pluginSystem: false,
  aiAgent: false,
  autoRewrite: false,
  autoMove: false,
  realtimeCollaboration: false,
};
```

这些开关表示版本范围和功能成熟度，不是付费墙。

---

## 8. 2.0 禁止事项

```text
图谱里直接写 Markdown 正文
知识树保存自由坐标和任意连线
Canvas 使用私有格式替代 JSON Canvas 1.0
前端扫描全库 Markdown 正文生成图谱
AI 未经确认自动改写 .mindmap.md
AI 未经确认批量移动文件
仪表盘卡片直接读写文件系统
把来源证据包放入 .constellation/cache/
把 AI 相似关系伪装成真实引用关系
恢复旧 .mindmaps/、.xmind、.mm 或旧脑图 Store
```

---

## 9. 实施顺序

### 阶段 1：ReferenceService 正式化

从 1.0 的 ReferenceServiceLite 升级为完整 ReferenceService。

实现：

- Wiki-Link 解析。
- Markdown 相对链接解析。
- 内容嵌入解析。
- 来源记录链接解析。
- 反向链接索引。
- 失效引用检测。

### 阶段 2：GraphService 与局部图谱

先做局部图谱，因为它围绕当前文件，范围可控。

实现：

- 当前文件一跳关系。
- 当前文件二跳关系。
- 点击跳转。
- 关系筛选。

### 阶段 3：全局图谱

在局部图谱和引用索引稳定后实现。

实现：

- 全局关系查询。
- 大库性能优化。
- 图谱筛选和聚类。
- 孤岛和高连接节点。

### 阶段 4：KnowledgeTreeService

实现 `.mindmap.md` 的结构化解析和写入。

先做：

- H1 + 嵌套列表解析。
- 树结构渲染。
- 节点移动。
- 节点提升为笔记。

后做：

- 放射概览。
- 学习覆盖层。
- AI 建树建议。

### 阶段 5：CanvasService

实现标准 JSON Canvas 1.0。

先做：

- 打开。
- 保存。
- 标准节点。
- 标准边。

后做：

- 网页元数据缓存。
- 更高级的对齐和布局辅助。

### 阶段 6：DashboardService

实现仪表盘布局和核心卡片。

先做：

- 最近编辑。
- 未整理碎片。
- 失效引用。
- AI 建议。

后做：

- 活动日历。
- 拖拽缩放。
- 更多自定义卡片。

### 阶段 7：VectorService 与知识库问答

在搜索、引用和来源体系稳定后启用语义搜索与问答。

---

## 10. 2.0 验收标准

2.0 验收以下能力：

```text
1. 能基于真实引用显示当前文件局部图谱。
2. 能基于索引显示全局图谱。
3. AI 相似关系与真实引用关系分开显示。
4. 能创建和打开 .mindmap.md 知识树。
5. 知识树只保存严格父子层级，不保存自由坐标。
6. 能创建和打开标准 .canvas 文件。
7. Canvas 文件符合 JSON Canvas 1.0 基本结构。
8. 能使用仪表盘查看最近编辑、未整理碎片、失效引用和 AI 建议。
9. 仪表盘布局可保存和恢复。
10. 能进行语义搜索或混合检索。
11. 知识库问答必须返回来源段落和可跳转位置。
12. AI 批量整理建议必须进入建议收件箱，不得自动写入。
13. 单个可视化模块失败不会导致整个应用白屏。
14. 关闭 AI 后，图谱、知识树、Canvas、仪表盘仍可使用。
15. 删除缓存后，引用索引、搜索索引和图谱数据能从真实文件重建。
```

---

## 11. 与 1.0、3.0 的关系

2.0 必须依赖 1.0 的事实源：

```text
Markdown
DocumentService
SearchService
SuggestionService
ReferenceServiceLite
```

2.0 负责建立知识结构和可视化能力，但不进入插件生态和自动代理阶段。

3.0 的插件系统和 AI Agent 必须等 2.0 的服务 API、权限模型、建议流程和回滚机制稳定后再建设。

一句话：

> 2.0 负责让知识结构化和可视化，但仍然坚持文件事实源、用户确认和模块边界。

---

## 12. 版权与许可提醒

本项目基于 floral-notepaper 二次开发。floral-notepaper 原始代码采用 MIT 许可证，原始版权归 Achilng 所有；Constellation 修改部分版权归 Maplar 所有。开发和发布时必须保留 LICENSE 及源码中的版权声明。
