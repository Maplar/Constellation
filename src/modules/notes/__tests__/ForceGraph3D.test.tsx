/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("ForceGraph3D import", () => {
  it("can be imported without errors", async () => {
    const mod = await import("../components/ForceGraph3D");
    expect(mod.ForceGraph3D).toBeDefined();
  });
});

describe("GraphView with 3D toggle", () => {
  it("exports ForceGraph3D alongside ForceGraph2D", async () => {
    const mod3d = await import("../components/ForceGraph3D");
    const mod2d = await import("../components/ForceGraph2D");
    expect(mod3d.ForceGraph3D).toBeDefined();
    expect(mod2d.ForceGraph2D).toBeDefined();
  });
});
