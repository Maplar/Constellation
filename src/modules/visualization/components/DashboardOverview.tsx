/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { useGraphStore, type GraphMode } from "../stores/useGraphStore";
import { ForceGraph2D } from "../../notes/components/ForceGraph2D";
import { ForceGraph3D } from "../../notes/components/ForceGraph3D";
import { MindMapGalaxy } from "./MindMapGalaxy";
import { getCategoryColor } from "../utils/colorMap";

/* ── Card wrapper ── */
interface GraphCardProps {
  title: string;
  mode: GraphMode;
  infoText: string;
  children: React.ReactNode;
}

function GraphCard({ title, mode, infoText, children }: GraphCardProps) {
  const { setActiveMode } = useGraphStore();

  return (
    <div
      className="flex flex-col overflow-hidden transition-shadow duration-200"
      style={{
        backgroundColor: "var(--color-cloud)",
        borderRadius: 10,
        border: "1px solid var(--color-paper-deep)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        height: 280,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
      }}
    >
      {/* Title bar */}
      <div
        className="shrink-0 flex items-center justify-between px-3 h-9 border-b"
        style={{ borderColor: "var(--color-paper-deep)" }}
      >
        <span className="text-[13px] font-medium" style={{ color: "var(--color-ink-soft)" }}>
          {title}
        </span>
        <button
          onClick={() => setActiveMode(mode)}
          className="text-[11px] px-2 py-0.5 rounded transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
          style={{ color: "var(--color-bamboo)" }}
          title="全屏展开"
        >
          全屏展开 →
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">{children}</div>

      {/* Info bar */}
      <div
        className="shrink-0 px-3 h-6 flex items-center border-t"
        style={{ borderColor: "var(--color-paper-deep)" }}
      >
        <span className="text-[10px]" style={{ color: "var(--color-ink-ghost)" }}>
          {infoText}
        </span>
      </div>
    </div>
  );
}

/* ── StatsBar (same as GraphDashboard but for overview) ── */
function StatsBar({ noteCount, edgeCount, categoryCount, density }: {
  noteCount: number;
  edgeCount: number;
  categoryCount: number;
  density: string;
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <StatCard value={noteCount} label="笔记" />
      <StatCard value={edgeCount} label="链接" />
      <StatCard value={categoryCount} label="分类" />
      <StatCard value={density} label="密度" />
    </div>
  );
}

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 flex-1 min-w-[120px]"
      style={{
        backgroundColor: "var(--color-cloud)",
        borderRadius: 10,
        border: "1px solid var(--color-paper-deep)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="w-1 h-10 rounded-full shrink-0"
        style={{ backgroundColor: "var(--color-bamboo)" }}
      />
      <div>
        <div
          className="text-[28px] font-bold leading-none"
          style={{ color: "var(--color-ink)" }}
        >
          {value}
        </div>
        <div
          className="text-[13px] mt-1"
          style={{ color: "var(--color-ink-faint)" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* ── Category Distribution Donut Chart ── */
function CategoryDistribution({ categories }: { categories: [string, number][] }) {
  const total = categories.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return <div className="p-3 text-[11px]" style={{ color: "var(--color-ink-ghost)" }}>暂无数据</div>;

  const cx = 80, cy = 80, r = 60, strokeWidth = 20;
  const circumference = 2 * Math.PI * r;
  let cumulativeOffset = 0;

  return (
    <div className="flex items-center gap-4 p-3 h-full">
      <svg width={160} height={160} viewBox="0 0 160 160">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-paper-warm)" strokeWidth={strokeWidth} />
        {/* Category arcs */}
        {categories.map(([cat, count]) => {
          const fraction = count / total;
          const dashLength = fraction * circumference;
          const dashOffset = -cumulativeOffset * circumference;
          cumulativeOffset += fraction;
          return (
            <circle
              key={cat}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={getCategoryColor(cat)}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          );
        })}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--color-ink)">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="var(--color-ink-faint)">笔记</text>
      </svg>
      {/* Legend */}
      <div className="space-y-1.5 flex-1 min-w-0">
        {categories.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(cat) }} />
            <span className="text-[11px] truncate flex-1" style={{ color: "var(--color-ink-soft)" }}>{cat}</span>
            <span className="text-[11px] font-mono" style={{ color: "var(--color-ink-ghost)" }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main DashboardOverview ── */

export function DashboardOverview() {
  const { linkGraph, notesMetadata } = useNoteStore();

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const meta of notesMetadata) {
      map.set(meta.id, meta.category || "未分类");
    }
    return map;
  }, [notesMetadata]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const meta of notesMetadata) {
      const cat = meta.category || "未分类";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notesMetadata]);

  const stats = useMemo(() => {
    const n = linkGraph.nodes.length;
    const density = n > 1 ? (linkGraph.edges.length / (n * (n - 1))).toFixed(2) : "0";
    return {
      noteCount: notesMetadata.length,
      edgeCount: linkGraph.edges.length,
      categoryCount: categories.length,
      density,
    };
  }, [linkGraph, notesMetadata, categories]);

  return (
    <div className="w-full h-full overflow-y-auto p-4">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* StatsBar */}
        <StatsBar
          noteCount={stats.noteCount}
          edgeCount={stats.edgeCount}
          categoryCount={stats.categoryCount}
          density={stats.density}
        />

        {/* 2×2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GraphCard
            title="文件关系图"
            mode="relation"
            infoText={`${linkGraph.nodes.length} 节点, ${linkGraph.edges.length} 边`}
          >
            <ForceGraph2D simplified />
          </GraphCard>

          <GraphCard
            title="思维导图星系"
            mode="galaxy"
            infoText={`${categories.length} 颗恒星, ${notesMetadata.length} 颗行星`}
          >
            <MindMapGalaxy />
          </GraphCard>

          <GraphCard
            title="引用星团图"
            mode="starcluster"
            infoText={`${Math.min(linkGraph.nodes.length, 50)} 节点`}
          >
            <ForceGraph3D
              nodes={linkGraph.nodes}
              edges={linkGraph.edges}
              maxNodes={50}
              simplified
              categoryMap={categoryMap}
            />
          </GraphCard>

          <GraphCard
            title="分类分布"
            mode="dashboard"
            infoText={`${categories.length} 个分类`}
          >
            <CategoryDistribution categories={categories} />
          </GraphCard>
        </div>
      </div>
    </div>
  );
}
