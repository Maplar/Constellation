/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：思维导图 Hook
 */

import { useCallback, useEffect } from "react";
import { useMindMapStore } from "../stores/useMindMapStore";
import {
  getMindMapForNote,
  saveMindMapForNote,
  importMindMapFile as importMindMapFileService,
} from "../services/mindMapStorage";
import { parseMindMapFile, exportMindMap } from "../services/mindMapParser";
import type { MindMapData } from "../../shared/types/notes";

interface UseMindMapOptions {
  notesDir: string;
  noteId: string;
  autoLoad?: boolean;
}

interface UseMindMapReturn {
  mindMap: MindMapData | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  loadMindMap: () => Promise<void>;
  saveMindMap: () => Promise<void>;
  importMindMap: (file: File) => Promise<void>;
  exportMindMapFile: (format: "json" | "xmind" | "mm") => Promise<void>;
}

export function useMindMap({
  notesDir,
  noteId,
  autoLoad = true,
}: UseMindMapOptions): UseMindMapReturn {
  const {
    currentMindMap,
    currentNoteId,
    isLoading,
    error,
    isDirty,
    setMindMap,
    setLoading,
    setError,
    clearDirty,
  } = useMindMapStore();

  // 只有当 noteId 匹配时才返回数据
  const mindMap = currentNoteId === noteId ? currentMindMap : null;

  const loadMindMap = useCallback(async () => {
    if (!notesDir || !noteId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getMindMapForNote(notesDir, noteId);
      setMindMap(data, noteId);
    } catch (err) {
      setError(String(err));
      setMindMap(null, noteId);
    } finally {
      setLoading(false);
    }
  }, [notesDir, noteId, setMindMap, setLoading, setError]);

  const saveMindMap = useCallback(async () => {
    if (!notesDir || !noteId || !currentMindMap) return;

    setLoading(true);
    setError(null);

    try {
      await saveMindMapForNote(notesDir, noteId, currentMindMap);
      clearDirty();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [notesDir, noteId, currentMindMap, setLoading, setError, clearDirty]);

  const importMindMap = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);

      try {
        let data: MindMapData;

        if (file.name.endsWith(".xmind")) {
          const buffer = await file.arrayBuffer();
          data = await parseMindMapFile(file.name, buffer);
        } else {
          const text = await file.text();
          data = await parseMindMapFile(file.name, text);
        }

        await importMindMapFileService(notesDir, noteId, data);
        setMindMap(data, noteId);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [notesDir, noteId, setMindMap, setLoading, setError]
  );

  const exportMindMapFile = useCallback(
    async (format: "json" | "xmind" | "mm") => {
      if (!currentMindMap) return;

      setError(null);

      try {
        const { content, extension } = await exportMindMap(currentMindMap, format);

        // 创建下载
        const blob =
          content instanceof Blob
            ? content
            : new Blob([content], { type: "text/plain" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mindmap_${Date.now()}${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(String(err));
      }
    },
    [currentMindMap, setError]
  );

  // 自动加载
  useEffect(() => {
    if (autoLoad && notesDir && noteId) {
      loadMindMap();
    }
  }, [autoLoad, notesDir, noteId, loadMindMap]);

  return {
    mindMap,
    isLoading,
    error,
    isDirty,
    loadMindMap,
    saveMindMap,
    importMindMap,
    exportMindMapFile,
  };
}
