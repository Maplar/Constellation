# 编辑标注与对象自适应右键菜单实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Constellation v4 单文件前端 UI 校准台中加入文字选区浮动工具条，并让右键菜单根据页面和命中对象精确切换动作。

**Architecture:** 保留一个选区工具条和一个右键菜单 DOM 容器。选区工具条调用现有编辑命令；右键菜单由 `contextMenuDefinitions` 注册表、`resolveContextMenuKey()` 命中逻辑和 `renderContextMenu()` 渲染函数驱动，不为每个页面复制独立菜单。所有动作仅模拟视觉反馈，不写入真实 Markdown、文件、图谱、知识树或 Canvas。

**Tech Stack:** 单文件 HTML、CSS Variables/Design Tokens、原生 DOM Selection/Range API、原生 JavaScript、Node.js 静态契约脚本、Playwright 浏览器校验。

**Scope Note:** 本计划不实施正式编辑器 AST、Tauri API 或 Rust Core。根据 `AGENTS.md`，提交和推送步骤不执行，除非用户之后明确确认。

---

## 文件结构

- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
  - 增加选区工具条样式、动态菜单标题与动作样式。
  - 增加对象上下文标记。
  - 增加 Selection/Range 和菜单注册表交互。
- Create: `scripts/check-ui-calibration-context-menu-contract.cjs`
  - 验证选区工具条、菜单注册表、页面对象菜单与危险动作契约。
- Modify: `README.md`
  - 记录三种选区标注入口与页面/对象自适应菜单。
- Modify: `AGENTS.md`
  - 固化选区工具条与右键菜单产品边界。
- Reference: `Docs/superpowers/specs/2026-06-15-editor-markup-context-menus-design.md`
  - 本计划的唯一交互设计依据。

## Task 1: 建立静态契约测试

**Files:**
- Create: `scripts/check-ui-calibration-context-menu-contract.cjs`
- Test: `scripts/check-ui-calibration-context-menu-contract.cjs`

- [ ] **Step 1: 写入失败的静态契约脚本**

文件必须以 Maplar 新增代码版权头开始，并包含以下断言：

```js
/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(
  path.join(root, "Docs", "ui-calibration", "constellation-v4-ui-calibration.html"),
  "utf8",
);
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");

const requiredHtmlTokens = [
  'id="selection-toolbar"',
  'data-selection-command="blockquote"',
  'data-selection-command="underline"',
  'data-selection-command="insight"',
  'id="context-menu-label"',
  'id="context-menu-items"',
  "const contextMenuDefinitions",
  "function resolveContextMenuKey",
  "function renderContextMenu",
  '"editor-selection"',
  '"file-markdown"',
  '"graph-node"',
  '"knowledge-tree-node"',
  '"canvas-node"',
  '"dashboard-card"',
  '"ai-source"',
  '"canvas-blank"',
  '"graph-blank"',
];

for (const token of requiredHtmlTokens) {
  assert.ok(html.includes(token), `HTML 缺少上下文菜单契约：${token}`);
}

assert.ok(html.includes("最多显示 6 个主要动作"), "校准说明缺少首层动作上限");
assert.ok(readme.includes("页面与对象自适应"), "README 缺少自适应右键菜单说明");
assert.ok(agents.includes("文字选区浮动工具条"), "AGENTS 缺少选区工具条约束");
assert.ok(agents.includes("不适用的动作不得显示"), "AGENTS 缺少精简菜单约束");

console.log("编辑标注与对象自适应右键菜单静态契约通过");
```

- [ ] **Step 2: 运行脚本确认测试失败**

Run:

```powershell
node scripts/check-ui-calibration-context-menu-contract.cjs
```

Expected: FAIL，首个缺失项为 `id="selection-toolbar"`。

