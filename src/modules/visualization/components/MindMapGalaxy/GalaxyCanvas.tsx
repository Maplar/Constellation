/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 星系画布 — React SVG 主容器
 * - 全尺寸 <svg>，支持缩放与平移
 * - 恒星圆周布局 + 行星环上均匀分布
 * - 跨分类 Wiki-Link 贝塞尔虚线连线
 * - 点击恒星聚焦：其他分类 opacity → 0.2
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { StarNode } from "./StarNode.tsx";
import { OrbitRing } from "./OrbitRing.tsx";
import { PlanetNode } from "./PlanetNode.tsx";
import { getCategoryColor } from "../../utils/colorMap";
import { HoverTooltip } from "../shared/HoverTooltip";

/* ── 类型 ── */

export interface NoteInfo {
  id: string;
  title: string;
  val: number;
}

export interface CategoryInfo {
  name: string;
  notes: NoteInfo[];
}

export interface LinkInfo {
  source: string; // noteId
  target: string; // noteId
}

interface GalaxyCanvasProps {
  width: number;
  height: number;
  categories: CategoryInfo[];
  links?: LinkInfo[];
  onNoteClick?: (noteId: string) => void;
  searchQuery?: string;
}

/* ── 布局常量 ── */

const ORBIT_RADIUS = 90; // 行星轨道环半径
const PLANET_RING_GAP = 28; // 多层行星环间距

/* ── 贝塞尔曲线生成器 ── */

function buildBezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  // 控制点向垂直方向偏移，产生弧线
  const cx = mx + (-dy / dist) * dist * curvature;
  const cy = my + (dx / dist) * dist * curvature;
  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
}

/* ══════════════════════════════════════════════
   主组件
   ══════════════════════════════════════════════ */

