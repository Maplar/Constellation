/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import type { NoteMetadata } from "../types/notes";

/**
 * 获取指定分类及其所有子分类内的笔记
 * 匹配规则：note.category === category 或 note.category 以 "category/" 开头
 * category 为空字符串时，仅返回未分类笔记
 */
export function getNotesInCategoryTree(
  notes: NoteMetadata[],
  category: string,
): NoteMetadata[] {
  if (!category) {
    return notes.filter((n) => !n.category);
  }
  const prefix = category + "/";
  return notes.filter(
    (n) => n.category === category || n.category.startsWith(prefix),
  );
}
