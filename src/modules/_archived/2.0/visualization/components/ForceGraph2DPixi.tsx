/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：Pixi.js 力导向图组件
 * 使用 WebGL 渲染，支持 1000+ 节点流畅显示
 *
 * 自包含组件：从 useNoteStore 读取数据，ResizeObserver 自动尺寸
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { Application, Graphics, Container, Text, TextStyle } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { useGraphStore } from "../stores/useGraphStore";
import type { GraphNode, LinkGraph } from "../../shared/types/notes";

/* ── Theme Bridge: 读取 CSS 变量 ── */

interface ThemeColors {
  bg: number;
  edge: number;
  edgeAlpha: number;
  edgeHighlight: number;
  edgeHighlightAlpha: number;
  nodeStroke: number;
  nodeStrokeAlpha: number;
  nodeStrokeHover: number;
  nodeStrokeHoverAlpha: number;
  nodeStrokeSelected: number;
  label: number;
  labelAlpha: number;
}

function parseColor(colorStr: string): { color: number; alpha: number } {
  const trimmed = colorStr.trim();
  const rgbaMatch = trimmed.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    return { color: (r << 16) | (g << 8) | b, alpha: a };
  }
  const hexMatch = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch && hexMatch[1]) {
    return { color: parseInt(hexMatch[1], 16), alpha: 1 };
  }
  return { color: 0x000000, alpha: 1 };
}

function getThemeColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  const getVar = (name: string, fallback: string) =>
    (style.getPropertyValue(name) || fallback).trim();

  const bg = parseColor(getVar("--canvas-bg", "#f6f3ec"));
  const edge = parseColor(getVar("--canvas-edge", "rgba(100, 100, 100, 0.3)"));
  const edgeHighlight = parseColor(
    getVar("--canvas-edge-highlight", "rgba(100, 100, 100, 0.8)")
  );
  const nodeStroke = parseColor(
    getVar("--canvas-node-stroke", "rgba(255, 255, 255, 0.5)")
  );
  const nodeStrokeHover = parseColor(
    getVar("--canvas-node-stroke-hover", "rgba(255, 255, 255, 0.8)")
  );
  const nodeStrokeSelected = parseColor(
    getVar("--canvas-node-stroke-selected", "#ffffff")
  );
  const label = parseColor(getVar("--canvas-label", "rgba(0, 0, 0, 0.8)"));

  return {
    bg: bg.color,
    edge: edge.color,
    edgeAlpha: edge.alpha,
    edgeHighlight: edgeHighlight.color,
    edgeHighlightAlpha: edgeHighlight.alpha,
    nodeStroke: nodeStroke.color,
    nodeStrokeAlpha: nodeStroke.alpha,
    nodeStrokeHover: nodeStrokeHover.color,
    nodeStrokeHoverAlpha: nodeStrokeHover.alpha,
    nodeStrokeSelected: nodeStrokeSelected.color,
    label: label.color,
    labelAlpha: label.alpha,
  };
}

/* ── 类型定义 ── */

interface ForceGraph2DPixiProps {
  onNodeClick?: (noteId: string) => void;
  onNodeDoubleClick?: (noteId: string) => void;
  searchQuery?: string;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  onNodeHover?: (nodeId: string | null) => void;
  simplified?: boolean;
  radiusScale?: number;
  graphData?: LinkGraph;
}

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface PositionedEdge {
  source: string | PositionedNode;
  target: string | PositionedNode;
  label: string | null;
  value: number;
  edgeType: "wiki" | "markdown" | "embed" | "similar";
}

/* ── 常量 ── */

const NODE_MIN_SIZE = 8;
const NODE_MAX_SIZE = 40;
const LABEL_FONT_SIZE = 11;
const LABEL_MAX_LENGTH = 8;
const BATCH_UPDATE_INTERVAL = 6;
const FRUSTUM_CULLING_THRESHOLD = 100;
const HIDE_LABELS_THRESHOLD = 100;

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

/* ── 辅助函数 ── */

