/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 行星节点渲染 — D3 SVG 辅助模块
 */

import * as d3 from "d3";
import type { GalaxyNode } from "../../hooks/useGalaxyLayout";
import { getCategoryColorWithOpacity } from "../../utils/colorMap";

export interface PlanetNodeConfig {
  focusedCategory: string | null;
  searchQuery: string;
  matchIds: Set<string>;
  isDark: boolean;
}

/**
 * 渲染行星（笔记节点）的圆形 + 标签
 */
export function renderPlanetNodes(
  selection: d3.Selection<SVGGElement, GalaxyNode, SVGGElement, unknown>,
  config: PlanetNodeConfig,
) {
  const { focusedCategory, searchQuery, matchIds } = config;

  selection
    .select<SVGCircleElement>("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => getCategoryColorWithOpacity(d.categoryId, 0.6))
    .attr("stroke", (d) => d.color)
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.5)
    .attr("opacity", (d) => {
      if (focusedCategory) {
        return d.categoryId === focusedCategory ? 1 : 0.15;
      }
      if (searchQuery) {
        return matchIds.has(d.id) ? 1 : 0.2;
      }
      return 1;
    });

  selection
    .select<SVGTextElement>("text")
    .text((d) => (d.label.length > 12 ? d.label.slice(0, 12) + "…" : d.label))
    .attr("dy", (d) => d.radius + 14)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("font-weight", "400")
    .attr("fill", config.isDark ? "#e5e1da" : "#1a1a18")
    .attr("font-family", '"Noto Sans SC", sans-serif')
    .attr("opacity", (d) => {
      if (focusedCategory) {
        return d.categoryId === focusedCategory ? 0.9 : 0.05;
      }
      if (searchQuery) {
        return matchIds.has(d.id) ? 0.9 : 0.05;
      }
      return d.val >= 3 ? 0.9 : 0;
    });
}
