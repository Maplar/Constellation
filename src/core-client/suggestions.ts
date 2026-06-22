/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export type SuggestionStatus = "pending" | "accepted" | "rejected";

export interface SuggestionRecord {
  id: string;
  documentId: string;
  suggestionType: string;
  payload: unknown;
  fingerprint: string;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionCreateRequest {
  documentId: string;
  suggestionType: string;
  payload: unknown;
  fingerprint: string;
}

export function listSuggestions(status?: SuggestionStatus): Promise<SuggestionRecord[]> {
  return invoke("suggestions_list", { status });
}

export function createSuggestion(
  request: SuggestionCreateRequest,
): Promise<SuggestionRecord | null> {
  return invoke("suggestions_create", { request });
}

export function setSuggestionStatus(
  id: string,
  status: SuggestionStatus,
): Promise<SuggestionRecord> {
  return invoke("suggestions_set_status", { id, status });
}

export function deleteSuggestion(id: string): Promise<void> {
  return invoke("suggestions_delete", { id });
}

export function applySuggestion(id: string): Promise<SuggestionRecord> {
  return invoke("suggestions_apply", { id });
}
