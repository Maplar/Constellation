/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useGraphStore, type GraphMode } from "../stores/useGraphStore";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { getCategoryColor } from "../utils/colorMap";

interface ModeItem {
  mode: GraphMode;
  icon: string;
  label: string;
}

const MODES: ModeItem[] = [
  { mode: "relation", icon: "🌐", label: "文件关系图谱" },
  { mode: "galaxy", icon: "🧠", label: "思维导图星系" },
  { mode: "starcluster", icon: "⭐", label: "引用星团图" },
  { mode: "dashboard", icon: "📊", label: "仪表盘概览" },
];

export function GraphSidebar() {
  const {
    activeMode,
    dimensionMode,
    sidebarCollapsed,
    searchQuery,
    selectedNodeId,
    setActiveMode,
    toggleDimension,
    toggleSidebar,
    setSearchQuery,
    selectNode,
  } = useGraphStore();

  const { linkGraph, notesMetadata, getLinkedNotes, getBacklinks } = useNoteStore();

  const stats = useMemo(() => {
    const nodes = linkGraph.nodes;
    const edges = linkGraph.edges;

    let maxRefNode = { label: "无", val: 0 };
    for (const node of nodes) {
      if (node.val > maxRefNode.val) {
        maxRefNode = { label: node.label, val: node.val };
      }
    }

    const categories = new Set(notesMetadata.map((n) => n.category || "未分类"));

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      maxRefNode,
      categoryCount: categories.size,
    };
  }, [linkGraph, notesMetadata]);

  const showViewControls = activeMode === "relation" || activeMode === "starcluster";

  return (
    <aside
      className="h-full shrink-0 border-r flex flex-col transition-all duration-200 ease-in-out"
      style={{
        width: sidebarCollapsed ? 56 : 240,
        backgroundColor: "var(--color-paper)",
        borderColor: "var(--color-paper-deep)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 h-11 border-b shrink-0"
        style={{ borderColor: "var(--color-paper-deep)" }}
      >
        {!sidebarCollapsed && (
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--color-ink-soft)" }}
          >
            图谱视图
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
          title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: "var(--color-ink-ghost)",
              transform: sidebarCollapsed ? "rotate(180deg)" : "none",
              transition: "transform 200ms ease",
            }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {MODES.map((item) => {
          const isActive = activeMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => setActiveMode(item.mode)}
              className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
              }`}
              style={{
                backgroundColor: isActive
                  ? "var(--color-bamboo-mist)"
                  : "transparent",
                color: isActive
                  ? "var(--color-bamboo)"
                  : "var(--color-ink-faint)",
              }}
              title={sidebarCollapsed ? item.label : undefined}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-paper-warm)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span className="text-[16px] shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="text-[13px] font-medium truncate">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {showViewControls && !sidebarCollapsed && (
        <div
          className="border-t px-3 py-2.5 shrink-0"
          style={{ borderColor: "var(--color-paper-deep)" }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-2"
            style={{ color: "var(--color-ink-ghost)" }}
          >
            视图控制
          </div>

          <div className="flex gap-1 mb-2">
            <button
              onClick={() => {
                if (dimensionMode !== "2D") toggleDimension();
              }}
              className="flex-1 px-2 py-1 text-[11px] rounded transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  dimensionMode === "2D"
                    ? "var(--color-bamboo-mist)"
                    : "transparent",
                color:
                  dimensionMode === "2D"
                    ? "var(--color-bamboo)"
                    : "var(--color-ink-ghost)",
                border:
                  dimensionMode === "2D"
                    ? "1px solid var(--color-bamboo)"
                    : "1px solid var(--color-paper-deep)",
              }}
            >
              2D
            </button>
            <button
              onClick={() => {
                if (dimensionMode !== "3D") toggleDimension();
              }}
              className="flex-1 px-2 py-1 text-[11px] rounded transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  dimensionMode === "3D"
                    ? "var(--color-bamboo-mist)"
                    : "transparent",
                color:
                  dimensionMode === "3D"
                    ? "var(--color-bamboo)"
                    : "var(--color-ink-ghost)",
                border:
                  dimensionMode === "3D"
                    ? "1px solid var(--color-bamboo)"
                    : "1px solid var(--color-paper-deep)",
              }}
            >
              3D
            </button>
          </div>

          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border"
            style={{
              backgroundColor: "var(--color-paper-warm)",
              borderColor: "var(--color-paper-deep)",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ color: "var(--color-ink-ghost)", flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索节点…"
              className="flex-1 text-[11px] min-w-0"
              style={{ color: "var(--color-ink)" }}
            />
          </div>
        </div>
      )}

      {activeMode === "starcluster" && selectedNodeId && !sidebarCollapsed && (
        <div
          className="border-t px-3 py-2.5 shrink-0 max-h-[250px] overflow-y-auto"
          style={{ borderColor: "var(--color-paper-deep)" }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-2 flex items-center justify-between"
            style={{ color: "var(--color-ink-ghost)" }}
          >
            <span>节点详情</span>
            <button
              onClick={() => selectNode(null)}
              className="text-[10px] cursor-pointer hover:opacity-80"
              style={{ color: "var(--color-ink-ghost)" }}
            >
              关闭
            </button>
          </div>
          <NodeDetailPanel
            nodeId={selectedNodeId}
            linkGraph={linkGraph}
            notesMetadata={notesMetadata}
            getLinkedNotes={getLinkedNotes}
            getBacklinks={getBacklinks}
          />
        </div>
      )}

      {!sidebarCollapsed && (
        <div
          className="border-t px-3 py-2.5 shrink-0"
          style={{ borderColor: "var(--color-paper-deep)" }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-2"
            style={{ color: "var(--color-ink-ghost)" }}
          >
            图例/统计
          </div>

          <div className="space-y-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
            <div className="flex justify-between">
              <span>节点总数</span>
              <span className="font-mono tabular-nums">{stats.nodeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>连接总数</span>
              <span className="font-mono tabular-nums">{stats.edgeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>分类数</span>
              <span className="font-mono tabular-nums">{stats.categoryCount}</span>
            </div>
            {stats.maxRefNode.val > 0 && (
              <div className="flex justify-between">
                <span>最高引用</span>
                <span
                  className="font-mono tabular-nums truncate ml-2"
                  title={`${stats.maxRefNode.label} (${stats.maxRefNode.val}次)`}
                >
                  {stats.maxRefNode.label.length > 6
                    ? stats.maxRefNode.label.slice(0, 6) + "…"
                    : stats.maxRefNode.label}{" "}
                  ({stats.maxRefNode.val})
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--color-paper-deep)" }}>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--color-ink-ghost)" }}>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--color-ink-ghost)", opacity: 0.4 }}
                />
                低引用
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--color-ink-ghost)", opacity: 0.7 }}
                />
                中引用
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--color-ink-ghost)" }}
                />
                高引用
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

interface NodeDetailPanelProps {
  nodeId: string;
  linkGraph: { nodes: { id: string; label: string; val: number; noteId: string }[]; edges: { source: string; target: string }[] };
  notesMetadata: { id: string; title: string; category: string }[];
  getLinkedNotes: (noteId: string) => { source: string; target: string }[];
  getBacklinks: (noteId: string) => { source: string; target: string }[];
}

function NodeDetailPanel({ nodeId, linkGraph, notesMetadata, getLinkedNotes, getBacklinks }: NodeDetailPanelProps) {
  const node = linkGraph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const noteMeta = notesMetadata.find((m) => m.id === node.noteId);
  const category = noteMeta?.category || "未分类";

  const outgoing = getLinkedNotes(node.noteId);
  const incoming = getBacklinks(node.noteId);

  const getNodeLabel = (id: string) => {
    const n = linkGraph.nodes.find((node) => node.id === id);
    return n?.label || "未知";
  };

  return (
    <div className="space-y-2 text-[11px]">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: getCategoryColor(category) }}
        />
        <span className="font-medium" style={{ color: "var(--color-ink-soft)" }}>
          {node.label}
        </span>
      </div>
      <div style={{ color: "var(--color-ink-faint)" }}>
        分类: {category}
      </div>
      <div style={{ color: "var(--color-ink-faint)" }}>
        被引用: {node.val} 次
      </div>

      {outgoing.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--color-ink-ghost)" }}>
            引用:
          </div>
          <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
            {outgoing.map((edge, i) => (
              <div key={i} className="flex items-center gap-1" style={{ color: "var(--color-ink-faint)" }}>
                <span>→</span>
                <span className="truncate">{getNodeLabel(edge.target)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--color-ink-ghost)" }}>
            被引用:
          </div>
          <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
            {incoming.map((edge, i) => (
              <div key={i} className="flex items-center gap-1" style={{ color: "var(--color-ink-faint)" }}>
                <span>←</span>
                <span className="truncate">{getNodeLabel(edge.source)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
