/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface VectorIndexStatus {
  chunkCount: number;
  documentCount: number;
  model: string;
  dimension: number;
  chunkVersion: number;
}

export interface SemanticSearchResult {
  documentId: string;
  path: string;
  title: string;
  heading: string;
  lineStart: number;
  snippet: string;
  score: number;
}

export function rebuildVectorIndex(
  notesDir: string,
  allowedFolders?: string[],
): Promise<VectorIndexStatus> {
  return invoke("ai_reindex", { notesDir, allowedFolders });
}

export function semanticSearch(
  notesDir: string,
  query: string,
  limit = 12,
): Promise<SemanticSearchResult[]> {
  return invoke("vector_search", { notesDir, query, limit });
}

export function getVectorIndexStatus(notesDir: string): Promise<VectorIndexStatus> {
  return invoke("vector_status", { notesDir });
}
