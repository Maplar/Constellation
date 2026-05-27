/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：关系卡片组件
 */

import { useMemo } from "react";
import { useNoteStore } from "../stores/useNoteStore";
import type { GraphEdge } from "../../shared/types/notes";

interface RelationPreviewProps {
  noteId: string;
}

export function RelationPreview({ noteId }: RelationPreviewProps) {
  const outgoing = useNoteStore((s) => s.outgoingMap.get(noteId) ?? []);
  const incoming = useNoteStore((s) => s.incomingMap.get(noteId) ?? []);
  const notesMetadata = useNoteStore((s) => s.notesMetadata);
  const selectNote = useNoteStore((s) => s.selectNote);

  const getNoteTitle = (id: string) =>
    notesMetadata.find((n) => n.id === id)?.title ?? "未知笔记";

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      <section>
        <h3 className="text-xs font-semibold text-ink-ghost uppercase tracking-wider mb-3">
          引用此笔记 ({incoming.length})
        </h3>
        {incoming.length === 0 ? (
          <p className="text-xs text-ink-ghost/60 italic">暂无引用</p>
        ) : (
          <div className="space-y-2">
            {incoming.map((edge) => (
              <RelationCard
                key={edge.source}
                title={getNoteTitle(edge.source)}
                edge={edge}
                onClick={() => selectNote(edge.source)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-paper-deep to-transparent" />

      <section>
        <h3 className="text-xs font-semibold text-ink-ghost uppercase tracking-wider mb-3">
          此笔记引用 ({outgoing.length})
        </h3>
        {outgoing.length === 0 ? (
          <p className="text-xs text-ink-ghost/60 italic">暂无引用</p>
        ) : (
          <div className="space-y-2">
            {outgoing.map((edge) => (
              <RelationCard
                key={edge.target}
                title={getNoteTitle(edge.target)}
                edge={edge}
                onClick={() => selectNote(edge.target)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface RelationCardProps {
  title: string;
  edge: GraphEdge;
  onClick: () => void;
}

function RelationCard({ title, edge, onClick }: RelationCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg bg-paper-warm/50 hover:bg-paper-warm 
                 border border-paper-deep/10 hover:border-bamboo/30
                 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-3.5 h-3.5 text-ink-ghost/40 group-hover:text-bamboo transition-colors shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="text-[13px] text-ink-soft group-hover:text-ink truncate transition-colors">
          {title}
        </span>
      </div>
      {edge.label && (
        <span className="text-[10px] text-ink-ghost/40 ml-5 truncate block">
          别名: {edge.label}
        </span>
      )}
    </button>
  );
}
