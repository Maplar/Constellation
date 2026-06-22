/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：重构 v4 自由卡片仪表盘布局、尺寸预设与版本迁移
 */

import { create } from "zustand";

export type CardWidth = "half" | "full";

export type CardType =
  | "relation-graph"
  | "quick-capture"
  | "recent-notes"
  | "random-note"
  | "ai-status"
  | "orphan-notes"
  | "note-stats"
  | "link-stats"
  | "category-distribution"
  | "citation-ranking"
  | "summary-stats"
  | "suggestion-inbox"
  | "workspace-diagnostics";

export interface DashboardCardConfig {
  id: string;
  type: CardType;
  title: string;
  width: CardWidth;
}

interface CardCatalogEntry {
  type: CardType;
  title: string;
  width: CardWidth;
  icon: string;
}

export const CARD_CATALOG: CardCatalogEntry[] = [
  { type: "relation-graph", title: "全局知识图谱", width: "full", icon: "graph" },
  { type: "quick-capture", title: "快速记录", width: "half", icon: "capture" },
  { type: "recent-notes", title: "最近编辑", width: "half", icon: "recent" },
  { type: "random-note", title: "随机漫游", width: "half", icon: "random" },
  { type: "orphan-notes", title: "待串联碎片", width: "half", icon: "orphan" },
  { type: "ai-status", title: "AI 数据库状态", width: "half", icon: "ai" },
  { type: "suggestion-inbox", title: "AI 建议收件箱", width: "half", icon: "inbox" },
  { type: "workspace-diagnostics", title: "知识库诊断", width: "half", icon: "health" },
  { type: "category-distribution", title: "文件夹分布", width: "half", icon: "pie" },
  { type: "citation-ranking", title: "引用排行", width: "half", icon: "rank" },
  { type: "note-stats", title: "笔记统计", width: "half", icon: "stats" },
  { type: "link-stats", title: "链接统计", width: "half", icon: "link" },
  { type: "summary-stats", title: "统计概览", width: "half", icon: "summary" },
];

const DEFAULT_CARDS: DashboardCardConfig[] = [
  { id: "default-quick-capture", type: "quick-capture", title: "快速记录", width: "half" },
  { id: "default-recent-notes", type: "recent-notes", title: "最近编辑", width: "half" },
  { id: "default-relation-graph", type: "relation-graph", title: "全局知识图谱", width: "full" },
  { id: "default-suggestion-inbox", type: "suggestion-inbox", title: "AI 建议收件箱", width: "half" },
  { id: "default-ai-status", type: "ai-status", title: "AI 数据库状态", width: "half" },
];

interface VisualizationState {
  cards: DashboardCardConfig[];
  workspaceKey: string;
  setWorkspace: (path: string) => void;
  addCard: (type: CardType) => boolean;
  removeCard: (id: string) => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
  setCardWidth: (id: string, width: CardWidth) => void;
  resetLayout: () => void;
}

function workspaceStorageKey(path: string): string {
  let hash = 2166136261;
  for (const character of path.trim().toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `constellation-dashboard-layout:v3:${(hash >>> 0).toString(16)}`;
}

function readWorkspaceCards(path: string): DashboardCardConfig[] {
  if (typeof localStorage === "undefined") return DEFAULT_CARDS;
  try {
    const current = localStorage.getItem(workspaceStorageKey(path));
    if (current) return migrateCards(JSON.parse(current));
    const legacy = localStorage.getItem("constellation-dashboard-layout");
    if (legacy) {
      const parsed = JSON.parse(legacy) as { state?: unknown };
      return migrateCards(parsed.state ?? parsed);
    }
  } catch {
    // Invalid layout data is replaceable derived configuration.
  }
  return DEFAULT_CARDS;
}

function writeWorkspaceCards(path: string, cards: DashboardCardConfig[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(workspaceStorageKey(path), JSON.stringify({ cards }));
}

function generateCardId(type: CardType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getAvailableCardTypes(existingCards: DashboardCardConfig[]): CardCatalogEntry[] {
  const addedTypes = new Set(existingCards.map((card) => card.type));
  return CARD_CATALOG.filter((entry) => !addedTypes.has(entry.type));
}

function migrateCards(value: unknown): DashboardCardConfig[] {
  if (!value || typeof value !== "object") return DEFAULT_CARDS;
  const cards = (value as { cards?: unknown }).cards;
  if (!Array.isArray(cards)) return DEFAULT_CARDS;
  const allowed = new Set(CARD_CATALOG.map((entry) => entry.type));
  return cards.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const card = value as Partial<DashboardCardConfig>;
    if (
      typeof card.id !== "string" ||
      typeof card.type !== "string" ||
      !allowed.has(card.type as CardType)
    ) {
      return [];
    }
    const catalog = CARD_CATALOG.find((entry) => entry.type === card.type);
    return [{
      id: card.id,
      type: card.type as CardType,
      title: typeof card.title === "string" ? card.title : catalog?.title ?? card.type,
      width: card.width === "full" ? "full" : "half",
    }];
  });
}

export const useVisualizationStore = create<VisualizationState>((set, get) => ({
      cards: readWorkspaceCards("default"),
      workspaceKey: "default",
      setWorkspace: (path) => {
        const key = path.trim() || "default";
        if (key === get().workspaceKey) return;
        writeWorkspaceCards(get().workspaceKey, get().cards);
        set({ workspaceKey: key, cards: readWorkspaceCards(key) });
      },
      addCard: (type) => {
        const entry = CARD_CATALOG.find((item) => item.type === type);
        if (!entry) return false;
        let added = false;
        set((state) => {
          if (state.cards.some((card) => card.type === type)) return state;
          added = true;
          const cards = [
            ...state.cards,
            {
              id: generateCardId(type),
              type,
              title: entry.title,
              width: entry.width,
            },
          ];
          writeWorkspaceCards(state.workspaceKey, cards);
          return {
            cards,
          };
        });
        return added;
      },
      removeCard: (id) =>
        set((state) => {
          const cards = state.cards.filter((card) => card.id !== id);
          writeWorkspaceCards(state.workspaceKey, cards);
          return { cards };
        }),
      reorderCards: (fromIndex, toIndex) =>
        set((state) => {
          const cards = [...state.cards];
          const [moved] = cards.splice(fromIndex, 1);
          if (!moved) return state;
          cards.splice(toIndex, 0, moved);
          writeWorkspaceCards(state.workspaceKey, cards);
          return { cards };
        }),
      setCardWidth: (id, width) =>
        set((state) => {
          const cards = state.cards.map((card) => (card.id === id ? { ...card, width } : card));
          writeWorkspaceCards(state.workspaceKey, cards);
          return { cards };
        }),
      resetLayout: () =>
        set((state) => {
          writeWorkspaceCards(state.workspaceKey, DEFAULT_CARDS);
          return { cards: DEFAULT_CARDS };
        }),
}));
