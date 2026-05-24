/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 行星（笔记）节点 — React SVG 组件
 * - 半径按引用次数映射 6~18px
 * - 填充色同所属分类颜色，白色描边
 * - hover 原生 SVG <title> 显示笔记标题
 * - 点击触发 onClick 回调传出笔记 ID
 */

import { useCallback } from "react";
import * as d3 from "d3";

interface PlanetNodeProps {
  noteId: string;
  title: string;
  color: string;
  cx: number;
  cy: number;
  val: number;
  maxVal: number;
  onClick?: (noteId: string) => void;
}

/** val → radius，线性映射 6~18px */
const radiusScale = d3.scaleLinear().domain([0, 1]).range([6, 18]).clamp(true);

export function PlanetNode({
  noteId,
  title,
  color,
  cx,
  cy,
  val,
  maxVal,
  onClick,
}: PlanetNodeProps) {
  radiusScale.domain([0, Math.max(maxVal, 1)]);
  const r = radiusScale(val);

  const handleClick = useCallback(() => {
    onClick?.(noteId);
  }, [onClick, noteId]);

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      cursor="pointer"
      onClick={handleClick}
    >
      <title>{title}</title>
      <circle
        r={r}
        fill={color}
        stroke="#ffffff"
        strokeWidth={1.5}
        style={{ transition: "r 0.15s ease" }}
      />
    </g>
  );
}
