/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useRef, useCallback, useMemo } from "react";
import { useGraphStore } from "../stores/useGraphStore";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { ForceGraph2DPixi } from "./ForceGraph2DPixi";
import { CanvasContainer } from "./shared/CanvasContainer";
import { GraphToolbar } from "./RelationGraph/GraphToolbar";
import { ErrorBoundary } from "../../../components/ErrorBoundary";

export function RelationGraph() {
  const {
    searchQuery,
    selectedNodeId,
    activeFilters,
    graphParams,
    selectNode,
    hoverNode,
  } = useGraphStore();
  const { linkGraph, notesMetadata, selectNote } =
    useNoteStore();
  const graphKey = useRef(0);

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

  const infoText = `当前: 文件关系图 | ${filteredNodes.length} 节点, ${filteredEdges.length} 边 | 2D 模式 | 力强度 ${graphParams.forceStrength.toFixed(1)}`;

  return (
    <CanvasContainer toolbar={<GraphToolbar onReset={handleReset} />} infoText={infoText}>
      <div className="w-full h-full relative">
        <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-[13px]" style={{ color: "var(--text-muted)" }}>图谱渲染出错，请刷新重试</div>}>
          <ForceGraph2DPixi
            key={`2d-${graphKey.current}`}
            onNodeClick={handleNodeClick}
            searchQuery={searchQuery}
            selectedNodeId={selectedNodeId}
            onNodeHover={handleNodeHover}
            radiusScale={graphParams.nodeRadiusScale}
          />
        </ErrorBoundary>
      </div>
    </CanvasContainer>
  );
}
