/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useNoteStore } from "../../../notes/stores/useNoteStore";
import { getCategoryColor } from "../../utils/colorMap";

export function CategoryDonutCardContent() {
  const { notesMetadata } = useNoteStore();

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of notesMetadata) {
      const cat = m.category || "未分类";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notesMetadata]);

  const total = categories.reduce((sum, [, c]) => sum + c, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12px]" style={{ color: "var(--text-muted)" }}>
        暂无数据
      </div>
    );
  }

  const cx = 80, cy = 80, r = 52, sw = 14;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-3 p-3 h-full">
      {/* SVG donut */}
      <svg width={160} height={160} viewBox="0 0 160 160" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={sw} />
        {categories.map(([cat, count]) => {
          const frac = count / total;
          const dl = frac * circumference;
          const dash = -offset * circumference;
          offset += frac;
          return (
            <circle
              key={cat}
              cx={cx} cy={cy} r={r}
              fill="none" stroke={getCategoryColor(cat)} strokeWidth={sw}
              strokeLinecap="butt"
              strokeDasharray={`${dl} ${circumference - dl}`}
              strokeDashoffset={dash}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: "stroke-dasharray 0.4s ease" }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text-primary)">
          {total}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
          笔记
        </text>
      </svg>

      {/* Legend list */}
      <div className="space-y-1.5 flex-1 min-w-0 overflow-y-auto">
        {categories.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getCategoryColor(cat) }}
            />
            <span className="text-[11px] truncate flex-1" style={{ color: "var(--text-primary)" }}>
              {cat}
            </span>
            <span className="text-[11px] font-mono shrink-0" style={{ color: "var(--text-muted)" }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
