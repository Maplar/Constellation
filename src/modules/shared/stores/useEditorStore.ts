/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";
import type { PreviewSubMode } from "../types/notes";

interface EditorStoreState {
  insertAtCursor: ((text: string) => boolean) | null;
  previewSubMode: PreviewSubMode;
}

interface EditorStoreActions {
  registerInsertAtCursor: (fn: (text: string) => boolean) => void;
  unregisterInsertAtCursor: () => void;
  setPreviewSubMode: (mode: PreviewSubMode) => void;
}

type EditorStore = EditorStoreState & EditorStoreActions;

export const useEditorStore = create<EditorStore>((set) => ({
  insertAtCursor: null,
  previewSubMode: "markdown",

  registerInsertAtCursor: (fn) => {
    set({ insertAtCursor: fn });
  },

  unregisterInsertAtCursor: () => {
    set({ insertAtCursor: null });
  },

  setPreviewSubMode: (mode) => {
    set({ previewSubMode: mode });
  },
}));
