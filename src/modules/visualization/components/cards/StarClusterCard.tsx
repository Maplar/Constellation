/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo, lazy, Suspense } from "react";
import { useNoteStore } from "../../../notes/stores/useNoteStore";
import { useGraphStore } from "../../stores/useGraphStore";
import { ThreeErrorBoundary } from "../shared/ThreeErrorBoundary";

const StarCluster3D = lazy(() =>
  import("../StarCluster3D").then((m) => ({ default: m.StarCluster3D })),
);

export function StarClusterCardContent() {
  const { linkGraph } = useNoteStore();
  const graphParams = useGraphStore((s) => s.graphParams);
  const updateGraphParams = useGraphStore((s) => s.updateGraphParams);

  const maxNodes = 100;
  const limitedNodes = useMemo(
    () => [...linkGraph.nodes].sort((a, b) => b.val - a.val).slice(0, maxNodes),
    [linkGraph.nodes, maxNodes],
  );
  const limitedIds = new Set(limitedNodes.map((n) => n.id));
  const limitedEdges = useMemo(
    () => linkGraph.edges.filter((e) => limitedIds.has(e.source) && limitedIds.has(e.target)),
    [linkGraph.edges, limitedIds],
  );

  return (
    <div className="flex flex-col h-full">
      {/* 3D canvas */}
      <div className="flex-1 min-h-0">
        <ThreeErrorBoundary>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-[12px]" style={{ color: "var(--text-muted)" }}>
                加载 3D 星团…
              </div>
            }
          >
            <StarCluster3D nodes={limitedNodes} edges={limitedEdges} maxNodes={maxNodes} simplified />
          </Suspense>
        </ThreeErrorBoundary>
      </div>

      {/* Bottom toolbar */}
      <div
        className="shrink-0 flex items-center gap-3 px-3 h-9 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          {limitedNodes.length} 节点, {limitedEdges.length} 边
        </span>
        <div className="flex-1" />

        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          辉光
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={graphParams.glowIntensity}
            onChange={(e) => updateGraphParams({ glowIntensity: parseFloat(e.target.value) })}
            className="w-12"
            style={{ accentColor: "var(--accent)" }}
          />
        </label>

        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          粒子
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={graphParams.particleCount}
            onChange={(e) => updateGraphParams({ particleCount: parseInt(e.target.value) })}
            className="w-12"
            style={{ accentColor: "var(--accent)" }}
          />
        </label>

        <button
          onClick={() => updateGraphParams({ autoRotate: !graphParams.autoRotate })}
          className="text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          style={{
            color: graphParams.autoRotate ? "var(--accent)" : "var(--text-muted)",
            backgroundColor: graphParams.autoRotate ? "var(--accent-light)" : "transparent",
          }}
        >
          旋转
        </button>
      </div>
    </div>
  );
}
