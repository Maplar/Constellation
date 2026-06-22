# Constellation 3.0：生态与自动化版

> 版本定位：插件生态、AI Agent 与自动化工作流版  
> 核心扩展：Stable API → Permission Model → Plugin System → AI Agent → Automation  
> 前置条件：Constellation 1.0 的核心文件事实源稳定，Constellation 2.0 的图谱、知识树、Canvas、仪表盘和 AI 建议流程稳定。

---

## 1. 版本结论

Constellation 3.0 的目标不是继续堆功能，而是在 1.0 和 2.0 已经稳定的基础上，把 Constellation 扩展为可生态化、可自动化、可组合的知识工作平台。

3.0 的核心升级是：

```text
稳定服务 API
  ↓
权限与审计模型
  ↓
插件系统
  ↓
AI Agent
  ↓
自动化工作流
  ↓
可扩展知识平台
```

3.0 不是 1.0 或 2.0 的提前实现项。插件系统和 AI Agent 都必须等核心模型稳定后再做，否则会把临时 API、临时权限和临时数据格式固化成长期技术债。

---

## 2. 产品定位

Constellation 3.0 是：

```text
生态与自动化版
= 插件系统
+ 插件市场 / 插件管理
+ AI Agent
+ 自动链接
+ 自动移动
+ 自动整理
+ 自动工作流
+ 高级权限与审计
+ 可选协作扩展
```

它解决的问题是：

```text
我能不能扩展 Constellation 的能力？
我能不能让 AI 按规则帮我整理一批内容？
我能不能把重复工作自动化？
我能不能安装社区插件？
我能不能安全地让第三方能力读写我的知识库？
```

3.0 的核心价值是：

> 从“知识结构化工具”，升级为“可扩展、可自动化的知识工作平台”。

---

## 3. 为什么插件系统和 AI Agent 必须放到 3.0

### 3.1 插件系统需要稳定 API

插件一旦开放，就意味着外部开发者会依赖你的接口。

如果 1.0、2.0 阶段服务边界还没稳定，就开放插件，会导致：

- 插件 API 频繁破坏。
- 第三方插件难以维护。
- 内部架构被旧 API 绑架。
- 临时数据模型变成长期兼容负担。

所以插件系统必须等以下能力稳定：

```text
DocumentService
ReferenceService
SearchService
GraphService
KnowledgeTreeService
CanvasService
DashboardService
SuggestionService
权限模型
错误模型
任务模型
```

### 3.2 AI Agent 需要权限、回滚和审计

AI Agent 和 1.0 的 AI Suggestion 不一样。

1.0 的 AI 是：

```text
AI 提建议 → 用户确认 → 系统写入
```

3.0 的 AI Agent 可能是：

```text
AI 规划任务 → AI 调用工具 → AI 修改多个文件 → AI 生成结果报告
```

这会带来更高风险：

- 自动移动文件。
- 自动改写正文。
- 自动添加链接。
- 自动修改知识树。
- 自动整理 Canvas。
- 自动批量处理建议。

因此必须有：

- 权限授权。
- 操作预览。
- 执行范围限制。
- 操作日志。
- 回滚机制。
- 审计记录。
- 用户中止。
- 失败恢复。

没有这些前置能力，AI Agent 不能进入正式版本。

---

## 4. 3.0 必须坚持的原则

### 4.1 默认仍然用户可控

即使进入 3.0，Constellation 也不能变成 AI 随意改库的软件。

默认规则：

```text
AI 可以规划
AI 可以建议
AI 可以生成 diff
AI 可以申请执行
用户授权后才可执行高风险写入
```

可以提供自动化，但必须可配置、可撤销、可审计。

### 4.2 插件不得绕过 Core Engine

插件不能直接读写工作区文件系统。

正确结构：

```text
Plugin
  ↓
Plugin API
  ↓
Permission Layer
  ↓
Core Service
  ↓
DocumentService / SearchService / GraphService / CanvasService ...
  ↓
真实文件系统
```

禁止：

- 插件直接 fs.readFile / fs.writeFile。
- 插件绕过权限修改 Markdown。
- 插件读取 API Key。
- 插件扫描全库正文但不走 SearchService。
- 插件在后台静默上传用户知识库。

### 4.3 自动化必须有范围边界

自动化任务必须明确：

