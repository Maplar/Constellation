/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect } from "react";
import { useVisualizationStore } from "../stores/useVisualizationStore";
import type { CardType } from "../stores/useVisualizationStore";

/* ── Card metadata ── */

interface CardMeta {
  type: CardType;
  title: string;
  icon: React.ReactNode;
  description: string;
  previewImage?: string;
}

const CARD_METAS: CardMeta[] = [
  {
    type: "relation-graph",
    title: "文件关系图",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
        <path d="M8.5 7.5L15.5 16.5M15.5 7.5L8.5 16.5" />
      </svg>
    ),
    description: "基于 d3-force 的力导向节点关系网络",
  },
  {
    type: "mindmap-galaxy",
    title: "思维导图星系",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
      </svg>
    ),
    description: "恒星·行星·轨道线构成的星系视图",
  },
  {
    type: "citation-bubble",
    title: "引用气泡图",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="5" /><circle cx="17" cy="7" r="3" /><circle cx="14" cy="15" r="4" /><circle cx="6" cy="17" r="2.5" />
      </svg>
    ),
    description: "按分类分组的圆形打包气泡图",
  },
  {
    type: "category-distribution",
    title: "分类分布",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 6.36 15.36L12 12V3Z" />
      </svg>
    ),
    description: "笔记分类占比环形统计图",
  },
  {
    type: "citation-ranking",
    title: "引用排行",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4" /><path d="M6 13h12M10 9h4M8 5h8" />
      </svg>
    ),
    description: "被引用次数最多的笔记排行",
  },
  {
    type: "note-stats",
    title: "笔记统计",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 12h8M8 8h5M8 16h5" />
      </svg>
    ),
    description: "笔记总数概览",
  },
  {
    type: "link-stats",
    title: "链接统计",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    description: "Wiki-Link 链接总数",
  },
  {
    type: "summary-stats",
    title: "统计概览",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    description: "笔记总数·链接总数·分类总数一览",
  },
];

/* ── AddComponentDrawer ── */

export interface AddComponentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard?: (type: CardType) => void;
}

export function AddComponentDrawer({ isOpen, onClose, onAddCard }: AddComponentDrawerProps) {
  const cards = useVisualizationStore((s) => s.cards);
  const addCard = useVisualizationStore((s) => s.addCard);

  const addedTypes = new Set(cards.map((c) => c.type));
  const availableItems = CARD_METAS.filter((m) => !addedTypes.has(m.type));

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleAdd = (type: CardType) => {
    const added = addCard(type);
    if (added) {
      onAddCard?.(type);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed z-50 transition-opacity duration-300"
        style={{
          top: 48,
          left: 0,
          right: 0,
          height: "calc(100vh - 48px)",
          backgroundColor: isOpen ? "rgba(0,0,0,0.4)" : "transparent",
          pointerEvents: isOpen ? "auto" : "none",
          opacity: isOpen ? 1 : 0,
        }}
      />

      {/* Drawer panel */}
      <div
        className="fixed z-50 overflow-y-auto transition-transform ease-out"
        style={{
          top: 48,
          right: 0,
          width: 320,
          height: "calc(100vh - 48px)",
          backgroundColor: "#ffffff",
          boxShadow: isOpen ? "-8px 0 30px rgba(0,0,0,0.12)" : "none",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transitionDuration: "350ms",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-14 shrink-0"
          style={{ borderBottom: "1px solid #e5e1d8" }}
        >
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: "#2d2d2a" }}
          >
            添加组件
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-[#f5f2eb]"
            style={{ color: "#8a857a" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card list */}
        <div className="p-4 flex flex-col gap-4">
          {availableItems.length === 0 ? (
            <div className="text-center py-12 text-[13px]" style={{ color: "#aaa69c" }}>
              <div className="mb-2">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mx-auto opacity-40">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M8 12h8M12 8v8" />
                </svg>
              </div>
              所有组件已添加完毕
            </div>
          ) : (
            availableItems.map((item) => (
              <button
                key={item.type}
                onClick={() => handleAdd(item.type)}
                className="text-left w-full flex items-center gap-3 p-3 cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e1d8",
                  borderRadius: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3a7d5e";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(58,125,94,0.12)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e1d8";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#eaf5ef", color: "#3a7d5e" }}
                >
                  {item.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: "#2d2d2a" }}>
                    {item.title}
                  </div>
                  <div className="text-[11px] mt-0.5 truncate" style={{ color: "#aaa69c" }}>
                    {item.description}
                  </div>
                </div>

                {/* Add button */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200"
                  style={{ backgroundColor: "#3a7d5e", color: "#fff" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
