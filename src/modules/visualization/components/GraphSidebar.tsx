/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Fuse from "fuse.js";
import { useGraphStore, type GraphMode } from "../stores/useGraphStore";
import { useNoteStore } from "../../notes/stores/useNoteStore";
import { getCategoryColor } from "../utils/colorMap";

/* ── Mode definitions ── */

interface ModeItem {
  mode: GraphMode;
  icon: React.ReactNode;
  label: string;
  dimension: string;
}

const IconRelation = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
    <path d="M8.5 7.5L15.5 16.5M15.5 7.5L8.5 16.5" />
  </svg>
);
const IconGalaxy = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
  </svg>
);
const IconStar = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconDashboard = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const IconSearch = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const IconChevron = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const MODES: ModeItem[] = [
  { mode: "relation", icon: IconRelation, label: "文件关系图", dimension: "2D/3D 切换" },
  { mode: "galaxy", icon: IconGalaxy, label: "思维导图星系", dimension: "2D 视图" },
  { mode: "starcluster", icon: IconStar, label: "引用星团图", dimension: "3D 视图" },
  { mode: "dashboard", icon: IconDashboard, label: "仪表盘总览", dimension: "全部模块" },
];

/* ── Search result type ── */
interface SidebarSearchResult {
  noteId: string;
  nodeId: string;
  title: string;
  category: string;
}

/* ── Main component ── */

