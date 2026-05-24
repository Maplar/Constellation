/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";

export type GraphMode = "relation" | "galaxy" | "starcluster" | "dashboard";
export type DimensionMode = "2D" | "3D";

export interface GraphParams {
  forceStrength: number;   // 0.1 ~ 2.0, 默认 1.0
  orbitDistance: number;   // 星系展开距离 100 ~ 500, 默认 200
  orbitDensity: boolean;   // 显示轨道线
  showLinks: boolean;      // 显示 Wiki-Link 连线
  autoRotate: boolean;     // 3D 自动旋转
  glowIntensity: number;   // 0 ~ 1.0
  particleCount: number;   // 粒子数量 100 ~ 1000
}

interface GraphState {
  /* ── 视图状态 ── */
  activeMode: GraphMode;
  activeView: GraphMode;                       // 别名，与 activeMode 同步
  dimensionMode: DimensionMode;
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
  toggleDimension: () => void;
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
  dimensionMode: "2D",
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
    orbitDistance: 200,
    orbitDensity: true,
    showLinks: true,
    autoRotate: true,
    glowIntensity: 0.6,
    particleCount: 500,
  },

  /* ── 动作 ── */
  setActiveMode: (mode) =>
    set({ activeMode: mode, activeView: mode }),

  setActiveView: (view) =>
    set({ activeView: view, activeMode: view }),

  toggleDimension: () =>
    set((state) => ({
      dimensionMode: state.dimensionMode === "2D" ? "3D" : "2D",
    })),

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
