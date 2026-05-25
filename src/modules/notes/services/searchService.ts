/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import Fuse from "fuse.js";
import type { Note } from "../../shared/types/notes";

export interface SearchResult {
  note: Note;
  score: number | undefined;
}

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