- 操作对象。
- 可读范围。
- 可写范围。
- 是否允许移动文件。
- 是否允许改正文。
- 是否允许改 frontmatter。
- 是否允许改知识树。
- 是否允许创建 Canvas。
- 是否允许调用外部网络。
- 是否需要用户二次确认。

### 4.4 所有高风险操作必须可追溯

高风险操作包括：

- 批量改写 Markdown。
- 批量移动文件。
- 批量删除文件。
- 修改知识树结构。
- 修改 Canvas。
- 自动添加大量链接。
- 外发正文到 AI 服务。
- 插件访问工作区敏感内容。

必须记录：

```text
谁发起
何时发起
操作范围
读取了什么
修改了什么
生成了什么 diff
是否由用户确认
是否成功
失败原因
能否回滚
```

---

## 5. 3.0 启用的核心服务

3.0 在 1.0、2.0 服务基础上新增：

```text
PluginService
PluginPermissionService
PluginRuntime
AutomationService
AgentService
AgentToolRegistry
AuditService
RollbackService
WorkflowService
MarketplaceService
```

### 5.1 PluginService

负责：

- 插件安装。
- 插件启用 / 禁用。
- 插件版本管理。
- 插件配置。
- 插件更新。
- 插件卸载。

### 5.2 PluginPermissionService

负责：

- 插件权限声明。
- 用户授权。
- 权限分级。
- 权限撤销。
- 权限审计。

权限示例：

```text
读取当前文件
读取当前文件夹
读取全库文件名
读取全库正文
写入当前文件
创建新文件
移动文件
删除到回收站
访问网络
调用 AI
读取图谱
修改知识树
修改 Canvas
读取仪表盘数据
```

### 5.3 PluginRuntime

负责：

- 插件沙箱。
- 生命周期。
- API 注入。
- 错误隔离。
- 资源限制。
- UI 扩展点。

插件失败不能导致主应用崩溃。

### 5.4 AutomationService

负责：

- 自动化规则。
- 条件触发。
- 执行动作。
- 执行记录。
- 错误恢复。

自动化示例：

```text
当快捷便签超过 20 条时，提醒整理
当文件出现失效引用时，加入仪表盘警告
当某个文件夹新增笔记时，自动生成摘要建议
当一批 AI 建议生成后，等待用户批量确认
```

### 5.5 AgentService

负责：

- AI Agent 会话。
- 任务规划。
- 工具调用。
- 中途确认。
- 执行报告。
- 中止和恢复。

AgentService 必须接入权限、审计和回滚系统。

### 5.6 AgentToolRegistry

负责定义 AI Agent 可调用工具。

工具示例：

```text
searchDocuments
readDocument
createSuggestion
previewWrite
applySuggestionWithConfirmation
queryGraph
queryKnowledgeTree
createCanvasDraft
inspectBrokenLinks
```

高风险工具默认不可直接执行，必须经过用户授权或确认。

### 5.7 AuditService

负责：

- 插件操作日志。
- Agent 操作日志。
- 自动化操作日志。
- 外发数据记录。
- 写入 diff 记录。

### 5.8 RollbackService

负责：

- 根据操作记录回滚。
- 恢复被移动文件。
- 恢复被改写内容。
- 恢复知识树结构。
- 恢复 Canvas 文件。

RollbackService 不能替代备份，但必须为高风险自动化提供局部撤销能力。

### 5.9 WorkflowService

负责：

- 用户自定义工作流。
- 插件提供工作流。
- AI 参与的半自动工作流。
- 工作流模板。

---

## 6. 插件系统设计

### 6.1 插件类型

3.0 可以支持以下插件类型：

```text
编辑器插件
搜索插件
仪表盘卡片插件
导入导出插件
AI 提示词插件
知识树辅助插件
Canvas 辅助插件
图谱分析插件
自动化规则插件
主题插件
```

### 6.2 插件扩展点

可开放的扩展点：

```text
编辑器右键菜单
当前文件工具栏
命令面板
搜索结果处理
仪表盘卡片
AI 建议生成器
导出器
导入器
知识树节点操作
Canvas 节点操作
图谱筛选器
```

### 6.3 插件权限分级

建议权限分三层：

#### 低风险权限

```text
读取当前文件 metadata
读取当前文件路径
注册命令
注册 UI 菜单
注册仪表盘只读卡片
```

#### 中风险权限

```text
读取当前文件正文
读取当前文件夹
调用搜索接口
调用图谱查询
调用 AI 生成建议
创建新 Markdown 文件
```

