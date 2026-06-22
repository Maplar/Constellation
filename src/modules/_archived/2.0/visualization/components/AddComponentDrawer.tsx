/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect } from "react";
import {
  CARD_CATALOG,
  useVisualizationStore,
  type CardType,
} from "../stores/useVisualizationStore";

export interface AddComponentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard?: (type: CardType) => void;
}

export function AddComponentDrawer({ isOpen, onClose, onAddCard }: AddComponentDrawerProps) {
  const cards = useVisualizationStore((state) => state.cards);
  const addCard = useVisualizationStore((state) => state.addCard);
  const addedTypes = new Set(cards.map((card) => card.type));
  const availableItems = CARD_CATALOG.filter((item) => !addedTypes.has(item.type));

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleAdd = (type: CardType) => {
    if (addCard(type)) {
      onAddCard?.(type);
      onClose();
    }
  };

  return (
    <>
      <button
        aria-label="关闭组件抽屉"
        onClick={onClose}
        className="fixed inset-0 z-50 transition-opacity"
        style={{
          top: 48,
          backgroundColor: "rgba(0,0,0,0.35)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />
      <aside
        className="fixed right-0 z-50 w-80 overflow-y-auto border-l transition-transform duration-300"
        style={{
          top: 48,
          height: "calc(100vh - 48px)",
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <header className="flex h-14 items-center justify-between border-b px-5" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>添加组件</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>构建你的知识回顾工作台</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg cursor-pointer" style={{ color: "var(--text-muted)" }}>×</button>
        </header>
        <div className="flex flex-col gap-3 p-4">
          {availableItems.map((item) => (
            <button
              key={item.type}
              onClick={() => handleAdd(item.type)}
              className="flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-mono" style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}>
                {item.icon.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</span>
                <span className="block truncate text-[11px]" style={{ color: "var(--text-muted)" }}>{descriptionFor(item.type)}</span>
              </span>
              <span style={{ color: "var(--accent)" }}>+</span>
            </button>
          ))}
          {availableItems.length === 0 && (
            <div className="py-12 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>所有组件都已添加</div>
          )}
        </div>
      </aside>
    </>
  );
}

function descriptionFor(type: CardType): string {
  if (type === "suggestion-inbox") return "确认、拒绝或批量处理 AI 整理建议";
  if (type === "workspace-diagnostics") return "检查失效引用、重复 UUID、冲突与大型文件";
  const descriptions: Partial<Record<CardType, string>> = {
    "relation-graph": "按文件夹颜色聚类的显式引用网络",
    "quick-capture": "打开快捷便签，立即记录一个碎片",
    "recent-notes": "回到最近编辑的知识碎片",
    "random-note": "随机重新发现一条旧记录",
    "orphan-notes": "找出尚未建立引用的孤立碎片",
    "ai-status": "查看全文索引和 AI 服务状态",
    "note-stats": "知识库文件总数",
    "link-stats": "显式引用关系总数",
    "category-distribution": "文件夹中的笔记分布",
    "citation-ranking": "被引用最多的知识节点",
    "summary-stats": "笔记、引用与文件夹概览",
  };
  return descriptions[type] ?? "工作区卡片";
}
