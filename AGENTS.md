# AGENTS.md – 开发指令、架构约束与版权规范

本文件用于指导 AI 编程助手（OpenCode、Copilot 等）在本项目中的行为。每次对话、代码生成或架构设计前，Agent 必须重新阅读本文件并严格遵守。

## 1. 项目基本信息
- **原始项目**：floral-notepaper（MIT 许可证），版权归 Achilng 所有。
- **二次开发项目**：Constellation（Maplar 修改版），修改部分版权归 Maplar 所有。
- **整体许可证**：MIT（保留原始版权声明，不得删除或修改 LICENSE 文件）。
- **产品哲学**："花笺的优雅 × FlClash的秩序 × Obsidian的智慧"。

---

## 2. 版权合规强制性规则 (最高优先级)
Agent 在代码生成、文件修改、构建打包时必须遵守：
1. 不得删除、修改或重命名 `LICENSE` 文件。
2. 生成任何**新代码文件**（.ts, .tsx, .rs, .js, .css, .html 等）时，必须在文件头部添加以下版权声明：
   ```typescript
   /**
    * @copyright Copyright (c) 2026 Maplar
    * 基于 floral-notepaper 二次开发新增
    */
   ```
3. 修改现有文件时，不得移除或覆盖已有版权声明；若无声明则补充如下内容：
   ```typescript
   /**
    * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
    * 基于 MIT 许可证授权
    *
    * 修改部分版权：Copyright (c) 2026 Maplar
    * 修改说明：[简述修改内容]
    */
   ```
4. 在 README.md 等文档中保留致谢/版权章节。构建产物必须包含 LICENSE 文件。
5. 禁止建议用户移除版权或转为闭源不保留声明。
6. 每次对话开始时，第一条回复必须输出：
   `[版权提醒] 本项目中 floral-notepaper（MIT）版权归 Achilng 所有，二次修改部分版权归 Maplar 所有。请始终保留 LICENSE 及源码中的版权声明。`

## 3. 全局架构约束 (System Context)
Agent 在进行架构设计、技术选型和代码实现时，绝对不可违背以下 6 大决策：
1. **窗口形态 (1C 缝合态)**：默认单主窗口工作区（左侧文件树+右侧多Tab编辑/图谱/仪表盘）。支持将任意 Tab "Detach" 分离为 floral 风格的独立磁贴小窗口（置顶/穿透）。
2. **底层存储 (2A 纯文件系统)**：底层是真实的本地文件夹和 .md / .canvas 文件。Rust 后端通过 notify crate 监听文件变更，Tantivy/LanceDB 仅作为索引层。绝对不依赖数据库存储笔记正文。
3. **AI 边界 (3A UI傻瓜/配置极客)**：AI 交互（对话、自动标签、语义搜索）在前端必须是一键式、无感知的傻瓜体验。底层环境允许用户通过设置面板配置 Ollama 地址或第三方 API Key。
4. **Canvas 归属 (4A 独立文件)**：思维导图/Canvas 画布保存为独立的 .canvas (JSON格式) 文件，与 .md 文件在文件树中混排显示。
5. **渲染引擎 (5B 混合渲染)**：
   - DOM 层 (React 19 + Tailwind)：仪表盘卡片、文件树、编辑器、设置面板。
   - Canvas/WebGL 层 (Pixi.js 或原生 Canvas 2D/WebGPU)：力导向图谱 (Graph)、无限画布 (Canvas)。上面覆盖 React DOM 作为 UI 控件（Tooltip、工具栏）。
6. **主题系统 (6B CSS变量级魔改)**：全量使用 CSS Variables + Design Tokens。底层支持第三方开发者编写 CSS 主题包，第一阶段官方提供 Light/Dark/Warm 三套高质量 floral 预设。

## 4. 核心体验红线（关于"傻瓜式"现代化交互）
- **绝对禁止**在核心交互中调用系统原生文件管理器（如系统的打开/保存弹窗、系统资源管理器）！
- 所有的文件/文件夹创建、重命名、移动、删除、搜索，必须在应用内通过现代化的前端 UI 完成。
- 必须提供丝滑的拖拽反馈（Drag & Drop）。
- 必须支持行内重命名（Inline Rename）。
- 必须实现幽灵态与乐观更新（Optimistic UI），绝不让用户等待后端 Loading 阻塞 UI。

## 5. 开发命令
| 命令 | 说明 |
|------|------|
| `npm run tauri dev` | 启动桌面端开发（Tauri + Vite） |
| `npm run tauri build` | 构建发布版本 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run dev` | 仅启动 Vite 前端 |

## 6. README 同步更新规则
每次完成一个功能模块的开发（包括新增、修改、删除功能），Agent **必须**在提交代码前更新 `README.md` 中的以下章节：
1. **功能特性**：如果是新功能，在列表中添加一项；如果是改进，修改对应的描述。
2. **模块完成度**：更新表格中对应模块的"完成度"百分比和"说明"列。
3. **技术架构**：如果引入新的技术栈（如 Pixi.js, Tantivy），更新技术栈表格。
4. **项目结构**：如果新增了重要的目录或文件，在架构概览中补充。

**更新格式要求**：
- 保持原有 Markdown 格式。
- 功能特性列表使用 `- **功能名** — 描述`。
- 模块完成度表格使用 `| 模块 | 完成度 | 说明 |`。

**操作流程**：
1. 修改代码实现功能。
2. 运行 `npm run test`（如果有）确保测试通过。
3. 手动或自动更新 `README.md`（Agent 应生成更新后的片段或直接修改文件）。
4. 生成 commit message，格式：`feat(模块名): 功能描述`（例如 `feat(filesystem): add modern inline file tree`）。
5. 提示用户确认后执行 `git add . && git commit -m "..." && git push`。

## 7. 违规处理
如果 Agent 可能违反上述版权规则或架构红线，必须立即停止并输出：
`⚠️ 警告：当前操作可能侵犯原始版权（MIT 协议要求保留声明）或违背 Constellation 核心架构约束。操作已中止。`