export function GalaxyCanvas({
  width,
  height,
  categories,
  links = [],
  onNoteClick,
  searchQuery = "",
}: GalaxyCanvasProps) {

  const searchLower = searchQuery.toLowerCase();
  const searchMatchIds = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    const ids = new Set<string>();
    for (const cat of categories) {
      for (const n of cat.notes) {
        if (n.title.toLowerCase().includes(searchLower) || n.id.toLowerCase().includes(searchLower)) {
          ids.add(n.id);
        }
      }
    }
    return ids;
  }, [searchQuery, categories]);
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<{
    clientX: number;
    clientY: number;
    label: string;
    category: string;
    val: number;
  } | null>(null);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetSnapshot = useRef({ x: 0, y: 0 });

  /* ── 缩放 ── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.2, Math.min(3, z + delta)));
    setOffset((prev) => {
      // 以鼠标位置为中心缩放
      const rect = (e.target as SVGSVGElement).getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = delta / (zoom || 1);
      return {
        x: prev.x - (mx - prev.x) * factor,
        y: prev.y - (my - prev.y) * factor,
      };
    });
  }, [zoom]);

  /* ── 平移 ── */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 仅在点击背景（SVG 自身）时启动拖拽
    if (e.target !== e.currentTarget) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetSnapshot.current = { ...offset };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: offsetSnapshot.current.x + dx,
      y: offsetSnapshot.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  /* ── 聚焦切换 ── */
  const handleStarFocus = useCallback((categoryName: string) => {
    setFocusedCategory((prev) => (prev === categoryName ? null : categoryName));
  }, []);

  /* ── 分类颜色映射 ── */
  const categoryColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.name, getCategoryColor(cat.name));
    }
    return map;
  }, [categories]);

  /* ── 全局最大引用数 ── */
  const globalMaxVal = useMemo(() => {
    let max = 1;
    for (const cat of categories) {
      for (const note of cat.notes) {
        if (note.val > max) max = note.val;
      }
    }
    return max;
  }, [categories]);

  /* ── 计算布局 ── */
  const layout = useMemo(() => {
    const centerX = width / 2;
    const centerY = height / 2;
    const starCircleRadius = Math.min(width, height) * 0.28;
    const catCount = categories.length;

    interface StarLayout {
      categoryName: string;
      x: number;
      y: number;
      color: string;
    }

    interface PlanetLayout {
      noteId: string;
      title: string;
      val: number;
      categoryName: string;
      color: string;
      x: number;
      y: number;
    }

    const stars: StarLayout[] = [];
    const planets: PlanetLayout[] = [];

    for (let i = 0; i < catCount; i++) {
      const cat = categories[i];
      const angle = (2 * Math.PI * i) / catCount - Math.PI / 2;
      const sx = centerX + starCircleRadius * Math.cos(angle);
      const sy = centerY + starCircleRadius * Math.sin(angle);
      const color = categoryColors.get(cat.name) || "#888888";

      stars.push({ categoryName: cat.name, x: sx, y: sy, color });

      // 行星均匀分布在围绕恒星的圆环上
      const noteCount = cat.notes.length;
      // 按引用数降序排列，高引用行星更靠近恒星
      const sorted = [...cat.notes].sort((a, b) => b.val - a.val);

      for (let j = 0; j < sorted.length; j++) {
        const note = sorted[j];
        const planetAngle = (2 * Math.PI * j) / noteCount;
        // 多层环：按索引分层
        const layerIndex = Math.floor(j / 8); // 每层最多 8 颗行星
        const orbitR = ORBIT_RADIUS + layerIndex * PLANET_RING_GAP;
        const px = sx + orbitR * Math.cos(planetAngle);
        const py = sy + orbitR * Math.sin(planetAngle);

        planets.push({
          noteId: note.id,
          title: note.title,
          val: note.val,
          categoryName: cat.name,
          color,
          x: px,
          y: py,
        });
      }
    }

    return { stars, planets };
  }, [categories, width, height, categoryColors]);

  /* ── 连线：跨分类笔记之间的 Wiki-Link ── */
  const linkPaths = useMemo(() => {
    const planetMap = new Map<string, { x: number; y: number; category: string }>();
    for (const p of layout.planets) {
      planetMap.set(p.noteId, { x: p.x, y: p.y, category: p.categoryName });
    }

    const paths: { d: string; sourceCategory: string; targetCategory: string }[] = [];

    for (const link of links) {
      const src = planetMap.get(link.source);
      const tgt = planetMap.get(link.target);
      if (!src || !tgt) continue;
      // 仅绘制跨分类连线
      if (src.category === tgt.category) continue;

      paths.push({
        d: buildBezierPath(src.x, src.y, tgt.x, tgt.y, 0.35),
        sourceCategory: src.category,
        targetCategory: tgt.category,
      });
    }

    return paths;
  }, [layout.planets, links]);

  /* ── 根据聚焦状态计算透明度 ── */
  function getCategoryOpacity(categoryName: string): number {
    if (!focusedCategory) return 1;
    return categoryName === focusedCategory ? 1 : 0.2;
  }

  return (
    <>
    <svg
      width="100%"
      height="100%"
      style={{ display: "block" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 背景（捕获平移事件，但 zoom 已在上层处理） */}
      <rect width="100%" height="100%" fill="transparent" />

      <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
        {/* ── 连线层 ── */}
        {linkPaths.map((lp, i) => {
          const linkOpacity =
            focusedCategory &&
            lp.sourceCategory !== focusedCategory &&
            lp.targetCategory !== focusedCategory
              ? 0.05
              : 0.4;
          return (
            <path
              key={`link-${i}`}
              d={lp.d}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="5 5"
              opacity={linkOpacity}
            />
          );
        })}

        {/* ── 轨道环 ── */}
        {layout.stars.map((star) => (
          <g
            key={`orbit-${star.categoryName}`}
            opacity={getCategoryOpacity(star.categoryName)}
            style={{ transition: "opacity 0.3s ease" }}
          >
            <OrbitRing
              cx={star.x}
              cy={star.y}
              radius={ORBIT_RADIUS}
            />
          </g>
        ))}

        {/* ── 行星节点 ── */}
        {layout.planets.map((planet) => (
          <g
            key={`planet-${planet.noteId}`}
            opacity={getCategoryOpacity(planet.categoryName)}
            style={{ transition: "opacity 0.3s ease" }}
          >
            <PlanetNode
              noteId={planet.noteId}
              title={planet.title}
              color={searchMatchIds.has(planet.noteId) ? "#3a7d5e" : planet.color}
              cx={planet.x}
              cy={planet.y}
              val={planet.val}
              maxVal={globalMaxVal}
              onClick={onNoteClick}
              onHoverStart={(e, title) =>
                setTooltip({ clientX: e.clientX, clientY: e.clientY, label: title, category: planet.categoryName, val: planet.val })
              }
              onHoverMove={(e) =>
                setTooltip((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : prev))
              }
              onHoverEnd={() => setTooltip(null)}
            />
          </g>
        ))}

        {/* ── 恒星节点 ── */}
        {layout.stars.map((star) => (
          <g
            key={`star-${star.categoryName}`}
            opacity={getCategoryOpacity(star.categoryName)}
            style={{ transition: "opacity 0.3s ease" }}
          >
            <StarNode
              categoryName={star.categoryName}
              color={star.color}
              cx={star.x}
              cy={star.y}
              onFocus={handleStarFocus}
              onHoverStart={(e, cat) =>
                setTooltip({ clientX: e.clientX, clientY: e.clientY, label: cat, category: cat, val: 0 })
              }
              onHoverMove={(e) =>
                setTooltip((prev) => (prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : prev))
              }
              onHoverEnd={() => setTooltip(null)}
            />
          </g>
        ))}
      </g>
    </svg>
    {tooltip && (
      <HoverTooltip
        clientX={tooltip.clientX}
        clientY={tooltip.clientY}
        label={tooltip.label}
        category={tooltip.category}
        val={tooltip.val}
      />
    )}
    </>
  );
}
