/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("ForceGraph2D import", () => {
  it("can be imported without errors", async () => {
    const mod = await import("../components/ForceGraph2D");
    expect(mod.ForceGraph2D).toBeDefined();
  });
});

describe("GraphView import", () => {
  it("can be imported without errors", async () => {
    const mod = await import("../components/GraphView");
    expect(mod.GraphView).toBeDefined();
  });
});

describe("linkParser integration", () => {
  it("buildLinkGraph is callable", async () => {
    const { buildLinkGraph } = await import("../linkParser");
    const result = buildLinkGraph([]);
    expect(result).toEqual({ nodes: [], edges: [] });
  });
});
