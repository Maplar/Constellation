/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { create } from "zustand";
import type { GraphEdge, LinkGraph, Note, NoteMetadata, WikiLink } from "../../shared/types/notes";
import { listNotes, getNote } from "../api";
import { parseAllLinks, buildLinkGraph } from "../linkParser";

interface NoteStoreState {
  notesMetadata: NoteMetadata[];
  notes: Note[];
  wikiLinks: WikiLink[];
  linkGraph: LinkGraph;
  selectedNoteId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
}

interface NoteStoreActions {
  loadNotes: () => Promise<void>;
  loadFullNotes: () => Promise<void>;
  selectNote: (id: string | null) => void;
  rebuildGraph: () => void;
  getLinkedNotes: (noteId: string) => GraphEdge[];
  getBacklinks: (noteId: string) => GraphEdge[];
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
      set({ notes: fullNotes, wikiLinks: links, linkGraph: graph, isLoading: false });
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
}));
