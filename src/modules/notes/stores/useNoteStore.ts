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
import { createSearchIndex, searchNotes } from "../services/searchService";

interface NoteStoreState {
  notesMetadata: NoteMetadata[];
  notes: Note[];
  wikiLinks: WikiLink[];
  linkGraph: LinkGraph;
  selectedNoteId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  fuseIndex: Fuse<Note> | null;
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

export const useNoteStore = create<NoteStore>((set, get) => ({
  notesMetadata: [],
  notes: [],
  wikiLinks: [],
  linkGraph: { nodes: [], edges: [] },
  selectedNoteId: null,
  isLoading: false,
  errorMessage: null,
  searchQuery: "",
  searchResults: [],
  fuseIndex: null,

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
      const fuseIndex = createSearchIndex(fullNotes);
      set({ notes: fullNotes, wikiLinks: links, linkGraph: graph, fuseIndex, isLoading: false });
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
    set({ wikiLinks: links, linkGraph: graph });
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
    const { searchQuery: q, fuseIndex } = get();
    if (!fuseIndex || !q.trim()) {
      set({ searchResults: [] });
      return;
    }
    const results = searchNotes(fuseIndex, q);
    set({ searchResults: results });
  },
}));
