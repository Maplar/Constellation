/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：统一搜索服务 (v3.5)
 *
 * 支持三种搜索后端：
 * 1. Fuse.js (默认 fallback，纯前端)
 * 2. Tantivy (全文搜索，Rust 后端)
 * 3. Hybrid (Tantivy + LanceDB 向量搜索)
 */

import Fuse from "fuse.js";
import type { Note, NoteMetadata } from "../../shared/types/notes";
import {
  clearSearch,
  getSearchStats as getCoreSearchStats,
  indexSearchDocument,
  indexSearchDocuments,
  initializeSearch,
  queryHybridSearch,
  querySearch,
  rebuildSearch,
  removeSearchDocument,
} from "../../../core-client";
import type {
  HybridSearchResult,
  IndexStats,
  TantivySearchResult,
} from "../../../core-client";

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export interface SearchResult {
  note: Note;
  score: number | undefined;
  matchType?: string;
}

export type { HybridSearchResult, IndexStats, TantivySearchResult };

export type SearchBackend = "fuse" | "tantivy" | "hybrid";

// ─── Fuse.js 搜索 (Fallback) ─────────────────────────────────────────────────

export function createSearchIndex(notes: Note[]): Fuse<Note> {
  return new Fuse(notes, {
    keys: ["title", "content", "category"],
    threshold: 0.4,
    includeScore: true,
    useExtendedSearch: true,
  });
}

export function searchNotes(fuse: Fuse<Note>, query: string): SearchResult[] {
  if (!query?.trim()) return [];
  try {
    return fuse.search(query).map((result) => ({
      note: result.item,
      score: result.score,
    }));
  } catch (error) {
    console.error("Fuse 搜索异常:", error);
    return [];
  }
}

// ─── Tantivy 搜索 (Rust 后端) ────────────────────────────────────────────────

/**
 * 初始化 Tantivy 搜索引擎（单例）
 */
export async function initSearchEngine(notesDir: string): Promise<IndexStats> {
  return initializeSearch(notesDir);
}

/**
 * 索引单篇笔记（增量更新）
 */
export async function indexNote(
  notesDir: string,
  document: { noteId: string; title: string; content: string; category: string }
): Promise<void> {
  await indexSearchDocument(notesDir, document);
}

/**
 * 批量索引笔记
 */
export async function indexNotesBatch(
  notesDir: string,
  documents: Array<{ noteId: string; title: string; content: string; category: string }>
): Promise<number> {
  return indexSearchDocuments(notesDir, documents);
}

export async function rebuildRustSearchIndex(notesDir: string): Promise<number> {
  return rebuildSearch(notesDir);
}

/**
 * 从索引中删除笔记
 */
export async function deleteNoteFromIndex(
  notesDir: string,
  noteId: string
): Promise<void> {
  await removeSearchDocument(notesDir, noteId);
}

/**
 * Tantivy 全文搜索
 */
export async function searchWithTantivy(
  notesDir: string,
  query: string,
  limit: number = 20
): Promise<TantivySearchResult[]> {
  return querySearch(notesDir, query, limit);
}

/**
 * 混合搜索 (Tantivy + 向量分数)
 */
export async function searchHybrid(
  notesDir: string,
  query: string,
  vectorScores: Array<[string, number]>,
  limit: number = 20
): Promise<HybridSearchResult[]> {
  return queryHybridSearch(notesDir, query, vectorScores, limit);
}

/**
 * 清空搜索索引
 */
export async function clearSearchIndex(notesDir: string): Promise<void> {
  await clearSearch(notesDir);
}

/**
 * 获取索引统计信息
 */
export async function getSearchStats(notesDir: string): Promise<IndexStats> {
  return getCoreSearchStats(notesDir);
}

// ─── 统一搜索接口 ────────────────────────────────────────────────────────────

/**
 * 统一搜索入口：自动选择最佳搜索后端
 *
 * 1. 优先使用 Tantivy (如果索引已初始化)
 * 2. 降级到 Fuse.js (纯前端 fallback)
 */
export async function unifiedSearch(
  notesDir: string,
  query: string,
  notes: Note[],
  fuseIndex: Fuse<Note> | null,
  limit: number = 20
): Promise<SearchResult[]> {
  if (!query?.trim()) return [];

  try {
    // 尝试使用 Tantivy
    const tantivyResults = await searchWithTantivy(notesDir, query, limit);
    if (tantivyResults.length > 0) {
      // 将 Tantivy 结果转换为 SearchResult
      const noteMap = new Map(notes.map((n) => [n.id, n]));
      const results: SearchResult[] = [];
      for (const r of tantivyResults) {
        const note = noteMap.get(r.noteId);
        if (note) {
          results.push({
            note,
            score: 1 - r.score, // Tantivy 分数越高越好，转换为越低越好
            matchType: r.matchType,
          });
        }
      }
      return results;
    }
  } catch (error) {
    console.warn("Tantivy 搜索失败，降级到 Fuse.js:", error);
  }

  // Fallback: 使用 Fuse.js
  if (fuseIndex) {
    return searchNotes(fuseIndex, query);
  }

  return [];
}

/**
 * 全量索引所有笔记（首次使用或重建索引）
 */
export async function rebuildSearchIndex(
  notesDir: string,
  notes: NoteMetadata[],
  getNoteContent: (id: string) => Promise<Note | null>
): Promise<number> {
  const documents: Array<{
    noteId: string;
    title: string;
    content: string;
    category: string;
  }> = [];

  for (const meta of notes) {
    try {
      const note = await getNoteContent(meta.id);
      if (note) {
        documents.push({
          noteId: note.id,
          title: note.title,
          content: note.content,
          category: note.category,
        });
      }
    } catch {
      // 跳过加载失败的笔记
    }
  }

  return indexNotesBatch(notesDir, documents);
}

// ─── 防抖搜索 Hook 辅助 ──────────────────────────────────────────────────────

export function createDebouncedSearch(delay: number = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function debouncedSearch<T>(
    fn: () => Promise<T>,
    callback: (result: T) => void
  ): void {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(async () => {
      const result = await fn();
      callback(result);
      timer = null;
    }, delay);
  };
}
