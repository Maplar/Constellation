/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { CitationBubble } from "../CitationBubble";
import { useNoteStore } from "../../../notes/stores/useNoteStore";
import { SelectedNodeBar } from "../shared/SelectedNodeBar";

export function CitationBubbleCardContent() {
  const { linkGraph } = useNoteStore();

  const infoText = useMemo(() => {
    const cats = new Set<string>();
    for (const n of linkGraph.nodes) {
      cats.add(n.label.slice(0, 2));
    }
    return `${linkGraph.nodes.length} 节点, ${linkGraph.edges.length} 边`;
  }, [linkGraph]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 relative">
        <CitationBubble />
        <SelectedNodeBar className="absolute top-2 left-1/2 -translate-x-1/2 z-30" />
      </div>
      <div
        className="shrink-0 flex items-center gap-3 px-3 h-9 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          {infoText}
        </span>
        <div className="flex-1" />
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          滚轮缩放 · 拖拽平移
        </span>
      </div>
    </div>
  );
}
