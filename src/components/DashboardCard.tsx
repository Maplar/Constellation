/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { type ReactNode, useState, type DragEvent } from "react";
import type { CardWidth } from "../modules/visualization/stores/useVisualizationStore";

export interface DashboardCardProps {
  id: string;
  title: string;
  width: CardWidth;
  onClose?: (id: string) => void;
  children?: ReactNode;
  editing?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd?: () => void;
}

export function DashboardCard({
  id,
  title,
  width,
  onClose,
  children,
  editing = false,
  draggable = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: DashboardCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const showClose = editing || isHovered;

  const handleClose = () => {
    if (editing) {
      onClose?.(id);
      return;
    }
    if (confirmDelete) {
      onClose?.(id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
        onDragStart?.(e, id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver?.(e, id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(e, id);
      }}
      onDragEnd={onDragEnd}
      className="flex flex-col overflow-hidden transition-all duration-200 relative"
      style={{
        minHeight: 280,
        backgroundColor: isDragOver
          ? "var(--accent-light)"
          : "var(--bg-secondary)",
        borderRadius: "var(--radius)",
        border: isDragOver
          ? `2px dashed var(--accent)`
          : "1px solid var(--border)",
        boxShadow: isDragging
          ? "var(--shadow-lg)"
          : isHovered
            ? "var(--shadow-md)"
            : "var(--shadow-sm)",
        opacity: isDragging ? 0.4 : 1,
        gridColumn: width === "full" ? "1 / -1" : undefined,
        cursor: draggable ? "grab" : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setConfirmDelete(false);
      }}
    >
      {/* Hover close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200"
        style={{
          opacity: showClose ? 1 : 0,
          backgroundColor: editing ? "#c0392b" : confirmDelete ? "#c0392b" : "rgba(192, 57, 43, 0.15)",
          color: editing ? "#fff" : confirmDelete ? "#fff" : "#c0392b",
          transform: showClose ? "scale(1)" : "scale(0.7)",
          pointerEvents: showClose ? "auto" : "none",
        }}
        title={editing ? "删除卡片" : confirmDelete ? "确认删除" : "移除卡片"}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Title bar */}
      <div
        className="shrink-0 flex items-center justify-between px-3 h-9 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
