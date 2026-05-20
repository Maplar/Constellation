/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { describe, expect, test } from "vitest";
import { noteContextMenuItems } from "./noteContextMenu";

describe("noteContextMenuItems", () => {
  test("includes export, move, and delete actions", () => {
    expect(noteContextMenuItems).toEqual([
      { action: "export", label: "导出 Markdown" },
      { action: "move", label: "移动到分类…" },
      { action: "delete", label: "删除笔记", tone: "danger" },
    ]);
  });
});
