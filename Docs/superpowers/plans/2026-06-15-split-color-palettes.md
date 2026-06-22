# 文件夹与来源调色盘拆分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端 UI 校准台的“统一调色盘”拆成“文件夹颜色”和“来源颜色”两个直接入口，并在来源调色盘中通过 URL/AI 分段切换目标。

**Architecture:** 保留一套共享色环、颜色计算和预览渲染逻辑，由入口传入 `folder` 或 `source` 上下文。目标数据继续使用 `.constellation/folders.json` 与 `.constellation/source-collections.json` 两个事实源语义；每个目标拥有独立校准草稿，来源上下文再按 `url` 或 `ai` 过滤目标。

**Tech Stack:** 单文件 HTML、CSS Variables/Design Tokens、原生 JavaScript、Node.js 静态契约脚本、Playwright 浏览器校验。

**Scope Note:** 本计划只修改静态前端 UI 校准台及项目文档，不实现 React、Tauri、Rust 或真实 JSON 读写。根据 `AGENTS.md`，不执行 Git 提交或推送，除非用户后续明确确认。

---

## 文件结构

- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
  - 将一个独立表面入口拆成两个。
  - 保留一个共享调色盘 DOM，按入口上下文渲染不同目标、标题、预览和动作。
  - 增加 URL/AI 分段切换、目标级草稿和未应用修改确认。
- Create: `scripts/check-ui-calibration-palette-contract.cjs`
  - 验证入口拆分、来源分段、事实源、草稿隔离和文档契约。
- Modify: `README.md`
  - 将“统一调色盘”更新为两个直接入口及其继承规则。
- Modify: `AGENTS.md`
  - 固化文件夹与来源调色入口分离，但共用取色核心和既有事实源。
- Reference: `Docs/superpowers/specs/2026-06-15-split-color-palettes-design.md`
  - 本计划的唯一交互设计依据。

## Task 1: 建立失败的静态契约测试

**Files:**
- Create: `scripts/check-ui-calibration-palette-contract.cjs`
- Test: `scripts/check-ui-calibration-palette-contract.cjs`

- [ ] **Step 1: 新建调色盘静态契约脚本**

文件必须完整写入：

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
  'data-palette-scope="folder"',
  'data-palette-scope="source"',
  'data-palette-source-type="url"',
  'data-palette-source-type="ai"',
  'data-palette-target-list',
  'data-palette-empty',
  'data-palette-empty-create',
  'data-palette-editable',
  'data-palette-discard-confirm',
  'data-palette-discard-action="discard"',
  'data-palette-discard-action="continue"',
  "const paletteDrafts",
  "let activePaletteScope",
  "let activePaletteSourceType",
  "function getVisiblePaletteTargets",
  "function renderPaletteContext",
  "function selectPaletteSourceType",
  "function hasPaletteDraftChanges",
  "function requestPaletteClose",
  '".constellation/folders.json"',
  '".constellation/source-collections.json"',
  '应用到文件夹',
  '应用到 URL 来源集合',
  '应用到 AI 来源集合',
];

for (const token of requiredHtmlTokens) {
  assert.ok(html.includes(token), `HTML 缺少拆分调色盘契约：${token}`);
}

const folderEntryCount = (html.match(/data-palette-scope="folder"/g) || []).length;
const sourceEntryCount = (html.match(/data-palette-scope="source"/g) || []).length;
assert.ok(folderEntryCount >= 1, "缺少文件夹颜色入口");
assert.ok(sourceEntryCount >= 1, "缺少来源颜色入口");

assert.ok(!html.includes("<strong>统一彩虹调色盘</strong>"), "调色盘标题仍使用旧统一名称");
assert.ok(!html.includes("<span>统一调色盘</span>"), "独立表面仍保留旧统一入口");
assert.ok(readme.includes("文件夹颜色"), "README 缺少文件夹颜色入口说明");
assert.ok(readme.includes("来源颜色"), "README 缺少来源颜色入口说明");
assert.ok(readme.includes("URL / AI 分段"), "README 缺少来源分段说明");
assert.ok(agents.includes("文件夹颜色与来源颜色必须作为两个并列入口"), "AGENTS 缺少入口拆分约束");
assert.ok(agents.includes("URL / AI 分段切换"), "AGENTS 缺少来源类型切换约束");

