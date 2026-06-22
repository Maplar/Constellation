/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface DocumentSummary {
  constellationId: string;
  relativePath: string;
  revision: string;
  title: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord extends DocumentSummary {
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface DocumentCreateRequest {
  title: string;
  content: string;
  folder?: string;
}

export interface DocumentUpdateRequest {
  relativePath: string;
  expectedRevision: string;
  title: string;
  content: string;
  folder?: string;
}

export interface DocumentConflict {
  currentRevision: string;
  conflictCopyPath: string;
}

export function listDocuments(): Promise<DocumentSummary[]> {
  return invoke("documents_list");
}

export function readDocument(relativePath: string): Promise<DocumentRecord> {
  return invoke("documents_read", { relativePath });
}

export function createDocument(request: DocumentCreateRequest): Promise<DocumentRecord> {
  return invoke("documents_create", { request });
}

export function createDocumentFolder(folder: string): Promise<void> {
  return invoke("documents_create_folder", { folder });
}

export function renameDocumentFolder(fromFolder: string, toFolder: string): Promise<void> {
  return invoke("documents_rename_folder", { fromFolder, toFolder });
}

export function trashDocumentFolder(folder: string): Promise<string> {
  return invoke("documents_trash_folder", { folder });
}

export function updateDocument(request: DocumentUpdateRequest): Promise<DocumentRecord> {
  return invoke("documents_update", { request });
}

export function moveDocument(relativePath: string, folder: string): Promise<DocumentRecord> {
  return invoke("documents_move", { relativePath, folder });
}

export function trashDocument(relativePath: string): Promise<string> {
  return invoke("documents_trash", { relativePath });
}

export function restoreDocument(trashPath: string): Promise<DocumentRecord> {
  return invoke("documents_restore", { trashPath });
}

export function undoLastDocumentOperation(): Promise<DocumentRecord | null> {
  return invoke("documents_undo_last");
}
