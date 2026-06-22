# Quick Note Continuation And Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在静态 UI 校准台中表达全局快捷便签暂存区、多个未整理草稿的活动切换、用户确认整理，以及下划线和文字感悟悬浮卡片。

**Architecture:** 继续使用单文件 HTML/CSS/JavaScript 原型。快捷便签区位于最后一个真实文件之后，维护一组内存示例草稿和一个活动草稿；文件区与便签区只用标签和分隔线区分并共用主题色。便签窗口与侧栏共享活动草稿显示，编辑器的下划线和感悟只做可逆视觉交互，不写入真实文件。

**Tech Stack:** HTML5、CSS Variables、原生 JavaScript、Node.js 静态断言、Playwright + Microsoft Edge。

---

### Task 1: 建立失败断言

**Files:**
- Verify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] 运行 Node 断言，确认当前缺少 `#quick-note-panel`、`#quick-note-switcher`、`[data-editor-command="underline"]`、`#insight-popover`，并确认仍存在“全库入口”。
- [ ] 预期断言失败，失败原因必须是新组件尚未实现。

### Task 2: 全局快捷便签暂存区

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] 在 `#workspace-tree` 后添加默认展开的 `#quick-note-panel`，使其常态显示在最后一个真实文件之后。
- [ ] 删除快捷便签外层卡片框，使用“文件”“快捷便签”标签与分隔线区分区域，并复用文件栏主题色。
- [ ] 摘要显示“快捷便签”、活动草稿标题和未整理数量。
- [ ] 列表至少展示两个未整理 Markdown 草稿，活动草稿有明确选中态。
- [ ] 提供新便签和整理按钮；整理按钮只显示应用内移动确认提示。
- [ ] 删除 `.global-entry-heading` 及 `renderWorkspaceTree()` 中的“全库入口”“00 收件箱”“附件”节点。

### Task 3: 便签窗口续写状态

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] 标题栏显示 `未整理 2 ▾`、`+`、转磁贴和关闭。
- [ ] 点击草稿切换入口显示紧凑选择层，包含标题、最后编辑时间和首行预览。
- [ ] 切换草稿时同步标题、正文、活动状态和“正在续写”提示。
- [ ] 新建便签创建新的内存示例草稿，不自动整理旧草稿。
- [ ] “整理”显示选择目标真实文件夹的静态确认层，不调用系统文件管理器。

### Task 4: 下划线与文字感悟

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] 编辑器工具栏增加普通 `U` 下划线按钮。
- [ ] 增加“感”按钮；静态交互对示例文字生成 `感₁` 上标。
- [ ] 点击 `感₁` 显示宽 `360–480px` 的横向 `#insight-popover`，包含正文、编辑和删除。
- [ ] 感悟卡片使用中性色，不复用引用来源颜色，不嵌套在块引用中。

### Task 5: 文档同步

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] 删除全库收件箱和全局附件入口描述。
- [ ] 记录快捷便签使用可见 `快捷便签/` Markdown 暂存目录、用户确认后移动到真实文件夹。
- [ ] 记录多个未整理草稿、唯一活动草稿、弱预测和误写拆分原则。
- [ ] 记录普通下划线与 Markdown 脚注式文字感悟边界。

### Task 6: 验证

**Files:**
- Verify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
- Verify: `README.md`
- Verify: `AGENTS.md`
- Verify: `LICENSE`

- [ ] Node 静态断言确认新组件存在且旧入口不存在。
- [ ] Microsoft Edge 验证快捷便签折叠、草稿切换、新建、整理提示、下划线按钮和感悟长卡片。
- [ ] 验证 Light、Warm、Dark 三主题无白色原生按钮或溢出。
- [ ] 运行内联脚本语法检查和 `git diff --check`。
- [ ] 确认 `LICENSE` SHA256 仍为 `2B30AE5698DC0DAC45082B3694020E593E9B513A28C0691F6DD2F662502D7E58`。
