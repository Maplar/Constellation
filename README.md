> **本项目基于 [floral-notepaper](https://github.com/Achilng/floral-notepaper) 二次开发，原始代码采用 MIT 许可证，原始版权归 Achilng 所有。Constellation 的修改部分版权归 Maplar 所有。请始终保留根目录 `LICENSE` 与源码版权声明。**

# Constellation 1.0

Constellation 是面向个人知识工作者的本地优先 Markdown 工作区。当前正式交付目标是一个可靠、可离线使用的碎片整理闭环：

```text
快捷捕获 -> 真实 Markdown 文件 -> 搜索与本地引用
-> AI 整理建议 -> 用户审阅/确认 -> 受控写入知识库
```

它不是临时 Demo，也不把笔记正文存进数据库、`localStorage` 或私有 JSON。工作区中的 Markdown、真实目录和附件是事实源；`.constellation/` 只保存配置、建议状态与可重建派生数据。

## 当前 1.0 范围

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 工作区 | 实施中 | 应用内路径连接、最近工作区、根目录约束与初始化。 |
| 文档 | 实施中 | Markdown CRUD、UUID v7、revision、原子写入、回收站。 |
| 快捷捕获 | 实施中 | 独立便签窗将活动草稿保存到可见的 `快捷便签/`。 |
| 当前文件编辑 | 实施中 | 单一当前文件、最小可视化 Markdown 编辑、自动保存与冲突恢复。 |
| 搜索 | 实施中 | Rust 全文检索与候选笔记查询；前端不扫描全库正文。 |
| 本地引用 | 实施中 | `[[Wiki-Link]]`、相对 Markdown 链接和当前文件反向链接。 |
| AI 整理建议 | 实施中 | OpenAI-compatible、可取消、结构化建议、预览后确认写入。 |
| 知识树 / Canvas / 图谱 / 仪表盘 | 2.0 | 不在 1.0 运行时显示入口。 |
| 语义检索、同步、备份、迁移、Git | 2.0+ | 仅保留路线图，不作为 1.0 依赖。 |
| 插件、AI Agent、自动化 | 3.0 / Lab | 必须等待稳定 API、权限、审计与回滚。 |

## 使用方式

1. 在欢迎页通过应用内路径输入连接或创建工作区；不调用系统原生文件选择器。
2. 通过快捷键、托盘或独立便签窗记录碎片。内容立即保存为 `快捷便签/` 下的真实 Markdown。
3. 在主窗口编辑唯一当前文件，搜索相关笔记并查看当前文件的引用与反向链接。
4. 配置 OpenAI-compatible 服务后，对一条碎片请求整理建议。
5. 审阅建议内容与写入差异。只有点击确认后，应用才创建或追加目标 Markdown；原始碎片保留并记录整理结果。

## 架构边界

```text
React App Shell
  -> feature UI
  -> src/core-client (Typed Tauri API)
  -> Rust Core services
  -> workspace filesystem
```

- `workspace` 管理工作区连接和路径安全。
- `documents` 管理 Markdown 读写、身份、revision、回收站与恢复。
- `capture`、`editor` 只共享文档身份与 revision，绝不复制正文状态。
- `search`、`references` 与 `suggestions` 通过 Rust 服务提供查询和受控写入。
- 所有 IPC 失败使用 `{ code, message, details, retryable }`；UI 不直接调用 Tauri `invoke` 或文件系统。
- AI 只生成建议，不直接改写正文、frontmatter、路径或引用；API Key 只存系统安全凭据。

## UI 校准与路线图

- [1.0 UI 校准台](Docs/ui-calibration/constellation-v4-ui-calibration.html)：保留完整、高密度的工作台视觉语言与编辑体验；仅隐藏知识树、Canvas、图谱、仪表盘等 2.0+ 入口，不以功能收敛换取视觉降级。
- [2.0+ UI 概念归档](Docs/ui-calibration/constellation-v4-ui-calibration-2.0-plus.html)：知识树、Canvas、图谱和仪表盘的后续视觉规划，不代表可用功能。
- [版本规划](Plan/)：1.0、2.0、3.0 的已确认范围与跨版本校验依据。

## 开发

```powershell
npm.cmd run test
npm.cmd run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Windows PowerShell 请使用 `npm.cmd`。涉及前端行为时运行测试与生产构建；涉及 Rust Core、文件写入、搜索、引用或建议流程时运行针对性的 Rust 测试。发布前必须确认根 `LICENSE` 未被改写，并生成第三方依赖许可证清单。

## 版权与许可

Constellation 基于 floral-notepaper 的 MIT 许可代码二次开发。floral-notepaper 原始版权归 Achilng 所有，Constellation 新增与修改部分版权归 Maplar 所有。MIT 许可证、原始版权声明和本项目源码中的版权头必须保留；不得复制或暗示使用 Obsidian、FlClash、OpenAI、Anthropic 等第三方的专有代码、资产或官方授权。
