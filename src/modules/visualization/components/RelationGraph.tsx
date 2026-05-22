/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useRef, useCallback, useMemo } from "react";
import { useGraphStore } from "../stores/useGraphStore";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { ForceGraph2D } from "../../notes/components/ForceGraph2D";
import { ForceGraph3D } from "../../notes/components/ForceGraph3D";

export function RelationGraph() {
  const {
    dimensionMode,
    searchQuery,
    selectedNodeId,
    selectNode,
    hoverNode,
  } = useGraphStore();
  const { linkGraph, notesMetadata, selectedNoteId, selectNote } =
    useNoteStore();
  const graphKey = useRef(0);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const meta of notesMetadata) {
      map.set(meta.id, meta.category || "未分类");
    }
    return map;
  }, [notesMetadata]);

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

  return (
    <div className="w-full h-full relative animate-fade-in">
      {dimensionMode === "3D" ? (
        <ForceGraph3D
          key={`3d-${graphKey.current}`}
          nodes={linkGraph.nodes}
          edges={linkGraph.edges}
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
          onNodeHover={handleNodeHover}
        />
      )}
    </div>
  );
}
