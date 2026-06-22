/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, test } from "vitest";
import { isCurrentWindowMaximized } from "./controls";

describe("window controls outside Tauri", () => {
  test("reports a non-maximized window in browser preview mode", async () => {
    await expect(isCurrentWindowMaximized()).resolves.toBe(false);
  });
});