console.log("文件夹与来源调色盘拆分静态契约通过");
```

- [ ] **Step 2: 运行脚本确认测试失败**

Run:

```powershell
node scripts/check-ui-calibration-palette-contract.cjs
```

Expected: FAIL，首个缺失项为 `data-palette-scope="folder"`。

## Task 2: 拆分独立表面入口并改造共享调色盘外壳

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:201-220`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:4717-4840`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:5919-5923`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:7503-7616`
- Test: `scripts/check-ui-calibration-palette-contract.cjs`

- [ ] **Step 1: 将一个独立表面入口替换为两个并列入口**

使用同一个 `palette` 浮层，但入口分别携带上下文：

```html
<button class="overlay-button" data-overlay-target="palette" data-palette-scope="folder">
  <span class="rail-icon">FC</span>
  <span class="rail-copy">
    <span>文件夹颜色</span>
    <small>彩虹文件夹与本地引用</small>
  </span>
</button>
<button class="overlay-button" data-overlay-target="palette" data-palette-scope="source">
  <span class="rail-icon">SC</span>
  <span class="rail-copy">
    <span>来源颜色</span>
    <small>URL 与 AI 来源集合</small>
  </span>
</button>
```

不得增加“颜色”总入口或二级选择页。

- [ ] **Step 2: 增加来源分段、动态目标列表和空状态样式**

在现有调色盘 CSS 附近加入：

```css
.palette-source-segments {
  display: inline-flex;
  gap: 3px;
  margin-bottom: 9px;
  padding: 3px;
  background: var(--paper);
  border: 1px solid var(--paper-deep);
  border-radius: 9px;
}

.palette-source-segments[hidden],
.palette-empty[hidden],
[data-palette-editable][hidden],
.palette-preview[hidden],
.palette-discard-confirm[hidden] {
  display: none;
}

.palette-source-segments button {
  min-width: 58px;
  min-height: 27px;
  padding: 0 12px;
  color: var(--ink-muted);
  background: transparent;
  border-radius: 6px;
  font-size: 8px;
}

.palette-source-segments button.is-active {
  color: var(--accent-strong);
  background: var(--accent-soft);
}

.palette-target-switcher {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.palette-empty {
  display: grid;
  min-height: 92px;
  place-items: center;
  gap: 8px;
  margin-bottom: 9px;
  padding: 14px;
  color: var(--ink-muted);
  background: var(--paper);
  border: 1px dashed var(--paper-deep);
  border-radius: 10px;
  font-size: 8px;
  text-align: center;
}

.palette-target-icon[data-source-kind="local"]::after,
.palette-target-icon[data-source-kind="url"]::after,
.palette-target-icon[data-source-kind="ai"]::after {
  width: 100%;
  height: 100%;
  content: "";
  background: var(--paper-soft);
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.palette-target-icon[data-source-kind="local"]::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2.5 4.5h4l1.4-1.7h5.6v9.7h-11z' fill='none' stroke='black' stroke-width='1.35' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2.5 4.5h4l1.4-1.7h5.6v9.7h-11z' fill='none' stroke='black' stroke-width='1.35' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-size: 12px 12px;
  mask-size: 12px 12px;
}

.palette-target-icon[data-source-kind="url"]::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.2 3v5.6a3.8 3.8 0 0 0 7.6 0V3' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.2 3v5.6a3.8 3.8 0 0 0 7.6 0V3' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  -webkit-mask-size: 10px 10px;
  mask-size: 10px 10px;
}

.palette-target-icon[data-source-kind="ai"]::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2.2 13 5.3 3l3.1 10M3.3 9.4h4M12.4 3v10' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M2.2 13 5.3 3l3.1 10M3.3 9.4h4M12.4 3v10' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-size: 11px 11px;
  mask-size: 11px 11px;
}

.palette-discard-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 9px;
  padding: 9px 10px;
  color: var(--ink-muted);
  background: color-mix(in srgb, var(--warning) 8%, var(--paper));
  border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--paper-deep));
  border-radius: 9px;
  font-size: 8px;
}
```

- [ ] **Step 3: 将调色盘头部和目标区域改为上下文容器**

保留现有色环和基础控件，将头部至目标信息区域替换为：

```html
<div class="palette-header" data-drag-handle>
  <div class="palette-header-copy">
    <strong data-palette-title>文件夹颜色</strong>
    <small data-palette-subtitle>彩虹文件夹是本地文件引用颜色的唯一事实源</small>
  </div>
  <button class="surface-close" data-overlay-close="palette" title="关闭">×</button>
