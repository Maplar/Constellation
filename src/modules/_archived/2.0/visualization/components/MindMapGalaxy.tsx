/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { BaseType } from "d3";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { useGraphStore } from "../stores/useGraphStore";
import { useGalaxyLayout, type GalaxyNode } from "../hooks/useGalaxyLayout";
import { getMixedColor } from "../utils/colorMap";
import { CanvasContainer } from "./shared/CanvasContainer";
import { GalaxyToolbar } from "./MindMapGalaxy/GalaxyToolbar";
import { renderStarNodes, startStarBreathingAnimation } from "./MindMapGalaxy/StarNode";
import { renderPlanetNodes } from "./MindMapGalaxy/PlanetNode";
import { renderOrbitRings } from "./MindMapGalaxy/OrbitRing";
import { HoverTooltip } from "./shared/HoverTooltip";

export function MindMapGalaxy() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { notesMetadata, linkGraph, selectNote } = useNoteStore();
  const { searchQuery, selectNode, activeFilters, graphParams } = useGraphStore();

  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    clientX: number;
    clientY: number;
    label: string;
    category: string;
    val: number;
  } | null>(null);

  /* ── Filter notes by activeFilters ── */
  const filteredNotes = useMemo(() => {
    if (activeFilters.length === 0) return notesMetadata;
    return notesMetadata.filter((n) => activeFilters.includes(n.category || "未分类"));
  }, [notesMetadata, activeFilters]);

  const filteredEdges = useMemo(() => {
    if (activeFilters.length === 0) return linkGraph.edges;
    const noteIds = new Set(filteredNotes.map((n) => n.id));
    return linkGraph.edges.filter((e) => noteIds.has(e.source) && noteIds.has(e.target));
  }, [linkGraph.edges, filteredNotes, activeFilters]);

  const { nodes, links } = useGalaxyLayout({
    notes: filteredNotes,
    edges: filteredEdges,
    width: dimensions.width,
    height: dimensions.height,
  });

  const categoryCount = useMemo(() => {
    return new Set(filteredNotes.map((n) => n.category || "未分类")).size;
  }, [filteredNotes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleNodeClick = useCallback(
    (node: GalaxyNode) => {
      if (node.type === "category") {
        setFocusedCategory((prev) =>
          prev === node.categoryId ? null : node.categoryId,
        );
      } else if (node.noteId) {
        selectNote(node.noteId);
        selectNode(node.noteId);
      }
    },
    [selectNote, selectNode],
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || nodes.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const isDark =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") === "dark";

    const defs = svg.append("defs");

    const bgGradient = defs
      .append("radialGradient")
      .attr("id", "galaxy-bg")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");

    if (isDark) {
      bgGradient.append("stop").attr("offset", "0%").attr("stop-color", "#0d1117");
      bgGradient.append("stop").attr("offset", "100%").attr("stop-color", "#000000");
    } else {
      bgGradient.append("stop").attr("offset", "0%").attr("stop-color", "#f0ece4");
      bgGradient.append("stop").attr("offset", "100%").attr("stop-color", "#e5e1d8");
    }

    const g = svg.append("g");

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);

    svg
      .insert("rect", ":first-child")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#galaxy-bg)");

    const searchLower = searchQuery.toLowerCase();
    const matchIds = new Set<string>();
    if (searchQuery) {
      for (const node of nodes) {
        if (node.label.toLowerCase().includes(searchLower)) {
          matchIds.add(node.id);
        }
      }
    }

    const config = { focusedCategory, searchQuery, matchIds, isDark };

    /* ── Orbit rings ── */
    if (graphParams.orbitDensity) {
      const categoryNodes = nodes.filter((n) => n.type === "category");
      renderOrbitRings(g, categoryNodes, isDark, graphParams.orbitDistance);
    }

    /* ── Links ── */
    const linkGroup = g.append("g").attr("class", "galaxy-links");
    const nodeGroup = g.append("g").attr("class", "galaxy-nodes");

    const getLinkEndpoint = (value: string | GalaxyNode): GalaxyNode | undefined => {
      const id = typeof value === "string" ? value : value.id;
      return nodes.find((n) => n.id === id);
    };

    const getLinkId = (value: string | GalaxyNode): string => {
      return typeof value === "string" ? value : value.id;
    };

    if (graphParams.showLinks) {
      linkGroup
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("x1", (d) => getLinkEndpoint(d.source)?.x ?? 0)
        .attr("y1", (d) => getLinkEndpoint(d.source)?.y ?? 0)
        .attr("x2", (d) => getLinkEndpoint(d.target)?.x ?? 0)
        .attr("y2", (d) => getLinkEndpoint(d.target)?.y ?? 0)
        .attr("stroke", (d) => {
          const source = getLinkEndpoint(d.source);
          const target = getLinkEndpoint(d.target);
          if (source && target) {
            return getMixedColor(source.color, target.color);
          }
          return isDark ? "#333" : "#ccc";
        })
        .attr("stroke-opacity", (d) => {
          const sourceId = getLinkId(d.source);
          const targetId = getLinkId(d.target);
          if (focusedCategory) {
            const sourceNode = nodes.find((n) => n.id === sourceId);
            const targetNode = nodes.find((n) => n.id === targetId);
            if (
              sourceNode?.categoryId === focusedCategory &&
              targetNode?.categoryId === focusedCategory
            ) {
              return 0.5;
            }
            return 0.05;
          }
          if (searchQuery) {
            return matchIds.has(sourceId) || matchIds.has(targetId) ? 0.5 : 0.05;
          }
          return 0.25;
        })
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-dashoffset", 0);

    // Flow animation on dashed lines (stroke-dashoffset animation)
    function animateLinkFlow() {
      linkGroup
        .selectAll<SVGLineElement, unknown>("line")
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", -16)
        .transition()
        .duration(0)
        .attr("stroke-dashoffset", 0)
        .on("end", function () {
          if (this.parentNode) animateLinkFlow();
        });
    }
    animateLinkFlow();
    }

    /* ── Nodes ── */
    const nodeElements = nodeGroup
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .attr("cursor", "pointer")
      .on("click", (_event: MouseEvent, d: GalaxyNode) => handleNodeClick(d));

    // Render circles and text (will be updated by sub-component helpers)
    nodeElements.append("circle");
    nodeElements.append("text");

    // Split into star and planet selections
    const starSelection = nodeElements.filter((d) => d.type === "category") as d3.Selection<SVGGElement, GalaxyNode, SVGGElement, unknown>;
    const planetSelection = nodeElements.filter((d) => d.type !== "category") as d3.Selection<SVGGElement, GalaxyNode, SVGGElement, unknown>;

    renderStarNodes(starSelection, config);
    renderPlanetNodes(planetSelection, config);
    startStarBreathingAnimation(starSelection);

    /* ── Hover effects ── */
    nodeElements
      .on("mouseenter", function (this: BaseType | SVGGElement, event: MouseEvent, d: GalaxyNode) {
        d3.select(this as SVGGElement).select("circle").transition().duration(150).attr("r", d.radius * 1.15);
        d3.select(this as SVGGElement).select("text").transition().duration(150).attr("opacity", 0.95);
        setTooltip({
          clientX: event.clientX,
          clientY: event.clientY,
          label: d.label,
          category: d.categoryId,
          val: d.val,
        });
      })
      .on("mousemove", function (_event: MouseEvent) {
        const e = _event as MouseEvent;
        setTooltip((prev) =>
          prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : prev,
        );
      })
      .on("mouseleave", function (this: BaseType | SVGGElement, _event: MouseEvent, d: GalaxyNode) {
        d3.select(this as SVGGElement)
          .select("circle")
          .transition()
          .duration(150)
          .attr("r", d.radius);
        d3.select(this as SVGGElement)
          .select("text")
          .transition()
          .duration(150)
          .attr("opacity", () => {
            if (d.type === "category") return 0.95;
            if (focusedCategory) {
              return d.categoryId === focusedCategory ? 0.9 : 0.05;
            }
            if (searchQuery) {
              return matchIds.has(d.id) ? 0.9 : 0.05;
            }
            return d.val >= 3 ? 0.9 : 0;
          });
        setTooltip(null);
      });

    /* ── Star dots for ambiance ── */
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * dimensions.width;
      const y = Math.random() * dimensions.height;
      const r = Math.random() * 1.5 + 0.5;
      const opacity = Math.random() * 0.3 + 0.1;

      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", r)
        .attr("fill", isDark ? "#ffffff" : "#888888")
        .attr("opacity", opacity);
    }
  }, [
    nodes,
    links,
    dimensions,
    searchQuery,
    focusedCategory,
    handleNodeClick,
    graphParams.orbitDensity,
    graphParams.showLinks,
  ]);

  const infoText = `当前: 思维导图星系 | ${categoryCount} 颗恒星, ${filteredNotes.length} 颗行星`;

  return (
    <CanvasContainer toolbar={<GalaxyToolbar />} infoText={infoText}>
      <div ref={containerRef} className="w-full h-full min-h-0 overflow-hidden relative">
        <svg ref={svgRef} className="w-full h-full" />
        {focusedCategory && (
          <button
            onClick={() => setFocusedCategory(null)}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-[12px] cursor-pointer transition-colors"
            style={{
              backgroundColor: "var(--color-paper)",
              color: "var(--color-ink-soft)",
              border: "1px solid var(--color-paper-deep)",
            }}
          >
            恢复全局视图
          </button>
        )}
        {tooltip && (
          <HoverTooltip
            clientX={tooltip.clientX}
            clientY={tooltip.clientY}
            label={tooltip.label}
            category={tooltip.category}
            val={tooltip.val}
          />
        )}
      </div>
    </CanvasContainer>
  );
}
