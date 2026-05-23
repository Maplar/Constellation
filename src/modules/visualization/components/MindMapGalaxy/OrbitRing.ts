/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 轨道线渲染 — D3 SVG 辅助模块
 */

import * as d3 from "d3";
import type { GalaxyNode } from "../../hooks/useGalaxyLayout";

/**
 * 在分类恒星周围绘制虚线轨道环
 */
export function renderOrbitRings(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  categoryNodes: GalaxyNode[],
  isDark: boolean,
) {
  const orbitGroup = g.append("g").attr("class", "orbit-rings");

  for (const cat of categoryNodes) {
    const orbitRadius = cat.radius * 3.5;
    orbitGroup
      .append("circle")
      .attr("cx", cat.x)
      .attr("cy", cat.y)
      .attr("r", orbitRadius)
      .attr("fill", "none")
      .attr("stroke", isDark ? "#333" : "#ddd")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "4,6")
      .attr("opacity", 0.4);
  }

  return orbitGroup;
}
