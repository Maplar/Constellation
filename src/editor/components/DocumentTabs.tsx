/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useState } from "react";
import type { DocumentTab } from "../stores/useDocumentTabs";

interface DocumentTabsProps {
  tabs: DocumentTab[];
  activeTabId: string | null;
  dirtyTabId?: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onTogglePinned: (id: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
}

export function DocumentTabs({
  tabs,
  activeTabId,
  dirtyTabId,
  onActivate,
  onClose,
  onTogglePinned,
  onReorder,
}: DocumentTabsProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  if (tabs.length === 0) return null;

  return (
    <div className="h-9 shrink-0 flex items-end overflow-x-auto border-b border-paper-deep/35 bg-paper/35">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            draggable
            onDragStart={() => setDraggedId(tab.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedId) onReorder(draggedId, tab.id);
              setDraggedId(null);
            }}
            className={`group h-8 min-w-[120px] max-w-[220px] px-2 flex items-center gap-1.5 border-r border-paper-deep/30 ${
              active ? "bg-cloud text-ink" : "bg-paper/30 text-ink-faint hover:bg-paper-warm/60"
            } ${draggedId === tab.id ? "opacity-45" : ""}`}
          >
            <button
              type="button"
              onClick={() => onTogglePinned(tab.id)}
              title={tab.pinned ? "取消固定" : "固定 Tab"}
              className={`shrink-0 text-[10px] ${tab.pinned ? "text-bamboo" : "text-ink-ghost/40 opacity-0 group-hover:opacity-100"}`}
            >
              {tab.pinned ? "●" : "○"}
            </button>
            <button
              type="button"
              onClick={() => onActivate(tab.id)}
              className="min-w-0 flex-1 truncate text-left text-[11px]"
              title={tab.title}
            >
              {dirtyTabId === tab.id ? "• " : ""}
              {tab.title || "无标题"}
            </button>
            <button
              type="button"
              onClick={() => onClose(tab.id)}
              className="shrink-0 w-5 h-5 rounded text-ink-ghost opacity-0 group-hover:opacity-100 hover:bg-paper-deep/35"
              title="关闭 Tab"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