</div>
<div class="palette-body" data-palette-scope-view="folder">
  <div class="palette-source-segments" data-palette-source-segments hidden aria-label="来源类型">
    <button type="button" class="is-active" data-palette-source-type="url">URL</button>
    <button type="button" data-palette-source-type="ai">AI</button>
  </div>

  <div class="palette-target-switcher" data-palette-target-list aria-label="选择调色目标"></div>
  <div class="palette-empty" data-palette-empty hidden>
    <span data-palette-empty-copy>当前知识库还没有可调色的文件夹</span>
    <button type="button" class="text-button" data-palette-empty-create hidden>新建来源集合</button>
  </div>

  <div class="palette-source" data-palette-editable data-palette-live-preview style="--reference-color:#527d5e">
    <span class="palette-source-mark" aria-hidden="true"></span>
    <span class="palette-source-copy">
      <strong data-palette-target-name>当前对象：01 研究 / 哲学</strong>
      <small data-palette-target-store>颜色事实源：.constellation/folders.json</small>
    </span>
    <span class="palette-value" data-palette-color-value>#527D5E</span>
  </div>
```

给现有 `.palette-picker-layout`、`.palette-preview-grid`、`.palette-sync-status` 和 `.palette-actions` 同时增加 `data-palette-editable`；确认条继续由 `data-palette-discard-confirm` 独立控制，不得复制第二套控件。

- [ ] **Step 4: 让预览项可按上下文显示**

在现有预览网格中保留四个卡片，但添加用途标记：

```html
<article class="palette-preview" data-palette-preview="folder-tree" data-palette-live-preview>
  <small>文件树</small>
  <div class="palette-folder-sample" data-palette-preview-name>01 研究 / 哲学</div>
</article>
<article class="palette-preview" data-palette-preview="reference" data-palette-live-preview>
  <small>引用胶囊与竖线</small>
  <div class="palette-reference-sample">
    <span class="reference-chip" data-palette-preview-reference data-reference-kind="local">本地文件</span>
    <span aria-hidden="true"></span>
  </div>
</article>
<article class="palette-preview" data-palette-preview="source-box" data-palette-live-preview>
  <small data-palette-preview-box-label>本地来源预览框</small>
  <div class="palette-tree-sample"><strong>证据片段</strong><small>边框与淡色背景同源</small></div>
</article>
<article class="palette-preview" data-palette-preview="graph" data-palette-live-preview>
  <small>图谱节点与来源边</small>
  <div class="palette-graph-sample">
    <span class="palette-graph-node main"></span>
    <span class="palette-graph-node one"></span>
    <span class="palette-graph-node two"></span>
  </div>
</article>
```

来源上下文隐藏 `folder-tree`；文件夹上下文显示全部四项，并让引用示例使用本地图案。

- [ ] **Step 5: 增加动态动作和放弃修改确认**

在 `.palette-actions` 之后加入：

```html
<div class="palette-discard-confirm" data-palette-discard-confirm hidden>
  <span>当前调色盘还有未应用修改。</span>
  <div class="palette-actions-right">
    <button type="button" class="text-button" data-palette-discard-action="continue">继续编辑</button>
    <button type="button" class="primary-button" data-palette-discard-action="discard">放弃修改</button>
  </div>
</div>
```

把应用按钮初始文案改为：

```html
<button class="primary-button" data-color-action="apply">应用到文件夹</button>
```

- [ ] **Step 6: 运行静态契约**

Run:

```powershell
node scripts/check-ui-calibration-palette-contract.cjs
```

Expected: 仍 FAIL，但两个入口、分段按钮、目标容器与确认条相关断言已通过。

## Task 3: 建立调色上下文、目标过滤与独立草稿

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:9323-9329`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:9442-9785`
- Test: `scripts/check-ui-calibration-palette-contract.cjs`

- [ ] **Step 1: 扩展目标数据并建立草稿状态**

将目标定义改为：

```js
const paletteTargets = {
  "folder-philosophy": {
    scope: "folder",
    sourceType: "local",
    kind: "本地文件夹",
    name: "哲学",
    path: "01 研究 / 哲学",
    store: ".constellation/folders.json",
    color: "#527d5e",
    defaultColor: "#527d5e",
  },
  "folder-mathematics": {
    scope: "folder",
    sourceType: "local",
    kind: "本地文件夹",
    name: "数学",
    path: "01 研究 / 数学",
    store: ".constellation/folders.json",
    color: "#627f9d",
    defaultColor: "#627f9d",
  },
  "url-philosophy-encyclopedia": {
    scope: "source",
    sourceType: "url",
    kind: "URL 来源集合",
    name: "哲学百科",
    detail: "网页、图片与媒体来源",
    store: ".constellation/source-collections.json",
    color: "#a87848",
    defaultColor: "#a87848",
  },
  "ai-methodology-session": {
    scope: "source",
    sourceType: "ai",
    kind: "AI 来源集合",
    name: "方法论研究会话",
    detail: "模型生成与引用来源",
    store: ".constellation/source-collections.json",
    color: "#75689a",
    defaultColor: "#75689a",
  },
};

