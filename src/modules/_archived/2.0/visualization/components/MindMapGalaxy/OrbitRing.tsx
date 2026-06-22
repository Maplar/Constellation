/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 轨道环 — React SVG 组件
 * 虚线圆，围绕恒星节点展示行星轨道
 */

interface OrbitRingProps {
  cx: number;
  cy: number;
  radius: number;
}

export function OrbitRing({ cx, cy, radius }: OrbitRingProps) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill="none"
      stroke="var(--border)"
      strokeWidth={0.5}
      strokeDasharray="4 4"
      opacity={0.4}
    />
  );
}
