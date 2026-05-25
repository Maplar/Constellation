/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import * as d3 from "d3";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { useGraphStore } from "../stores/useGraphStore";
import { getCategoryColor } from "../utils/colorMap";

interface BubbleData {
  id: string;
  label: string;
  noteId?: string;
  category: string;
  val: number;
  children?: BubbleData[];
}

interface TooltipInfo {
  label: string;
  category: string;
  val: number;
  x: number;
  y: number;
}

function truncateLabel(label: string, max = 6): string {
  return label.length > max ? label.slice(0, max) + "…" : label;
}

export function CitationBubble() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const linkGraph = useNoteStore((s) => s.linkGraph);
  const notesMetadata = useNoteStore((s) => s.notesMetadata);
  const selectedNoteId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of notesMetadata) {
      map.set(m.id, m.category || "未分类");
    }
    return map;
  }, [notesMetadata]);

  const hierarchyData = useMemo(() => {
    const categoryGroups = new Map<string, BubbleData[]>();
    for (const node of linkGraph.nodes) {
      const cat = categoryMap.get(node.noteId) || "未分类";
      if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
      categoryGroups.get(cat)!.push({
        id: node.id,
        label: node.label,
        noteId: node.noteId,
        category: cat,
        val: node.val,
      });
    }
    const children: BubbleData[] = [];
    for (const [cat, nodes] of categoryGroups) {
      children.push({
        id: `cat-${cat}`,
        label: cat,
        category: cat,
        val: nodes.reduce((s, n) => s + n.val, 0),
        children: nodes,
      });
    }
    return { id: "root", label: "root", category: "", val: 0, children };
  }, [linkGraph, categoryMap]);

  const handleNodeClick = useCallback(
    (noteId?: string) => {
      if (noteId) {
        selectNode(noteId);
      }
    },
    [selectNode],
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    const container = containerRef.current;
    if (!svgEl || !container) return;

    const bounds = container.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    if (width === 0 || height === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    if (hierarchyData.children?.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("fill", "var(--text-muted)")
        .text("暂无笔记引用数据");
      return;
    }

    const root = d3.hierarchy<BubbleData>(hierarchyData).sum((d) => d.val || 1);

    const packLayout = d3.pack<BubbleData>().size([width, height]).padding(6);
    packLayout(root);

    const g = svg.append("g");

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
      });
    svg.call(zoomBehavior);

    const leaves = root.leaves() as d3.HierarchyCircularNode<BubbleData>[];

    /* ── Category enclosure circles ── */
    const catNodes = root.children ?? [];
    for (const cat of catNodes) {
      const c = cat as d3.HierarchyCircularNode<BubbleData>;
      if (!c.r) continue;
      const catData = c.data;
      g.append("circle")
        .attr("cx", c.x)
        .attr("cy", c.y)
        .attr("r", c.r + 4)
        .attr("fill", "none")
        .attr("stroke", getCategoryColor(catData.category))
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4 3")
        .attr("opacity", 0.4);

      g.append("text")
        .attr("x", c.x)
        .attr("y", c.y - c.r - 6)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("font-weight", 500)
        .attr("fill", getCategoryColor(catData.category))
        .attr("font-family", '"Noto Sans SC", sans-serif')
        .text(catData.label);
    }

    /* ── Note circles ── */
    const nodeSelection = g
      .selectAll<SVGGElement, d3.HierarchyCircularNode<BubbleData>>("g.note")
      .data(leaves)
      .join("g")
      .attr("class", "note")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("cursor", (d) => (d.data.noteId ? "pointer" : "default"))
      .on("click", (_event, d) => handleNodeClick(d.data.noteId))
      .on("mouseenter", (event: MouseEvent, d) => {
        const rect = container.getBoundingClientRect();
        setTooltip({
          label: d.data.label,
          category: d.data.category,
          val: d.data.val,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        d3.select(event.currentTarget as Element)
          .select("circle")
          .attr("stroke-width", 3)
          .attr("stroke", "var(--accent)");
      })
      .on("mousemove", (event: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        setTooltip((prev) =>
          prev
            ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top }
            : prev,
        );
      })
      .on("mouseleave", (event: MouseEvent) => {
        setTooltip(null);
        d3.select(event.currentTarget as Element)
          .select("circle")
          .attr("stroke-width", (d: any) => (d.data.noteId === selectedNoteId ? 2.5 : 2))
          .attr("stroke", (d: any) =>
            d.data.noteId === selectedNoteId ? "var(--accent)" : "#ffffff",
          );
      });

    nodeSelection
      .append("circle")
      .attr("r", (d) => Math.max(4, d.r!))
      .attr("fill", (d) => getCategoryColor(d.data.category))
      .attr("fill-opacity", 0.75)
      .attr("stroke", (d) =>
        d.data.noteId === selectedNoteId ? "var(--accent)" : "#ffffff",
      )
      .attr("stroke-width", (d) => (d.data.noteId === selectedNoteId ? 2.5 : 2));

    nodeSelection
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", (d) => Math.min(11, Math.max(7, d.r! * 0.5)))
      .attr("fill", "#fff")
      .attr("font-family", '"Noto Sans SC", sans-serif')
      .attr("pointer-events", "none")
      .text((d) => {
        const r = d.r ?? 0;
        const chars = Math.max(1, Math.floor(r / 5));
        const t = truncateLabel(d.data.label, chars);
        return r > 10 ? t : "";
      });

    /* ── Fade-in ── */
    nodeSelection.attr("opacity", 0).transition().duration(400).delay((_d, i) => i * 10).attr("opacity", 1);
  }, [hierarchyData, selectedNoteId, handleNodeClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-0 overflow-hidden relative"
    >
      <svg ref={svgRef} className="w-full h-full" />
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
