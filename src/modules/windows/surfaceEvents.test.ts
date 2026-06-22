/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, test } from "vitest";
import { NOTE_SURFACE_ACTION_EVENT } from "./surfaceActions";
import { NOTE_SURFACE_MODE_EVENT } from "./surfaceMode";

describe("Constellation note-surface events", () => {
  test("uses the Constellation event namespace", () => {
    expect(NOTE_SURFACE_MODE_EVENT).toBe("constellation:surface-mode");
    expect(NOTE_SURFACE_ACTION_EVENT).toBe("constellation:surface-action");
  });
});
