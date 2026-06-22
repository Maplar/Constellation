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
