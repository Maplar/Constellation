/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useState, useRef } from "react";
import { ForceGraph2D } from "./ForceGraph2D";
import { ForceGraph3D } from "./ForceGraph3D";
import { useNoteStore } from "../stores/useNoteStore";
import type { NoteMetadata } from "../../shared/types/notes";

export function GraphView() {
  const { notesMetadata, isLoading, errorMessage, loadNotes, loadFullNotes, selectNote, linkGraph } =
    useNoteStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [graphMode, setGraphMode] = useState<"2d" | "3d">("3d");
  const graphKey = useRef(0);

  useEffect(() => {
    void (async () => {
      await loadNotes();
      await loadFullNotes();
    })();
  }, [loadNotes, loadFullNotes]);

  const filteredNotes = searchQuery
    ? notesMetadata.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.preview.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : notesMetadata;

  const handleNodeClick = (noteId: string) => {
    selectNote(noteId);
  };

  const handleNoteSelect = (note: NoteMetadata) => {
    selectNote(note.id);
  };

  return (
    <div className="w-full h-screen flex flex-col noise-bg bg-cloud overflow-hidden">
      <div className="flex items-center justify-between pl-5 pr-0 h-11 bg-paper/60 border-b border-paper-deep/30 shrink-0 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[13px] font-display font-medium text-ink-soft tracking-wide">
            星座
          </span>
          <span className="text-[11px] text-ink-ghost font-body">—</span>
          <span className="text-[11px] text-ink-faint font-body truncate max-w-[240px]">
            笔记图谱
          </span>
        </div>
        <div className="flex items-center gap-2 pr-3">
          <div className="flex items-center gap-0.5 mr-3 bg-paper-warm/60 rounded-md p-[2px] border border-paper-deep/25">
            <button
              onClick={() => { graphKey.current++; setGraphMode("2d"); }}
              className={`px-2.5 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                graphMode === "2d"
                  ? "text-bamboo bg-cloud shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-medium"
                  : "text-ink-ghost hover:text-ink-faint"
              }`}
            >
              2D
            </button>
            <button
              onClick={() => { graphKey.current++; setGraphMode("3d"); }}
              className={`px-2.5 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                graphMode === "3d"
                  ? "text-bamboo bg-cloud shadow-[0_1px_2px_rgba(0,0,0,0.04)] font-medium"
                  : "text-ink-ghost hover:text-ink-faint"
              }`}
            >
              3D
            </button>
          </div>
          <span className="text-[10px] text-ink-ghost font-mono tabular-nums">
            {linkGraph.nodes.length} 节点 · {linkGraph.edges.length} 连线
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[240px] shrink-0 border-r border-paper-deep/30 bg-paper/40 flex flex-col">
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-paper-warm/80 border border-paper-deep/40 focus-within:border-bamboo/30 focus-within:bg-cloud transition-all">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-ink-ghost shrink-0"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索笔记…"
                className="flex-1 text-[12px] font-body text-ink placeholder:text-ink-ghost/60 bg-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <div className="py-1.5 px-3 text-[10px] text-ink-ghost font-mono tracking-wider uppercase">
              笔记列表
            </div>
            {isLoading ? (
              <div className="px-3 py-4 text-[11px] text-ink-ghost">加载中…</div>
            ) : errorMessage ? (
              <div className="px-3 py-4 text-[11px] text-red-400">{errorMessage}</div>
            ) : (
              <div className="space-y-0.5">
                {filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleNoteSelect(note)}
                    className="w-full text-left rounded-lg px-3 py-2 transition-all duration-200 cursor-pointer hover:bg-paper-warm/70"
                  >
                    <span className="text-[13px] font-display font-medium text-ink-soft truncate block">
                      {note.title || "无标题笔记"}
                    </span>
                    <span className="text-[10px] text-ink-ghost/60 font-mono tabular-nums">
                      {note.wordCount} 字
                    </span>
                  </button>
                ))}
                {filteredNotes.length === 0 && (
                  <div className="px-3 py-4 text-[11px] text-ink-ghost">没有匹配的笔记</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {graphMode === "3d" ? (
            <ForceGraph3D key={`3d-${graphKey.current}`} onNodeClick={handleNodeClick} />
          ) : (
            <ForceGraph2D key={`2d-${graphKey.current}`} onNodeClick={handleNodeClick} />
          )}
        </div>
      </div>
    </div>
  );
}
