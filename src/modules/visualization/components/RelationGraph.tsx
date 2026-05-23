/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useRef, useCallback, useMemo, useState } from "react";
import { useGraphStore } from "../stores/useGraphStore";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { ForceGraph2D } from "../../notes/components/ForceGraph2D";
import { ForceGraph3D } from "../../notes/components/ForceGraph3D";
import { CanvasContainer } from "./shared/CanvasContainer";
import { GraphToolbar } from "./RelationGraph/GraphToolbar";

export function RelationGraph() {
  const {
    dimensionMode,
    searchQuery,
    selectedNodeId,
    activeFilters,
    selectNode,
    hoverNode,
  } = useGraphStore();
  const { linkGraph, notesMetadata, selectedNoteId, selectNote } =
    useNoteStore();
  const graphKey = useRef(0);
  const [transitioning, setTransitioning] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const meta of notesMetadata) {
      map.set(meta.id, meta.category || "未分类");
    }
    return map;
  }, [notesMetadata]);

  /* ── Filter by activeFilters ── */
  const filteredNodes = useMemo(() => {
    if (activeFilters.length === 0) return linkGraph.nodes;
    return linkGraph.nodes.filter((n) => {
      const cat = categoryMap.get(n.noteId) || "未分类";
      return activeFilters.includes(cat);
    });
  }, [linkGraph.nodes, activeFilters, categoryMap]);

  const filteredEdges = useMemo(() => {
    if (activeFilters.length === 0) return linkGraph.edges;
    const ids = new Set(filteredNodes.map((n) => n.id));
    return linkGraph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [linkGraph.edges, filteredNodes, activeFilters]);

  const handleNodeClick = useCallback(
    (noteId: string) => {
      selectNote(noteId);
      selectNode(noteId);
    },
    [selectNote, selectNode],
  );

  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      hoverNode(nodeId);
    },
    [hoverNode],
  );

  const handleReset = useCallback(() => {
    graphKey.current += 1;
    selectNode(null);
  }, [selectNode]);

  /* ── Dimension switch with 300ms transition ── */
  const prevDimRef = useRef(dimensionMode);
  if (prevDimRef.current !== dimensionMode) {
    prevDimRef.current = dimensionMode;
    if (!transitioning) {
      setTransitioning(true);
      setTimeout(() => setTransitioning(false), 300);
    }
  }

  const infoText = `当前: 文件关系图 | ${filteredNodes.length} 节点, ${filteredEdges.length} 边 | ${dimensionMode} 模式`;

  return (
    <CanvasContainer toolbar={<GraphToolbar onReset={handleReset} />} infoText={infoText}>
      <div
        className="w-full h-full relative"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      >
        {dimensionMode === "3D" ? (
          <ForceGraph3D
            key={`3d-${graphKey.current}`}
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNoteId={selectedNoteId}
            maxNodes={150}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            categoryMap={categoryMap}
          />
        ) : (
          <ForceGraph2D
            key={`2d-${graphKey.current}`}
            onNodeClick={handleNodeClick}
            searchQuery={searchQuery}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={null}
            onNodeHover={handleNodeHover}
          />
        )}
      </div>
    </CanvasContainer>
  );
}
