/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";

export type GraphMode = "relation" | "galaxy" | "starcluster" | "dashboard";
export type DimensionMode = "2D" | "3D";

interface GraphState {
  activeMode: GraphMode;
  dimensionMode: DimensionMode;
  sidebarCollapsed: boolean;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;

  setActiveMode: (mode: GraphMode) => void;
  toggleDimension: () => void;
  toggleSidebar: () => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  activeMode: "relation",
  dimensionMode: "2D",
  sidebarCollapsed: false,
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: "",

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
}));
