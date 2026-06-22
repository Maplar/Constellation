# 仪表盘日历与紧凑布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 UI 校准台中增加可点击的月历热力图，并让仪表盘卡片使用 dense 网格尽量铺满可用区域。

**Architecture:** 保留现有 12 列 CSS Grid 和卡片尺寸体系，通过 `grid-auto-flow: dense` 与成组尺寸组合消除布局空洞。日历使用静态活动数据渲染日期格，点击日期只更新卡片内详情，不引入真实 Git 或文件系统接口。

**Tech Stack:** 单文件 HTML、CSS Grid、原生 JavaScript、Playwright 浏览器断言。

---

### Task 1: 月历热力图

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [x] **Step 1: 运行缺失能力断言**

验证当前仪表盘不存在 `data-activity-calendar`、日期格和日期详情区域。

- [x] **Step 2: 增加日历卡片**

加入 2026 年 6 月月历、星期标题、活动等级、修改次数、文件数和图例。

- [x] **Step 3: 增加日期详情交互**

点击日期时更新选中状态及右侧摘要，展示保存次数、涉及文件数和修改文件列表。

- [x] **Step 4: 浏览器验证**

验证日期数量、选中切换、详情更新、无活动日期状态和控制台错误。

### Task 2: 紧凑铺满

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [x] **Step 1: 启用 dense 网格**

为仪表盘设置 `grid-auto-flow: dense`，保持必要卡片间距。

- [x] **Step 2: 调整卡片组合**

日历使用 8 × 3，AI 建议使用 4 × 3；其他中型卡片按三个 4 × 2 组成完整行。

- [x] **Step 3: 同步文档**

写明月历热力图数据语义、混合数据来源和仪表盘紧凑铺满原则。

- [x] **Step 4: 最终验证**

通过浏览器测量每张卡片位置，确认不存在可被已有卡片填补的大型内部空洞；检查版权头和 `LICENSE` 无差异。
