/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import type { GraphEdge, GraphNode, LinkGraph, Note, WikiLink } from "../shared/types/notes";

const WIKI_LINK_RE = /\[\[([^\[\]]+)\]\]/g;

export function parseWikiLinks(content: string, sourceNoteId: string): WikiLink[] {
  const links: WikiLink[] = [];
  const matches = content.matchAll(WIKI_LINK_RE);

  for (const match of matches) {
    const raw = match[1].trim();
    if (!raw) continue;

    const aliasIdx = raw.lastIndexOf("|");
    if (aliasIdx >= 0) {
      const targetTitle = raw.slice(0, aliasIdx).trim();
      const alias = raw.slice(aliasIdx + 1).trim() || null;
      if (!targetTitle) continue;
      links.push({ sourceNoteId, targetTitle, alias, rawText: raw });
    } else {
      links.push({ sourceNoteId, targetTitle: raw, alias: null, rawText: raw });
    }
  }

  return links;
}

export function parseAllLinks(notes: Note[]): WikiLink[] {
  const allLinks: WikiLink[] = [];
  for (const note of notes) {
    const links = parseWikiLinks(note.content, note.id);
    for (const link of links) {
      allLinks.push(link);
    }
  }
  return allLinks;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveTitleToId(
  targetTitle: string,
  notesMap: Map<string, Note>,
  titleToIdIndex: Map<string, string>,
): string | null {
  const normalized = normalizeTitle(targetTitle);

  const cached = titleToIdIndex.get(normalized);
  if (cached) return cached;

  for (const [id, note] of notesMap) {
    if (normalizeTitle(note.title) === normalized) {
      titleToIdIndex.set(normalized, id);
      return id;
    }
  }

  return null;
}

export function buildLinkGraph(notes: Note[]): LinkGraph {
  const notesMap = new Map<string, Note>();
  for (const note of notes) {
    notesMap.set(note.id, note);
  }

  const allLinks = parseAllLinks(notes);
  const titleToIdIndex = new Map<string, string>();
  const edgeMap = new Map<string, { source: string; target: string; label: string | null }>();
  const inboundCount = new Map<string, number>();

  for (const link of allLinks) {
    const targetId = resolveTitleToId(link.targetTitle, notesMap, titleToIdIndex);
    if (!targetId || targetId === link.sourceNoteId) continue;

    const key = `${link.sourceNoteId}->${targetId}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        source: link.sourceNoteId,
        target: targetId,
        label: link.alias,
      });
    }

    inboundCount.set(targetId, (inboundCount.get(targetId) ?? 0) + 1);
  }

  const graphNodes: GraphNode[] = [];
  const nodeIdSet = new Set<string>();

  for (const [, edge] of edgeMap) {
    nodeIdSet.add(edge.source);
    nodeIdSet.add(edge.target);
  }

  for (const note of notes) {
    nodeIdSet.add(note.id);
  }

  const maxInbound = Math.max(1, ...inboundCount.values());

  for (const noteId of nodeIdSet) {
    const note = notesMap.get(noteId);
    const inbound = inboundCount.get(noteId) ?? 0;
    const normalizedSize = 1 + (inbound / maxInbound) * 4;

    graphNodes.push({
      id: noteId,
      label: note?.title ?? noteId,
      val: normalizedSize,
      color: getNoteColor(note, inbound),
      noteId,
    });
  }

  const graphEdges: GraphEdge[] = [];
  const edgeValueMap = new Map<string, number>();
  for (const [, edge] of edgeMap) {
    const key = `${edge.source}-${edge.target}`;
    edgeValueMap.set(key, (edgeValueMap.get(key) ?? 0) + 1);
  }

  for (const [key, value] of edgeValueMap) {
    const [source, target] = key.split("-");
    const edge = edgeMap.get(`${source}->${target}`);
    graphEdges.push({
      source,
      target,
      label: edge?.label ?? null,
      value,
    });
  }

  return { nodes: graphNodes, edges: graphEdges };
}

function getNoteColor(note: Note | undefined, inboundCount: number): string {
  if (inboundCount >= 3) return "#7ebea5";
  if (inboundCount >= 1) return "#a3c9b7";
  if (note?.category) return "#c5d5cb";
  return "#d5dbdf";
}
