/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useMemo } from "react";
import { useGraphStore } from "../stores/useGraphStore";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { GraphSidebar } from "./GraphSidebar";
import { RelationGraph } from "./RelationGraph";
import { MindMapGalaxy } from "./MindMapGalaxy";
import { StarCluster3D } from "./StarCluster3D";
import { DashboardOverview } from "./DashboardOverview";

export function GraphDashboard() {
  const { activeMode, dimensionMode } = useGraphStore();
  const { loadNotes, loadFullNotes, linkGraph, notesMetadata } = useNoteStore();

  useEffect(() => {
    void (async () => {
      await loadNotes();
      await loadFullNotes();
    })();
  }, [loadNotes, loadFullNotes]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        useGraphStore.setState({ sidebarCollapsed: true });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ── Stats for StatsBar ── */
  const stats = useMemo(() => {
    const nodes = linkGraph.nodes;
    const edges = linkGraph.edges;
    const n = nodes.length;
    const categories = new Set(notesMetadata.map((m) => m.category || "未分类"));
    const density = n > 1 ? (edges.length / (n * (n - 1))).toFixed(2) : "0";
    return {
      noteCount: notesMetadata.length,
      edgeCount: edges.length,
      categoryCount: categories.size,
      density,
    };
  }, [linkGraph, notesMetadata]);

  const showStatsBar = activeMode !== "dashboard";

  return (
    <div className="w-full h-full flex overflow-hidden">
      <GraphSidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        {/* ── StatsBar ── */}
        {showStatsBar && (
          <div
            className="shrink-0 flex items-center gap-4 px-4 h-16 border-b"
            style={{
              borderColor: "var(--color-paper-deep)",
              backgroundColor: "var(--color-paper)",
            }}
          >
            <StatsCard value={stats.noteCount} label="笔记" />
            <StatsCard value={stats.edgeCount} label="链接" />
            <StatsCard value={stats.categoryCount} label="分类" />
            <StatsCard value={stats.density} label="密度" />
          </div>
        )}

        {/* ── Visualization Canvas ── */}
        <div className="flex-1 min-h-0 p-3">
          {activeMode === "relation" ? (
            <RelationGraph />
          ) : activeMode === "galaxy" ? (
            <MindMapGalaxy />
          ) : activeMode === "starcluster" ? (
            <StarCluster3D nodes={linkGraph.nodes} edges={linkGraph.edges} />
          ) : (
            <DashboardOverview />
          )}
        </div>

        {/* ── Bottom Control Bar ── */}
        {activeMode !== "dashboard" && (
          <div
            className="shrink-0 flex items-center justify-between px-4 h-10 border-t"
            style={{
              borderColor: "var(--color-paper-deep)",
              backgroundColor: "var(--color-paper)",
            }}
          >
            <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--color-ink-ghost)" }}>
              <span>
                当前: {
                  activeMode === "relation" ? "文件关系图" :
                  activeMode === "galaxy" ? "思维导图星系" :
                  "引用星团图"
                }
              </span>
              <span>·</span>
              <span>{linkGraph.nodes.length} 节点, {linkGraph.edges.length} 边</span>
              {activeMode === "relation" && (
                <>
                  <span>·</span>
                  <span>{dimensionMode} 模式</span>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── StatsCard ── */
function StatsCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-1 h-8 rounded-full"
        style={{ backgroundColor: "var(--color-bamboo)" }}
      />
      <div>
        <div
          className="text-[20px] font-bold leading-none"
          style={{ color: "var(--color-ink)" }}
        >
          {value}
        </div>
        <div
          className="text-[12px] mt-0.5"
          style={{ color: "var(--color-ink-faint)" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
