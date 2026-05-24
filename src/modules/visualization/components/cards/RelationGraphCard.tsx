/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useState, useMemo, lazy, Suspense } from "react";
import { ForceGraph2D } from "../../../notes/components/ForceGraph2D";
import { useNoteStore } from "../../../notes/stores/useNoteStore";
import { useGraphStore } from "../../stores/useGraphStore";
import { ThreeErrorBoundary } from "../shared/ThreeErrorBoundary";

const ForceGraph3D = lazy(() =>
  import("../../../notes/components/ForceGraph3D").then((m) => ({ default: m.ForceGraph3D })),
);

type DimMode = "2D" | "3D";

export function RelationGraphCardContent() {
  const { linkGraph, notesMetadata } = useNoteStore();
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const graphParams = useGraphStore((s) => s.graphParams);
  const updateGraphParams = useGraphStore((s) => s.updateGraphParams);

  const [dimMode, setDimMode] = useState<DimMode>("2D");

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of notesMetadata) {
      map.set(m.id, m.category || "未分类");
    }
    return map;
  }, [notesMetadata]);

  const infoText = useMemo(
    () => `${linkGraph.nodes.length} 节点, ${linkGraph.edges.length} 边`,
    [linkGraph],
  );

  const toggleDim = () => setDimMode((m) => (m === "2D" ? "3D" : "2D"));

  return (
    <div className="flex flex-col h-full">
      {/* Graph canvas */}
      <div className="flex-1 min-h-0">
        {dimMode === "2D" ? (
          <ForceGraph2D simplified searchQuery={searchQuery} />
        ) : (
          <ThreeErrorBoundary>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-[12px]" style={{ color: "var(--text-muted)" }}>
                  加载 3D…
                </div>
              }
            >
              <ForceGraph3D
                nodes={linkGraph.nodes}
                edges={linkGraph.edges}
                maxNodes={80}
                simplified
                categoryMap={categoryMap}
                searchQuery={searchQuery}
              />
            </Suspense>
          </ThreeErrorBoundary>
        )}
      </div>

      {/* Bottom toolbar */}
      <div
        className="shrink-0 flex items-center gap-3 px-3 h-9 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          {infoText}
        </span>
        <div className="flex-1" />

        {/* 2D/3D toggle */}
        <button
          onClick={toggleDim}
          className="text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors"
          style={{
            color: dimMode === "3D" ? "var(--accent)" : "var(--text-muted)",
            backgroundColor: dimMode === "3D" ? "var(--accent-light)" : "transparent",
            border: `1px solid ${dimMode === "3D" ? "var(--accent)" : "var(--border)"}`,
          }}
        >
          {dimMode === "2D" ? "2D" : "3D"}
        </button>

        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          力强度
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={graphParams.forceStrength}
            onChange={(e) => updateGraphParams({ forceStrength: parseFloat(e.target.value) })}
            className="w-16"
            style={{ accentColor: "var(--accent)" }}
          />
          <span className="text-[10px] font-mono w-6" style={{ color: "var(--text-muted)" }}>
            {graphParams.forceStrength.toFixed(1)}
          </span>
        </label>
      </div>
    </div>
  );
}
