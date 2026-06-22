/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface SearchDocument {
  noteId: string;
  title: string;
  content: string;
  category: string;
  relativePath?: string;
  heading?: string;
  lineStart?: number;
}

export interface TantivySearchResult {
  noteId: string;
  documentId: string;
  path: string;
  title: string;
  heading: string;
  lineStart: number;
  snippet: string;
  score: number;
  matchType: string;
}

export interface HybridSearchResult {
  noteId: string;
  documentId: string;
  path: string;
  title: string;
  heading: string;
  lineStart: number;
  snippet: string;
  textScore: number;
  vectorScore: number;
  combinedScore: number;
  matchType: string;
}

export interface IndexStats {
  docCount: number;
  isInitialized: boolean;
  indexPath: string;
}

export function initializeSearch(notesDir: string): Promise<IndexStats> {
  return invoke("search_init", { notesDir });
}

export function indexSearchDocument(notesDir: string, document: SearchDocument): Promise<void> {
  return invoke("search_index_document", { notesDir, document });
}

export function indexSearchDocuments(
  notesDir: string,
  documents: SearchDocument[],
): Promise<number> {
  return invoke("search_index_batch", { notesDir, documents });
}

export function rebuildSearch(notesDir: string): Promise<number> {
  return invoke("search_rebuild", { notesDir });
}

export function removeSearchDocument(notesDir: string, noteId: string): Promise<void> {
  return invoke("search_delete_document", { notesDir, noteId });
}

export function querySearch(
  notesDir: string,
  query: string,
  limit = 20,
): Promise<TantivySearchResult[]> {
  return invoke("search_query", { notesDir, query, limit });
}

export function queryHybridSearch(
  notesDir: string,
  query: string,
  vectorScores: Array<[string, number]>,
  limit = 20,
): Promise<HybridSearchResult[]> {
  return invoke("search_hybrid", { notesDir, query, vectorScores, limit });
}

export function clearSearch(notesDir: string): Promise<void> {
  return invoke("search_clear", { notesDir });
}

export function getSearchStats(notesDir: string): Promise<IndexStats> {
  return invoke("search_stats", { notesDir });
}
