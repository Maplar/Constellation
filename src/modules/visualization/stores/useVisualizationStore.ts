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
  | "starcluster"
  | "note-stats"
  | "link-stats"
  | "category-distribution"
  | "citation-ranking";

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
  { type: "starcluster", title: "引用星团图", width: "half", icon: "star" },
  { type: "note-stats", title: "笔记统计", width: "half", icon: "stats" },
  { type: "link-stats", title: "链接统计", width: "half", icon: "link" },
  { type: "category-distribution", title: "分类分布", width: "half", icon: "pie" },
  { type: "citation-ranking", title: "引用排行", width: "half", icon: "rank" },
];

const DEFAULT_CARD_TYPES: CardType[] = [
  "relation-graph",
  "mindmap-galaxy",
  "starcluster",
  "note-stats",
  "link-stats",
];

interface VisualizationState {
  cards: DashboardCardConfig[];
  addCard: (type: CardType) => void;
  removeCard: (id: string) => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
}

function generateCardId(type: CardType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function initCards(): DashboardCardConfig[] {
  return DEFAULT_CARD_TYPES.map((type) => {
    const entry = CARD_CATALOG.find((c) => c.type === type);
    return {
      id: generateCardId(type),
      type,
      title: entry?.title ?? type,
      width: entry?.width ?? "half",
    };
  });
}

export const useVisualizationStore = create<VisualizationState>()(
  persist(
    (set) => ({
      cards: initCards(),

      addCard: (type) =>
        set((state) => {
          const entry = CARD_CATALOG.find((c) => c.type === type);
          if (!entry) return state;
          const card: DashboardCardConfig = {
            id: generateCardId(type),
            type: entry.type,
            title: entry.title,
            width: entry.width,
          };
          return { cards: [...state.cards, card] };
        }),

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
    }),
    {
      name: "constellation-dashboard-layout",
      partialize: (state) => ({ cards: state.cards }),
    },
  ),
);
