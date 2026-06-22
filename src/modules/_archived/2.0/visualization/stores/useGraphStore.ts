/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";

export type GraphMode = "relation" | "dashboard";

export interface GraphParams {
  forceStrength: number;     // 0.1 ~ 2.0, 默认 1.0
  showLinks: boolean;        // 显示 Wiki-Link 连线
  nodeRadiusScale: number;   // 节点半径缩放 0.5 ~ 2.0, 默认 1.0
}

interface GraphState {
  /* ── 视图状态 ── */
  activeMode: GraphMode;
  activeView: GraphMode;                       // 别名，与 activeMode 同步
  sidebarCollapsed: boolean;

  /* ── 选择与悬停 ── */
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  /* ── 搜索与筛选 ── */
  searchQuery: string;
  activeFilters: string[];

  /* ── 图谱参数 ── */
  graphParams: GraphParams;

  /* ── 动作 ── */
  setActiveMode: (mode: GraphMode) => void;
  setActiveView: (view: GraphMode) => void;    // 别名
  toggleSidebar: () => void;
  selectNode: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void; // 别名
  hoverNode: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  updateGraphParams: (partial: Partial<GraphParams>) => void;
  toggleFilter: (category: string) => void;
  setActiveFilters: (filters: string[]) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  /* ── 视图状态 ── */
  activeMode: "relation",
  activeView: "relation",
  sidebarCollapsed: false,

  /* ── 选择与悬停 ── */
  selectedNodeId: null,
  hoveredNodeId: null,

  /* ── 搜索与筛选 ── */
  searchQuery: "",
  activeFilters: [],

  /* ── 图谱参数 ── */
  graphParams: {
    forceStrength: 1.0,
    showLinks: true,
    nodeRadiusScale: 1.0,
  },

  /* ── 动作 ── */
  setActiveMode: (mode) =>
    set({ activeMode: mode, activeView: mode }),

  setActiveView: (view) =>
    set({ activeView: view, activeMode: view }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  selectNode: (id) =>
    set({ selectedNodeId: id }),

  setSelectedNode: (id) =>
    set({ selectedNodeId: id }),

  hoverNode: (id) =>
    set({ hoveredNodeId: id }),

  setSearchQuery: (q) =>
    set({ searchQuery: q }),

  updateGraphParams: (partial) =>
    set((state) => ({
      graphParams: { ...state.graphParams, ...partial },
    })),

  toggleFilter: (category) =>
    set((state) => {
      const filters = state.activeFilters;
      const next = filters.includes(category)
        ? filters.filter((f) => f !== category)
        : [...filters, category];
      return { activeFilters: next };
    }),

  setActiveFilters: (filters) =>
    set({ activeFilters: filters }),
}));
