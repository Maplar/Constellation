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

interface GraphPanelProps {
  title: string;
  icon: string;
  mode: GraphMode;
  children: React.ReactNode;
  className?: string;
}

function GraphPanel({ title, icon, mode, children, className = "" }: GraphPanelProps) {
  const { setActiveMode } = useGraphStore();

  return (
    <div
      className={`rounded-lg border overflow-hidden flex flex-col ${className}`}
      style={{
        backgroundColor: "var(--color-paper)",
        borderColor: "var(--color-paper-deep)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 h-9 border-b shrink-0"
        style={{ borderColor: "var(--color-paper-deep)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px]">{icon}</span>
          <span
            className="text-[12px] font-medium"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {title}
          </span>
        </div>
        <button
          onClick={() => setActiveMode(mode)}
          className="p-1 rounded transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
          title="最大化"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--color-ink-ghost)" }}
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export function DashboardOverview() {
  const { linkGraph, notesMetadata } = useNoteStore();
  const { setActiveMode } = useGraphStore();

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const meta of notesMetadata) {
      map.set(meta.id, meta.category || "未分类");
    }
    return map;
  }, [notesMetadata]);

  const stats = useMemo(() => {
    const nodes = linkGraph.nodes;
    const edges = linkGraph.edges;
    const categories = new Set(notesMetadata.map((n) => n.category || "未分类"));

    return {
      noteCount: notesMetadata.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      categoryCount: categories.size,
    };
  }, [linkGraph, notesMetadata]);

  return (
    <div className="w-full h-full overflow-y-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1400px] mx-auto">
        <GraphPanel title="文件关系图谱" icon="🌐" mode="relation" className="h-[300px]">
          <ForceGraph2D simplified />
        </GraphPanel>

        <GraphPanel title="引用星团图" icon="⭐" mode="starcluster" className="h-[300px]">
          <ForceGraph3D
            nodes={linkGraph.nodes}
            edges={linkGraph.edges}
            maxNodes={50}
            simplified
            categoryMap={categoryMap}
          />
        </GraphPanel>

        <GraphPanel
          title="思维导图星系"
          icon="🧠"
          mode="galaxy"
          className="h-[400px] lg:col-span-2"
        >
          <MindMapGalaxy />
        </GraphPanel>

        <div
          className="lg:col-span-2 rounded-lg border px-4 py-3 flex items-center justify-between flex-wrap gap-4"
          style={{
            backgroundColor: "var(--color-paper)",
            borderColor: "var(--color-paper-deep)",
          }}
        >
          <div className="flex items-center gap-6 flex-wrap">
            <StatItem label="总笔记" value={stats.noteCount} />
            <StatItem label="总节点" value={stats.nodeCount} />
            <StatItem label="总连接" value={stats.edgeCount} />
            <StatItem label="分类数" value={stats.categoryCount} />
          </div>
          <button
            onClick={() => setActiveMode("relation")}
            className="text-[11px] px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            style={{
              backgroundColor: "var(--color-bamboo-mist)",
              color: "var(--color-bamboo)",
            }}
          >
            查看完整图谱
          </button>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[11px]"
        style={{ color: "var(--color-ink-ghost)" }}
      >
        {label}
      </span>
      <span
        className="text-[16px] font-mono font-medium tabular-nums"
        style={{ color: "var(--color-ink-soft)" }}
      >
        {value}
      </span>
    </div>
  );
}
