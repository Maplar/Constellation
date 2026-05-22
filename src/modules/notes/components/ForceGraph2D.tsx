/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { useNoteStore } from "../stores/useNoteStore";
import { getCategoryColor } from "../../visualization/utils/colorMap";

interface ForceGraph2DProps {
  onNodeClick?: (noteId: string) => void;
  searchQuery?: string;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  onNodeHover?: (nodeId: string | null) => void;
  simplified?: boolean;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  val: number;
  color: string;
  noteId: string;
  category: string;
  x?: number;
  y?: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
  label: string | null;
  value: number;
}

function resolveThemeColors(): {
  bg: string;
  text: string;
  link: string;
  highlight: string;
} {
  if (typeof document === "undefined")
    return { bg: "#fcfaf6", text: "#2d2d2a", link: "#b7bfb5", highlight: "#4faa70" };
  const theme = document.documentElement.getAttribute("data-theme");
  const isDark = theme === "dark";
  return {
    bg: isDark ? "#1a1a18" : "#fcfaf6",
    text: isDark ? "#d5d3ce" : "#2d2d2a",
    link: isDark ? "#4a5450" : "#b7bfb5",
    highlight: isDark ? "#5fc085" : "#2d5a3d",
  };
}

function mapNodeSize(val: number, maxVal: number): number {
  if (maxVal <= 0) return 12;
  const minSize = 12;
  const maxSize = 48;
  return minSize + (val / maxVal) * (maxSize - minSize);
}