function d3Extent(values: number[]): [number, number] | undefined {
  if (values.length === 0) return undefined;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

function truncateLabel(label: string, max = LABEL_MAX_LENGTH): string {
  return label.length > max ? label.slice(0, max) + "..." : label;
}

/* ── 主组件 ── */

export function ForceGraph2DPixi({
  onNodeClick,
  onNodeDoubleClick,
  searchQuery = "",
  selectedNodeId,
  onNodeHover,
  simplified = false,
  radiusScale = 1.0,
  graphData,
}: ForceGraph2DPixiProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const nodesRef = useRef<PositionedNode[]>([]);
  const edgesRef = useRef<PositionedEdge[]>([]);
  const frameCountRef = useRef(0);
  const pendingUpdateRef = useRef(false);
  const themeColorsRef = useRef<ThemeColors>(getThemeColors());
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [renderError, setRenderError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Pixi 显示对象引用
  const edgeContainerRef = useRef<Container | null>(null);
  const nodeContainerRef = useRef<Container | null>(null);
  const labelContainerRef = useRef<Container | null>(null);
  const nodeGraphicsMapRef = useRef<Map<string, Graphics>>(new Map());
  const edgeGraphicsMapRef = useRef<Map<string, Graphics>>(new Map());
  const labelMapRef = useRef<Map<string, Text>>(new Map());

  // 状态 refs
  const showLabelsRef = useRef(true);
  const useFrustumCullingRef = useRef(false);
  const hoveredNodeRef = useRef<string | null>(null);
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId ?? null);
  const searchQueryRef = useRef(searchQuery);
  const radiusScaleRef = useRef(radiusScale);

  // 从 store 读取数据
  const storeGraph = useNoteStore((s) => s.linkGraph);
  const linkGraph = graphData ?? storeGraph;
  const notesMetadata = useNoteStore((s) => s.notesMetadata);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);

  // 构建分类映射
  const categoryMap = useRef(new Map<string, string>());
  useEffect(() => {
    const map = new Map<string, string>();
    for (const meta of notesMetadata) {
      map.set(meta.id, meta.category || "未分类");
    }
    categoryMap.current = map;
  }, [notesMetadata]);

  // 更新 refs
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId ?? null;
  }, [selectedNodeId]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    radiusScaleRef.current = radiusScale;
  }, [radiusScale]);

  // 计算节点大小
  const sizeScaleRef = useRef<(val: number) => number>(() => NODE_MIN_SIZE);

  useEffect(() => {
    const valExtent = d3Extent(linkGraph.nodes.map((n) => n.val)) || [0, 1];
    sizeScaleRef.current = (val: number) => {
      const t =
        valExtent[1] > valExtent[0]
          ? (val - valExtent[0]) / (valExtent[1] - valExtent[0])
          : 0.5;
      return NODE_MIN_SIZE + t * (NODE_MAX_SIZE - NODE_MIN_SIZE);
    };
  }, [linkGraph.nodes]);

  // 更新标签/裁剪阈值
  useEffect(() => {
    showLabelsRef.current = linkGraph.nodes.length <= HIDE_LABELS_THRESHOLD;
    useFrustumCullingRef.current =
      linkGraph.nodes.length > FRUSTUM_CULLING_THRESHOLD;
  }, [linkGraph.nodes.length]);

  /* ── ResizeObserver 自动尺寸 ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /* ── 初始化 Pixi Application ── */
  const canInitialize = dimensions.width > 0 && dimensions.height > 0;

  useEffect(() => {
    if (!containerRef.current || !canInitialize) return;
    let cancelled = false;
    const app = new Application();
    appRef.current = app;

    const initApp = async () => {
      try {
        await app.init({
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: themeColorsRef.current.bg,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (cancelled || !containerRef.current) {
          app.destroy(true, { children: true, texture: true });
          return;
        }
        containerRef.current.replaceChildren(app.canvas);

        const viewport = new Viewport({
          screenWidth: dimensions.width,
          screenHeight: dimensions.height,
          worldWidth: dimensions.width * 2,
          worldHeight: dimensions.height * 2,
          events: app.renderer.events,
        });

        app.stage.addChild(viewport);
        viewportRef.current = viewport;

        viewport
          .drag({ clampWheel: false })
          .pinch()
          .wheel({ smooth: 3 })
          .decelerate({ friction: 0.92 });

        viewport.clampZoom({ minScale: MIN_ZOOM, maxScale: MAX_ZOOM });
        viewport.moveCenter(dimensions.width / 2, dimensions.height / 2);

        const edgeContainer = new Container({ label: "edges" });
        const nodeContainer = new Container({ label: "nodes" });
        const labelContainer = new Container({ label: "labels" });

        viewport.addChild(edgeContainer);
        viewport.addChild(nodeContainer);
        viewport.addChild(labelContainer);

        edgeContainerRef.current = edgeContainer;
        nodeContainerRef.current = nodeContainer;
        labelContainerRef.current = labelContainer;
        setRenderError(null);
      } catch (error) {
        if (!cancelled) {
          setRenderError(error instanceof Error ? error.message : "Pixi 初始化失败");
        }
      }
    };

    void initApp();

    return () => {
      cancelled = true;
      if (appRef.current === app) {
        if (app.renderer) {
          app.destroy(true, { children: true, texture: true });
        }
        appRef.current = null;
      }
      viewportRef.current = null;
      edgeContainerRef.current = null;
      nodeContainerRef.current = null;
      labelContainerRef.current = null;
      nodeGraphicsMapRef.current.clear();
      edgeGraphicsMapRef.current.clear();
      labelMapRef.current.clear();
    };
  }, [canInitialize, retryKey]);

  /* ── 更新尺寸 ── */
  useEffect(() => {
    if (appRef.current && dimensions.width > 0) {
      appRef.current.renderer.resize(dimensions.width, dimensions.height);
    }
    if (viewportRef.current) {
      viewportRef.current.resize(dimensions.width, dimensions.height);
    }
  }, [dimensions]);

  /* ── 主题变更监听 ── */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      themeColorsRef.current = getThemeColors();
      if (appRef.current) {
        appRef.current.renderer.background.color = themeColorsRef.current.bg;
      }
      updateDisplay();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  /* ── Web Worker 集成 ── */
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/forceLayout.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event) => {
      const { type, nodes: workerNodes, edges: workerEdges } = event.data;

      if (type === "tick" || type === "end") {
        nodesRef.current = workerNodes as PositionedNode[];
        edgesRef.current = workerEdges as PositionedEdge[];

        frameCountRef.current++;
        if (
          frameCountRef.current % BATCH_UPDATE_INTERVAL === 0 ||
          type === "end"
        ) {
          updateDisplay();
          pendingUpdateRef.current = false;
        } else if (!pendingUpdateRef.current) {
          pendingUpdateRef.current = true;
          requestAnimationFrame(() => {
            updateDisplay();
            pendingUpdateRef.current = false;
          });
        }
      }
    };
    worker.onerror = (event) => {
      setRenderError(event.message || "图谱布局线程运行失败");
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  /* ── 发送数据到 Worker ── */
  useEffect(() => {
    if (!workerRef.current || dimensions.width === 0) return;

    const nodeIds = new Set(linkGraph.nodes.map((node) => node.id));
    const validEdges = linkGraph.edges.filter(
      (edge) => nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)),
    );
    workerRef.current.postMessage({
      type: "init",
      nodes: linkGraph.nodes,
      edges: validEdges,
      width: dimensions.width,
      height: dimensions.height,
      strength: 0.1,
    });
  }, [linkGraph.nodes, linkGraph.edges, dimensions]);

  /* ── 更新显示 ── */
  const updateDisplay = useCallback(() => {
    const app = appRef.current;
    const viewport = viewportRef.current;
    if (!app || !viewport) return;

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const theme = themeColorsRef.current;
    const sizeScale = sizeScaleRef.current;
    const showLabels = showLabelsRef.current;
    const shouldCull = useFrustumCullingRef.current;
    const selectedId = selectedNodeIdRef.current;
    const currentSearch = searchQueryRef.current;
    const hoveredId = hoveredNodeRef.current;
    const rScale = radiusScaleRef.current;

    const viewBounds = viewport.getVisibleBounds();
    const padding = 50;
    const cullBounds = {
      x: viewBounds.x - padding,
      y: viewBounds.y - padding,
      width: viewBounds.width + padding * 2,
      height: viewBounds.height + padding * 2,
    };

    const nodeMap = new Map<string, PositionedNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // 搜索高亮集合
    const searchMatchIds = new Set<string>();
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      for (const node of nodes) {
        if (node.label.toLowerCase().includes(q)) {
          searchMatchIds.add(node.id);
        }
      }
    }

    // ── 更新边 ──
    const edgeContainer = edgeContainerRef.current;
    if (edgeContainer) {
      const activeEdgeKeys = new Set<string>();

      for (const edge of edges) {
        const source = nodeMap.get(
          typeof edge.source === "object" ? edge.source.id : edge.source
        );
        const target = nodeMap.get(
          typeof edge.target === "object" ? edge.target.id : edge.target
        );
        if (!source || !target) continue;

        const edgeKey = `${source.id}-${target.id}`;
        activeEdgeKeys.add(edgeKey);

        if (shouldCull) {
          const minX = Math.min(source.x, target.x);
          const maxX = Math.max(source.x, target.x);
          const minY = Math.min(source.y, target.y);
          const maxY = Math.max(source.y, target.y);
          const inView = !(
            maxX < cullBounds.x ||
            minX > cullBounds.x + cullBounds.width ||
            maxY < cullBounds.y ||
            minY > cullBounds.y + cullBounds.height
          );
          if (!inView) {
            const existing = edgeGraphicsMapRef.current.get(edgeKey);
            if (existing) existing.visible = false;
            continue;
          }
        }

        const isHighlighted =
          searchMatchIds.has(source.id) || searchMatchIds.has(target.id);

        let edgeGfx = edgeGraphicsMapRef.current.get(edgeKey);
        if (!edgeGfx) {
          edgeGfx = new Graphics();
          edgeContainer.addChild(edgeGfx);
          edgeGraphicsMapRef.current.set(edgeKey, edgeGfx);
        }

        edgeGfx.visible = true;
        edgeGfx.clear();

        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const offsetX = -dy * 0.12;
        const offsetY = dx * 0.12;

        const color = isHighlighted ? theme.edgeHighlight : theme.edge;
        const alpha = isHighlighted ? theme.edgeHighlightAlpha : theme.edgeAlpha;
        const baseWidth = edge.edgeType === "embed" ? 2.5 : edge.edgeType === "markdown" ? 0.75 : 1.25;
        const lineWidth = isHighlighted ? baseWidth + 1 : baseWidth;
        const relationAlpha = edge.edgeType === "similar" ? alpha * 0.45 : alpha;

        edgeGfx.moveTo(source.x, source.y);
        edgeGfx.quadraticCurveTo(
          midX + offsetX,
          midY + offsetY,
          target.x,
          target.y
        );
        edgeGfx.stroke({ width: lineWidth, color, alpha: relationAlpha });
      }

      for (const [key, gfx] of edgeGraphicsMapRef.current) {
        if (!activeEdgeKeys.has(key)) {
          gfx.destroy();
          edgeGraphicsMapRef.current.delete(key);
        }
      }
    }

    // ── 更新节点 ──
    const nodeContainer = nodeContainerRef.current;
    if (nodeContainer) {
      const activeNodeIds = new Set<string>();
      const time = performance.now();

      for (const node of nodes) {
        const baseRadius = sizeScale(node.val) * rScale;
        activeNodeIds.add(node.id);

        if (shouldCull) {
          const inView = !(
            node.x + baseRadius < cullBounds.x ||
            node.x - baseRadius > cullBounds.x + cullBounds.width ||
            node.y + baseRadius < cullBounds.y ||
            node.y - baseRadius > cullBounds.y + cullBounds.height
          );
          if (!inView) {
            const existing = nodeGraphicsMapRef.current.get(node.id);
            if (existing) existing.visible = false;
            continue;
          }
        }

        const isSelected = selectedId === node.id;
        const isHovered = hoveredId === node.id;
        const isSearchMatch = searchMatchIds.has(node.id);
        const breathe = 0.75 + 0.25 * Math.sin(time * 0.002 + node.val * 0.3);

        let nodeGfx = nodeGraphicsMapRef.current.get(node.id);
        if (!nodeGfx) {
          nodeGfx = new Graphics();
          nodeContainer.addChild(nodeGfx);

          nodeGfx.eventMode = "static";
          nodeGfx.cursor = "pointer";

          const nodeId = node.id;
          const nodeNoteId = node.noteId;

          nodeGfx.on("pointerover", () => {
            hoveredNodeRef.current = nodeId;
            onNodeHover?.(nodeId);
          });

          nodeGfx.on("pointerout", () => {
            hoveredNodeRef.current = null;
            onNodeHover?.(null);
          });

          nodeGfx.on("pointertap", (event) => {
            if (event.detail >= 2) {
              onNodeDoubleClick?.(nodeNoteId);
            } else {
              onNodeClick?.(nodeNoteId);
            }
            setSelectedNode(nodeNoteId);
          });

          nodeGraphicsMapRef.current.set(node.id, nodeGfx);
        }

        nodeGfx.visible = true;
        nodeGfx.clear();
        nodeGfx.position.set(node.x, node.y);

        const fillColor =
          typeof node.color === "string"
            ? parseInt(node.color.replace("#", ""), 16) || 0x4faa70
            : node.color || 0x4faa70;

        if (isSelected) {
          nodeGfx.circle(0, 0, baseRadius);
          nodeGfx.fill({ color: fillColor, alpha: 1 });
          nodeGfx.stroke({
            width: 3,
            color: theme.nodeStrokeSelected,
            alpha: 1,
          });
        } else if (isHovered || isSearchMatch) {
          nodeGfx.circle(0, 0, baseRadius);
          nodeGfx.fill({ color: fillColor, alpha: Math.max(breathe, 0.85) });
          nodeGfx.stroke({
            width: 2,
            color: theme.nodeStrokeHover,
            alpha: theme.nodeStrokeHoverAlpha,
          });
        } else {
          nodeGfx.circle(0, 0, baseRadius);
          nodeGfx.fill({ color: fillColor, alpha: breathe });
          nodeGfx.stroke({
            width: 1.5,
            color: theme.nodeStroke,
            alpha: theme.nodeStrokeAlpha,
          });
        }
      }

      for (const [id, gfx] of nodeGraphicsMapRef.current) {
        if (!activeNodeIds.has(id)) {
          gfx.destroy();
          nodeGraphicsMapRef.current.delete(id);
        }
      }
    }

    // ── 更新标签 ──
    const labelContainer = labelContainerRef.current;
    if (labelContainer && showLabels && !simplified) {
      const activeLabelIds = new Set<string>();

      for (const node of nodes) {
        const baseRadius = sizeScale(node.val) * rScale;
        if (baseRadius <= 12) continue;

        activeLabelIds.add(node.id);

        if (shouldCull) {
          const inView = !(
            node.x < cullBounds.x ||
            node.x > cullBounds.x + cullBounds.width ||
            node.y < cullBounds.y ||
            node.y > cullBounds.y + cullBounds.height
          );
          if (!inView) {
            const existing = labelMapRef.current.get(node.id);
            if (existing) existing.visible = false;
            continue;
          }
        }

        let label = labelMapRef.current.get(node.id);
        if (!label) {
          const style = new TextStyle({
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: LABEL_FONT_SIZE,
            fill: theme.label,
            align: "center",
          });
          label = new Text({ text: "", style });
          label.anchor.set(0.5, 0);
          labelContainer.addChild(label);
          labelMapRef.current.set(node.id, label);
        }

        label.visible = true;
        label.position.set(node.x, node.y + baseRadius + 4);

        const displayLabel = truncateLabel(node.label);
        if (label.text !== displayLabel) {
          label.text = displayLabel;
        }
        label.style.fill = theme.label;
      }

      for (const [id, text] of labelMapRef.current) {
        if (!activeLabelIds.has(id)) {
          text.destroy();
          labelMapRef.current.delete(id);
        }
      }
    } else if (labelContainer && (simplified || !showLabels)) {
      for (const [, text] of labelMapRef.current) {
        text.visible = false;
      }
    }
  }, [onNodeClick, onNodeDoubleClick, onNodeHover, setSelectedNode, simplified]);

  /* ── 返回 JSX ── */
  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ overflow: "hidden", touchAction: "none" }}
      />
      {renderError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper/95 px-6 text-center">
          <p className="text-[12px] text-red-500">图谱渲染失败：{renderError}</p>
          <button
            type="button"
            onClick={() => {
              setRenderError(null);
              setRetryKey((value) => value + 1);
            }}
            className="rounded-lg border border-bamboo/40 px-3 py-1.5 text-[12px] text-bamboo hover:bg-bamboo-mist cursor-pointer"
          >
            重新渲染
          </button>
        </div>
      )}
    </div>
  );
}
