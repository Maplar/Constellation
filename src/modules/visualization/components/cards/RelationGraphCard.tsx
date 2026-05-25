/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { ForceGraph2D } from "../../../notes/components/ForceGraph2D";
import { useNoteStore } from "../../../notes/stores/useNoteStore";
import { useGraphStore } from "../../stores/useGraphStore";

export function RelationGraphCardContent() {
  const { linkGraph } = useNoteStore();
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const graphParams = useGraphStore((s) => s.graphParams);
  const updateGraphParams = useGraphStore((s) => s.updateGraphParams);

  const infoText = useMemo(
    () => `${linkGraph.nodes.length} 节点, ${linkGraph.edges.length} 边`,
    [linkGraph],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ForceGraph2D simplified searchQuery={searchQuery} radiusScale={graphParams.nodeRadiusScale} />
      </div>

      <div
        className="shrink-0 flex items-center gap-3 px-3 h-9 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          {infoText}
        </span>
        <div className="flex-1" />

        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          大小
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={graphParams.nodeRadiusScale}
            onChange={(e) => updateGraphParams({ nodeRadiusScale: parseFloat(e.target.value) })}
            className="w-14"
            style={{ accentColor: "var(--accent)" }}
          />
          <span className="text-[10px] font-mono w-6" style={{ color: "var(--text-muted)" }}>
            {graphParams.nodeRadiusScale.toFixed(1)}
          </span>
        </label>

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