export function ForceGraph2D({
  onNodeClick,
  searchQuery = "",
  selectedNodeId,
  onNodeHover,
  simplified = false,
}: ForceGraph2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<string | null>(null);

  const linkGraph = useNoteStore((s) => s.linkGraph);
  const notesMetadata = useNoteStore((s) => s.notesMetadata);

  const categoryMap = new Map<string, string>();
  for (const meta of notesMetadata) {
    categoryMap.set(meta.id, meta.category || "未分类");
  }

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      onNodeClick?.(nodeId);
    },
    [onNodeClick],
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    const container = containerRef.current;
    if (!svgEl || !container) return;

    const bounds = container.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    if (width === 0 || height === 0) return;

    const colors = resolveThemeColors();
    const svg = d3.select(svgEl);

    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);

    const maxVal = Math.max(...linkGraph.nodes.map((n) => n.val), 1);

    const simNodes: SimNode[] = linkGraph.nodes.map((n) => ({
      ...n,
      category: categoryMap.get(n.noteId) || "未分类",
      color: getCategoryColor(categoryMap.get(n.noteId) || "未分类"),
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));

    const simLinks: SimLink[] = linkGraph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
      value: e.value,
    }));

    const linkGroup = g.append("g").attr("class", "links");
    const nodeGroup = g.append("g").attr("class", "nodes");

    const linkElements = linkGroup
      .selectAll("path")
      .data(simLinks)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", colors.link)
      .attr("stroke-width", (d: SimLink) => Math.min(3, Math.max(0.5, d.value * 1.2)))
      .attr("stroke-opacity", 0.4)
      .attr("stroke-dasharray", simplified ? "4,4" : "none");

    const nodeElements = nodeGroup
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_event: MouseEvent, d: SimNode) => handleNodeClick(d.noteId))
      .on("mouseenter", (_event: MouseEvent, d: SimNode) => {
        hoveredRef.current = d.id;
        onNodeHover?.(d.id);
        updateHighlight();
      })
      .on("mouseleave", () => {
        hoveredRef.current = null;
        onNodeHover?.(null);
        updateHighlight();
      });

    const highRefCount = Math.max(3, maxVal * 0.3);

    nodeElements
      .append("circle")
      .attr("r", (d: SimNode) => mapNodeSize(d.val, maxVal))
      .attr("fill", (d: SimNode) => d.color)
      .attr("stroke", (d: SimNode) => d.color)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5);

    nodeElements
      .append("text")
      .text((d: SimNode) =>
        d.label.length > 12 ? d.label.slice(0, 12) + "\u2026" : d.label,
      )
      .attr("dy", (d: SimNode) => mapNodeSize(d.val, maxVal) + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", (d: SimNode) =>
        Math.max(9, 10 + (d.val / maxVal) * 4),
      )
      .attr("fill", colors.text)
      .attr("font-family", '"Noto Sans SC", sans-serif')
      .attr("opacity", (d: SimNode) => (d.val >= highRefCount ? 0.9 : 0));

    function updateHighlight() {
      const hovered = hoveredRef.current;
      const selected = selectedNodeId;
      const activeId = hovered || selected;

      const relatedIds = new Set<string>();
      if (activeId) {
        relatedIds.add(activeId);
        for (const edge of linkGraph.edges) {
          if (edge.source === activeId) relatedIds.add(edge.target);
          if (edge.target === activeId) relatedIds.add(edge.source);
        }
      }

      const searchLower = searchQuery.toLowerCase();
      const matchIds = new Set<string>();
      if (searchQuery) {
        for (const node of simNodes) {
          if (node.label.toLowerCase().includes(searchLower)) {
            matchIds.add(node.id);
          }
        }
      }

      nodeElements.select("circle").attr("opacity", (d: SimNode) => {
        if (searchQuery) return matchIds.has(d.id) ? 1 : 0.15;
        if (!activeId) return 1;
        return relatedIds.has(d.id) ? 1 : 0.2;
      });

      nodeElements.select("text").attr("opacity", (d: SimNode) => {
        if (searchQuery) return matchIds.has(d.id) ? 0.9 : 0.05;
        const showLabel = d.val >= highRefCount || relatedIds.has(d.id);
        if (!activeId) return showLabel ? 0.9 : 0;
        return relatedIds.has(d.id) ? 0.9 : 0.05;
      });

      linkElements
        .attr("stroke-opacity", (d: SimLink) => {
          const srcId = typeof d.source === "string" ? d.source : d.source.id;
          const tgtId = typeof d.target === "string" ? d.target : d.target.id;
          if (searchQuery) {
            return matchIds.has(srcId) || matchIds.has(tgtId) ? 0.6 : 0.05;
          }
          if (!activeId) return 0.4;
          return relatedIds.has(srcId) && relatedIds.has(tgtId) ? 0.8 : 0.08;
        })
        .attr("stroke", (d: SimLink) => {
          const srcId = typeof d.source === "string" ? d.source : d.source.id;
          const tgtId = typeof d.target === "string" ? d.target : d.target.id;
          if (activeId && relatedIds.has(srcId) && relatedIds.has(tgtId)) {
            return colors.highlight;
          }
          return colors.link;
        })
        .attr("stroke-dasharray", (d: SimLink) => {
          const srcId = typeof d.source === "string" ? d.source : d.source.id;
          const tgtId = typeof d.target === "string" ? d.target : d.target.id;
          if (activeId && relatedIds.has(srcId) && relatedIds.has(tgtId)) {
            return "none";
          }
          return simplified ? "4,4" : "none";
        });
    }

    updateHighlight();

    const sim = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d: SimNode) => d.id)
          .distance(simplified ? 120 : 100)
          .strength((d: SimLink) => Math.min(0.5, d.value * 0.2)),
      )
      .force("charge", d3.forceManyBody().strength(simplified ? -150 : -300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide<SimNode>()
          .radius((d) => mapNodeSize(d.val, maxVal) + 8),
      )
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .on("tick", () => {
        linkElements.attr("d", (d: SimLink) => {
          const sx = (d.source as SimNode).x ?? 0;
          const sy = (d.source as SimNode).y ?? 0;
          const tx = (d.target as SimNode).x ?? 0;
          const ty = (d.target as SimNode).y ?? 0;
          const dx = tx - sx;
          const dy = ty - sy;
          const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
          return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
        });

        nodeElements.attr(
          "transform",
          (d: SimNode) =>
            `translate(${(d as SimNode).x ?? 0},${(d as SimNode).y ?? 0})`,
        );
      });

    simRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [linkGraph, selectedNodeId, searchQuery, simplified, handleNodeClick, onNodeHover]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-0 overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
