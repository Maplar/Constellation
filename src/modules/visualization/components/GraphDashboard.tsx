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
  const { activeMode, dimensionMode, toggleDimension } = useGraphStore();
  const { loadNotes, loadFullNotes, linkGraph, notesMetadata, selectNote } = useNoteStore();

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

  const handleExport = () => {
    const svgEl = document.querySelector(".visualization-canvas svg");
    const canvasEl = document.querySelector(".visualization-canvas canvas");
    if (svgEl) {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgEl);
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `graph-${activeMode}-${dimensionMode}-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (canvasEl) {
      const dataUrl = (canvasEl as HTMLCanvasElement).toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `graph-${activeMode}-${dimensionMode}-${Date.now()}.png`;
      a.click();
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ── Top Toolbar (48px) ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 h-12 border-b"
        style={{
          borderColor: "var(--color-paper-deep)",
          backgroundColor: "var(--color-paper)",
        }}
      >
        <button
          onClick={() => selectNote(null)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
          style={{ color: "var(--color-ink-faint)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回笔记
        </button>
        <div className="flex-1 text-center">
          <span className="text-[14px] font-semibold" style={{ color: "var(--color-ink)" }}>
            图谱仪表盘
          </span>
        </div>
        <button
          className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
          title="最大化"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
        <button
          className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
          title="关闭"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
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

          {/* ── Bottom Control Bar (40px) ── */}
          {activeMode !== "dashboard" && (
            <div
              className="shrink-0 flex items-center justify-between px-4 h-10 border-t"
              style={{
                borderColor: "var(--color-paper-deep)",
                backgroundColor: "var(--color-paper)",
              }}
            >
              <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--color-ink-ghost)" }}>
                {/* 2D/3D toggle for relation mode */}
                {activeMode === "relation" && (
                  <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "var(--color-paper-deep)" }}>
                    {(["2D", "3D"] as const).map((mode) => {
                      const active = dimensionMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => { if (!active) toggleDimension(); }}
                          className="px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer"
                          style={{
                            backgroundColor: active ? "var(--color-bamboo-mist)" : "transparent",
                            color: active ? "var(--color-bamboo)" : "var(--color-ink-ghost)",
                            borderRight: mode === "2D" ? "1px solid var(--color-paper-deep)" : undefined,
                          }}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                )}
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
              <button
                onClick={handleExport}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
                style={{ color: "var(--color-ink-faint)", border: "1px solid var(--color-paper-deep)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                导出
              </button>
            </div>
          )}
        </main>
      </div>
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
