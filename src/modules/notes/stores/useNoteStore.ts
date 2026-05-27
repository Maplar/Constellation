/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";
import Fuse from "fuse.js";
import type { GraphEdge, LinkGraph, Note, NoteMetadata, WikiLink } from "../../shared/types/notes";
import { listNotes, getNote } from "../api";
import { parseAllLinks, buildLinkGraph } from "../linkParser";
import type { SearchResult } from "../services/searchService";

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
  searchResults: SearchResult[];
}

interface NoteStoreActions {
  loadNotes: () => Promise<void>;
  loadFullNotes: () => Promise<void>;
  selectNote: (id: string | null) => void;
  rebuildGraph: () => void;
  getLinkedNotes: (noteId: string) => GraphEdge[];
  getBacklinks: (noteId: string) => GraphEdge[];
  setSearchQuery: (query: string) => void;
  performSearch: () => void;
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

  loadFullNotes: async () => {
    const { notesMetadata } = get();
    if (notesMetadata.length === 0) {
      await get().loadNotes();
    }
    const metadata = get().notesMetadata;
    set({ isLoading: true, errorMessage: null });
    try {
      const fullNotes: Note[] = [];
      for (const meta of metadata) {
        try {
          const note = await getNote(meta.id);
          fullNotes.push(note);
        } catch {
          // skip notes that fail to load
        }
      }
      const links = parseAllLinks(fullNotes);
      const graph = buildLinkGraph(fullNotes);
      const { outgoingMap, incomingMap } = buildReferenceMaps(graph.edges);
      set({ notes: fullNotes, wikiLinks: links, linkGraph: graph, outgoingMap, incomingMap, isLoading: false });
      get().performSearch();
    } catch (error) {
      set({ isLoading: false, errorMessage: String(error) });
    }
  },

  selectNote: (id) => {
    set({ selectedNoteId: id });
  },

  rebuildGraph: () => {
    const { notes } = get();
    if (notes.length === 0) return;
    const links = parseAllLinks(notes);
    const graph = buildLinkGraph(notes);
    const { outgoingMap, incomingMap } = buildReferenceMaps(graph.edges);
    set({ wikiLinks: links, linkGraph: graph, outgoingMap, incomingMap });
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

  performSearch: () => {
    const { searchQuery: q, notes } = get();
    if (!q?.trim()) {
      set({ searchResults: [] });
      return;
    }
    if (notes.length === 0) {
      set({ searchResults: [] });
      return;
    }
    try {
      const fuse = new Fuse(notes, {
        keys: ["title", "content"],
        threshold: 0.3,
      });
      set({
        searchResults: fuse.search(q).map((r) => ({
          note: r.item,
          score: r.score,
        })),
      });
    } catch (error) {
      console.error("搜索失败:", error);
      set({ searchResults: [] });
    }
  },
}));
