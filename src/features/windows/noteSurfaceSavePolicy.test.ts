/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { describe, expect, test } from "vitest";
import { shouldSaveBeforeSwitchingToTile } from "./noteSurfaceSavePolicy";

describe("note surface save policy", () => {
  test("only saves before switching to tile when auto-save is enabled", () => {
    expect(shouldSaveBeforeSwitchingToTile(true)).toBe(true);
    expect(shouldSaveBeforeSwitchingToTile(false)).toBe(false);
  });
});
