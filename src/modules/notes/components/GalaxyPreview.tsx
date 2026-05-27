/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：星环视图组件
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMindMapStore } from "../stores/useMindMapStore";
import { useNoteStore } from "../stores/useNoteStore";
import { useMindMap } from "../hooks/useMindMap";
import type { MindMapData, MindMapNode } from "../../shared/types/notes";
import {
  findNodeById,
  addChildNode,
  updateNodeLink,
} from "../services/mindMapParser";
import { saveMindMapForNote } from "../services/mindMapStorage";
import {
  getAccessibleNodeColor,
  getAccessibleNodeStroke,
} from "../../visualization/utils/colorMap";

// ──────────────────────────────────────────────────────────────
// 常量
// ──────────────────────────────────────────────────────────────

const MAX_VISIBLE_CHILDREN = 16;
const CENTER_RADIUS = 32;
const CHILD_RADIUS = 20;
const ORBIT_RADIUS = 120;
const NODE_SPACING = 8; // 节点之间的最小间距

// ──────────────────────────────────────────────────────────────
// 类型
// ──────────────────────────────────────────────────────────────

interface GalaxyNodeData {
  nodeId: string;
  title: string;
  x: number;
  y: number;
  shape: "circle" | "square" | "triangle" | "hexagon";
  isLeaf: boolean;
  linkedNoteId: string | null;
  color: string;
  canNavigate: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  isLeaf: boolean;
  linkedNoteId: string | null;
}

// ──────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────

// 检测深色模式
function isDarkMode(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
  );
}

// 三角形路径点
function trianglePoints(cx: number, cy: number, r: number): string {
  const h = r * 1.2;
  return [
    `${cx},${cy - h}`,
    `${cx - h * Math.sin(Math.PI / 3)},${cy + h * Math.cos(Math.PI / 3)}`,
    `${cx + h * Math.sin(Math.PI / 3)},${cy + h * Math.cos(Math.PI / 3)}`,
  ].join(" ");
}

// 六边形路径点
function hexagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

// 默认节点颜色
const DEFAULT_COLORS = [
  "#7ebea5",
  "#a3c9b7",
  "#c5d5cb",
  "#8fb8a6",
  "#6ba393",
  "#b5d4c3",
  "#9cc5b0",
  "#d5dbdf",
];

