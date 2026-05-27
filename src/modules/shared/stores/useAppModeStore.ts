/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";

export type AppMode = "edit" | "dashboard";

interface AppModeState {
  mode: AppMode;
  isEditingDashboard: boolean;
  setMode: (mode: AppMode) => void;
  toggleEditingDashboard: () => void;
}

export const useAppModeStore = create<AppModeState>((set) => ({
  mode: "edit",
  isEditingDashboard: false,
  setMode: (newMode) => {
    set({ mode: newMode });
  },
  toggleEditingDashboard: () =>
    set((s) => ({ isEditingDashboard: !s.isEditingDashboard })),
}));
