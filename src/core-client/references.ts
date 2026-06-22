/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface ReferenceNode {
  id: string;
  label: string;
  noteId: string;
  category: string;
  fileName: string;
  inboundCount: number;
}

export interface ReferenceEdge {
  source: string;
  target: string;
  label: string | null;
  relationType: "wiki" | "markdown" | "embed";
}

export interface ReferenceGraph {
  nodes: ReferenceNode[];
  edges: ReferenceEdge[];
}

export function getReferenceGraph(): Promise<ReferenceGraph> {
  return invoke("references_graph");
}

export function getLocalReferenceGraph(noteId: string, depth = 1): Promise<ReferenceGraph> {
  return invoke("references_local_graph", { noteId, depth });
}

export function rebuildReferenceIndex(notesDir: string): Promise<number> {
  return invoke("references_rebuild", { notesDir });
}

export function indexDocumentReferences(
  notesDir: string,
  relativePath: string,
): Promise<void> {
  return invoke("references_index_document", { notesDir, relativePath });
}

export function getReferencesForDocument(
  notesDir: string,
  documentId: string,
): Promise<ReferenceEdge[]> {
  return invoke("references_for_document", { notesDir, documentId });
}

export function getBacklinksForDocument(
  notesDir: string,
  documentId: string,
): Promise<ReferenceEdge[]> {
  return invoke("backlinks_for_document", { notesDir, documentId });
}

export function getWorkspaceLocalGraph(
  notesDir: string,
  documentId: string,
  depth = 1,
): Promise<ReferenceGraph> {
  return invoke("graph_local", { notesDir, documentId, depth });
}

export function getWorkspaceGlobalGraph(notesDir: string): Promise<ReferenceGraph> {
  return invoke("graph_global", { notesDir });
}
