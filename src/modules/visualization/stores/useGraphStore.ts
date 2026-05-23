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
  activeMode: GraphMode;
  dimensionMode: DimensionMode;
  sidebarCollapsed: boolean;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  graphParams: GraphParams;
  activeFilters: string[];

  setActiveMode: (mode: GraphMode) => void;
  toggleDimension: () => void;
  toggleSidebar: () => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  updateGraphParams: (partial: Partial<GraphParams>) => void;
  toggleFilter: (category: string) => void;
  setActiveFilters: (filters: string[]) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  activeMode: "relation",
  dimensionMode: "2D",
  sidebarCollapsed: false,
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: "",
  graphParams: {
    forceStrength: 1.0,
    orbitDistance: 200,
    orbitDensity: true,
    showLinks: true,
    autoRotate: true,
    glowIntensity: 0.6,
    particleCount: 500,
  },
  activeFilters: [],

  setActiveMode: (mode) => set({ activeMode: mode }),
  toggleDimension: () =>
    set((state) => ({
      dimensionMode: state.dimensionMode === "2D" ? "3D" : "2D",
    })),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
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
  setActiveFilters: (filters) => set({ activeFilters: filters }),
}));
