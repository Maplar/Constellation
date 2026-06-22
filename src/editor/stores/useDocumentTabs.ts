/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";

export interface DocumentTab {
  id: string;
  title: string;
  pinned: boolean;
}

interface PersistedTabs {
  version: 1;
  activeTabId: string | null;
  tabs: DocumentTab[];
}

interface DocumentTabsState extends PersistedTabs {
  workspaceKey: string;
  setWorkspaceKey: (workspaceKey: string) => void;
  openTab: (tab: Pick<DocumentTab, "id" | "title">, mode?: "new" | "replace") => void;
  closeTab: (id: string) => string | null;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  togglePinned: (id: string) => void;
  reorderTab: (sourceId: string, targetId: string) => void;
}

const STORAGE_PREFIX = "constellation:v4:tabs:";

function storageKey(workspaceKey: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(workspaceKey || "default")}`;
}

function readTabs(workspaceKey: string): PersistedTabs {
  if (typeof localStorage === "undefined") {
    return { version: 1, activeTabId: null, tabs: [] };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(workspaceKey)) ?? "");
    if (parsed?.version === 1 && Array.isArray(parsed.tabs)) {
      return {
        version: 1,
        activeTabId:
          typeof parsed.activeTabId === "string" ? parsed.activeTabId : null,
        tabs: parsed.tabs.filter(
          (tab: unknown): tab is DocumentTab =>
            Boolean(
              tab &&
                typeof tab === "object" &&
                "id" in tab &&
                typeof tab.id === "string" &&
                "title" in tab &&
                typeof tab.title === "string",
            ),
        ),
      };
    }
  } catch {
    // Invalid session data is disposable.
  }
  return { version: 1, activeTabId: null, tabs: [] };
}

function persist(workspaceKey: string, state: PersistedTabs): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(workspaceKey), JSON.stringify(state));
}

export const useDocumentTabs = create<DocumentTabsState>((set, get) => ({
  version: 1,
  workspaceKey: "",
  activeTabId: null,
  tabs: [],

  setWorkspaceKey: (workspaceKey) => {
    const current = get();
    if (current.workspaceKey === workspaceKey) return;
    if (current.workspaceKey) {
      persist(current.workspaceKey, {
        version: 1,
        activeTabId: current.activeTabId,
        tabs: current.tabs,
      });
    }
    set({ workspaceKey, ...readTabs(workspaceKey) });
  },

  openTab: (tab, mode = "new") => {
    const current = get();
    const existing = current.tabs.find((item) => item.id === tab.id);
    let tabs = current.tabs;
    if (existing) {
      tabs = tabs.map((item) =>
        item.id === tab.id ? { ...item, title: tab.title } : item,
      );
    } else if (mode === "replace" && current.activeTabId) {
      const active = tabs.find((item) => item.id === current.activeTabId);
      tabs =
        active && !active.pinned
          ? tabs.map((item) =>
              item.id === active.id ? { ...tab, pinned: false } : item,
            )
          : [...tabs, { ...tab, pinned: false }];
    } else {
      tabs = [...tabs, { ...tab, pinned: false }];
    }
    const next = { version: 1 as const, activeTabId: tab.id, tabs };
    set(next);
    persist(current.workspaceKey, next);
  },

  closeTab: (id) => {
    const current = get();
    const index = current.tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return current.activeTabId;
    const tabs = current.tabs.filter((tab) => tab.id !== id);
    const activeTabId =
      current.activeTabId === id
        ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? null)
        : current.activeTabId;
    const next = { version: 1 as const, activeTabId, tabs };
    set(next);
    persist(current.workspaceKey, next);
    return activeTabId;
  },

  setActiveTab: (id) => {
    const current = get();
    if (!current.tabs.some((tab) => tab.id === id)) return;
    const next = { version: 1 as const, activeTabId: id, tabs: current.tabs };
    set({ activeTabId: id });
    persist(current.workspaceKey, next);
  },

  updateTabTitle: (id, title) => {
    const current = get();
    const tabs = current.tabs.map((tab) => (tab.id === id ? { ...tab, title } : tab));
    const next = { version: 1 as const, activeTabId: current.activeTabId, tabs };
    set({ tabs });
    persist(current.workspaceKey, next);
  },

  togglePinned: (id) => {
    const current = get();
    const tabs = current.tabs.map((tab) =>
      tab.id === id ? { ...tab, pinned: !tab.pinned } : tab,
    );
    const next = { version: 1 as const, activeTabId: current.activeTabId, tabs };
    set({ tabs });
    persist(current.workspaceKey, next);
  },

  reorderTab: (sourceId, targetId) => {
    if (sourceId === targetId) return;
    const current = get();
    const sourceIndex = current.tabs.findIndex((tab) => tab.id === sourceId);
    const targetIndex = current.tabs.findIndex((tab) => tab.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const tabs = [...current.tabs];
    const [source] = tabs.splice(sourceIndex, 1);
    if (!source) return;
    tabs.splice(targetIndex, 0, source);
    const next = { version: 1 as const, activeTabId: current.activeTabId, tabs };
    set({ tabs });
    persist(current.workspaceKey, next);
  },
}));

export interface OpenDocumentTabDetail {
  documentId: string;
  mode?: "new" | "replace";
}

export function requestOpenDocumentTab(
  documentId: string,
  mode: "new" | "replace" = "new",
): void {
  window.dispatchEvent(
    new CustomEvent<OpenDocumentTabDetail>("open-document-tab", {
      detail: { documentId, mode },
    }),
  );
}
