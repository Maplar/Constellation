/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：可排序毛玻璃仪表盘卡片
 */

import { type ReactNode, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardWidth } from "../modules/visualization/stores/useVisualizationStore";

interface SortableDashboardCardProps {
  id: string;
  title: string;
  width: CardWidth;
  onClose?: (id: string) => void;
  children?: ReactNode;
  editing?: boolean;
  onWidthChange?: (width: CardWidth) => void;
}

export function SortableDashboardCard({
  id,
  title,
  width,
  onClose,
  children,
  editing = false,
  onWidthChange,
}: SortableDashboardCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: width === "full" ? "1 / -1" : undefined,
    minHeight: 280,
    cursor: isDragging ? "grabbing" : undefined,
  };

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

  const showClose = editing || isHovered;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-card flex flex-col overflow-hidden transition-shadow duration-200 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setConfirmDelete(false);
      }}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="drag-handle absolute top-2.5 left-2.5 z-10 p-1 rounded"
        aria-label="拖拽排序"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="9" cy="5" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200"
        style={{
          opacity: showClose ? 1 : 0,
          backgroundColor: editing
            ? "#c0392b"
            : confirmDelete
              ? "#c0392b"
              : "rgba(192, 57, 43, 0.15)",
          color: editing ? "#fff" : confirmDelete ? "#fff" : "#c0392b",
          transform: showClose ? "scale(1)" : "scale(0.7)",
          pointerEvents: showClose ? "auto" : "none",
        }}
        title={editing ? "删除卡片" : confirmDelete ? "确认删除" : "移除卡片"}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* 标题栏 */}
      <div
        className="shrink-0 flex items-center justify-between px-3 h-9 border-b"
        style={{ borderColor: "var(--border)", paddingLeft: 28 }}
      >
        <span
          className="text-[13px] font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
        {editing && (
          <button
            type="button"
            onClick={() => onWidthChange?.(width === "full" ? "half" : "full")}
            className="mr-7 rounded-md border border-paper-deep/50 px-2 py-0.5 text-[10px] text-ink-faint hover:text-bamboo"
          >
            {width === "full" ? "半宽" : "全宽"}
          </button>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
