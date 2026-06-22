/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useNoteStore } from "../../../notes/stores/useNoteStore";
import { getCategoryColor } from "../../utils/colorMap";
import { getDisplayTitle } from "../../../shared/utils/noteUtils";

interface RankedNote {
  id: string;
  title: string;
  category: string;
  incomingCount: number;
}

export function CitationRankingCardContent() {
  const { notesMetadata, wikiLinks } = useNoteStore();

  const ranking = useMemo(() => {
    const incoming = new Map<string, number>();
    for (const link of wikiLinks) {
      const target = link.targetTitle;
      if (target) {
        incoming.set(target, (incoming.get(target) || 0) + 1);
      }
    }

    const ranked: RankedNote[] = [];
    for (const note of notesMetadata) {
      const count = incoming.get(note.title) ?? 0;
      if (count > 0) {
        ranked.push({
          id: note.id,
          title: getDisplayTitle(note),
          category: note.category || "未分类",
          incomingCount: count,
        });
      }
    }

    ranked.sort((a, b) => b.incomingCount - a.incomingCount);
    return ranked.slice(0, 20);
  }, [notesMetadata, wikiLinks]);

  const maxCount = ranking[0]?.incomingCount ?? 1;

  return (
    <div className="flex flex-col h-full">
      {ranking.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
          暂无引用数据
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {ranking.map((item, idx) => {
            const barWidth = (item.incomingCount / maxCount) * 100;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors group cursor-default"
                style={{ borderColor: "var(--border)" }}
              >
                {/* Rank number */}
                <span
                  className="w-5 text-center text-[11px] font-mono shrink-0"
                  style={{
                    color: idx < 3 ? "var(--accent)" : "var(--text-muted)",
                    fontWeight: idx < 3 ? 700 : 400,
                  }}
                >
                  {idx + 1}
                </span>

                {/* Category dot */}
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getCategoryColor(item.category) }}
                />

                {/* Title */}
                <span
                  className="text-[12px] flex-1 truncate"
                  style={{ color: "var(--text-primary)" }}
                  title={item.title}
                >
                  {item.title}
                </span>

                {/* Bar */}
                <div className="relative w-16 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--bg-hover)" }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: idx < 3 ? "var(--accent)" : "var(--text-muted)",
                      opacity: idx < 3 ? 0.8 : 0.4,
                    }}
                  />
                </div>

                {/* Count */}
                <span className="text-[11px] font-mono w-8 text-right shrink-0" style={{ color: "var(--text-muted)" }}>
                  {item.incomingCount}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Info bar */}
      <div
        className="shrink-0 px-3 h-7 flex items-center border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          {ranking.length} 篇被引用笔记
        </span>
      </div>
    </div>
  );
}
