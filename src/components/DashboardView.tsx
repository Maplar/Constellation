/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useRef, useState, useEffect, useMemo, useCallback, type DragEvent } from "react";
import { useVisualizationStore, CARD_CATALOG } from "../modules/visualization/stores/useVisualizationStore";
import type { CardType } from "../modules/visualization/stores/useVisualizationStore";
import { useNoteStore } from "../modules/notes/stores/useNoteStore";
import { DashboardCard } from "./DashboardCard";
import { RelationGraphCardContent } from "../modules/visualization/components/cards/RelationGraphCard";
import { GalaxyCardContent } from "../modules/visualization/components/cards/GalaxyCard";
import { CategoryDonutCardContent } from "../modules/visualization/components/cards/CategoryDonutCard";
import { CitationRankingCardContent } from "../modules/visualization/components/cards/CitationRankingCard";
import { StarClusterCardContent } from "../modules/visualization/components/cards/StarClusterCard";

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
    case "starcluster":
      return <StarClusterCardContent />;
    case "note-stats":
      return <StatCardContent value={notesMetadata.length} label="笔记总数" />;
    case "link-stats":
      return <StatCardContent value={wikiLinks.length} label="链接总数" />;
    case "category-distribution":
      return <CategoryDonutCardContent />;
    case "citation-ranking":
      return <CitationRankingCardContent />;
    default:
      return <div className="p-4 text-[12px]" style={{ color: "var(--text-muted)" }}>未知组件</div>;
  }
}

export function DashboardView() {
  const cards = useVisualizationStore((s) => s.cards);
  const addCard = useVisualizationStore((s) => s.addCard);
  const removeCard = useVisualizationStore((s) => s.removeCard);
  const reorderCards = useVisualizationStore((s) => s.reorderCards);

  const containerRef = useRef<HTMLDivElement>(null);
  const [numCols, setNumCols] = useState(3);
  const [showDropdown, setShowDropdown] = useState(false);

  // Drag state
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

  const addedTypes = new Set(cards.map((c) => c.type));
  const availableTypes = CARD_CATALOG.filter((c) => !addedTypes.has(c.type));

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
        </div>

        {/* Add card button + dropdown */}
        <div className="px-6 pb-6 relative">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="w-full py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 rounded-xl text-[13px]"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "2px dashed var(--border)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            添加组件
          </button>

          {showDropdown && availableTypes.length > 0 && (
            <div
              className="absolute bottom-full left-6 right-6 mb-1 z-50 animate-fade-in"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div className="p-1">
                {availableTypes.map((entry) => (
                  <button
                    key={entry.type}
                    onClick={() => {
                      addCard(entry.type);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-[13px] cursor-pointer transition-colors flex items-center gap-2"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span className="text-[10px] font-mono opacity-50" style={{ color: "var(--text-muted)" }}>
                      {entry.width === "full" ? " ■■" : " ■"}
                    </span>
                    {entry.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDropdown && availableTypes.length === 0 && (
            <div
              className="absolute bottom-full left-6 right-6 mb-1 z-50 p-3 text-[12px] text-center animate-fade-in"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-lg)",
                color: "var(--text-muted)",
              }}
            >
              所有组件已添加
            </div>
          )}
        </div>

        {showDropdown && (
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
        )}
      </div>
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