const paletteDrafts = Object.fromEntries(
  Object.entries(paletteTargets).map(([targetId, target]) => [
    targetId,
    {
      originalColor: target.color,
      safeColor: target.color,
      mode: "original",
      dirty: false,
    },
  ]),
);

let activePaletteScope = "folder";
let activePaletteSourceType = "url";
let activePaletteTarget = "folder-philosophy";
let pendingOverlayAfterPalette = null;
```

不得创建第三个颜色存储字段或视图级颜色覆盖。

- [ ] **Step 2: 增加上下文过滤和目标按钮渲染**

完整加入：

```js
function getVisiblePaletteTargets() {
  return Object.entries(paletteTargets).filter(([, target]) => {
    if (target.scope !== activePaletteScope) return false;
    return activePaletteScope === "folder" || target.sourceType === activePaletteSourceType;
  });
}

function createPaletteTargetButton(targetId, target) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "palette-target-button";
  button.dataset.paletteTarget = targetId;
  button.style.setProperty("--target-color", target.color);

  const icon = document.createElement("span");
  icon.className = "palette-target-icon";
  icon.dataset.sourceKind = target.sourceType;
  icon.setAttribute("aria-hidden", "true");

  const copy = document.createElement("span");
  copy.className = "palette-target-copy";
  const name = document.createElement("strong");
  name.textContent = target.name;
  const detail = document.createElement("small");
  detail.textContent = target.path || target.detail;
  copy.append(name, detail);
  button.append(icon, copy);
  return button;
}

function renderPaletteTargetList() {
  const targets = getVisiblePaletteTargets();
  paletteTargetList.replaceChildren(
    ...targets.map(([targetId, target]) => createPaletteTargetButton(targetId, target)),
  );
  paletteEmpty.hidden = targets.length > 0;
  paletteTargetList.hidden = targets.length === 0;
  paletteElement.querySelectorAll("[data-palette-editable]").forEach((element) => {
    element.hidden = targets.length === 0;
  });
  paletteEmptyCreate.hidden = activePaletteScope === "folder";
  paletteEmptyCopy.textContent =
    activePaletteScope === "folder"
      ? "当前知识库还没有可调色的文件夹"
      : `当前还没有 ${activePaletteSourceType.toUpperCase()} 来源集合`;

  paletteTargetList.querySelectorAll("[data-palette-target]").forEach((button) => {
    button.addEventListener("click", () => selectPaletteTarget(button.dataset.paletteTarget));
  });
}
```

为以上函数声明对应 DOM 常量：

```js
const paletteTargetList = paletteElement.querySelector("[data-palette-target-list]");
const paletteEmpty = paletteElement.querySelector("[data-palette-empty]");
const paletteEmptyCopy = paletteElement.querySelector("[data-palette-empty-copy]");
const paletteEmptyCreate = paletteElement.querySelector("[data-palette-empty-create]");
const paletteSourceSegments = paletteElement.querySelector("[data-palette-source-segments]");
```

- [ ] **Step 3: 增加目标草稿读写**

完整加入：

```js
function syncActiveDraftState() {
  const draft = paletteDrafts[activePaletteTarget];
  if (!draft) return;
  draft.originalColor = draftOriginalColor;
  draft.safeColor = draftSafeColor;
  draft.mode = draftMode;
  draft.dirty = getDraftColor() !== paletteTargets[activePaletteTarget].color;
}

function loadActiveDraftState() {
  const target = paletteTargets[activePaletteTarget];
  const draft = paletteDrafts[activePaletteTarget];
  draftOriginalColor = draft.originalColor;
  paletteHsv = rgbToHsv(hexToRgb(draftOriginalColor));
  draftSafeColor = createSafeColor(draftOriginalColor);
  draft.safeColor = draftSafeColor;
  draftMode = draft.mode;
  updatePickerUI();
  paintColorTarget(activePaletteTarget, getDraftColor());
  renderPaletteTarget();
}
```

在 `setDraftFromHex()` 与 `selectDraftMode()` 的 `updatePickerUI()` 之后调用 `syncActiveDraftState()`。

- [ ] **Step 4: 按调色上下文更新标题、分段、预览和按钮**

用以下函数集中管理文案和可见性：

```js
function renderPaletteContext() {
  const sourceMode = activePaletteScope === "source";
  paletteElement.dataset.paletteScopeView = activePaletteScope;
  paletteSourceSegments.hidden = !sourceMode;
  paletteElement.querySelector("[data-palette-title]").textContent =
    sourceMode ? "来源颜色" : "文件夹颜色";
  paletteElement.querySelector("[data-palette-subtitle]").textContent = sourceMode
    ? "来源集合颜色同步引用、预览框、图谱节点与显式来源边"
    : "彩虹文件夹是本地文件引用颜色的唯一事实源";

  paletteElement.querySelectorAll("[data-palette-source-type]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.paletteSourceType === activePaletteSourceType);
  });

  paletteElement.querySelector('[data-palette-preview="folder-tree"]').hidden = sourceMode;
  paletteElement.querySelector("[data-palette-preview-box-label]").textContent = sourceMode
    ? "来源片段预览框"
    : "本地来源预览框";

  const applyButton = paletteElement.querySelector('[data-color-action="apply"]');
  applyButton.textContent = sourceMode
    ? `应用到 ${activePaletteSourceType.toUpperCase()} 来源集合`
    : "应用到文件夹";

  renderPaletteTargetList();
}
```

- [ ] **Step 5: 按上下文进入调色盘并切换 URL/AI**

完整加入：

```js
function firstVisiblePaletteTarget() {
  return getVisiblePaletteTargets()[0]?.[0] || null;
}

