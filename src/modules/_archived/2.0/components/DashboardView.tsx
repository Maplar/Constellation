/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：v3.5 重构 — 集成 @dnd-kit 拖拽，应用毛玻璃卡片风格
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useVisualizationStore } from "../modules/visualization/stores/useVisualizationStore";
import { useNoteStore } from "../modules/notes/stores/useNoteStore";
import { useAppModeStore } from "../modules/shared/stores/useAppModeStore";
import { SortableDashboardCard } from "./SortableDashboardCard";
import { AddComponentDrawer } from "../modules/visualization/components/AddComponentDrawer";
import { RelationGraphCardContent } from "../modules/visualization/components/cards/RelationGraphCard";
import { CategoryDonutCardContent } from "../modules/visualization/components/cards/CategoryDonutCard";
import { CitationRankingCardContent } from "../modules/visualization/components/cards/CitationRankingCard";
import { SummaryStatsCardContent } from "../modules/visualization/components/cards/SummaryStatsCard";
import type { CardType } from "../modules/visualization/stores/useVisualizationStore";
import { openNotepadWindow } from "../modules/windows/api";
import { listen } from "@tauri-apps/api/event";
import { getConfig } from "../modules/settings/api";
import { DashboardCardBoundary } from "./DashboardCardBoundary";
import {
  getWorkspaceDiagnostics,
  applySuggestion,
  listSuggestions,
  setSuggestionStatus,
  type SuggestionRecord,
  type WorkspaceDiagnostics,
} from "../core-client";

function gridCols(width: number): number {
  if (width < 750) return 1;
  if (width < 1200) return 2;
  return 3;
}

function StatCardContent({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 h-full">
      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: "var(--accent)" }} />
      <div>
        <div className="text-[28px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</div>
        <div className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>{label}</div>
      </div>
    </div>
  );
}

function CardContentSwitcher({ type }: { type: CardType }) {
  const { notesMetadata, linkGraph, selectNote } = useNoteStore();

  switch (type) {
    case "relation-graph":
      return <RelationGraphCardContent />;
    case "quick-capture":
      return <ActionCard title="记录此刻的想法" description="打开独立快捷便签，保存后自动进入知识库。" action="开始记录" onClick={() => void openNotepadWindow()} />;
    case "recent-notes":
      return <NoteListCard notes={notesMetadata.slice(0, 6)} onSelect={selectNote} empty="还没有最近编辑的笔记" />;
    case "random-note": {
      const daySeed = Math.floor(Date.now() / 86_400_000);
      const random = notesMetadata.length > 0 ? notesMetadata[daySeed % notesMetadata.length] : undefined;
      return random
        ? <ActionCard title={random.title} description={random.preview || random.category || "重新看看这条碎片"} action="打开笔记" onClick={() => selectNote(random.id)} />
        : <EmptyCard text="记录第一条碎片后，这里会带你随机漫游。" />;
    }
    case "orphan-notes": {
      const connected = new Set(linkGraph.edges.flatMap((edge) => [edge.source, edge.target]));
      return <NoteListCard notes={notesMetadata.filter((note) => !connected.has(note.id)).slice(0, 6)} onSelect={selectNote} empty="很好，当前没有孤立碎片" />;
    }
    case "ai-status":
      return <StatusCard noteCount={notesMetadata.length} edgeCount={linkGraph.edges.length} />;
    case "note-stats":
      return <StatCardContent value={notesMetadata.length} label="笔记总数" />;
    case "link-stats":
      return <StatCardContent value={linkGraph.edges.length} label="链接总数" />;
    case "category-distribution":
      return <CategoryDonutCardContent />;
    case "citation-ranking":
      return <CitationRankingCardContent />;
    case "summary-stats":
      return <SummaryStatsCardContent />;
    case "suggestion-inbox":
      return <SuggestionInboxCard />;
    case "workspace-diagnostics":
      return <WorkspaceDiagnosticsCard />;
    default:
      return <div className="p-4 text-[12px]" style={{ color: "var(--text-muted)" }}>未知组件</div>;
  }
}

