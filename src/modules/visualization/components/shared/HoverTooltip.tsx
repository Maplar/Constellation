/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { getCategoryColor } from "../../utils/colorMap";

interface HoverTooltipProps {
  x: number;
  y: number;
  label: string;
  category: string;
  val: number;
  extra?: string;
}

export function HoverTooltip({ x, y, label, category, val, extra }: HoverTooltipProps) {
  return (
    <div
      className="absolute pointer-events-none z-20 px-3 py-2"
      style={{
        left: x + 14,
        top: y - 44,
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-lg)",
        maxWidth: 240,
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
        <span className="truncate">{category} · 引用 {val} 次</span>
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
