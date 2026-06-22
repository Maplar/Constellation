/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";
import type { GraphEdge, LinkGraph, Note, NoteMetadata, WikiLink } from "../../shared/types/notes";
import { getReferenceGraph, listNotes } from "../api";
import { querySearch } from "../../../core-client";
import { getConfig } from "../../settings/api";
import { getCategoryColor } from "../../visualization/utils/colorMap";

interface MetadataSearchResult {
  note: NoteMetadata;
  score: number;
}

interface NoteStoreState {
  notesMetadata: NoteMetadata[];
  notes: Note[];
  wikiLinks: WikiLink[];
  linkGraph: LinkGraph;
  outgoingMap: Map<string, GraphEdge[]>;  // noteId → 该笔记引用的边列表
  incomingMap: Map<string, GraphEdge[]>;  // noteId → 引用该笔记的边列表
  selectedNoteId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  searchQuery: string;
  searchResults: MetadataSearchResult[];
}

interface NoteStoreActions {
  loadNotes: () => Promise<void>;
  refreshKnowledgeIndex: () => Promise<void>;
  selectNote: (id: string | null) => void;
  rebuildGraph: () => void;
  getLinkedNotes: (noteId: string) => GraphEdge[];
  getBacklinks: (noteId: string) => GraphEdge[];
  setSearchQuery: (query: string) => void;
  performSearch: () => Promise<void>;
}

type NoteStore = NoteStoreState & NoteStoreActions;

// 辅助函数：构建引用索引 Map
function buildReferenceMaps(edges: GraphEdge[]): {
  outgoingMap: Map<string, GraphEdge[]>;
  incomingMap: Map<string, GraphEdge[]>;
} {
  const outgoingMap = new Map<string, GraphEdge[]>();
  const incomingMap = new Map<string, GraphEdge[]>();

  for (const edge of edges) {
    // outgoing
    if (!outgoingMap.has(edge.source)) outgoingMap.set(edge.source, []);
    outgoingMap.get(edge.source)!.push(edge);

    // incoming
    if (!incomingMap.has(edge.target)) incomingMap.set(edge.target, []);
    incomingMap.get(edge.target)!.push(edge);
  }

  return { outgoingMap, incomingMap };
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notesMetadata: [],
  notes: [],
  wikiLinks: [],
  linkGraph: { nodes: [], edges: [] },
  outgoingMap: new Map(),
  incomingMap: new Map(),
  selectedNoteId: null,
  isLoading: false,
  errorMessage: null,
  searchQuery: "",
  searchResults: [],

  loadNotes: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const metadata = await listNotes();
      set({ notesMetadata: metadata, isLoading: false });
    } catch (error) {
      set({ isLoading: false, errorMessage: String(error) });
    }
  },

  refreshKnowledgeIndex: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const [metadata, rawGraph] = await Promise.all([listNotes(), getReferenceGraph()]);
      const graph: LinkGraph = {
        nodes: rawGraph.nodes.map((node) => ({
          ...node,
          color: getCategoryColor(node.category ?? ""),
        })),
        edges: rawGraph.edges,
      };
      const titleById = new Map(metadata.map((note) => [note.id, note.title]));
      const links: WikiLink[] = graph.edges
        .filter((edge) => edge.edgeType === "wiki")
        .map((edge) => ({
          sourceNoteId: edge.source,
          targetTitle: titleById.get(edge.target) ?? edge.target,
          alias: edge.label,
          rawText: edge.label ?? titleById.get(edge.target) ?? edge.target,
        }));
      const { outgoingMap, incomingMap } = buildReferenceMaps(graph.edges);
      set({ notesMetadata: metadata, notes: [], wikiLinks: links, linkGraph: graph, outgoingMap, incomingMap, isLoading: false });
      get().performSearch();
    } catch (error) {
      set({ isLoading: false, errorMessage: String(error) });
    }
  },

  selectNote: (id) => {
    set({ selectedNoteId: id });
  },

  rebuildGraph: () => {
    void get().refreshKnowledgeIndex();
  },

  getLinkedNotes: (noteId) => {
    const { linkGraph } = get();
    return linkGraph.edges.filter((e) => e.source === noteId);
  },

  getBacklinks: (noteId) => {
    const { linkGraph } = get();
    return linkGraph.edges.filter((e) => e.target === noteId);
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().performSearch();
  },

  performSearch: async () => {
    const { searchQuery: q, notesMetadata } = get();
    if (!q?.trim()) {
      set({ searchResults: [] });
      return;
    }
    if (notesMetadata.length === 0) {
      set({ searchResults: [] });
      return;
    }
    try {
      const config = await getConfig();
      const hits = await querySearch(config.notesDir, q.trim(), 50);
      const metadataById = new Map(notesMetadata.map((note) => [note.id, note]));
      set({
        searchResults: hits
          .map((hit) => metadataById.get(hit.noteId))
          .filter((note): note is NoteMetadata => Boolean(note))
          .map((note, index) => ({ note, score: index })),
      });
    } catch (error) {
      console.error("搜索失败:", error);
      set({ searchResults: [] });
    }
  },
}));
