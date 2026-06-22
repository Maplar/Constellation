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

const htmlContracts = [
  ['data-reference-component="content"', "编辑器内容框展开开关"],
  ['id="reference-default-capsule-position"', "设置页胶囊默认位置"],
  ['id="reference-default-content-placement"', "设置页内容框默认位置"],
  ['value="inline"', "段落内位置"],
  ['value="between"', "段落之间位置"],
  ['value="tight"', "紧靠主胶囊位置"],
  ['value="gap-3"', "距主胶囊三行位置"],
  ["主引用锚点", "胶囊主关系说明"],
  ["从属内容框", "矩形内容框从关系说明"],
  ["内容框必须依附胶囊", "内容框依赖规则"],
  ["function resolveReferenceInsertPoint", "插入点解析函数"],
  ["function buildReferenceInsertions", "主从组件插入计划函数"],
];

for (const [token, label] of htmlContracts) {
  assert.ok(html.includes(token), `HTML 缺少：${label} (${token})`);
}

assert.ok(!html.includes('data-reference-component="capsule"'), "编辑器不应提供关闭主胶囊的控件");
assert.ok(!html.includes('id="capsule-insert-position"'), "编辑器不应显示胶囊位置设置");
assert.ok(!html.includes('id="content-placement-mode"'), "编辑器不应显示内容框位置设置");
assert.ok(readme.includes("不能独立存在"), "README 缺少内容框不能独立存在的说明");
assert.ok(readme.includes("主从关系"), "README 缺少胶囊与内容框主从关系说明");

console.log("引用主从布局静态契约通过");