#### 高风险权限

```text
读取全库正文
批量写入 Markdown
移动文件
删除文件
修改知识树
修改 Canvas
访问外部网络
外发正文到第三方服务
```

高风险权限必须显式授权，并在执行时提供审计记录。

### 6.4 插件市场

插件市场可以作为 3.0 后半段能力。

必须包含：

- 插件来源。
- 作者信息。
- 版本信息。
- 权限声明。
- 更新日志。
- 兼容版本。
- 安全提示。
- 禁用和卸载。

不建议 3.0 早期开放完全自由市场。可以先支持本地插件或官方插件目录。

---

## 7. AI Agent 设计

### 7.1 Agent 与 Suggestion 的区别

1.0 / 2.0 的 AI Suggestion：

```text
单次请求
返回建议
用户确认
系统写入
```

3.0 的 AI Agent：

```text
多步任务
读取上下文
调用工具
生成计划
展示计划
执行部分步骤
中途请求确认
生成最终报告
```

### 7.2 Agent 可做的事

允许的 Agent 任务：

```text
整理一批快捷便签并生成建议
检查某个主题下的失效引用
为某个知识树提出补充分支
为某篇研究文档收集相关内部笔记
把一批笔记生成 Canvas 草图
为仪表盘生成维护报告
诊断知识库孤岛和重复内容
```

### 7.3 Agent 默认不能做的事

默认禁止：

```text
未经确认直接批量改写正文
未经确认直接移动文件
未经确认直接删除文件
未经确认直接改知识树
未经确认直接保存 Canvas
未经确认外发全库正文
绕过 SuggestionService 直接 apply
```

### 7.4 Agent 执行模式

建议提供三种模式：

#### 只读分析模式

```text
Agent 只能读取和分析，不能写入。
```

适合：

- 知识库诊断。
- 图谱分析。
- 结构建议。

#### 建议生成模式

```text
Agent 可以生成一批 Suggestion，但不能应用。
```

适合：

- 批量整理。
- 标签建议。
- 链接建议。

#### 授权执行模式

```text
Agent 可以执行用户明确授权范围内的写入动作。
```

适合：

- 已审阅建议的批量应用。
- 用户指定文件夹内的规则整理。
- 明确有回滚记录的批量操作。

---

## 8. 自动化工作流设计

### 8.1 工作流组成

一个工作流由以下部分组成：

```text
触发器 Trigger
条件 Condition
动作 Action
权限 Permission
确认策略 Confirmation
失败策略 FailurePolicy
审计记录 AuditLog
```

### 8.2 触发器示例

```text
手动触发
应用启动时
工作区打开时
文件保存后
快捷便签新增后
失效引用出现后
AI 建议生成后
定期检查
```

### 8.3 动作示例

```text
搜索相关笔记
创建 AI 整理建议
加入仪表盘提醒
生成诊断报告
创建 Canvas 草稿
更新标签建议
发送本地通知
```

### 8.4 确认策略

```text
无需确认：只读或低风险提醒
执行前确认：中风险写入
逐项确认：批量写入
执行后可撤销：低风险自动整理
必须手动确认：高风险改写、移动、删除
```

---

## 9. 安全与隐私边界

### 9.1 API Key

禁止：

- 插件读取 API Key。
- 插件把 API Key 写入工作区。
- 插件把 API Key 写入日志。

API Key 必须由系统安全凭据存储管理。

### 9.2 外发数据

任何插件或 Agent 外发正文前必须展示：

```text
服务商
外发范围
文件数量
是否包含正文
是否包含附件
是否包含来源证据
是否会保存到第三方
```

### 9.3 网络权限

插件访问网络必须单独授权。

建议支持：

```text
禁止网络
允许访问指定域名
允许访问插件声明域名
允许任意网络访问
```

默认应禁止任意网络访问。

---

## 10. 3.0 功能开关

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

注意：

- `autoRewrite`、`autoMove`、`autoDelete` 不建议 3.0 初期默认启用。
- 自动化应该先从只读分析和建议生成开始。
- 插件市场可以晚于本地插件系统。

---

## 11. 3.0 禁止事项

