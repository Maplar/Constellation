/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { beforeEach, describe, expect, test } from "vitest";
import { useDocumentTabs } from "./useDocumentTabs";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

describe("useDocumentTabs", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage(),
    });
    useDocumentTabs.setState({
      version: 1,
      workspaceKey: "",
      activeTabId: null,
      tabs: [],
    });
  });

  test("replace mode keeps pinned active tabs and adds a new tab", () => {
    const state = useDocumentTabs.getState();
    state.setWorkspaceKey("workspace-a");
    state.openTab({ id: "a", title: "A" });
    state.togglePinned("a");
    state.openTab({ id: "b", title: "B" }, "replace");

    expect(useDocumentTabs.getState().tabs.map((tab) => tab.id)).toEqual(["a", "b"]);
    expect(useDocumentTabs.getState().activeTabId).toBe("b");
  });

  test("replace mode replaces an unpinned active tab", () => {
    const state = useDocumentTabs.getState();
    state.setWorkspaceKey("workspace-a");
    state.openTab({ id: "a", title: "A" });
    state.openTab({ id: "b", title: "B" }, "replace");

    expect(useDocumentTabs.getState().tabs).toEqual([
      { id: "b", title: "B", pinned: false },
    ]);
  });

  test("workspace sessions restore independently", () => {
    const state = useDocumentTabs.getState();
    state.setWorkspaceKey("workspace-a");
    state.openTab({ id: "a", title: "A" });
    state.setWorkspaceKey("workspace-b");
    state.openTab({ id: "b", title: "B" });
    state.setWorkspaceKey("workspace-a");

    expect(useDocumentTabs.getState().activeTabId).toBe("a");
    expect(useDocumentTabs.getState().tabs.map((tab) => tab.id)).toEqual(["a"]);
  });
});