## Task 2: 增加文字选区浮动工具条

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:2022-2130`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:6284-6305`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:7632-8240`
- Test: `scripts/check-ui-calibration-context-menu-contract.cjs`

- [ ] **Step 1: 增加工具条 CSS**

在感悟卡片样式附近加入：

```css
.selection-toolbar {
  position: absolute;
  z-index: 92;
  display: none;
  align-items: center;
  gap: 2px;
  padding: 4px;
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--paper-soft) 96%, transparent);
  border: 1px solid var(--paper-deep);
  border-radius: 9px;
  box-shadow: var(--shadow-float);
  backdrop-filter: blur(18px);
}

.selection-toolbar.is-open {
  display: flex;
  animation: pop-in 120ms ease both;
}

.selection-toolbar button {
  min-height: 27px;
  padding: 0 8px;
  color: inherit;
  background: transparent;
  border-radius: 6px;
  font-size: 9px;
}

.selection-toolbar button:hover {
  color: var(--accent-strong);
  background: var(--accent-soft);
}
```

- [ ] **Step 2: 增加工具条 DOM**

在 `#insight-popover` 之前加入：

```html
<div class="selection-toolbar" id="selection-toolbar" role="toolbar" aria-label="文字选区快速操作">
  <button type="button" data-selection-command="blockquote">❝ 块引用</button>
  <button type="button" data-selection-command="underline"><u>U</u> 下划线</button>
  <button type="button" data-selection-command="insight">感 感悟</button>
</div>
```

- [ ] **Step 3: 保存有效选区并定位工具条**

在脚本变量区增加 `selectionToolbar`、`savedEditorRange`，并实现：

```js
function getEditorSelectionRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const container =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  return visualEditor.contains(container) ? range.cloneRange() : null;
}

function restoreEditorSelection() {
  if (!savedEditorRange) return false;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedEditorRange);
  visualEditor.focus();
  return true;
}

function hideSelectionToolbar() {
  selectionToolbar.classList.remove("is-open");
}

function showSelectionToolbar(range) {
  savedEditorRange = range.cloneRange();
  const frameRect = device.getBoundingClientRect();
  const selectionRect = range.getBoundingClientRect();
  const scale = Number(getComputedStyle(root).getPropertyValue("--stage-scale")) || 1;
  const left = Math.min(
    930,
    Math.max(90, (selectionRect.left - frameRect.left + selectionRect.width / 2) / scale - 105),
  );
  const top = Math.max(88, (selectionRect.top - frameRect.top) / scale - 39);
  selectionToolbar.style.left = `${left}px`;
  selectionToolbar.style.top = `${top}px`;
  selectionToolbar.classList.add("is-open");
}
```

- [ ] **Step 4: 监听选区变化**

对 `#markdown-preview` 监听 `mouseup` 和 `keyup`。使用 `requestAnimationFrame` 读取最终 Selection；有效选区调用 `showSelectionToolbar(range)`，无效选区关闭工具条。

- [ ] **Step 5: 让三个按钮复用现有编辑命令**

抽取统一函数：

```js
function executeEditorCommand(command) {
  if (!restoreEditorSelection()) return;
  if (command === "underline") {
    document.execCommand("underline", false);
  } else if (command === "insight") {
    insertInsightFromSelection();
  } else if (command === "blockquote") {
    document.execCommand("formatBlock", false, "blockquote");
  }
  hideSelectionToolbar();
  markDocumentDirty();
}
```

顶部工具栏的三个对应按钮和选区工具条都调用该函数；不要保留两套不同实现。

- [ ] **Step 6: 增加退出行为**

- `Esc` 关闭选区工具条、感悟卡片和右键菜单。
- 单击工具条、感悟卡片以外区域后关闭工具条。
- 工具条按钮的 `mousedown` 调用 `preventDefault()`，避免点击按钮时丢失选区。

- [ ] **Step 7: 运行静态契约**

Run:

```powershell
node scripts/check-ui-calibration-context-menu-contract.cjs
```

Expected: 仍 FAIL，但三个 `data-selection-command` 和 `id="selection-toolbar"` 已通过。

