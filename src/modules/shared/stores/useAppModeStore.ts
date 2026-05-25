/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";
import { useVisualizationStore } from "../../visualization/stores/useVisualizationStore";

export type AppMode = "edit" | "dashboard";

interface AppModeState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useAppModeStore = create<AppModeState>((set) => ({
  mode: "edit",
  setMode: (newMode) => {
    const { saveLayout } = useVisualizationStore.getState();
    saveLayout();
    set({ mode: newMode });
  },
}));