function beginPaletteSession(scope = "folder") {
  if (activePaletteTarget) {
    syncActiveDraftState();
    paintColorTarget(activePaletteTarget, paletteTargets[activePaletteTarget].color);
  }
  activePaletteScope = scope === "source" ? "source" : "folder";
  const current = paletteTargets[activePaletteTarget];
  if (!current || current.scope !== activePaletteScope) {
    activePaletteTarget = firstVisiblePaletteTarget();
  }
  renderPaletteContext();
  if (activePaletteTarget) loadActiveDraftState();
  renderRecentColors();
}

function selectPaletteSourceType(sourceType) {
  if (!["url", "ai"].includes(sourceType) || sourceType === activePaletteSourceType) return;
  if (activePaletteTarget) {
    syncActiveDraftState();
    paintColorTarget(activePaletteTarget, paletteTargets[activePaletteTarget].color);
  }
  activePaletteSourceType = sourceType;
  activePaletteTarget = firstVisiblePaletteTarget();
  renderPaletteContext();
  if (activePaletteTarget) loadActiveDraftState();
}
```

绑定分段按钮：

```js
paletteElement.querySelectorAll("[data-palette-source-type]").forEach((button) => {
  button.addEventListener("click", () => {
    selectPaletteSourceType(button.dataset.paletteSourceType);
  });
});
```

- [ ] **Step 6: 修改目标切换，防止草稿串色**

完整替换：

```js
function selectPaletteTarget(targetId) {
  if (!paletteTargets[targetId] || targetId === activePaletteTarget) return;
  if (activePaletteTarget) {
    syncActiveDraftState();
    paintColorTarget(activePaletteTarget, paletteTargets[activePaletteTarget].color);
  }
  activePaletteTarget = targetId;
  loadActiveDraftState();
}
```

- [ ] **Step 7: 替换目标信息渲染，并让来源预览跟随 URL/AI**

完整替换 `renderPaletteTarget()`：

```js
function renderPaletteTarget() {
  const target = paletteTargets[activePaletteTarget];
  if (!target) return;

  paletteTargetList.querySelectorAll("[data-palette-target]").forEach((button) => {
    const selected = button.dataset.paletteTarget === activePaletteTarget;
    button.classList.toggle("is-selected", selected);
    button.style.setProperty(
      "--target-color",
      selected ? getDraftColor() : paletteTargets[button.dataset.paletteTarget].color,
    );
  });

  paletteElement.querySelector("[data-palette-target-name]").textContent =
    `当前对象：${target.name}`;
  paletteElement.querySelector("[data-palette-target-store]").textContent =
    `颜色事实源：${target.store}`;
  paletteElement.querySelector("[data-palette-preview-name]").textContent =
    target.path || target.name;
  paletteElement.querySelector("[data-palette-sync-status]").textContent =
    `草稿颜色只同步预览“${target.name}”；点击“应用”后才确认该对象颜色`;

  const referencePreview = paletteElement.querySelector("[data-palette-preview-reference]");
  referencePreview.dataset.referenceKind = target.sourceType;
  referencePreview.textContent =
    target.sourceType === "local"
      ? "本地文件"
      : target.sourceType === "url"
        ? "URL 来源"
        : "AI 来源";
}
```

预览图案通过既有 `.reference-chip[data-reference-kind]` 样式复用本地、URL、AI SVG 校准参数；不得用字体 `U` 或字体 `AI` 代替来源图案。

- [ ] **Step 8: 让入口把调色上下文传入浮层**

修改 `openOverlay()`：

```js
function openOverlay(id, options = {}) {
  const overlay = document.getElementById(id === "context" ? "context-menu" : id);
  if (!overlay) return;
  if (id === "context") {
    renderContextMenu("components-example");
    overlay.style.left = "520px";
    overlay.style.top = "260px";
  }
  if (id === "palette") beginPaletteSession(options.paletteScope);
  overlay.classList.add("is-open");
}
```

入口监听改为：

```js
document.querySelectorAll("[data-overlay-target]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const targetId = button.dataset.overlayTarget;
    const paletteIsOpen = paletteElement.classList.contains("is-open");
    const switchingPaletteScope =
      targetId === "palette" &&
      paletteIsOpen &&
      button.dataset.paletteScope !== activePaletteScope;
    if (
      paletteIsOpen &&
      hasPaletteDraftChanges() &&
      (targetId !== "palette" || switchingPaletteScope)
    ) {
      pendingOverlayAfterPalette = {
        id: targetId,
        paletteScope: button.dataset.paletteScope,
      };
      requestPaletteClose();
      return;
    }
    openOverlay(targetId, { paletteScope: button.dataset.paletteScope });
  });
});
```

- [ ] **Step 9: 运行静态契约**

Run:

```powershell
node scripts/check-ui-calibration-palette-contract.cjs
```

Expected: 仍 FAIL，但上下文、分段、目标过滤和草稿状态断言已通过。

## Task 4: 完成应用、取消和未应用修改确认

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:9740-9785`
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:9905-9909`
- Test: `scripts/check-ui-calibration-palette-contract.cjs`

- [ ] **Step 1: 增加未应用修改检测**

```js
function hasPaletteDraftChanges() {
  return Object.entries(paletteDrafts).some(([targetId, draft]) => {
    const chosen = draft.mode === "safe" ? draft.safeColor : draft.originalColor;
    return draft.dirty || chosen !== paletteTargets[targetId].color;
  });
}
```

- [ ] **Step 2: 让应用只提交当前目标并保持面板打开**

完整替换：

```js
function applyPaletteSession() {
  if (!activePaletteTarget) return;
  syncActiveDraftState();
  const chosenColor = getDraftColor();
  paletteTargets[activePaletteTarget].color = chosenColor;
  paletteDrafts[activePaletteTarget].dirty = false;
  paintColorTarget(activePaletteTarget, chosenColor);
  addRecentColor(chosenColor);
  renderPaletteTarget();
  const target = paletteTargets[activePaletteTarget];
  showToast(`已应用${target.kind}“${target.name}”颜色 ${chosenColor.toUpperCase()}`);
}
```

保持面板打开，使用户可以继续处理其他文件夹或来源集合。

- [ ] **Step 3: 让取消只恢复当前目标**

完整替换：

```js
function cancelCurrentPaletteDraft() {
  if (!activePaletteTarget) return;
  const target = paletteTargets[activePaletteTarget];
  paletteDrafts[activePaletteTarget] = {
    originalColor: target.color,
    safeColor: createSafeColor(target.color),
    mode: "original",
    dirty: false,
  };
  loadActiveDraftState();
  showToast(`已恢复“${target.name}”最近一次应用颜色`);
}
```

把 `[data-color-action="cancel"]` 绑定改为 `cancelCurrentPaletteDraft`。

- [ ] **Step 4: 增加关闭确认与放弃全部草稿**

完整加入：

```js
function discardAllPaletteDrafts() {
  Object.entries(paletteTargets).forEach(([targetId, target]) => {
    paletteDrafts[targetId] = {
      originalColor: target.color,
      safeColor: createSafeColor(target.color),
      mode: "original",
      dirty: false,
    };
    paintColorTarget(targetId, target.color);
  });
}

