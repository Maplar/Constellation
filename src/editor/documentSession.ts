/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import type { DocumentRecord } from "../core-client";

export type DocumentSessionStatus = "idle" | "dirty" | "saving" | "saved" | "conflict" | "error";

export interface DocumentSession {
  constellationId: string;
  relativePath: string;
  expectedRevision: string;
  title: string;
  content: string;
  status: DocumentSessionStatus;
}

export function openDocumentSession(document: DocumentRecord): DocumentSession {
  return {
    constellationId: document.constellationId,
    relativePath: document.relativePath,
    expectedRevision: document.revision,
    title: document.title,
    content: document.content,
    status: "saved",
  };
}

export function updateDocumentDraft(
  session: DocumentSession,
  draft: Partial<Pick<DocumentSession, "title" | "content">>,
): DocumentSession {
  return { ...session, ...draft, status: "dirty" };
}
