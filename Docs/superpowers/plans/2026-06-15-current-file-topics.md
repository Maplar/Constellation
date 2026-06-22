# Current File Topics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将静态 UI 校准台改成无 Tab、当前文件中心、自由命名专题和默认折叠关系栏的通用知识库界面。

**Architecture:** 保持单文件 HTML/CSS/JavaScript 原型。文件树选择维护唯一当前文件；专题只切换示例局部索引配置；左侧应用图标栏继续切换视图；右侧关系栏由一个边缘按钮控制。

**Tech Stack:** HTML5、CSS Variables、原生 JavaScript、Playwright + Microsoft Edge、PowerShell。

---

### Task 1: 删除研究空间和 Tab 表达

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] 删除顶部研究空间选择器和最近空间快捷入口。
- [ ] 删除编辑区 `.document-tabs` HTML、CSS 和动态 Tab JavaScript。
- [ ] 将文件栏固定标题改为“我的知识库”。

### Task 2: 添加自由命名专题

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] 在文件树下方添加可折叠专题列表。
- [ ] 在新建菜单中增加“专题”入口。
- [ ] 添加自由文本名称表单；空名称阻止创建，合法名称追加到专题列表并选中。
- [ ] 将原型示例命名改成用户式名称，不使用“学科空间”或“研究空间”。
- [ ] 专题面板默认折叠；摘要保留当前专题颜色、名称、数量和展开箭头。
- [ ] 切换或新建专题后同步折叠摘要。

### Task 3: 建立唯一当前文件上下文

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] Markdown 文件点击后更新编辑器标题和当前路径。
- [ ] 图谱、知识树和 Canvas 标题使用“当前文件名 + 视图名”。
- [ ] `.mindmap.md` 与 `.canvas` 继续作为真实文件显示，但不进入 Tab。
- [ ] 顶部文件标题作为唯一 H1；当前专题使用非标题眉题。
- [ ] 正文明确从 H2 开始，标题菜单把 H1 显示为顶部只读文档标题。
- [ ] 源码首个 H1 不在可视正文中重复渲染。

### Task 4: 默认折叠右侧关系栏

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] 删除右栏中的引用建立流程和局部图谱预览。
- [ ] 默认给编辑区添加折叠状态，使正文占满宽度。
- [ ] 添加边缘展开/折叠按钮，并同步 `aria-expanded`、标题和箭头方向。

### Task 5: 文档和验证

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Verify: `LICENSE`

- [ ] 更新通用知识库、专题、唯一当前文件和右栏折叠约束。
- [ ] 清除文件树原生按钮外观，并在 Dark 主题验证普通、悬停、选中和折叠状态。
- [ ] 运行 Node 内联脚本语法检查。
- [ ] 使用 Microsoft Edge 验证专题创建、当前文件视图和关系栏开合。
- [ ] 运行 `git diff --check` 并确认 `LICENSE` SHA256 未变化。

### Task 6: 收敛文件栏与状态区

- [ ] 删除“工作区共享”“全库入口”、收件箱和全局附件栏目。
- [ ] “同步与留痕”默认折叠，摘要表达按需启用，展开后再显示同步工具与 Git 详情。
- [ ] 未明确启用共享或多人协作时，不显示成员或协作已开启的暗示。
- [ ] 快捷便签在最后一个真实文件之后显示为独立折叠区，允许多个未整理草稿和一个活动草稿。
