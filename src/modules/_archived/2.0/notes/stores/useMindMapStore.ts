/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：思维导图状态管理
 */

import { create } from "zustand";
import type { MindMapData, MindMapNode } from "../../shared/types/notes";
import {
  addChildNode,
  deleteNode,
  renameNode,
  updateNodeLink,
} from "../services/mindMapParser";

interface MindMapStoreState {
  currentMindMap: MindMapData | null;
  currentNoteId: string | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}

interface MindMapStoreActions {
  setMindMap: (data: MindMapData | null, noteId: string | null) => void;
  updateMindMap: (data: MindMapData) => void;
  addChild: (parentNodeId: string, title?: string) => void;
  deleteChild: (nodeId: string) => void;
  rename: (nodeId: string, newTitle: string) => void;
  linkNote: (nodeId: string, linkedNoteId: string | null) => void;
  markDirty: () => void;
  clearDirty: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type MindMapStore = MindMapStoreState & MindMapStoreActions;

export const useMindMapStore = create<MindMapStore>((set, get) => ({
  currentMindMap: null,
  currentNoteId: null,
  isDirty: false,
  isLoading: false,
  error: null,

  setMindMap: (data, noteId) => {
    set({
      currentMindMap: data,
      currentNoteId: noteId,
      isDirty: false,
      error: null,
    });
  },

  updateMindMap: (data) => {
    set({ currentMindMap: data, isDirty: true });
  },

  addChild: (parentNodeId, title) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    const newData = addChildNode(currentMindMap.root, parentNodeId, title);
    set({ currentMindMap: newData, isDirty: true });
  },

  deleteChild: (nodeId) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    const newData = deleteNode(currentMindMap.root, nodeId);
    set({ currentMindMap: newData, isDirty: true });
  },

  rename: (nodeId, newTitle) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    const newData = renameNode(currentMindMap.root, nodeId, newTitle);
    set({ currentMindMap: newData, isDirty: true });
  },

  linkNote: (nodeId, linkedNoteId) => {
    const { currentMindMap } = get();
    if (!currentMindMap) return;

    const newData = updateNodeLink(currentMindMap.root, nodeId, linkedNoteId);
    set({ currentMindMap: newData, isDirty: true });
  },

  markDirty: () => set({ isDirty: true }),
  clearDirty: () => set({ isDirty: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
