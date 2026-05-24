/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
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

const MODES: ModeItem[] = [
  { mode: "relation", icon: IconRelation, label: "文件关系图", dimension: "2D/3D 切换" },
  { mode: "galaxy", icon: IconGalaxy, label: "思维导图星系", dimension: "2D 视图" },
  { mode: "starcluster", icon: IconStar, label: "引用星团图", dimension: "3D 视图" },
  { mode: "dashboard", icon: IconDashboard, label: "仪表盘总览", dimension: "全部模块" },
];

/* ── Main component ── */

export function GraphSidebar() {
  const { activeView, setActiveView, searchQuery, setSearchQuery, activeFilters, toggleFilter } = useGraphStore();
  const { notesMetadata, notes, wikiLinks } = useNoteStore();

  /* ── 分类统计（去重 + 计数） ── */
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notesMetadata) {
      const cat = note.category || "未分类";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notesMetadata]);

  /* ── 网络密度 = 边数 / (节点数*(节点数-1)/2) ── */
  const density = useMemo(() => {
    const n = notes.length;
    if (n <= 1) return 0;
    return wikiLinks.length / (n * (n - 1) / 2);
  }, [notes, wikiLinks]);

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col h-full overflow-y-auto"
      style={{
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-light)",
        padding: "16px 12px",
      }}
    >
      {/* ── 标题 ── */}
      <div
        className="text-[16px] font-semibold mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        📊 图谱仪表盘
      </div>

      {/* ── 视图切换 ── */}
      <div className="text-[12px] mb-1.5" style={{ color: "var(--text-muted)" }}>
        可视化视图
      </div>

      <nav className="space-y-0.5">
        {MODES.map((item) => {
          const isActive = activeView === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => setActiveView(item.mode)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: isActive ? "var(--accent-light)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: 16, height: 16 }}>
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{item.label}</div>
                <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                  {item.dimension}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* ── 筛选器 ── */}
      <div className="mt-2 mb-2">
        <div
          className="text-[12px] mb-2 mt-2"
          style={{ color: "var(--text-muted)" }}
        >
          筛选器
        </div>

        {/* 搜索框 */}
        <div
          className="flex items-center gap-2 px-3 h-8 rounded-lg border"
          style={{
            backgroundColor: "var(--bg-hover)",
            borderColor: "var(--border)",
            borderRadius: 8,
          }}
        >
          <span className="text-[13px] shrink-0">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            className="flex-1 text-[12px] bg-transparent outline-none min-w-0"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        {/* 分类复选框列表 */}
        <div className="mt-2 space-y-0.5">
          {categories.map(([cat, count]) => {
            const isChecked = activeFilters.length === 0 || activeFilters.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleFilter(cat)}
                className="w-full flex items-center gap-2 px-1.5 py-1 rounded text-left transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
              >
                {/* 圆形复选框 */}
                <span
                  className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: isChecked ? "var(--accent)" : "transparent",
                    borderColor: isChecked ? "var(--accent)" : "var(--border)",
                  }}
                >
                  {isChecked && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>

                {/* 分类色块 */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />

                {/* 分类名 + 数量 */}
                <span className="flex-1 text-[12px] truncate" style={{ color: "var(--text-primary)" }}>
                  {cat}
                </span>
                <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 图例 ── */}
      <div className="mt-2 mb-2">
        <div
          className="text-[12px] mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          图例
        </div>
        <div className="space-y-1">
          {categories.map(([cat]) => (
            <div key={cat} className="flex items-center gap-2 px-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getCategoryColor(cat) }}
              />
              <span className="text-[12px] truncate" style={{ color: "var(--text-secondary)" }}>
                {cat}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 底部统计 ── */}
      <div
        className="mt-auto"
        style={{
          borderTop: "1px solid var(--border-light)",
          padding: "12px 0 0",
        }}
      >
        <div className="text-[12px] mb-1.5" style={{ color: "var(--text-muted)" }}>
          统计信息
        </div>
        <div className="space-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <div className="flex justify-between">
            <span>笔记总数</span>
            <span>{notes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>链接总数</span>
            <span>{wikiLinks.length}</span>
          </div>
          <div className="flex justify-between">
            <span>分类总数</span>
            <span>{categories.length}</span>
          </div>
          <div className="flex justify-between">
            <span>网络密度</span>
            <span>{density.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
