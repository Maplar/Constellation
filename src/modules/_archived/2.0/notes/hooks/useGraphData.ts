/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useNoteStore } from "../stores/useNoteStore";
import type { GraphNode, GraphEdge } from "../../shared/types/notes";

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useGraphData(): GraphData & { isLoading: boolean; isEmpty: boolean } {
  const linkGraph = useNoteStore((s) => s.linkGraph);
  const isLoading = useNoteStore((s) => s.isLoading);

  const graphData = useMemo<GraphData & { isLoading: boolean; isEmpty: boolean }>(
    () => ({
      nodes: linkGraph.nodes,
      edges: linkGraph.edges,
      isLoading,
      isEmpty: linkGraph.nodes.length === 0 && !isLoading,
    }),
    [linkGraph, isLoading],
  );

  return graphData;
}
