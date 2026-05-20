/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { useNoteStore } from "../stores/useNoteStore";

interface ForceGraph2DProps {
  onNodeClick?: (noteId: string) => void;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  val: number;
  color: string;
  noteId: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
  label: string | null;
  value: number;
}

function resolveThemeColors(): { bg: string; text: string; link: string } {
  if (typeof document === "undefined") return { bg: "#fcfaf6", text: "#2d2d2a", link: "#b7bfb5" };
  const theme = document.documentElement.getAttribute("data-theme");
  const isDark = theme === "dark";
  return {
    bg: isDark ? "#1a1a18" : "#fcfaf6",
    text: isDark ? "#d5d3ce" : "#2d2d2a",
    link: isDark ? "#4a5450" : "#b7bfb5",
  };
}

export function ForceGraph2D({ onNodeClick }: ForceGraph2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const linkGraph = useNoteStore((s) => s.linkGraph);
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);

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

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);

    const simNodes: SimNode[] = linkGraph.nodes.map((n) => ({
      ...n,
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
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", colors.link)
      .attr("stroke-width", (d: SimLink) => Math.min(3, Math.max(0.5, d.value * 1.2)))
      .attr("stroke-opacity", 0.6);

    const nodeElements = nodeGroup
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_event: MouseEvent, d: SimNode) => handleNodeClick(d.noteId));

    const relatedIds = new Set<string>();
    if (selectedNoteId) {
      relatedIds.add(selectedNoteId);
      for (const edge of linkGraph.edges) {
        if (edge.source === selectedNoteId) relatedIds.add(edge.target);
        if (edge.target === selectedNoteId) relatedIds.add(edge.source);
      }
    }

    nodeElements
      .append("circle")
      .attr("r", (d: SimNode) => Math.max(4, d.val * 6))
      .attr("fill", (d: SimNode) => d.color)
      .attr("stroke", (d: SimNode) => d.color)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5)
      .attr("opacity", (d: SimNode) => {
        if (!selectedNoteId) return 1;
        return relatedIds.has(d.noteId) ? 1 : 0.3;
      });

    nodeElements
      .append("text")
      .text((d: SimNode) => (d.label.length > 12 ? d.label.slice(0, 12) + "\u2026" : d.label))
      .attr("dy", (d: SimNode) => d.val * 6 + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", (d: SimNode) => Math.max(9, 10 + d.val))
      .attr("fill", colors.text)
      .attr("font-family", '"Noto Sans SC", sans-serif')
      .attr("opacity", (d: SimNode) => {
        if (!selectedNoteId) return 0.9;
        return relatedIds.has(d.noteId) ? 0.9 : 0.3;
      });

    const sim = d3.forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(simLinks)
          .id((d: SimNode) => d.id)
          .distance(100)
          .strength((d: SimLink) => Math.min(0.5, d.value * 0.2)),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<SimNode>().radius((d) => d.val * 6 + 20))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .on("tick", () => {
        linkElements
          .attr("x1", (d: SimLink) => (d.source as SimNode).x ?? 0)
          .attr("y1", (d: SimLink) => (d.source as SimNode).y ?? 0)
          .attr("x2", (d: SimLink) => (d.target as SimNode).x ?? 0)
          .attr("y2", (d: SimLink) => (d.target as SimNode).y ?? 0);

        nodeElements.attr(
          "transform",
          (d: SimNode) => `translate(${(d as SimNode).x ?? 0},${(d as SimNode).y ?? 0})`,
        );
      });

    simRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [linkGraph, selectedNoteId, handleNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-0 overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