function SuggestionInboxCard() {
  const [items, setItems] = useState<SuggestionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setError(null);
    void listSuggestions("pending").then(setItems).catch((reason) => setError(String(reason)));
  }, []);
  useEffect(refresh, [refresh]);
  if (error) return <AsyncCardError message={error} onRetry={refresh} />;
  if (items.length === 0) return <EmptyCard text="当前没有待确认的 AI 建议" />;

  const update = (id: string, status: "accepted" | "rejected") => {
    const request =
      status === "accepted" ? applySuggestion(id) : setSuggestionStatus(id, status);
    void request
      .then(() => setItems((current) => current.filter((item) => item.id !== id)))
      .catch((reason) => setError(String(reason)));
  };
  return (
    <div className="h-full overflow-y-auto p-3">
      {items.map((item) => (
        <div key={item.id} className="mb-2 rounded-xl border border-paper-deep/40 p-3">
          <div className="text-[12px] font-medium text-ink">{item.suggestionType}</div>
          <div className="mt-1 truncate text-[10px] font-mono text-ink-faint">
            {item.documentId}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => update(item.id, "accepted")}
              className="rounded-lg bg-bamboo px-3 py-1 text-[10px] text-white"
            >
              接受
            </button>
            <button
              type="button"
              onClick={() => update(item.id, "rejected")}
              className="rounded-lg border border-paper-deep/50 px-3 py-1 text-[10px] text-ink-soft"
            >
              拒绝
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkspaceDiagnosticsCard() {
  const [diagnostics, setDiagnostics] = useState<WorkspaceDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setError(null);
    void getWorkspaceDiagnostics().then(setDiagnostics).catch((reason) => setError(String(reason)));
  }, []);
  useEffect(refresh, [refresh]);
  if (error) return <AsyncCardError message={error} onRetry={refresh} />;
  if (!diagnostics) return <EmptyCard text="正在诊断知识库..." />;
  const rows: Array<[string, number]> = [
    ["文件", diagnostics.fileCount],
    ["孤立笔记", diagnostics.isolatedNotes.length],
    ["失效引用", diagnostics.brokenReferences.length],
    ["重复 UUID", diagnostics.duplicateIds.length],
    ["冲突文件", diagnostics.conflictFiles.length],
    ["超大文件", diagnostics.largeFiles.length],
  ];
  return (
    <div className="grid h-full grid-cols-2 gap-2 p-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-paper-warm/60 p-3">
          <div className="text-[10px] text-ink-faint">{label}</div>
          <div className="mt-1 text-[20px] font-semibold text-ink">{value}</div>
        </div>
      ))}
      <button
        type="button"
        onClick={refresh}
        className="col-span-2 rounded-lg border border-bamboo/40 py-1.5 text-[10px] text-bamboo"
      >
        重新诊断
      </button>
    </div>
  );
}

function AsyncCardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-[11px] text-red-500">{message}</p>
      <button type="button" onClick={onRetry} className="text-[11px] text-bamboo underline">
        重试
      </button>
    </div>
  );
}

function ActionCard({ title, description, action, onClick }: { title: string; description: string; action: string; onClick: () => void }) {
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <div>
        <div className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>{title}</div>
        <p className="mt-2 text-[12px] leading-5" style={{ color: "var(--text-secondary)" }}>{description}</p>
      </div>
      <button onClick={onClick} className="self-start rounded-lg px-4 py-2 text-[12px] cursor-pointer" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>{action}</button>
    </div>
  );
}

