/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import { useNoteStore } from "../stores/useNoteStore";
import { useGraphStore } from "../../visualization/stores/useGraphStore";
import { getCategoryColor, getCategoryColorWithOpacity } from "../../visualization/utils/colorMap";

interface ForceGraph2DProps {
  onNodeClick?: (noteId: string) => void;
  searchQuery?: string;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  onNodeHover?: (nodeId: string | null) => void;
  simplified?: boolean;
  radiusScale?: number;
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

/** 线性比例尺：val → radius，min 8px / max 40px */
const valToRadius = d3.scaleLinear().domain([0, 1]).range([8, 40]).clamp(true);

/** 截断标签：最多 8 个中文字符，超出加 "..." */
function truncateLabel(label: string, max = 8): string {
  return label.length > max ? label.slice(0, max) + "..." : label;
}

export function ForceGraph2D({
  onNodeClick,
  searchQuery = "",
  selectedNodeId,
  onNodeHover,
  simplified = false,
  radiusScale = 1.0,
}: ForceGraph2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<string | null>(null);
  const radiusScaleRef = useRef(radiusScale);
  radiusScaleRef.current = radiusScale;
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const linkGraph = useNoteStore((s) => s.linkGraph);
  const notesMetadata = useNoteStore((s) => s.notesMetadata);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);

