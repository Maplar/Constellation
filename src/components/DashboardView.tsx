/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useRef, useState, useEffect, useCallback, type DragEvent } from "react";
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
import { SummaryStatsCardContent } from "../modules/visualization/components/cards/SummaryStatsCard";
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
    case "summary-stats":
      return <SummaryStatsCardContent />;
    default:
      return <div className="p-4 text-[12px]" style={{ color: "var(--text-muted)" }}>未知组件</div>;
  }
}

export function DashboardView() {
  const cards = useVisualizationStore((s) => s.cards);
  const removeCard = useVisualizationStore((s) => s.removeCard);
  const reorderCards = useVisualizationStore((s) => s.reorderCards);
  const isEditingDashboard = useAppModeStore((s) => s.isEditingDashboard);

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
              editing={isEditingDashboard}
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

          {/* Inline controls — visible when editing */}
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
                  onClick={handleSaveLayout}
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
                  保存布局
                </button>
              </div>
              {toast && (
                <div
                  className="fixed z-50 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 animate-fade-in"
                  style={{
                    bottom: 32,
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#3a7d5e",
                    color: "#fff",
                    boxShadow: "0 4px 16px rgba(58,125,94,0.35)",
                  }}
                >
                  {toast}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resolved: old fixed-position edit/+add/save buttons deleted — moved to TopBar + inline grid */}

      {/* Drawer */}
      <AddComponentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