function NoteListCard({ notes, onSelect, empty }: { notes: Array<{ id: string; title: string; category: string; updatedAt: string }>; onSelect: (id: string) => void; empty: string }) {
  if (notes.length === 0) return <EmptyCard text={empty} />;
  return (
    <div className="h-full overflow-y-auto p-2">
      {notes.map((note) => (
        <button key={note.id} onClick={() => onSelect(note.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left cursor-pointer hover:bg-paper-warm/60">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
          <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "var(--text-primary)" }}>{note.title}</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{note.category || "未分类"}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center px-5 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>{text}</div>;
}

function StatusCard({ noteCount, edgeCount }: { noteCount: number; edgeCount: number }) {
  return (
    <div className="grid h-full grid-cols-2 gap-3 p-4">
      <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-hover)" }}>
        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>全文索引</div>
        <div className="mt-2 text-[13px] font-medium" style={{ color: "var(--accent)" }}>Tantivy 就绪</div>
        <div className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>{noteCount} 篇文档</div>
      </div>
      <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-hover)" }}>
        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>引用索引</div>
        <div className="mt-2 text-[13px] font-medium" style={{ color: "var(--accent)" }}>Rust Core</div>
        <div className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>{edgeCount} 条关系</div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const cards = useVisualizationStore((s) => s.cards);
  const removeCard = useVisualizationStore((s) => s.removeCard);
  const reorderCards = useVisualizationStore((s) => s.reorderCards);
  const setCardWidth = useVisualizationStore((s) => s.setCardWidth);
  const isEditingDashboard = useAppModeStore((s) => s.isEditingDashboard);

  const containerRef = useRef<HTMLDivElement>(null);
  const [numCols, setNumCols] = useState(3);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const resetLayout = useVisualizationStore((s) => s.resetLayout);
  const setWorkspace = useVisualizationStore((s) => s.setWorkspace);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = cards.findIndex((c) => c.id === active.id);
      const newIndex = cards.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderCards(oldIndex, newIndex);
      }
    },
    [cards, reorderCards]
  );

  const updateCols = useCallback(() => {
    if (containerRef.current) {
      setNumCols(gridCols(containerRef.current.clientWidth - 48));
    }
  }, []);

  useEffect(() => {
    updateCols();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateCols());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateCols]);

  useEffect(() => {
    void getConfig().then((config) => setWorkspace(config.notesDir));
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<{ path: string }>("workspace-changed", (event) => {
      setWorkspace(event.payload.path);
    }).then((dispose) => {
      if (disposed) dispose();
      else unlisten = dispose;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [setWorkspace]);

  const cardIds = cards.map((c) => c.id);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
      style={{ backgroundColor: "var(--bg-dashboard)" }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cardIds} strategy={rectSortingStrategy}>
            <div
              className="dashboard-grid"
              style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
            >
              {cards.map((card) => (
                <SortableDashboardCard
                  key={card.id}
                  id={card.id}
                  title={card.title}
                  width={card.width}
                  editing={isEditingDashboard}
                  onClose={(id) => removeCard(id)}
                  onWidthChange={(width) => setCardWidth(card.id, width)}
                >
                  <DashboardCardBoundary>
                    <CardContentSwitcher type={card.type} />
                  </DashboardCardBoundary>
                </SortableDashboardCard>
              ))}

              {cards.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4">
                  <div style={{ color: "var(--text-muted)", opacity: 0.3 }}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </div>
                  <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                    仪表盘为空，点击右上角 + 添加组件
                  </span>
                </div>
              )}

              <div className="col-span-full h-16" />

              {isEditingDashboard && (
                <div className="col-span-full">
                  <div className="flex items-center justify-center gap-3 pb-6">
                    <button
                      onClick={() => setDrawerOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer"
                      style={{
                        backgroundColor: "#3a7d5e",
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(58,125,94,0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 16px rgba(58,125,94,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(58,125,94,0.3)";
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      添加组件
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("恢复默认仪表盘布局？当前卡片排列将被替换。")) {
                          resetLayout();
                        }
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer"
                      style={{
                        color: "#3a7d5e",
                        border: "1.5px solid #3a7d5e",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.backgroundColor = "#eaf5ef";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17,21 17,13 7,13 7,21" />
                        <polyline points="7,3 7,8 15,8" />
                      </svg>
                      恢复默认布局
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <AddComponentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
