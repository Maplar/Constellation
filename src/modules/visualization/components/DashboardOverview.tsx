/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import React, { useMemo, useState, useCallback } from "react";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { useGraphStore, type GraphMode } from "../stores/useGraphStore";
import { ForceGraph2D } from "../../notes/components/ForceGraph2D";
import { MindMapGalaxy } from "./MindMapGalaxy";
import { getCategoryColor } from "../utils/colorMap";

/* ── Draggable Grid ── */
function DraggableGrid({ children }: { children: React.ReactNode }) {
  const [order, setOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setOrder((prev) => {
      const ids = React.Children.toArray(children)
        .filter((c): c is React.ReactElement<{ cardId?: string }> => React.isValidElement(c))
        .map((c) => c.props.cardId || "");
      const fromIdx = ids.indexOf(dragId);
      const toIdx = ids.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...ids];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragId);
      return next;
    });
    setDragId(null);
  }, [dragId, children]);

  const childArray = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<{ cardId?: string }>[];
  const sorted = order.length > 0
    ? order.map((id) => childArray.find((c) => c.props.cardId === id)).filter(Boolean)
    : childArray;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
    >
      {sorted.map((child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<GraphCardExtraProps>, {
              onDragStart: handleDragStart,
              onDrop: handleDrop,
              isDragging: dragId === child.props.cardId,
            })
          : child,
      )}
    </div>
  );
}

/* ── Card wrapper ── */
interface GraphCardExtraProps {
  cardId?: string;
  onDragStart?: (id: string) => void;
  onDrop?: (id: string) => void;
  isDragging?: boolean;
}

interface GraphCardProps {
  title: string;
  mode: GraphMode;
  infoText: string;
  children: React.ReactNode;
  cardId?: string;
  onDragStart?: (id: string) => void;
  onDrop?: (id: string) => void;
  isDragging?: boolean;
}

function GraphCard({ title, mode, infoText, children, cardId, onDragStart, onDrop, isDragging }: GraphCardProps) {
  const { setActiveMode } = useGraphStore();

  return (
    <div
      draggable={!!cardId}
      onDragStart={() => cardId && onDragStart?.(cardId)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => cardId && onDrop?.(cardId)}
      className="flex flex-col overflow-hidden transition-shadow duration-200"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        boxShadow: isDragging ? "var(--shadow-lg)" : "var(--shadow-sm)",
        height: 280,
        opacity: isDragging ? 0.6 : 1,
        cursor: cardId ? "grab" : "default",
      }}
      onMouseEnter={(e) => {
        if (!isDragging) (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        if (!isDragging) (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {/* Title bar — 36px */}
      <div
        className="shrink-0 flex items-center justify-between px-3 h-9 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[14px] font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </span>
        <button
          onClick={() => setActiveMode(mode)}
          className="text-[12px] px-2 py-0.5 rounded transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--accent)" }}
          title="全屏展开"
        >
          全屏展开 →
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">{children}</div>

      {/* Info bar */}
      <div
        className="shrink-0 px-3 h-7 flex items-center border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          {infoText}
        </span>
      </div>
    </div>
  );
}

/* ── StatsBar ── */
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

/* ── StatCard: spec 28px bold, 13px label, padding 16px 20px, left accent bar 4px ── */
function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-4 flex-1 min-w-[120px]"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="w-1 h-8 rounded-full shrink-0"
        style={{ backgroundColor: "var(--accent)" }}
      />
      <div>
        <div
          className="text-[28px] font-bold leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </div>
        <div
          className="text-[13px] mt-1"
          style={{ color: "var(--text-secondary)" }}
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
  if (total === 0) return <div className="p-3 text-[12px]" style={{ color: "var(--text-muted)" }}>暂无数据</div>;

  const cx = 80, cy = 80, r = 60, strokeWidth = 20;
  const circumference = 2 * Math.PI * r;
  let cumulativeOffset = 0;

  return (
    <div className="flex items-center gap-4 p-3 h-full">
      <svg width={160} height={160} viewBox="0 0 160 160">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={strokeWidth} />
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
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text-primary)">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">笔记</text>
      </svg>
      {/* Legend */}
      <div className="space-y-1.5 flex-1 min-w-0">
        {categories.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(cat) }} />
            <span className="text-[12px] truncate flex-1" style={{ color: "var(--text-primary)" }}>{cat}</span>
            <span className="text-[12px] font-mono" style={{ color: "var(--text-muted)" }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main DashboardOverview ── */

export function DashboardOverview() {
  const { linkGraph, notesMetadata } = useNoteStore();
  const graphParams = useGraphStore((s) => s.graphParams);

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

        {/* Responsive Grid with drag reordering — 2 columns */}
        <DraggableGrid>
          <GraphCard
            title="文件关系图"
            mode="relation"
            infoText={`${linkGraph.nodes.length} 节点, ${linkGraph.edges.length} 边`}
            cardId="relation"
          >
            <ForceGraph2D simplified radiusScale={graphParams.nodeRadiusScale} />
          </GraphCard>

          <GraphCard
            title="思维导图星系"
            mode="galaxy"
            infoText={`${categories.length} 颗恒星, ${notesMetadata.length} 颗行星`}
            cardId="galaxy"
          >
            <MindMapGalaxy />
          </GraphCard>

          <GraphCard
            title="分类分布"
            mode="dashboard"
            infoText={`${categories.length} 个分类`}
            cardId="distribution"
          >
            <CategoryDistribution categories={categories} />
          </GraphCard>
        </DraggableGrid>
      </div>
    </div>
  );
}
