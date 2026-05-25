/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CardWidth = "full" | "half";

export type CardType =
  | "relation-graph"
  | "mindmap-galaxy"
  | "note-stats"
  | "link-stats"
  | "category-distribution"
  | "citation-ranking"
  | "citation-bubble";

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
  { type: "relation-graph", title: "文件关系图", width: "full", icon: "graph" },
  { type: "mindmap-galaxy", title: "思维导图星系", width: "half", icon: "galaxy" },
  { type: "citation-bubble", title: "引用气泡图", width: "full", icon: "bubble" },
  { type: "category-distribution", title: "分类分布", width: "half", icon: "pie" },
  { type: "citation-ranking", title: "引用排行", width: "half", icon: "rank" },
  { type: "note-stats", title: "笔记统计", width: "half", icon: "stats" },
  { type: "link-stats", title: "链接统计", width: "half", icon: "link" },
];

interface VisualizationState {
  cards: DashboardCardConfig[];
  addCard: (type: CardType) => boolean;
  removeCard: (id: string) => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
  saveLayout: () => void;
  loadLayout: () => void;
}

function generateCardId(type: CardType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getAvailableCardTypes(existingCards: DashboardCardConfig[]): CardCatalogEntry[] {
  const addedTypes = new Set(existingCards.map((c) => c.type));
  return CARD_CATALOG.filter((c) => !addedTypes.has(c.type));
}

export const useVisualizationStore = create<VisualizationState>()(
  persist(
    (set, get) => ({
      cards: [],

      addCard: (type) => {
        const entry = CARD_CATALOG.find((c) => c.type === type);
        if (!entry) return false;
        let added = false;
        set((state) => {
          if (state.cards.some((c) => c.type === type)) return state;
          added = true;
          const card: DashboardCardConfig = {
            id: generateCardId(type),
            type: entry.type,
            title: entry.title,
            width: entry.width,
          };
          return { cards: [...state.cards, card] };
        });
        return added;
      },

      removeCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
        })),

      reorderCards: (fromIndex, toIndex) =>
        set((state) => {
          const next = [...state.cards];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return { cards: next };
        }),

      saveLayout: () => {
        const { cards } = get();
        localStorage.setItem("constellation-dashboard-layout", JSON.stringify({ state: { cards }, version: 0 }));
      },

      loadLayout: () => {
        const saved = localStorage.getItem("constellation-dashboard-layout");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            set({ cards: parsed.state?.cards || [] });
          } catch {
            // ignore parse errors
          }
        }
      },
    }),
    {
      name: "constellation-dashboard-layout",
      partialize: (state) => ({ cards: state.cards }),
    },
  ),
);
