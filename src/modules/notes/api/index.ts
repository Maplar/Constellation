/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { invoke } from "@tauri-apps/api/core";
import type { LinkGraph, Note, NoteMetadata, SaveNoteRequest } from "../../shared/types/notes";
import {
  analyzeMigration,
  executeMigration,
  getLocalReferenceGraph as getCoreLocalReferenceGraph,
  getReferenceGraph as getCoreReferenceGraph,
  createDocument,
  createDocumentFolder,
  listDocuments as listCoreDocuments,
  moveDocument,
  readDocument,
  renameDocumentFolder,
  trashDocumentFolder,
  trashDocument,
  updateDocument,
} from "../../../core-client";
import type {
  MigrationAnalysis,
  MigrationReport,
  ReferenceGraph,
} from "../../../core-client";

export type { MigrationAnalysis, MigrationReport };

export function listNotes(): Promise<NoteMetadata[]> {
  return listCoreDocuments().then((documents) => documents.map(mapDocumentSummary));
}

export async function getNote(id: string): Promise<Note> {
  const summary = (await listCoreDocuments()).find((document) => document.constellationId === id);
  if (!summary) throw new Error("文档不存在");
  return mapDocument(await readDocument(summary.relativePath));
}

export function createNote(request: SaveNoteRequest): Promise<Note> {
  return createDocument({ title: request.title, content: request.content, folder: request.category }).then(mapDocument);
}

export async function updateNote(id: string, request: SaveNoteRequest): Promise<Note> {
  const current = await getNote(id);
  return updateDocument({ relativePath: current.fileName, expectedRevision: (await readDocument(current.fileName)).revision, title: request.title, content: request.content, folder: request.category }).then(mapDocument);
}

export async function deleteNote(id: string): Promise<void> {
  const current = await getNote(id);
  await trashDocument(current.fileName);
}

export async function moveNoteCategory(id: string, category: string): Promise<NoteMetadata> {
  const current = await getNote(id);
  return mapDocumentSummary(await moveDocument(current.fileName, category));
}

function mapDocumentSummary(document: import("../../../core-client").DocumentSummary): NoteMetadata {
  return { id: document.constellationId, title: document.title, fileName: document.relativePath, category: document.folder, createdAt: document.createdAt, updatedAt: document.updatedAt, wordCount: 0, preview: "", noteType: "note" };
}

function mapDocument(document: import("../../../core-client").DocumentRecord): Note {
  return { ...mapDocumentSummary(document), content: document.content };
}

export function listCategories(): Promise<string[]> {
  return listCoreDocuments().then((documents) => [...new Set(documents.map((document) => document.folder).filter(Boolean))].sort());
}

export function createCategory(name: string): Promise<void> {
  return createDocumentFolder(name);
}

export function renameCategory(oldName: string, newName: string): Promise<void> {
  return renameDocumentFolder(oldName, newName);
}

export function deleteCategory(name: string): Promise<void> {
  return trashDocumentFolder(name).then(() => undefined);
}

export async function getReferenceGraph(): Promise<LinkGraph> {
  const graph = await getCoreReferenceGraph();
  return mapReferenceGraph(graph);
}

export async function getLocalReferenceGraph(noteId: string, depth = 1): Promise<LinkGraph> {
  const graph = await getCoreLocalReferenceGraph(noteId, depth);
  return mapReferenceGraph(graph);
}

function mapReferenceGraph(graph: ReferenceGraph): LinkGraph {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      noteId: node.noteId,
      label: node.label,
      val: Math.max(1, node.inboundCount + 1),
      color: categoryColor(node.category),
      category: node.category,
    })),
    edges: graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
      value: 1,
      edgeType: edge.relationType,
    })),
  };
}

function categoryColor(category: string): string {
  const palette = ["#4faa70", "#5b9bd5", "#e8a838", "#d4584a", "#9b6fb5", "#45b5a0", "#d4869e", "#7cb850"];
  let hash = 0;
  for (const char of category || "未分类") {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return palette[Math.abs(hash) % palette.length] ?? palette[0]!;
}

export function readExternalFile(path: string): Promise<string> {
  return invoke("read_external_file", { path });
}

export function saveExternalFile(path: string, content: string): Promise<void> {
  return invoke("save_external_file", { path, content });
}

export function analyzeV3Migration(sourceDir: string, targetDir: string): Promise<MigrationAnalysis> {
  return analyzeMigration(sourceDir, targetDir);
}

export function executeV3Migration(sourceDir: string, targetDir: string): Promise<MigrationReport> {
  return executeMigration(sourceDir, targetDir);
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "操作失败";
}