function requestPaletteClose() {
  const confirmBar = paletteElement.querySelector("[data-palette-discard-confirm]");
  if (!hasPaletteDraftChanges()) {
    paletteElement.classList.remove("is-open");
    return true;
  }
  confirmBar.hidden = false;
  return false;
}

function finishPaletteClose(discard) {
  const confirmBar = paletteElement.querySelector("[data-palette-discard-confirm]");
  confirmBar.hidden = true;
  if (!discard) return;
  discardAllPaletteDrafts();
  paletteElement.classList.remove("is-open");
  if (pendingOverlayAfterPalette) {
    const next = pendingOverlayAfterPalette;
    pendingOverlayAfterPalette = null;
    openOverlay(next.id, { paletteScope: next.paletteScope });
  }
}
```

关闭按钮使用：

```js
if (button.dataset.overlayClose === "palette") {
  requestPaletteClose();
  return;
}
```

确认条绑定：

```js
paletteElement.querySelectorAll("[data-palette-discard-action]").forEach((button) => {
  button.addEventListener("click", () => {
    finishPaletteClose(button.dataset.paletteDiscardAction === "discard");
  });
});
```

- [ ] **Step 5: 完成空状态创建入口的静态反馈**

```js
paletteEmptyCreate.addEventListener("click", () => {
  showToast(
    `真实前端将在此新建 ${activePaletteSourceType.toUpperCase()} 来源集合；校准台不写入工作区`,
  );
});
```

- [ ] **Step 6: 运行静态契约**

Run:

```powershell
node scripts/check-ui-calibration-palette-contract.cjs
```

Expected:

```text
文件夹与来源调色盘拆分静态契约通过
```

## Task 5: 更新校准说明、README 与 AGENTS

**Files:**
- Modify: `Docs/ui-calibration/constellation-v4-ui-calibration.html:7207-7237`
- Modify: `README.md:17`
- Modify: `README.md:109`
- Modify: `AGENTS.md:165`
- Test: `scripts/check-ui-calibration-palette-contract.cjs`

- [ ] **Step 1: 将组件指南中的统一调色盘拆成两项**

用以下两项替换原“统一调色盘”说明：

```html
<article class="component-guide-item">
  <strong>文件夹颜色</strong>
  <dl>
    <dt>功能</dt><dd>修改彩虹文件夹颜色，并同步本地引用、知识树和图谱。</dd>
    <dt>入口</dt><dd>左侧“独立表面 → 文件夹颜色”。</dd>
    <dt>用法</dt><dd>选择真实文件夹，取色后应用到文件夹；本地引用只继承，不单独改色。</dd>
    <dt>数据</dt><dd>正式实现写入 <code>.constellation/folders.json</code>。</dd>
  </dl>
