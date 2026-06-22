# 统一文件夹调色盘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在单文件 UI 校准台中提供精简易用的专业色环，并把低频高级参数移入设置，同时证明文件夹、引用、知识树和图谱共享同一颜色事实源。

**Architecture:** 复用现有 `applyRainbowColor` 和 `data-rainbow-controlled` 机制，增加“已应用颜色”和“草稿颜色”两个会话状态。主浮层只负责直观选色与确认，高级数值控件集中在设置区；所有预览仍通过同一个 CSS 变量同步，不产生视图级颜色覆盖。

**Tech Stack:** 单文件 HTML、CSS Variables、原生 JavaScript、Playwright 浏览器断言。

---

### Task 1: 调色盘独立表面

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [x] **Step 1: 运行缺失能力断言**

验证调色盘入口、`#palette` 浮层和四类预览当前不存在。

- [x] **Step 2: 增加入口、浮层与四类预览**

增加“统一调色盘”独立表面，复用既有六个颜色值，并为文件夹、引用、知识树和图谱预览添加 `data-rainbow-controlled`。

- [x] **Step 3: 连接同步状态**

扩展 `applyRainbowColor`，同步浮层颜色值文本；仅在浮层内点击时显示“源文件夹及关联视图已同步”的提示。

- [x] **Step 4: 浏览器验证**

验证浮层可开关、六个色点可选、四类预览颜色一致、页面无 JavaScript 错误。

### Task 2: 规范同步

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [x] **Step 1: 明确颜色事实源**

写明调色盘修改 `.constellation/folders.json` 中的源文件夹颜色，引用、知识树和图谱只能继承，不提供视图级覆盖。

- [x] **Step 2: 检查版权和差异**

确认 HTML 版权头、README 版权致谢和根 `LICENSE` 均未被破坏。

### Task 3: 专业色环与精简主流程

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [x] **Step 1: 运行缺失能力断言**

验证当前不存在色相环、饱和度/明度区、原始色/UI 安全色双选择、HEX 输入、最近颜色和应用/取消状态。

- [x] **Step 2: 增加主调色组件**

在统一调色盘中加入色相环、中央饱和度/明度区、双预览、HEX、预设色、最近颜色、吸管占位和底部操作按钮。

- [x] **Step 3: 实现颜色草稿状态**

拖动或点击取色区域时只更新预览；取消恢复打开浮层前的颜色，应用确认当前原始色或 UI 安全色并记录最近颜色。

- [x] **Step 4: 验证主流程**

浏览器断言色环和明度区可交互、双预览颜色不同、HEX 可输入、取消可回滚、应用可确认、四类预览始终同色。

### Task 4: 高级取色设置

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [x] **Step 1: 增加设置组件**

在“外观与编辑”中增加可折叠“高级取色”，展示 RGB/HSL、明度、饱和度、透明度、安全色强度、对比度检查、最近颜色数量和清理操作。

- [x] **Step 2: 明确主次边界**

README 与 AGENTS 写明主调色盘保持三步操作，高级参数只在设置中出现，不改变文件夹作为唯一颜色事实源的规则。

- [x] **Step 3: 最终验证**

确认主浮层无溢出、设置高级区可展开、引用竖线仍为 `6px`、内容框保持等宽、页面无控制台错误，且 `LICENSE` 无差异。
