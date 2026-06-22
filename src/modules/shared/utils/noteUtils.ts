/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import Fuse from "fuse.js";
import type { Note, NoteMetadata } from "../types/notes";

export function getDisplayTitle(note: Pick<NoteMetadata, "title" | "preview">): string {
  const title = note.title.trim();
  if (title) return title;

  const preview = note.preview.trim();
  if (preview) return preview.slice(0, 20);

  return "无标题笔记";
}

export function buildPreview(content: string): string {
  return content.split(/\s+/).filter(Boolean).join(" ").slice(0, 80);
}

export function countNoteChars(content: string): number {
  let count = 0;
  for (const ch of content) {
    if (!/\s/.test(ch)) count++;
  }
  return count;
}

export function metadataFromNote(note: Note): NoteMetadata {
  return {
    id: note.id,
    title: note.title,
    fileName: note.fileName,
    category: note.category,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    wordCount: note.wordCount,
    preview: buildPreview(note.content),
    noteType: note.noteType ?? "note",
  };
}

export interface CategoryGroup {
  category: string;
  notes: NoteMetadata[];
  latestUpdatedAt: string;
}

export function groupNotesByCategory(
  notes: NoteMetadata[],
  allCategories: string[] = [],
): CategoryGroup[] {
  const groups = new Map<string, NoteMetadata[]>();

  for (const cat of allCategories) {
    groups.set(cat, []);
  }

  for (const note of notes) {
    const key = note.category || "";
    const list = groups.get(key);
    if (list) {
      list.push(note);
    } else {
      groups.set(key, [note]);
    }
  }

  const result: CategoryGroup[] = [];
  for (const [category, categoryNotes] of groups) {
    categoryNotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    result.push({
      category,
      notes: categoryNotes,
      latestUpdatedAt: categoryNotes[0]?.updatedAt ?? "",
    });
  }

  result.sort((a, b) => {
    const aEmpty = a.notes.length === 0;
    const bEmpty = b.notes.length === 0;
    if (aEmpty && !bEmpty) return -1;
    if (!aEmpty && bEmpty) return 1;
    return b.latestUpdatedAt.localeCompare(a.latestUpdatedAt);
  });
  return result;
}

const fuseFilterOptions = {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "preview", weight: 0.3 },
    { name: "category", weight: 0.1 },
    { name: "fileName", weight: 0.1 },
  ],
  threshold: 0.2,
  distance: 100,
  minMatchCharLength: 2,
  shouldSort: true,
  ignoreLocation: false,
  findAllMatches: true,
};

export function filterNotes(notes: NoteMetadata[], query: string): NoteMetadata[] {
  const trimmed = query.trim();
  if (!trimmed) return notes;

  const fuse = new Fuse(notes, fuseFilterOptions);
  return fuse.search(trimmed).map((r) => r.item);
}

export function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
