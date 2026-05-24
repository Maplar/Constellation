/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useNoteStore } from "../../../notes/stores/useNoteStore";
import { useGraphStore } from "../../stores/useGraphStore";
import { GalaxyCanvas } from "../MindMapGalaxy/GalaxyCanvas";
import { getCategoryColor } from "../../utils/colorMap";
import type { NoteInfo, CategoryInfo, LinkInfo } from "../MindMapGalaxy/GalaxyCanvas";

export function GalaxyCardContent() {
  const { notesMetadata, linkGraph, selectNote } = useNoteStore();
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const selectNode = useGraphStore((s) => s.selectNode);
  const graphParams = useGraphStore((s) => s.graphParams);
  const updateGraphParams = useGraphStore((s) => s.updateGraphParams);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 240 });

  const updateDims = useCallback(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setDims({ w: r.width, h: Math.max(r.height - 36, 200) });
    }
  }, []);

  useEffect(() => {
    updateDims();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateDims);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateDims]);

  const { categories, links } = useMemo(() => {
    const catMap = new Map<string, NoteInfo[]>();
    for (const m of notesMetadata) {
      const cat = m.category || "未分类";
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push({ id: m.id, title: m.title, val: 1 });
    }

    const filtered = searchQuery
      ? new Set(
          notesMetadata
            .filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((m) => m.id),
        )
      : new Set(notesMetadata.map((m) => m.id));

    const cats: CategoryInfo[] = [];
    for (const [name, notes] of catMap) {
      const filteredNotes = notes.filter((n) => filtered.has(n.id));
      if (filteredNotes.length > 0) {
        cats.push({ name, notes: filteredNotes });
      }
    }

    const linkSet = new Map<string, boolean>();
    const linkArr: LinkInfo[] = [];
    for (const e of linkGraph.edges) {
      const key = `${e.source}→${e.target}`;
      if (!linkSet.has(key) && filtered.has(e.source) && filtered.has(e.target)) {
        linkSet.set(key, true);
        linkArr.push({ source: e.source, target: e.target });
      }
    }

    return { categories: cats, links: linkArr };
  }, [notesMetadata, linkGraph, searchQuery]);

  const handleNoteClick = useCallback(
    (noteId: string) => {
      void selectNote(noteId);
      selectNode(noteId);
    },
    [selectNote, selectNode],
  );

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Galaxy canvas */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {categories.length > 0 ? (
          <GalaxyCanvas
            width={dims.w}
            height={dims.h}
            categories={categories}
            links={links}
            onNoteClick={handleNoteClick}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[12px]" style={{ color: "var(--text-muted)" }}>
            暂无数据
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div
        className="shrink-0 flex items-center gap-3 px-3 h-9 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          {categories.length} 星系, {notesMetadata.length} 行星
        </span>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          轨道
          <input
            type="range"
            min="100"
            max="500"
            step="10"
            value={graphParams.orbitDistance}
            onChange={(e) => updateGraphParams({ orbitDistance: parseInt(e.target.value) })}
            className="w-14"
            style={{ accentColor: "var(--accent)" }}
          />
        </label>
        <button
          onClick={() => updateGraphParams({ orbitDensity: !graphParams.orbitDensity })}
          className="text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          style={{
            color: graphParams.orbitDensity ? "var(--accent)" : "var(--text-muted)",
            backgroundColor: graphParams.orbitDensity ? "var(--accent-light)" : "transparent",
          }}
        >
          轨道线
        </button>
        <button
          onClick={() => updateGraphParams({ showLinks: !graphParams.showLinks })}
          className="text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          style={{
            color: graphParams.showLinks ? "var(--accent)" : "var(--text-muted)",
            backgroundColor: graphParams.showLinks ? "var(--accent-light)" : "transparent",
          }}
        >
          连线
        </button>
      </div>
    </div>
  );
}

/** Placeholder pixel colors for GalaxyCanvas node color lookup */
export function getNodeColor(category: string): string {
  return getCategoryColor(category);
}
