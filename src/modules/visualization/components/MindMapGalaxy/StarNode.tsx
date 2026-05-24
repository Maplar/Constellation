/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 恒星（分类）节点 — React SVG 组件
 * - 半径 30px 圆形，填充色按分类，白色描边 2px
 * - CSS 呼吸脉动动画 (pulse, 3s)
 * - 中心显示分类名称
 * - d3-drag 可拖拽
 * - 点击时触发 onFocus 回调
 */

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

interface StarNodeProps {
  categoryName: string;
  color: string;
  cx: number;
  cy: number;
  onFocus?: (categoryName: string) => void;
}

const STAR_RADIUS = 30;

export function StarNode({
  categoryName,
  color,
  cx,
  cy,
  onFocus,
}: StarNodeProps) {
  const gRef = useRef<SVGGElement>(null);

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark";

  const textColor = isDark ? "#e5e1da" : "#1a1a18";

  const handleClick = useCallback(() => {
    onFocus?.(categoryName);
  }, [onFocus, categoryName]);

  /* ── d3-drag 简单实现（不更新布局，只移动自身） ── */
  useEffect(() => {
    const el = gRef.current;
    if (!el) return;

    const drag = d3
      .drag<SVGGElement, unknown>()
      .on("drag", (event: d3.D3DragEvent<SVGGElement, unknown, unknown>) => {
        d3.select(el).attr(
          "transform",
          `translate(${event.x}, ${event.y})`,
        );
      });

    d3.select(el).call(drag);

    return () => {
      d3.select(el).on(".drag", null);
    };
  }, []);

  const truncated =
    categoryName.length > 8 ? categoryName.slice(0, 8) + "..." : categoryName;

  return (
    <g
      ref={gRef}
      transform={`translate(${cx}, ${cy})`}
      cursor="pointer"
      onClick={handleClick}
    >
      <circle
        r={STAR_RADIUS}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
        style={{
          animation: "star-pulse 3s ease-in-out infinite",
          transformOrigin: "center",
          transformBox: "fill-box",
        }}
      />
      <text
        dy={0}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill={textColor}
        fontFamily={'"Noto Sans SC", sans-serif'}
        dominantBaseline="central"
      >
        {truncated}
      </text>
    </g>
  );
}

/* ── 呼吸动画注入（挂载时插入一次） ── */

let styleInjected = false;

function injectPulseKeyframes() {
  if (styleInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes star-pulse {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}

injectPulseKeyframes();
