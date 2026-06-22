/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useGraphStore } from "../../stores/useGraphStore";
import { useNoteStore } from "../../../notes/stores/useNoteStore";
import { getCategoryColor } from "../../utils/colorMap";

interface SelectedNodeBarProps {
  className?: string;
}

export function SelectedNodeBar({ className }: SelectedNodeBarProps) {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const notesMetadata = useNoteStore((s) => s.notesMetadata);

  const selectedNote = useMemo(
    () => notesMetadata.find((n) => n.id === selectedNodeId) ?? null,
    [notesMetadata, selectedNodeId],
  );

  if (!selectedNodeId || !selectedNote) return null;

  const category = selectedNote.category || "未分类";
  const title = selectedNote.title || "无标题笔记";

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-body select-none ${className ?? ""}`}
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        opacity: 0.95,
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: getCategoryColor(category) }}
      />
      <span
        className="max-w-[180px] truncate"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </span>
      <button
        onClick={() => selectNode(null)}
        className="ml-1 p-0.5 rounded cursor-pointer transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        }}
        title="清除选中"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