</article>
<article class="component-guide-item">
  <strong>来源颜色</strong>
  <dl>
    <dt>功能</dt><dd>修改 URL 或 AI 来源集合颜色，并同步外部引用与图谱来源。</dd>
    <dt>入口</dt><dd>左侧“独立表面 → 来源颜色”。</dd>
    <dt>用法</dt><dd>先通过 URL / AI 分段切换类型，再选择来源集合和颜色。</dd>
    <dt>数据</dt><dd>正式实现写入 <code>.constellation/source-collections.json</code>。</dd>
  </dl>
</article>
```

- [ ] **Step 2: 更新 README 顶部校准台概述**

将“统一调色盘”相关句子更新为：

```markdown
“独立表面”将调色能力拆为“文件夹颜色”和“来源颜色”两个并列入口：文件夹颜色只管理真实彩虹文件夹，并让本地引用、知识树和图谱继承；来源颜色通过 URL / AI 分段切换来源集合，并同步胶囊、竖线、来源预览框、图谱节点和显式来源边。两者复用同一套色环、原始色/UI 安全色和预设色组件，但不混合目标列表。
```

- [ ] **Step 3: 替换 README 功能特性**

```markdown
- **文件夹颜色与来源颜色（UI 已校准，运行时待实施）** — “独立表面”提供两个并列入口。文件夹颜色对应 `.constellation/folders.json`，只管理真实彩虹文件夹；来源颜色对应 `.constellation/source-collections.json`，通过 URL / AI 分段切换来源集合。两者共用“取色 → 选择原始色或 UI 安全色 → 应用”的精简核心，关联视图只继承、不覆盖。
```

- [ ] **Step 4: 更新 AGENTS 调色盘约束**

将现有“统一调色盘”句子改为：

```markdown
- 本地文件夹颜色存于 `.constellation/folders.json`；URL 与 AI 来源集合颜色存于 `.constellation/source-collections.json`。本地引用继承目标文件所在文件夹颜色，URL/AI 引用继承其来源集合颜色；胶囊、竖线、来源预览框、图谱节点和显式来源边必须使用同一解析颜色，禁止保存视图级颜色覆盖。文件夹颜色与来源颜色必须作为两个并列入口，不得把本地文件夹、URL 和 AI 目标混入同一首层列表；来源颜色内部使用 URL / AI 分段切换。两个入口必须复用同一取色核心，默认流程保持为“色环取色 -> 选择原始色或 UI 安全色 -> 应用”；RGB/HSL、明度、饱和度、透明度、安全色强度、对比度和历史管理等低频参数必须放入设置的“高级取色”。
```

- [ ] **Step 5: 运行文档与静态检查**

Run:

```powershell
node scripts/check-ui-calibration-palette-contract.cjs
git diff --check -- Docs/ui-calibration/constellation-v4-ui-calibration.html README.md AGENTS.md scripts/check-ui-calibration-palette-contract.cjs Docs/superpowers/specs/2026-06-15-split-color-palettes-design.md Docs/superpowers/plans/2026-06-15-split-color-palettes.md
```

Expected: 静态契约通过；`git diff --check` 退出码为 `0`。

## Task 6: 浏览器交互、主题与版权验证

**Files:**
- Verify: `Docs/ui-calibration/constellation-v4-ui-calibration.html`
- Verify: `LICENSE`

- [ ] **Step 1: 验证文件夹颜色入口**

使用 Playwright 打开本地 HTML 后：

1. 点击 `[data-palette-scope="folder"]`。
2. 断言 `[data-palette-title]` 文本为“文件夹颜色”。
3. 断言 `[data-palette-source-segments]` 隐藏。
4. 断言所有目标按钮对应 `paletteTargets[*].scope === "folder"`。
5. 断言 `folder-tree` 预览可见。
6. 修改 HEX 后断言只有当前 `data-color-target` 使用草稿色。
7. 点击“应用到文件夹”，断言面板保持打开且 toast 表示文件夹颜色已应用。

- [ ] **Step 2: 验证来源颜色与 URL/AI 分段**

1. 关闭文件夹调色盘；若有草稿，先点击“放弃修改”。
2. 点击 `[data-palette-scope="source"]`。
3. 断言标题为“来源颜色”，分段按钮可见。
4. URL 状态只显示 `sourceType === "url"` 的目标，应用按钮为“应用到 URL 来源集合”。
5. 修改 URL 草稿但不应用，切换 AI。
6. AI 状态只显示 `sourceType === "ai"` 的目标，应用按钮为“应用到 AI 来源集合”。
7. 修改 AI 草稿，再切回 URL，断言 URL 草稿恢复且 AI 草稿未覆盖 URL。
8. 断言来源上下文隐藏文件树预览。

- [ ] **Step 3: 验证应用、取消与关闭确认**

1. 对 URL 目标修改颜色，点击“取消”，断言恢复最近一次已应用颜色且面板保持打开。
2. 再次修改颜色并点击关闭按钮。
3. 断言 `[data-palette-discard-confirm]` 可见，面板仍打开。
4. 点击“继续编辑”，确认条隐藏且草稿保留。
5. 再次关闭并点击“放弃修改”，断言面板关闭且所有未应用目标恢复已应用颜色。
6. 存在未应用草稿时点击快捷便签入口，断言先显示调色盘确认条；放弃后才打开快捷便签。

- [ ] **Step 4: 验证三套主题与来源图案**

分别切换 Light、Warm、Dark，断言：

- 两个入口、分段按钮、目标列表与确认条使用 Design Tokens。
- 无系统原生白底按钮和原生选择框。
- URL 目标使用窄体挖空 `U` SVG。
- AI 目标使用挖空 `AI` SVG，`I` 无上下横线。
- 文件夹目标使用文件夹图案，不使用 URL/AI 字体字形。
- 浮层不超出设备边界，无横向滚动。
- 浏览器 `pageerror` 数量为 `0`。

- [ ] **Step 5: 最终静态与版权检查**

Run:

```powershell
node scripts/check-ui-calibration-palette-contract.cjs
node scripts/check-ui-calibration-reference-contract.cjs
node scripts/check-ui-calibration-context-menu-contract.cjs
git diff --check -- Docs/ui-calibration/constellation-v4-ui-calibration.html README.md AGENTS.md scripts/check-ui-calibration-palette-contract.cjs Docs/superpowers/specs/2026-06-15-split-color-palettes-design.md Docs/superpowers/plans/2026-06-15-split-color-palettes.md
Get-FileHash -Algorithm SHA256 -LiteralPath LICENSE
```

Expected:

- 三个静态契约脚本全部通过。
- `git diff --check` 退出码为 `0`。
- `LICENSE` SHA256 保持：

```text
2B30AE5698DC0DAC45082B3694020E593E9B513A28C0691F6DD2F662502D7E58
```

## 计划自检

- 两个并列入口由 Task 2 覆盖，不保留统一总入口。
- 文件夹目标与 URL/AI 来源目标的首层分离由 Task 2–3 覆盖。
- URL/AI 分段切换、挖空图案和独立草稿由 Task 2–3 覆盖。
- 一套共享取色核心由现有色环逻辑复用，计划未复制颜色算法。
- 当前目标应用、当前目标取消、全部草稿关闭确认由 Task 4 覆盖。
- 文件夹和来源空状态由 Task 2–4 覆盖，但不创建真实工作区数据。
- README、AGENTS 和组件指南同步由 Task 5 覆盖。
- 静态契约、浏览器交互、三主题、既有引用契约和版权哈希由 Task 6 覆盖。
- 未包含正式 React、Tauri、Rust、JSON 读写或视图级颜色覆盖。