```text
插件直接读写文件系统
插件绕过 core-client 调用内部命令
插件读取或导出 API Key
插件未经授权读取全库正文
插件未经授权访问网络
AI Agent 未经确认批量改写正文
AI Agent 未经确认移动或删除文件
AI Agent 绕过 SuggestionService 写入
自动化工作流没有审计记录
高风险操作没有回滚或失败恢复方案
插件失败导致主应用崩溃
为了兼容插件冻结临时 API
```

---

## 12. 实施顺序

### 阶段 1：稳定公共 API

在开放插件前，必须先稳定：

```text
Document API
Search API
Reference API
Graph API
KnowledgeTree API
Canvas API
Dashboard API
Suggestion API
Settings API
Job API
```

### 阶段 2：权限模型

实现：

- 权限声明。
- 授权界面。
- 权限撤销。
- 权限审计。
- 高风险权限二次确认。

### 阶段 3：审计与回滚

实现：

- 操作日志。
- diff 记录。
- 执行报告。
- 局部回滚。
- 失败恢复。

### 阶段 4：本地插件系统

先实现本地插件，不急于开放插件市场。

支持：

- 安装本地插件。
- 启用 / 禁用。
- 权限请求。
- 命令注册。
- 只读仪表盘卡片。
- 简单菜单扩展。

### 阶段 5：自动化工作流

先实现低风险自动化：

- 提醒。
- 诊断。
- 生成建议。
- 加入仪表盘。

暂不默认启用自动改写、自动移动、自动删除。

### 阶段 6：AI Agent 只读模式

先实现：

- 只读分析。
- 任务计划。
- 工具调用预览。
- 报告生成。

### 阶段 7：AI Agent 建议模式

实现：

- 批量 Suggestion 生成。
- 建议分组。
- 用户确认。
- 批量应用入口。

### 阶段 8：授权执行模式

在审计、回滚、权限稳定后，允许 Agent 执行用户授权范围内的写入任务。

### 阶段 9：插件市场

最后再考虑：

- 插件发布。
- 插件审核。
- 插件签名。
- 插件更新。
- 插件兼容性提示。

---

## 13. 3.0 验收标准

3.0 验收以下能力：

```text
1. 插件只能通过公开 Plugin API 访问能力。
2. 插件权限声明清晰可见。
3. 用户可以启用、禁用和卸载插件。
4. 插件失败不会导致主应用崩溃。
5. 插件不能绕过 Core Engine 直接读写文件。
6. 高风险权限必须显式授权。
7. AI Agent 可以在只读模式下分析知识库并生成报告。
8. AI Agent 可以生成批量整理建议，但默认不能自动应用。
9. Agent 写入前必须展示计划、范围和风险。
10. 高风险 Agent 操作必须有审计记录。
11. 自动化工作流必须有触发器、条件、动作和失败策略。
12. 自动化写入必须遵守用户确认和权限限制。
13. 外发正文前必须展示服务商和数据范围。
14. API Key 不得进入工作区、日志或插件可读范围。
15. 插件系统和 Agent 系统关闭后，1.0 与 2.0 核心功能仍可完整使用。
```

---

## 14. 与 1.0、2.0 的关系

3.0 不能替代 1.0 和 2.0，而是建立在它们之上。

1.0 提供：

```text
真实 Markdown 文件
DocumentService
SearchService
SuggestionService
用户确认写入
```

2.0 提供：

```text
GraphService
KnowledgeTreeService
CanvasService
DashboardService
VectorService
SourceService
```

3.0 提供：

```text
PluginService
AutomationService
AgentService
AuditService
RollbackService
WorkflowService
```

一句话：

> 3.0 负责让系统生态化和自动化，但不能破坏 1.0 的文件事实源、2.0 的模块边界和用户确认原则。

---

## 15. 最终边界

3.0 可以让 Constellation 变得强大，但不能让它变得不可控。

应该追求：

```text
可扩展
可授权
可审计
可回滚
可关闭
```

不应该追求：

```text
AI 默默替用户整理一切
插件随意访问知识库
自动化绕过用户确认
为了生态牺牲数据安全
```

最终定位：

> Constellation 3.0 是生态与自动化阶段，但它的自动化必须建立在用户控制、权限边界、审计记录和可恢复写入之上。

---

## 16. 版权与许可提醒

本项目基于 floral-notepaper 二次开发。floral-notepaper 原始代码采用 MIT 许可证，原始版权归 Achilng 所有；Constellation 修改部分版权归 Maplar 所有。开发和发布时必须保留 LICENSE 及源码中的版权声明。