  const categoryMap = new Map<string, string>();
  for (const meta of notesMetadata) {
    categoryMap.set(meta.id, meta.category || "未分类");
  }

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId);
      onNodeClick?.(nodeId);
    },
    [onNodeClick, setSelectedNode],
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

    /* ── Defs: glow filter + arrow marker ── */
    const defs = svg.append("defs");

    // Glow filter for high-ref nodes
    const glowFilter = defs
      .append("filter")
      .attr("id", "node-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "blur");
    glowFilter
      .append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .join("feMergeNode")
      .attr("in", (d: string) => d);

    // Arrow marker
    defs
      .append("marker")
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
    defs
      .append("marker")
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

    // 将全局 maxVal 归一化到 [0, 1] 区间供线性比例尺使用
    valToRadius.domain([0, maxVal]);

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

    const neighborMap = new Map<string, Set<string>>();
    for (const edge of linkGraph.edges) {
      const srcId = edge.source;
      const tgtId = edge.target;
      if (!neighborMap.has(srcId)) neighborMap.set(srcId, new Set());
      if (!neighborMap.has(tgtId)) neighborMap.set(tgtId, new Set());
      neighborMap.get(srcId)!.add(tgtId);
      neighborMap.get(tgtId)!.add(srcId);
    }

    const linkGroup = g.append("g").attr("class", "links");
    const nodeGroup = g.append("g").attr("class", "nodes");

    /* ── Edge rendering: curved paths with arrows ── */
    const linkElements = linkGroup
      .selectAll("path")
      .data(simLinks)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d: SimLink) => {
        const srcNode = simNodes.find(
          (n) => n.id === (typeof d.source === "string" ? d.source : d.source.id),
        );
        return srcNode
          ? getCategoryColorWithOpacity(srcNode.category, 0.25)
          : colors.link;
      })
      .attr("stroke-width", (d: SimLink) =>
        Math.min(2.5, Math.max(0.5, d.value * 1)),
      )
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
          prev
            ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top }
            : prev,
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

    // Node circle — 半径按 node.val 线性映射，填充色来自 colorMap
    nodeElements
      .append("circle")
      .attr("r", (d: SimNode) => valToRadius(d.val) * radiusScaleRef.current)
      .attr("fill", (d: SimNode) => d.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .each(function () {
        d3.select(this).attr("data-original-r", function () {
          return d3.select(this).attr("r");
        });
      });

    // Node label — 节点上方 4px，字体 11px，CSS 变量颜色
    nodeElements
      .append("text")
      .text((d: SimNode) => truncateLabel(d.label))
      .attr("dy", (d: SimNode) => -(valToRadius(d.val) * radiusScaleRef.current + 4))
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "var(--text-primary)")
      .attr("font-family", '"Noto Sans SC", sans-serif')
      .attr("opacity", 0.9);

    function updateHighlight() {
      const hovered = hoveredRef.current;
      const selected = selectedNodeId;
      const activeId = hovered || selected;

      const relatedIds = new Set<string>();
      if (activeId) {
        relatedIds.add(activeId);
        const neighbors = neighborMap.get(activeId);
        if (neighbors) {
          for (const id of neighbors) {
            relatedIds.add(id);
          }
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

      nodeElements.select("circle").attr("stroke", (d: SimNode) => {
        if (searchQuery && matchIds.has(d.id)) return "#3a7d5e";
        return "#ffffff";
      });

      nodeElements.select("circle").attr("stroke-width", (d: SimNode) => {
        if (searchQuery && matchIds.has(d.id)) return 3;
        return 2;
      });

      nodeElements.select("text").attr("opacity", (d: SimNode) => {
        if (searchQuery) return matchIds.has(d.id) ? 0.9 : 0.05;
        if (!activeId) return 0.9;
        return relatedIds.has(d.id) ? 0.9 : 0.05;
      });

      // Hover scale: hovered node 1.2x, related nodes 1.1x
      nodeElements.attr("transform", (d: SimNode) => {
        const tx = (d as SimNode).x ?? 0;
        const ty = (d as SimNode).y ?? 0;
        let scale = 1;
        if (hovered) {
          if (d.id === hovered) scale = 1.2;
          else if (relatedIds.has(d.id)) scale = 1.1;
        }
        return `translate(${tx},${ty}) scale(${scale})`;
      });

      linkElements
        .attr("stroke-opacity", (d: SimLink) => {
          const srcId =
            typeof d.source === "string" ? d.source : d.source.id;
          const tgtId =
            typeof d.target === "string" ? d.target : d.target.id;
          if (searchQuery) {
            return matchIds.has(srcId) || matchIds.has(tgtId) ? 0.6 : 0.05;
          }
          if (!activeId) return 0.5;
          return relatedIds.has(srcId) && relatedIds.has(tgtId) ? 0.8 : 0.08;
        })
        .attr("stroke", (d: SimLink) => {
          const srcId =
            typeof d.source === "string" ? d.source : d.source.id;
          const tgtId =
            typeof d.target === "string" ? d.target : d.target.id;
          if (activeId && relatedIds.has(srcId) && relatedIds.has(tgtId)) {
            return colors.highlight;
          }
          const srcNode = simNodes.find((n) => n.id === srcId);
          return srcNode
            ? getCategoryColorWithOpacity(srcNode.category, 0.25)
            : colors.link;
        })
        .attr("marker-end", (d: SimLink) => {
          const srcId =
            typeof d.source === "string" ? d.source : d.source.id;
          const tgtId =
            typeof d.target === "string" ? d.target : d.target.id;
          if (activeId && relatedIds.has(srcId) && relatedIds.has(tgtId)) {
            return "url(#arrow-highlight)";
          }
          return "url(#arrow)";
        })
        .attr("stroke-dasharray", (d: SimLink) => {
          const srcId =
            typeof d.source === "string" ? d.source : d.source.id;
          const tgtId =
            typeof d.target === "string" ? d.target : d.target.id;
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
          .radius((d) => valToRadius(d.val) * radiusScaleRef.current + 8),
      )
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .alphaDecay(simplified ? 0.03 : 0.015)
      .alphaMin(0.005)
      .on("tick", () => {
        linkElements.attr("d", (d: SimLink) => {
          const sx = (d.source as SimNode).x ?? 0;
          const sy = (d.source as SimNode).y ?? 0;
          const tx = (d.target as SimNode).x ?? 0;
          const ty = (d.target as SimNode).y ?? 0;
          const dx = tx - sx;
          const dy2 = ty - sy;
          const dr = Math.sqrt(dx * dx + dy2 * dy2) * 1.5;
          return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
        });

        nodeElements.attr("transform", (d: SimNode) => {
          const tx = (d as SimNode).x ?? 0;
          const ty = (d as SimNode).y ?? 0;
          const hovered = hoveredRef.current;
          let scale = 1;
          if (hovered) {
            if (d.id === hovered) scale = 1.2;
            else if (neighborMap.get(d.id)?.has(hovered)) scale = 1.1;
          }
          return `translate(${tx},${ty}) scale(${scale})`;
        });
      });

    simRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [linkGraph, selectedNodeId, searchQuery, simplified, handleNodeClick, onNodeHover]);

  /* ── 节点缩放实时更新 ── */
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const nodeGroup = svg.select("g.nodes");
    if (nodeGroup.empty()) return;

    const scale = radiusScaleRef.current;

    nodeGroup.selectAll<SVGCircleElement, SimNode>("g circle").attr("r", (d) => valToRadius(d.val) * scale);

    nodeGroup.selectAll<SVGTextElement, SimNode>("g text").attr("dy", (d) => -(valToRadius(d.val) * scale + 4));

    const sim = simRef.current;
    if (sim) {
      sim
        .force(
          "collide",
          d3
            .forceCollide<SimNode>()
            .radius((d) => valToRadius(d.val) * scale + 8),
        )
        .alpha(0.1)
        .restart();
    }
  }, [radiusScale]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-0 overflow-hidden relative"
    >
      <svg ref={svgRef} className="w-full h-full" />
      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 px-3 py-2"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 44,
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            maxWidth: 220,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            className="text-[12px] font-medium whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ color: "var(--text-primary)" }}
          >
            {tooltip.label}
          </div>
          <div
            className="text-[10px] flex items-center gap-2 mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: getCategoryColor(tooltip.category) }}
            />
            <span className="truncate">
              {tooltip.category} · 引用 {tooltip.val} 次
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
