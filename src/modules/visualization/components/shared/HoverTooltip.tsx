/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { getCategoryColor } from "../../utils/colorMap";

interface HoverTooltipProps {
  clientX: number;
  clientY: number;
  label: string;
  category: string;
  val: number;
  extra?: string;
  visible?: boolean;
}

const OFFSET = 14;
const EST_WIDTH = 220;
const EST_HEIGHT = 60;

export function HoverTooltip({
  clientX,
  clientY,
  label,
  category,
  val,
  extra,
  visible = true,
}: HoverTooltipProps) {
  let x = clientX + OFFSET;
  let y = clientY + OFFSET;

  if (typeof window !== "undefined") {
    if (x + EST_WIDTH > window.innerWidth) {
      x = clientX - EST_WIDTH - OFFSET;
    }
    if (y + EST_HEIGHT > window.innerHeight) {
      y = clientY - EST_HEIGHT - OFFSET;
    }
    if (x < 4) x = 4;
    if (y < 4) y = 4;
  }

  return (
    <div
      role="tooltip"
      aria-live="polite"
      aria-label={`${label}，${category}，引用 ${val} 次`}
      className="fixed pointer-events-none z-[9998] px-3 py-2"
      style={{
        left: x,
        top: y,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.15s ease",
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        maxWidth: 260,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div
        className="text-[12px] font-medium whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </div>
      <div
        className="text-[10px] flex items-center gap-2 mt-0.5"
        style={{ color: "var(--text-muted)" }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: getCategoryColor(category) }}
        />
        <span className="truncate">
          {category} · 引用 {val} 次
        </span>
      </div>
      {extra && (
        <div
          className="text-[10px] mt-1 truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {extra}
        </div>
      )}
    </div>
  );
}
