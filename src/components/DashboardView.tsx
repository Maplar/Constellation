/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useRef, useState, useEffect, useMemo, useCallback, type DragEvent } from "react";
import { useVisualizationStore } from "../modules/visualization/stores/useVisualizationStore";
import { useNoteStore } from "../modules/notes/stores/useNoteStore";
import { useAppModeStore } from "../modules/shared/stores/useAppModeStore";
import { DashboardCard } from "./DashboardCard";
import { AddComponentDrawer } from "../modules/visualization/components/AddComponentDrawer";
import { RelationGraphCardContent } from "../modules/visualization/components/cards/RelationGraphCard";
import { GalaxyCardContent } from "../modules/visualization/components/cards/GalaxyCard";
import { CategoryDonutCardContent } from "../modules/visualization/components/cards/CategoryDonutCard";
import { CitationRankingCardContent } from "../modules/visualization/components/cards/CitationRankingCard";
import { CitationBubbleCardContent } from "../modules/visualization/components/cards/CitationBubbleCard";
import type { CardType } from "../modules/visualization/stores/useVisualizationStore";

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
  const { notesMetadata, wikiLinks } = useNoteStore();

  switch (type) {
    case "relation-graph":
      return <RelationGraphCardContent />;
    case "mindmap-galaxy":
      return <GalaxyCardContent />;
    case "note-stats":
      return <StatCardContent value={notesMetadata.length} label="笔记总数" />;
    case "link-stats":
      return <StatCardContent value={wikiLinks.length} label="链接总数" />;
    case "category-distribution":
      return <CategoryDonutCardContent />;
    case "citation-ranking":
      return <CitationRankingCardContent />;
    case "citation-bubble":
      return <CitationBubbleCardContent />;
    default:
      return <div className="p-4 text-[12px]" style={{ color: "var(--text-muted)" }}>未知组件</div>;
  }
}

export function DashboardView() {
  const cards = useVisualizationStore((s) => s.cards);
  const removeCard = useVisualizationStore((s) => s.removeCard);
  const reorderCards = useVisualizationStore((s) => s.reorderCards);
  const { mode } = useAppModeStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [numCols, setNumCols] = useState(3);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((_e: DragEvent<HTMLDivElement>, id: string) => {
    setDragId(id);
  }, []);

  const handleDragOver = useCallback((_e: DragEvent<HTMLDivElement>, id: string) => {
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback((_e: DragEvent<HTMLDivElement>, id: string) => {
    if (!dragId || dragId === id) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = cards.findIndex((c) => c.id === dragId);
    const toIdx = cards.findIndex((c) => c.id === id);
    if (fromIdx !== -1 && toIdx !== -1) {
      reorderCards(fromIdx, toIdx);
    }
    setDragId(null);
    setDragOverId(null);
  }, [dragId, cards, reorderCards]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

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

  const handleSaveLayout = useCallback(() => {
    setToast("布局已保存");
    setTimeout(() => setToast(null), 1800);
  }, []);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SummaryBar />

        <div
          className="grid p-6"
          style={{ gap: 20, gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
        >
          {cards.map((card) => (
            <DashboardCard
              key={card.id}
              id={card.id}
              title={card.title}
              width={card.width}
              draggable
              isDragging={dragId === card.id}
              isDragOver={dragOverId === card.id}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onClose={(id) => removeCard(id)}
            >
              <CardContentSwitcher type={card.type} />
            </DashboardCard>
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
        </div>
      </div>

      {/* Edit button — visible only in dashboard mode */}
      {mode !== "edit" && (
        <button
          onClick={() => useAppModeStore.getState().setMode("edit")}
          className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-white shadow-md border border-[#e5e1d8] hover:bg-[#eaf5ef] flex items-center justify-center transition-colors duration-200 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3a7d5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* Circular Add Button — fixed position below topbar */}
      {mode === "edit" && (
        <>
          <button
            onClick={() => setDrawerOpen(true)}
            className="fixed z-30 flex items-center justify-center transition-all duration-300 ease-out cursor-pointer"
            style={{
              top: 64,
              right: 24,
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#3a7d5e",
              boxShadow: "0 2px 12px rgba(58,125,94,0.35)",
              border: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(58,125,94,0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(58,125,94,0.35)";
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {/* Circular Save Button */}
          <button
            onClick={handleSaveLayout}
            className="fixed z-30 flex items-center justify-center transition-all duration-300 ease-out cursor-pointer"
            style={{
              top: 64,
              right: 84,
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "transparent",
              boxShadow: "none",
              border: "2px solid #3a7d5e",
              color: "#3a7d5e",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.backgroundColor = "#eaf5ef";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17,21 17,13 7,13 7,21" />
              <polyline points="7,3 7,8 15,8" />
            </svg>
          </button>

          {/* Toast */}
          {toast && (
            <div
              className="fixed z-50 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 animate-fade-in"
              style={{
                top: 64,
                right: 144,
                backgroundColor: "#3a7d5e",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(58,125,94,0.35)",
              }}
            >
              {toast}
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      <AddComponentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function SummaryBar() {
  const { notesMetadata, wikiLinks } = useNoteStore();

  const categoryCount = useMemo(() => {
    const set = new Set(notesMetadata.map((n) => n.category || "未分类"));
    return set.size;
  }, [notesMetadata]);

  const stats = [
    { label: "笔记总数", value: notesMetadata.length },
    { label: "链接总数", value: wikiLinks.length },
    { label: "分类总数", value: categoryCount },
  ];

  return (
    <div
      className="shrink-0 flex items-center gap-6 px-4 h-16 border-b mx-6 mt-6 rounded-xl"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: "var(--accent)" }} />
          <div>
            <div className="text-[20px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>
              {s.value}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
