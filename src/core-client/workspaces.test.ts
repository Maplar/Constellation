/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { connectWorkspace } from "./workspaces";

describe("connectWorkspace", () => {
  it("registers a directory before opening its WorkspaceService record", async () => {
    invoke.mockResolvedValueOnce({ id: "workspace-1", path: "D:/knowledge" });
    invoke.mockResolvedValueOnce({ id: "workspace-1", path: "D:/knowledge" });

    await connectWorkspace("D:/knowledge");

    expect(invoke).toHaveBeenNthCalledWith(1, "workspace_register", {
      path: "D:/knowledge",
      name: undefined,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "workspace_open", { id: "workspace-1" });
  });
});
