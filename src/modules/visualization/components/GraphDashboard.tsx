/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useGraphStore } from "../stores/useGraphStore";
import { useNoteStore } from "../../notes/stores/useNoteStore";

/* ── 统计摘要栏 ── */

function StatsBar() {
  const { notesMetadata, notes, wikiLinks } = useNoteStore();

  const categories = useMemo(() => {
    const set = new Set(notesMetadata.map((n) => n.category || "未分类"));
    return set.size;
  }, [notesMetadata]);

  const density = useMemo(() => {
    const n = notes.length;
    if (n <= 1) return 0;
    return wikiLinks.length / (n * (n - 1) / 2);
  }, [notes, wikiLinks]);

  const stats = [
    { label: "笔记总数", value: notes.length },
    { label: "链接总数", value: wikiLinks.length },
    { label: "分类总数", value: categories },
    { label: "网络密度", value: density.toFixed(4) },
  ];

  return (
    <div
      className="shrink-0 flex items-center gap-4 px-4 h-16 border-b"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <div
            className="w-1 h-8 rounded-full shrink-0"
            style={{ backgroundColor: "var(--accent)" }}
          />
          <div>
            <div
              className="text-[20px] font-bold leading-none"
              style={{ color: "var(--text-primary)" }}
            >
              {s.value}
            </div>
            <div
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 仪表盘卡片 ── */

const DASHBOARD_CARDS = [
  { key: "relation", title: "文件关系图" },
  { key: "galaxy", title: "思维导图星系" },
  { key: "distribution", title: "分类分布" },
] as const;

function DashboardCard({ title }: { title: string }) {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: 280,
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* 标题栏 */}
      <div
        className="shrink-0 flex items-center justify-between px-3 h-9 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </span>
      </div>
      {/* 内容区 */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          预览缩略图
        </span>
      </div>
    </div>
  );
}

/* ── 主组件 ── */

interface GraphDashboardProps {
  onBack?: () => void;
}

export function GraphDashboard({ onBack }: GraphDashboardProps = {}) {
  const { activeView } = useGraphStore();

  void onBack; // 保留接口兼容，后续可用于返回按钮

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 顶部统计栏 */}
      <StatsBar />

      {/* 内容区 */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {activeView === "dashboard" ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            {DASHBOARD_CARDS.map((card) => (
              <DashboardCard key={card.key} title={card.title} />
            ))}
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="text-[14px]" style={{ color: "var(--text-muted)" }}>
              画布区域待实现
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
