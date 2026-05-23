/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import { useNoteStore } from "../stores/useNoteStore";
import { getCategoryColor, getCategoryColorWithOpacity } from "../../visualization/utils/colorMap";

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

interface TooltipInfo {
  nodeId: string;
  label: string;
  category: string;
  val: number;
  x: number;
  y: number;
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
  const minSize = 8;
  const maxSize = 40;
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
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

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
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const svg = d3.select(svgEl);

    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    /* ── Defs: glow filter + arrow marker ── */
    const defs = svg.append("defs");

    // Glow filter for high-ref nodes
    const glowFilter = defs.append("filter").attr("id", "node-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    glowFilter.append("feMerge").selectAll("feMergeNode").data(["blur", "SourceGraphic"]).join("feMergeNode").attr("in", (d: string) => d);

    // Arrow marker
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L8,0L0,3")
      .attr("fill", colors.link)
      .attr("opacity", 0.5);

    // Highlight arrow marker
    defs.append("marker")
      .attr("id", "arrow-highlight")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L8,0L0,3")
      .attr("fill", colors.highlight)
      .attr("opacity", 0.8);

    const g = svg.append("g");

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);

    const maxVal = Math.max(...linkGraph.nodes.map((n) => n.val), 1);
    const highRefCount = Math.max(3, maxVal * 0.3);

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

    /* ── Edge rendering: curved paths with arrows ── */
    const linkElements = linkGroup
      .selectAll("path")
      .data(simLinks)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d: SimLink) => {
        const srcNode = simNodes.find((n) => n.id === (typeof d.source === "string" ? d.source : d.source.id));
        return srcNode ? getCategoryColorWithOpacity(srcNode.category, 0.25) : colors.link;
      })
      .attr("stroke-width", (d: SimLink) => Math.min(2.5, Math.max(0.5, d.value * 1)))
      .attr("stroke-opacity", 0.5)
      .attr("marker-end", "url(#arrow)")
      .attr("stroke-dasharray", simplified ? "4,4" : "none");

    /* ── Node rendering with fade-in ── */
    const nodeElements = nodeGroup
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .attr("opacity", 0)
      .on("click", (_event: MouseEvent, d: SimNode) => handleNodeClick(d.noteId))
      .on("mouseenter", (event: MouseEvent, d: SimNode) => {
        hoveredRef.current = d.id;
        onNodeHover?.(d.id);
        const rect = container.getBoundingClientRect();
        setTooltip({
          nodeId: d.id,
          label: d.label,
          category: d.category,
          val: d.val,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        updateHighlight();
      })
      .on("mousemove", (event: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        setTooltip((prev) =>
          prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : prev,
        );
      })
      .on("mouseleave", () => {
        hoveredRef.current = null;
        onNodeHover?.(null);
        setTooltip(null);
        updateHighlight();
      });

    // Fade-in animation
    nodeElements
      .transition()
      .duration(600)
      .delay((_d, i) => i * 3)
      .attr("opacity", 1);

    // Node circle with size mapping
    nodeElements
      .append("circle")
      .attr("r", (d: SimNode) => mapNodeSize(d.val, maxVal))
      .attr("fill", (d: SimNode) => d.color)
      .attr("stroke", isDark ? "#222120" : "#ffffff")
      .attr("stroke-width", 2)
      .attr("filter", (d: SimNode) => (d.val >= highRefCount && !simplified ? "url(#node-glow)" : "none"));

    // Node label
    nodeElements
      .append("text")
      .text((d: SimNode) =>
        d.label.length > 8 ? d.label.slice(0, 8) + "..." : d.label,
      )
      .attr("dy", (d: SimNode) => mapNodeSize(d.val, maxVal) + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
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
          if (!activeId) return 0.5;
          return relatedIds.has(srcId) && relatedIds.has(tgtId) ? 0.8 : 0.08;
        })
        .attr("stroke", (d: SimLink) => {
          const srcId = typeof d.source === "string" ? d.source : d.source.id;
          const tgtId = typeof d.target === "string" ? d.target : d.target.id;
          if (activeId && relatedIds.has(srcId) && relatedIds.has(tgtId)) {
            return colors.highlight;
          }
          const srcNode = simNodes.find((n) => n.id === srcId);
          return srcNode ? getCategoryColorWithOpacity(srcNode.category, 0.25) : colors.link;
        })
        .attr("marker-end", (d: SimLink) => {
          const srcId = typeof d.source === "string" ? d.source : d.source.id;
          const tgtId = typeof d.target === "string" ? d.target : d.target.id;
          if (activeId && relatedIds.has(srcId) && relatedIds.has(tgtId)) {
            return "url(#arrow-highlight)";
          }
          return "url(#arrow)";
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
      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 px-3 py-2 rounded-lg shadow-lg"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 44,
            backgroundColor: "var(--color-paper)",
            border: "1px solid var(--color-paper-deep)",
            maxWidth: 220,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          <div
            className="text-[12px] font-medium whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {tooltip.label}
          </div>
          <div
            className="text-[10px] flex items-center gap-2 mt-0.5"
            style={{ color: "var(--color-ink-ghost)" }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: getCategoryColor(tooltip.category) }}
            />
            <span className="truncate">{tooltip.category} · 引用 {tooltip.val} 次</span>
          </div>
        </div>
      )}
    </div>
  );
}
