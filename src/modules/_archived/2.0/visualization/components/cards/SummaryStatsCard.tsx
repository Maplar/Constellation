/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useNoteStore } from "../../../notes/stores/useNoteStore";

interface StatItemProps {
  value: number;
  label: string;
  barColor: string;
}

function StatItem({ value, label, barColor }: StatItemProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <div
        className="w-1 h-10 rounded-full shrink-0"
        style={{ backgroundColor: barColor }}
      />
      <div>
        <div
          className="text-[24px] font-bold leading-none tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </div>
        <div
          className="text-[11px] mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export function SummaryStatsCardContent() {
  const { notesMetadata, wikiLinks } = useNoteStore();

  const categoryCount = useMemo(() => {
    const set = new Set(notesMetadata.map((n) => n.category || "未分类"));
    return set.size;
  }, [notesMetadata]);

  const stats = [
    { label: "笔记总数", value: notesMetadata.length, barColor: "#3a7d5e" },
    { label: "链接总数", value: wikiLinks.length, barColor: "#c49b6c" },
    { label: "分类总数", value: categoryCount, barColor: "#7a9eb1" },
  ];

  return (
    <div className="h-full flex items-center">
      <div className="grid grid-cols-3 w-full gap-1 px-1">
        {stats.map((s) => (
          <StatItem key={s.label} {...s} />
        ))}
      </div>
    </div>
  );
}