function getNodeColorByIndex(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

// ──────────────────────────────────────────────────────────────
// 组件
// ──────────────────────────────────────────────────────────────

interface GalaxyPreviewProps {
  noteId: string;
  notesDir?: string;
}

export function GalaxyPreview({ noteId, notesDir }: GalaxyPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showMore, setShowMore] = useState(false);

  const notesMetadata = useNoteStore((s) => s.notesMetadata);
  const selectNote = useNoteStore((s) => s.selectNote);
  const notes = useNoteStore((s) => s.notes);

  const {
    mindMap,
    isLoading,
    error,
    loadMindMap,
    saveMindMap,
    importMindMap,
  } = useMindMap({
    notesDir: notesDir || "",
    noteId,
    autoLoad: !!notesDir,
  });

  const { currentMindMap, setMindMap, linkNote } = useMindMapStore();

  // 同步 useMindMap 和 useMindMapStore
  useEffect(() => {
    if (mindMap) {
      setMindMap(mindMap, noteId);
    }
  }, [mindMap, noteId, setMindMap]);

  // 监听容器尺寸变化
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

  // 计算布局
  const { centerNode, visibleChildren, hasMore, moreCount } = useMemo(() => {
    if (!currentMindMap) {
      return {
        centerNode: null,
        visibleChildren: [],
        hasMore: false,
        moreCount: 0,
      };
    }

    const root = currentMindMap.root;
    const children = root.children;
    const visible = children.slice(0, MAX_VISIBLE_CHILDREN);
    const more = children.length > MAX_VISIBLE_CHILDREN;
    const moreCnt = children.length - MAX_VISIBLE_CHILDREN + 1;

    return {
      centerNode: root,
      visibleChildren: visible,
      hasMore: more,
      moreCount: moreCnt,
    };
  }, [currentMindMap]);

  // 获取当前笔记内容（用于判断引用关系）
  const currentNoteContent = useMemo(() => {
    const note = notes.find((n) => n.id === noteId);
    return note?.content || "";
  }, [notes, noteId]);

  // 计算子节点形状
  const getNodeShape = useCallback(
    (node: MindMapNode): GalaxyNodeData["shape"] => {
      // 非叶子节点：圆形
      if (node.children.length > 0) {
        return "circle";
      }

      // 叶子节点形状判断
      const linkedNote = node.linkedNoteId
        ? notesMetadata.find((n) => n.id === node.linkedNoteId)
        : null;

      const centerLinksNode = currentNoteContent.includes(`[[${node.title}]]`);
      const nodeLinksCenter =
        linkedNote?.content?.includes(`[[${notesMetadata.find((n) => n.id === noteId)?.title || ""}]]`) ||
        false;

      if (centerLinksNode && nodeLinksCenter) return "hexagon";
      if (centerLinksNode) return "triangle";
      return "square";
    },
    [currentNoteContent, notesMetadata, noteId]
  );

  // 计算节点数据
  const galaxyNodes = useMemo((): GalaxyNodeData[] => {
    if (!centerNode || dimensions.width === 0) return [];

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    return visibleChildren.map((child, index) => {
      const angle = (2 * Math.PI * index) / visibleChildren.length;
      const x = cx + ORBIT_RADIUS * Math.cos(angle);
      const y = cy + ORBIT_RADIUS * Math.sin(angle);
      const shape = getNodeShape(child);
      const isLeaf = child.children.length === 0;
      const canNavigate = isLeaf && child.linkedNoteId !== null;

      return {
        nodeId: child.nodeId,
        title: child.title,
        x,
        y,
        shape,
        isLeaf,
        linkedNoteId: child.linkedNoteId,
        color: getNodeColorByIndex(index),
        canNavigate,
      };
    });
  }, [centerNode, visibleChildren, dimensions, getNodeShape]);

  // 处理节点点击
  const handleNodeClick = useCallback(
    (node: GalaxyNodeData) => {
      if (node.canNavigate && node.linkedNoteId) {
        selectNote(node.linkedNoteId);
      }
    },
    [selectNote]
  );

  // 处理右键菜单
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, node: GalaxyNodeData) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.nodeId,
        isLeaf: node.isLeaf,
        linkedNoteId: node.linkedNoteId,
      });
    },
    []
  );

  // 关联笔记
  const handleLinkNote = useCallback(
    async (selectedNoteId: string) => {
      if (!currentMindMap || !notesDir) return;

      const newData = updateNodeLink(
        currentMindMap.root,
        contextMenu!.nodeId,
        selectedNoteId
      );

      setMindMap(newData, noteId);
      await saveMindMapForNote(notesDir, noteId, newData);
      setContextMenu(null);
    },
    [currentMindMap, notesDir, contextMenu, noteId, setMindMap]
  );

  // 取消关联
  const handleUnlinkNote = useCallback(async () => {
    if (!currentMindMap || !notesDir) return;

    const newData = updateNodeLink(
      currentMindMap.root,
      contextMenu!.nodeId,
      null
    );

    setMindMap(newData, noteId);
    await saveMindMapForNote(notesDir, noteId, newData);
    setContextMenu(null);
  }, [currentMindMap, notesDir, contextMenu, noteId, setMindMap]);

  // 关闭右键菜单
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 渲染空状态
  if (!notesDir) {
    return (
      <div className="flex items-center justify-center h-full text-ink-ghost text-sm">
        请先配置笔记目录
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-ink-ghost text-sm">
        <svg
          className="animate-spin h-5 w-5 mr-2 text-bamboo"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        加载中...
      </div>
    );
  }

  if (!currentMindMap) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-ink-ghost">
        <svg
          className="w-12 h-12 text-ink-ghost/40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
        <p className="text-sm">无思维导图关联</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              // 创建新的思维导图
              const newMindMap: MindMapData = {
                version: "1.0",
                root: {
                  nodeId: crypto.randomUUID(),
                  title:
                    notesMetadata.find((n) => n.id === noteId)?.title ||
                    "根节点",
                  children: [],
                  linkedNoteId: null,
                },
              };
              await saveMindMapForNote(notesDir, noteId, newMindMap);
              setMindMap(newMindMap, noteId);
            }}
            className="px-3 py-1.5 text-xs bg-bamboo/10 text-bamboo hover:bg-bamboo/20 rounded-md transition-colors"
          >
            创建思维导图
          </button>
          <label className="px-3 py-1.5 text-xs bg-paper-warm text-ink-ghost hover:bg-paper-warm/80 rounded-md transition-colors cursor-pointer">
            导入文件
            <input
              type="file"
              accept=".xmind,.mm,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await importMindMap(file);
                }
              }}
            />
          </label>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;
  const dark = isDarkMode();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onClick={handleCloseContextMenu}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="select-none"
      >
        {/* 背景渐变 */}
        <defs>
          <radialGradient id="galaxy-bg" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={dark ? "#0d1117" : "#f0ece4"}
            />
            <stop
              offset="100%"
              stopColor={dark ? "#000000" : "#e5e1d8"}
            />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#galaxy-bg)" />

        {/* 轨道线 */}
        <circle
          cx={cx}
          cy={cy}
          r={ORBIT_RADIUS}
          fill="none"
          stroke={dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* 中心到子节点的连线 */}
        {galaxyNodes.map((node) => (
          <line
            key={`line-${node.nodeId}`}
            x1={cx}
            y1={cy}
            x2={node.x}
            y2={node.y}
            stroke={dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* 子节点 */}
        {galaxyNodes.map((node) => {
          const fillColor = getAccessibleNodeColor(node.color);
          const strokeColor = getAccessibleNodeStroke(node.color);

          return (
            <g
              key={node.nodeId}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node);
              }}
              onContextMenu={(e) => handleContextMenu(e, node)}
              className={`cursor-pointer ${node.canNavigate ? "hover:opacity-80" : ""}`}
            >
              {/* 节点形状 */}
              {node.shape === "circle" && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={CHILD_RADIUS}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={2}
                />
              )}
              {node.shape === "square" && (
                <rect
                  x={node.x - CHILD_RADIUS}
                  y={node.y - CHILD_RADIUS}
                  width={CHILD_RADIUS * 2}
                  height={CHILD_RADIUS * 2}
                  rx={4}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={2}
                />
              )}
              {node.shape === "triangle" && (
                <polygon
                  points={trianglePoints(node.x, node.y, CHILD_RADIUS)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={2}
                />
              )}
              {node.shape === "hexagon" && (
                <polygon
                  points={hexagonPoints(node.x, node.y, CHILD_RADIUS)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={2}
                />
              )}

              {/* 节点标题 */}
              <text
                x={node.x}
                y={node.y + CHILD_RADIUS + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[11px] fill-ink-soft pointer-events-none"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {node.title.length > 8
                  ? node.title.substring(0, 8) + "..."
                  : node.title}
              </text>

              {/* 可跳转指示器 */}
              {node.canNavigate && (
                <circle
                  cx={node.x + CHILD_RADIUS - 4}
                  cy={node.y - CHILD_RADIUS + 4}
                  r={4}
                  fill="#7ebea5"
                  stroke={dark ? "#1a1a2e" : "#f5f5f5"}
                  strokeWidth="1"
                />
              )}
            </g>
          );
        })}

        {/* 更多节点指示器 */}
        {hasMore && (
          <g
            onClick={(e) => {
              e.stopPropagation();
              setShowMore(!showMore);
            }}
            className="cursor-pointer"
          >
            <circle
              cx={cx + ORBIT_RADIUS + 40}
              cy={cy}
              r={CHILD_RADIUS}
              fill={dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
              stroke={dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
              strokeWidth="1"
            />
            <text
              x={cx + ORBIT_RADIUS + 40}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-ink-ghost"
            >
              +{moreCount}
            </text>
          </g>
        )}

        {/* 中心节点 */}
        <circle
          cx={cx}
          cy={cy}
          r={CENTER_RADIUS}
          fill={dark ? "#2d3748" : "#e2e8f0"}
          stroke={dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"}
          strokeWidth="2"
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[12px] font-semibold fill-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {centerNode!.title.length > 6
            ? centerNode!.title.substring(0, 6) + "..."
            : centerNode!.title}
        </text>
      </svg>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-paper border border-paper-deep/20 rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isLeaf && (
            <>
              <button
                onClick={() => {
                  // 打开笔记选择器
                  const noteId = prompt("输入要关联的笔记 ID");
                  if (noteId) {
                    handleLinkNote(noteId);
                  }
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-ink-soft hover:bg-paper-warm transition-colors"
              >
                关联笔记
              </button>
              {contextMenu.linkedNoteId && (
                <button
                  onClick={handleUnlinkNote}
                  className="w-full px-3 py-1.5 text-left text-xs text-ink-soft hover:bg-paper-warm transition-colors"
                >
                  取消关联
                </button>
              )}
            </>
          )}
          {!contextMenu.isLeaf && (
            <div className="px-3 py-1.5 text-xs text-ink-ghost/60">
              非叶子节点无法关联
            </div>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