## Task 3: 将通用右键菜单改为动态菜单容器

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:5650-5705`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:7592-7600`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:8029-8038`
- Test: `scripts/check-ui-calibration-context-menu-contract.cjs`

- [ ] **Step 1: 完善菜单视觉结构**

增加对象标签、图标槽、更多箭头和柔和危险态：

```css
.context-menu {
  width: clamp(188px, 17vw, 220px);
}

.context-menu-label {
  padding: 4px 9px 7px;
  color: var(--ink-ghost);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.context-item-copy {
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-item-icon {
  width: 14px;
  color: var(--ink-muted);
  text-align: center;
}

.context-item.danger:hover {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}
```

危险态悬停不得使用整块纯红背景。

- [ ] **Step 2: 替换静态菜单项**

把原静态按钮改为：

```html
<div class="context-menu" id="context-menu" role="menu" aria-label="对象操作菜单">
  <div class="context-menu-label" id="context-menu-label">当前对象</div>
  <div id="context-menu-items"></div>
</div>
```

- [ ] **Step 3: 定义菜单项数据结构**

在脚本中加入：

```js
const contextMenuDefinitions = {
  "editor-selection": {
    label: "正文选区",
    items: [
      ["copy", "复制", "⌘", "Ctrl+C"],
      ["blockquote", "块引用", "❝"],
      ["underline", "下划线", "U"],
      ["insight", "写感悟", "感"],
      ["reference", "链接 / 引用", "↗"],
    ],
  },
  "editor-paragraph": {
    label: "正文段落",
    items: [
      ["paste", "粘贴", "⌘", "Ctrl+V"],
      ["insert-after", "在下方插入", "+"],
      ["paragraph-type", "切换段落类型", "¶", "›"],
    ],
  },
  "editor-reference": {
    label: "引用胶囊",
    items: [
      ["open-source", "打开来源", "↗"],
      ["toggle-preview", "展开 / 收起预览", "▤"],
      ["show-in-graph", "在图谱查看", "◎"],
      ["remove-reference", "移除引用", "×", "", "danger"],
    ],
  },
};
```

其余注册项在 Task 4 中补齐。数组字段固定为：

```text
[action, label, icon, shortcutOrArrow?, tone?]
```

- [ ] **Step 4: 实现菜单渲染**

```js
function renderContextMenu(key) {
  const definition = contextMenuDefinitions[key];
  if (!definition) return false;
  contextMenuLabel.textContent = definition.label;
  contextMenuItems.replaceChildren(
    ...definition.items.slice(0, 6).flatMap(([action, label, icon, meta = "", tone = ""]) => {
      if (action === "divider") {
        const divider = document.createElement("div");
        divider.className = "context-divider";
        return [divider];
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = `context-item${tone ? ` ${tone}` : ""}`;
      button.dataset.contextAction = action;
      button.setAttribute("role", "menuitem");
      button.innerHTML =
        `<span class="context-item-copy"><span class="context-item-icon">${icon}</span>` +
        `<span>${label}</span></span><kbd>${meta}</kbd>`;
      return [button];
    }),
  );
  return true;
}
```

- [ ] **Step 5: 集中处理动作**

对 `#context-menu-items` 使用事件委托。编辑器的 `blockquote`、`underline`、`insight` 调用 `executeEditorCommand()`；`open-source`、`show-in-graph`、`reference` 复用现有弹层或视图跳转；其余静态校准动作统一显示明确 toast，例如“已模拟：聚焦图谱节点”。

禁止让“应用 AI 建议”绕过差异预览，禁止让“从树中移除”显示成删除真实文件。

## Task 4: 增加页面与对象菜单矩阵

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:5988-6960`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:7607-8040`
- Test: `scripts/check-ui-calibration-context-menu-contract.cjs`

- [ ] **Step 1: 为可命中对象增加语义标记**

使用现有元素，不新建重复示例：

```html
data-context-kind="file-markdown"
data-context-kind="file-folder"
data-context-kind="quick-note"
data-context-kind="graph-node"
data-context-kind="graph-source"
data-context-kind="knowledge-tree-node"
data-context-kind="canvas-node"
data-context-kind="dashboard-card"
data-context-kind="ai-source"
data-context-kind="ai-suggestion"
```

文件树由 JavaScript 动态渲染时，在节点创建函数中按文件类型赋值。图谱、知识树、Canvas、仪表盘和 AI 来源直接在已有示例元素上赋值。

- [ ] **Step 2: 补齐对象菜单定义**

每个对象首层最多 `6` 项：

```js
"file-markdown": {
  label: "Markdown 文件",
  items: [
    ["open", "打开", "↗"],
    ["rename", "重命名", "✎"],
    ["move", "移动到…", "→"],
    ["copy-path", "复制相对路径", "⌘"],
    ["recycle", "移入回收站", "×", "", "danger"],
  ],
},
"graph-node": {
  label: "图谱节点",
  items: [
    ["open", "打开文件", "↗"],
    ["focus-node", "聚焦节点", "◎"],
    ["expand-one-hop", "展开一跳", "+"],
    ["locate-tree", "在文件树定位", "⌖"],
    ["hide-node", "隐藏节点", "−"],
  ],
},
"knowledge-tree-node": {
  label: "知识树节点",
  items: [
    ["new-child", "新建子节点", "+"],
    ["rename", "重命名", "✎"],
    ["indent", "提升 / 降级", "↕"],
    ["promote-note", "转为笔记", "M"],
    ["focus-branch", "聚焦分支", "◎"],
  ],
},
"canvas-node": {
  label: "Canvas 节点",
  items: [
    ["edit", "编辑", "✎"],
    ["copy", "复制", "⌘"],
    ["connect", "连接", "↗"],
    ["group", "分组", "▣"],
    ["delete-canvas-node", "删除节点", "×", "", "danger"],
  ],
},
"dashboard-card": {
  label: "仪表盘卡片",
  items: [
    ["refresh-card", "刷新", "↻"],
    ["resize-card", "调整尺寸", "↔"],
    ["duplicate-card", "复制卡片", "⌘"],
    ["remove-card", "移除卡片", "×", "", "danger"],
  ],
},
"ai-source": {
  label: "AI 来源结果",
  items: [
    ["open-source", "打开来源", "↗"],
    ["cite-editor", "引用到正文", "❝"],
    ["save-evidence", "保存证据", "▤"],
    ["show-in-graph", "在图谱查看", "◎"],
  ],
},
```

同时按设计文档补充文件夹、快捷便签、来源节点、知识树子树、Canvas 边/分组和 AI 建议。相同动作复用相同 action ID。

- [ ] **Step 3: 增加空白区域菜单**

定义：

```js
"editor-blank": {
  label: "编辑区",
  items: [["paste", "粘贴", "⌘"], ["insert-paragraph", "插入段落", "+"]],
},
"graph-blank": {
  label: "图谱空白",
  items: [
    ["fit-view", "适应视图", "□"],
    ["reset-layout", "重置布局", "↻"],
    ["filter-relations", "筛选关系", "≡"],
  ],
},
"knowledge-tree-blank": {
  label: "知识树空白",
  items: [
    ["new-root", "新建根级节点", "+"],
    ["expand-all", "全部展开", "↧"],
    ["fit-view", "适应视图", "□"],
  ],
},
"canvas-blank": {
  label: "Canvas 空白",
  items: [
    ["new-text-node", "新建文本", "+"],
    ["paste", "粘贴", "⌘"],
    ["fit-view", "适应视图", "□"],
  ],
},
"dashboard-blank": {
  label: "仪表盘空白",
  items: [
    ["add-card", "添加卡片", "+"],
    ["compact-layout", "自动补位", "▦"],
    ["restore-layout", "恢复默认布局", "↻"],
  ],
},
"ai-blank": {
  label: "AI 与来源",
  items: [["new-search", "新建检索", "+"], ["clear-results", "清空当前结果", "×"]],
},
```

- [ ] **Step 4: 实现命中优先级**

```js
function resolveContextMenuKey(event) {
  const selectionRange = getEditorSelectionRange();
  if (selectionRange && event.target.closest("#markdown-preview")) return "editor-selection";

  const explicitTarget = event.target.closest("[data-context-kind]");
  if (explicitTarget) return explicitTarget.dataset.contextKind;

  if (event.target.closest(".reference-chip")) return "editor-reference";
  if (event.target.closest(".insight-anchor")) return "editor-insight";
  if (event.target.closest("#markdown-preview p, #markdown-preview blockquote, #markdown-preview h2, #markdown-preview h3")) {
    return "editor-paragraph";
  }

  const activeView = event.target.closest(".app-view")?.dataset.view;
  return {
    editor: "editor-blank",
    graph: "graph-blank",
    "knowledge-tree": "knowledge-tree-blank",
    canvas: "canvas-blank",
    dashboard: "dashboard-blank",
    ai: "ai-blank",
    components: "components-example",
  }[activeView] || null;
}
```

设置页返回 `null`，保留浏览器默认行为或不显示自定义菜单。

- [ ] **Step 5: 替换全局通用 contextmenu 监听**

右键时：

1. 调用 `resolveContextMenuKey(event)`。
2. 返回 `null` 时不调用 `preventDefault()`。
3. 命中菜单时调用 `preventDefault()` 和 `renderContextMenu(key)`。
4. 保存当前命中对象到 `activeContextTarget`。
5. 按设备缩放比例换算位置，并依据菜单宽高限制在设备边界内。

- [ ] **Step 6: 添加键盘操作**

- 菜单打开后首项获得焦点。
- `ArrowDown`、`ArrowUp` 在菜单项间循环。
- `Enter` 或空格执行当前项。
- `Esc` 关闭菜单并将焦点返回 `activeContextTarget`。

- [ ] **Step 7: 运行静态契约**

Run:

```powershell
node scripts/check-ui-calibration-context-menu-contract.cjs
```

Expected:

```text
编辑标注与对象自适应右键菜单静态契约通过
```

## Task 5: 更新组件校准说明和项目文档

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:7139-7200`
- Modify: `README.md:17-100`
- Modify: `AGENTS.md:106-115`
- Test: `scripts/check-ui-calibration-context-menu-contract.cjs`

- [ ] **Step 1: 更新校准台组件说明**

“当前文件 Markdown 编辑器”说明增加：

- 选中文字出现 `块引用 / 下划线 / 感悟` 浮动工具条。
- 块引用作用于完整段落。
- 下划线只作用于精确选区。
- 感悟生成 `感₁` 上标和横向悬浮卡片。

“右键菜单与设置”改为“对象自适应右键菜单”，说明：

- 页面和命中对象共同决定动作。
- 首层最多 `6` 个动作。
- 页面空白只显示 `2–4` 个动作。
- 不适用动作不显示。

- [ ] **Step 2: 更新 README**

在功能特性中加入：

```markdown
- **文字选区快捷标注（UI 已校准，运行时待实施）** — 选中文字后显示“块引用 / 下划线 / 感悟”短工具条；三种标注分别对应标准 Markdown 块引用、`<u>` 内联下划线和脚注式感悟锚点。
- **对象自适应右键菜单（UI 已校准，运行时待实施）** — 编辑器、文件树、图谱、知识树、Canvas、仪表盘和 AI 来源根据页面与命中对象显示精简动作；首层最多六项，空白区域最多四项，不显示不适用的禁用项。
```

- [ ] **Step 3: 更新 AGENTS**

在编辑器约束后加入：

```markdown
- 正文存在有效文字选区时显示短浮动工具条，只包含块引用、普通下划线和文字感悟；工具条动作必须复用顶部编辑命令，不得维护第二套正文状态。
- 自定义右键菜单必须由页面、命中对象和当前状态共同决定；不适用的动作不得显示。首层最多六个主要动作，页面空白区域最多四个动作，低频项进入“更多”。
- 图谱菜单只允许浏览、筛选和跳转；知识树“从树中移除”不得删除真实文件；仪表盘“移除卡片”不得删除笔记；AI 建议菜单不得绕过差异预览直接写入。
```

- [ ] **Step 4: 运行文档与静态契约检查**

Run:

```powershell
node scripts/check-ui-calibration-context-menu-contract.cjs
git diff --check -- Docs/ui-calibration/constellation-v4-ui-calibration.html README.md AGENTS.md scripts/check-ui-calibration-context-menu-contract.cjs
```

Expected: 契约通过；`git diff --check` 退出码为 `0`，允许仅出现 CRLF 转换警告。

## Task 6: 浏览器交互与主题验证

**Files:**
- Verify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`

- [ ] **Step 1: 验证选区工具条**

使用 Playwright：

1. 打开本地 HTML。
2. 在 `#markdown-preview` 中选择一段文字。
3. 断言 `#selection-toolbar` 包含 `is-open`。
4. 断言按钮文字为块引用、下划线、感悟。
5. 点击下划线，断言选区生成 `<u>`。
6. 重新选择文字并点击感悟，断言新增 `.insight-anchor` 且感悟卡片打开。
7. 选中普通段落并点击块引用，断言完整段落变为 `BLOCKQUOTE`。

- [ ] **Step 2: 验证对象菜单**

依次切换页面并右键：

| 页面 | 对象 | 预期菜单标签 |
|---|---|---|
| 编辑器 | 文字选区 | 正文选区 |
| 编辑器 | 引用胶囊 | 引用胶囊 |
| 文件树 | Markdown 文件 | Markdown 文件 |
| 图谱 | 普通节点 | 图谱节点 |
| 图谱 | 空白 | 图谱空白 |
| 知识树 | 节点 | 知识树节点 |
| Canvas | 文件节点 | Canvas 节点 |
| Canvas | 空白 | Canvas 空白 |
| 仪表盘 | 卡片 | 仪表盘卡片 |
| AI | 来源结果 | AI 来源结果 |

每次断言：

- 菜单可见。
- 首层动作数量不超过 `6`。
- 空白区域动作数量不超过 `4`。
- 没有 `disabled` 菜单项。

- [ ] **Step 3: 验证键盘与关闭行为**

- `ArrowDown` 改变焦点菜单项。
- `Enter` 执行动作并显示 toast。
- `Esc` 关闭菜单。
- 点击菜单外部关闭菜单。

- [ ] **Step 4: 验证三套主题**

分别切换 Light、Warm、Dark，断言：

- 菜单与选区工具条边框、背景来自主题 Token。
- 无白色系统原生菜单背景。
- 菜单不超出设备边界。
- 页面无横向溢出。
- 浏览器 `pageerror` 数量为 `0`。

- [ ] **Step 5: 最终检查**

Run:

```powershell
node scripts/check-ui-calibration-context-menu-contract.cjs
git diff --check -- Docs/ui-calibration/constellation-v4-ui-calibration.html README.md AGENTS.md scripts/check-ui-calibration-context-menu-contract.cjs Docs/superpowers/specs/2026-06-15-editor-markup-context-menus-design.md Docs/superpowers/plans/2026-06-15-editor-markup-context-menus.md
Get-FileHash -Algorithm SHA256 -LiteralPath LICENSE
```

Expected:

- 静态契约通过。
- `git diff --check` 退出码为 `0`。
- `LICENSE` SHA256 保持：

```text
2B30AE5698DC0DAC45082B3694020E593E9B513A28C0691F6DD2F662502D7E58
```

## 计划自检

- 设计中的三个选区动作由 Task 2 覆盖。
- 页面与对象命中、空白区域动作和首层数量限制由 Task 3–4 覆盖。
- 编辑器、文件树、图谱、知识树、Canvas、仪表盘和 AI 来源均有菜单定义与浏览器验证。
- 设置页不强制自定义菜单。
- 危险动作语义、AI 确认后写入和知识树/图谱/Canvas 边界均在 Task 3–5 固化。
- 静态契约、真实浏览器交互、三主题和版权文件均有最终验证。
- 未包含真实 AST、Tauri、Rust 或文件写入实现。