export function GraphSidebar() {
  const {
    activeMode,
    sidebarCollapsed,
    searchQuery,
    selectedNodeId,
    activeFilters,
    setActiveMode,
    toggleSidebar,
    setSearchQuery,
    selectNode,
    toggleFilter,
  } = useGraphStore();

  const { linkGraph, notesMetadata, selectNote } = useNoteStore();

  /* ── Fuse search ── */
  const nodeFuse = useMemo(() => {
    const items = linkGraph.nodes.map((n) => ({
      nodeId: n.id,
      noteId: n.noteId,
      label: n.label,
    }));
    return new Fuse(items, { keys: ["label"], threshold: 0.4, includeScore: true });
  }, [linkGraph.nodes]);

  const searchResults = useMemo<SidebarSearchResult[]>(() => {
    if (!searchQuery.trim()) return [];
    return nodeFuse.search(searchQuery).slice(0, 15).map((r) => {
      const meta = notesMetadata.find((m) => m.id === r.item.noteId);
      return {
        noteId: r.item.noteId,
        nodeId: r.item.nodeId,
        title: r.item.label,
        category: meta?.category || "未分类",
      };
    });
  }, [searchQuery, nodeFuse, notesMetadata]);

  /* ── Category list with counts ── */
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const meta of notesMetadata) {
      const cat = meta.category || "未分类";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notesMetadata]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const nodes = linkGraph.nodes;
    const edges = linkGraph.edges;
    const n = nodes.length;
    const density = n > 1 ? edges.length / (n * (n - 1)) : 0;
    return {
      noteCount: notesMetadata.length,
      edgeCount: edges.length,
      categoryCount: categories.length,
      density: density.toFixed(2),
    };
  }, [linkGraph, notesMetadata, categories]);

  /* ── Handlers ── */
  const handleSearchResultClick = useCallback(
    (result: SidebarSearchResult) => {
      selectNote(result.noteId);
      selectNode(result.nodeId);
      setSearchQuery("");
    },
    [selectNote, selectNode, setSearchQuery],
  );

  /* ── Search focus management ── */
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const showResults = searchQuery.trim().length > 0 && searchResults.length > 0 && searchFocused;

  useEffect(() => {
    if (!showResults) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showResults]);

  return (
    <aside
      className="h-full shrink-0 flex flex-col transition-all duration-200 ease-in-out"
      style={{
        width: sidebarCollapsed ? 48 : 240,
        backgroundColor: "var(--color-paper)",
        borderRight: "1px solid var(--color-paper-warm)",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 h-11 shrink-0">
        {!sidebarCollapsed && (
          <span className="text-[16px] font-semibold" style={{ color: "var(--color-ink)" }}>
            📊 图谱仪表盘
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-md transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
          title={sidebarCollapsed ? "展开" : "折叠"}
        >
          <span
            style={{
              color: "var(--color-ink-ghost)",
              display: "inline-block",
              transform: sidebarCollapsed ? "rotate(180deg)" : "none",
              transition: "transform 200ms ease",
            }}
          >
            {IconChevron}
          </span>
        </button>
      </div>

      {/* ── Mode Switcher ── */}
      {!sidebarCollapsed && (
        <div className="px-3 pb-1">
          <div className="text-[12px] mb-1.5" style={{ color: "var(--color-ink-ghost)" }}>
            可视化视图
          </div>
        </div>
      )}
      <nav className={`shrink-0 px-2 space-y-0.5 ${sidebarCollapsed ? "py-2" : "pb-2"}`}>
        {MODES.map((item) => {
          const isActive = activeMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => setActiveMode(item.mode)}
              className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0 py-2" : "px-3 py-2 text-left"
              }`}
              style={{
                backgroundColor: isActive ? "var(--color-bamboo-mist)" : "transparent",
                color: isActive ? "var(--color-bamboo)" : "var(--color-ink-faint)",
                borderLeft: isActive && !sidebarCollapsed ? "3px solid var(--color-bamboo)" : "3px solid transparent",
              }}
              title={sidebarCollapsed ? item.label : undefined}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-paper-warm)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span className="shrink-0 flex items-center justify-center relative" style={{ width: 16, height: 16 }}>
                {item.icon}
                {isActive && sidebarCollapsed && (
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: "var(--color-bamboo)" }}
                  />
                )}
              </span>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{item.label}</div>
                  <div className="text-[11px] truncate" style={{ color: "var(--color-ink-ghost)" }}>
                    {item.dimension}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Filters ── */}
      {!sidebarCollapsed && (
        <div className="shrink-0 px-3 pb-2">
          <div className="text-[12px] mb-1.5" style={{ color: "var(--color-ink-ghost)" }}>
            筛选器
          </div>

          {/* Search */}
          <div ref={searchContainerRef} className="relative mb-2">
            <div
              className="flex items-center gap-1.5 px-2.5 rounded-lg border transition-colors"
              style={{
                height: 32,
                backgroundColor: "var(--color-paper-warm)",
                borderColor: searchFocused ? "var(--color-bamboo)" : "var(--color-paper-deep)",
              }}
            >
              <span style={{ color: "var(--color-ink-ghost)", flexShrink: 0 }}>{IconSearch}</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="搜索节点..."
                className="flex-1 text-[12px] min-w-0 bg-transparent outline-none"
                style={{ color: "var(--color-ink)" }}
              />
              {searchQuery && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setSearchQuery(""); searchInputRef.current?.focus(); }}
                  className="text-[11px] cursor-pointer hover:opacity-70"
                  style={{ color: "var(--color-ink-ghost)" }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {showResults && (
              <div
                className="absolute left-0 right-0 top-full mt-1 rounded-lg border z-50 max-h-[200px] overflow-y-auto"
                style={{
                  backgroundColor: "var(--color-cloud)",
                  borderColor: "var(--color-paper-deep)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
              >
                {searchResults.map((result) => (
                  <button
                    key={result.nodeId}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer first:rounded-t-lg last:rounded-b-lg hover:bg-[var(--color-paper-warm)]"
                    style={{ color: "var(--color-ink-soft)" }}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getCategoryColor(result.category) }}
                    />
                    <span className="text-[12px] truncate flex-1">{result.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category checkboxes */}
          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {categories.map(([cat, count]) => {
              const checked = activeFilters.length === 0 || activeFilters.includes(cat);
              return (
                <label
                  key={cat}
                  className="flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer transition-colors hover:bg-[var(--color-paper-warm)]"
                  onClick={(e) => { e.preventDefault(); toggleFilter(cat); }}
                >
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full border transition-colors"
                    style={{
                      borderColor: checked ? "var(--color-bamboo)" : "var(--color-paper-deep)",
                      backgroundColor: checked ? "var(--color-bamboo)" : "transparent",
                    }}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(cat) }}
                  />
                  <span className="flex-1 text-[12px] truncate" style={{ color: "var(--color-ink-soft)" }}>
                    {cat}
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: "var(--color-ink-ghost)" }}>
                    {count}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Sort dropdown */}
          <div className="mt-2">
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[12px] cursor-pointer"
              style={{
                height: 32,
                backgroundColor: "var(--color-paper-warm)",
                borderColor: "var(--color-paper-deep)",
                color: "var(--color-ink-faint)",
              }}
            >
              <span>排序:</span>
              <span className="flex-1" style={{ color: "var(--color-ink-soft)" }}>引用量</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {!sidebarCollapsed && (
        <div className="shrink-0 px-3 pb-2">
          <div className="text-[12px] mb-1.5" style={{ color: "var(--color-ink-ghost)" }}>
            图例
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {categories.map(([cat]) => (
              <div key={cat} className="flex items-center gap-2 px-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />
                <span className="text-[11px] truncate" style={{ color: "var(--color-ink-faint)" }}>
                  {cat}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      {!sidebarCollapsed && (
        <div className="mx-3 border-t shrink-0" style={{ borderColor: "var(--color-paper-deep)" }} />
      )}

      {/* ── Stats ── */}
      {!sidebarCollapsed && (
        <div className="shrink-0 px-3 py-2 space-y-1">
          <div className="text-[12px] mb-1" style={{ color: "var(--color-ink-ghost)" }}>
            统计信息
          </div>
          <StatRow label="笔记" value={`${stats.noteCount} 篇`} />
          <StatRow label="链接" value={`${stats.edgeCount} 条`} />
          <StatRow label="分类" value={`${stats.categoryCount} 个`} />
          <StatRow label="密度" value={stats.density} />
        </div>
      )}

      {/* ── Node Detail ── */}
      {selectedNodeId && !sidebarCollapsed && (
        <>
          <div className="mx-3 border-t shrink-0" style={{ borderColor: "var(--color-paper-deep)" }} />
          <div className="shrink-0 px-3 py-2 max-h-[200px] overflow-y-auto">
            <div className="text-[12px] mb-1.5 flex items-center justify-between" style={{ color: "var(--color-ink-ghost)" }}>
              <span>节点详情</span>
              <button
                onClick={() => selectNode(null)}
                className="text-[10px] cursor-pointer hover:opacity-80"
                style={{ color: "var(--color-ink-ghost)" }}
              >
                关闭
              </button>
            </div>
            <NodeDetailPanel nodeId={selectedNodeId} />
          </div>
        </>
      )}

      {/* ── Spacer (collapsed mode) ── */}
      {sidebarCollapsed && <div className="flex-1" />}
    </aside>
  );
}

/* ── Sub-components ── */

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span style={{ color: "var(--color-ink-faint)" }}>{label}</span>
      <span className="font-mono" style={{ color: "var(--color-ink-soft)" }}>{value}</span>
    </div>
  );
}

function NodeDetailPanel({ nodeId }: { nodeId: string }) {
  const { linkGraph, notesMetadata, getLinkedNotes, getBacklinks, selectNote } = useNoteStore();

  const node = linkGraph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const noteMeta = notesMetadata.find((m) => m.id === node.noteId);
  const category = noteMeta?.category || "未分类";
  const outgoing = getLinkedNotes(node.noteId);
  const incoming = getBacklinks(node.noteId);

  const getNodeLabel = (id: string) => linkGraph.nodes.find((n) => n.id === id)?.label || "未知";

  return (
    <div className="space-y-1.5 text-[11px]">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
        <span className="font-medium" style={{ color: "var(--color-ink-soft)" }}>{node.label}</span>
      </div>
      <div style={{ color: "var(--color-ink-faint)" }}>分类: {category}</div>
      <div style={{ color: "var(--color-ink-faint)" }}>被引用: {node.val} 次</div>
      {noteMeta?.createdAt && (
        <div style={{ color: "var(--color-ink-faint)" }}>创建: {noteMeta.createdAt.slice(0, 10)}</div>
      )}
      {noteMeta?.updatedAt && (
        <div style={{ color: "var(--color-ink-faint)" }}>修改: {noteMeta.updatedAt.slice(0, 10)}</div>
      )}
      {outgoing.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--color-ink-ghost)" }}>引用:</div>
          <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
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
          <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--color-ink-ghost)" }}>被引用:</div>
          <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
            {incoming.map((edge, i) => (
              <div key={i} className="flex items-center gap-1" style={{ color: "var(--color-ink-faint)" }}>
                <span>←</span>
                <span className="truncate">{getNodeLabel(edge.source)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Action buttons */}
      <div className="flex gap-2 pt-1.5">
        <button
          onClick={() => selectNote(node.noteId)}
          className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: "var(--color-bamboo-mist)",
            color: "var(--color-bamboo)",
            border: "1px solid var(--color-bamboo)",
          }}
        >
          打开笔记
        </button>
        <button
          onClick={() => {
            /* Scroll/zoom to node — selectNode already highlights it */
          }}
          className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
          style={{
            border: "1px solid var(--color-paper-deep)",
            color: "var(--color-ink-faint)",
          }}
        >
          定位
        </button>
      </div>
    </div>
  );
}
