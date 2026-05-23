/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * 恒星节点渲染 — D3 SVG 辅助模块
 */

import * as d3 from "d3";
import type { GalaxyNode } from "../../hooks/useGalaxyLayout";
import { getCategoryColorWithOpacity } from "../../utils/colorMap";

export interface StarNodeConfig {
  focusedCategory: string | null;
  searchQuery: string;
  matchIds: Set<string>;
  isDark: boolean;
}

/**
 * 渲染恒星（分类节点）的圆形 + 脉冲光晕 + 标签
 */
export function renderStarNodes(
  selection: d3.Selection<SVGGElement, GalaxyNode, SVGGElement, unknown>,
  config: StarNodeConfig,
) {
  const { focusedCategory, searchQuery, matchIds } = config;

  selection
    .select<SVGCircleElement>("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => getCategoryColorWithOpacity(d.categoryId, 0.9))
    .attr("stroke", (d) => d.color)
    .attr("stroke-width", 3)
    .attr("stroke-opacity", 0.5)
    .attr("filter", (d) => `drop-shadow(0 0 12px ${d.color})`)
    .attr("opacity", (d) => {
      if (focusedCategory) {
        return d.categoryId === focusedCategory ? 1 : 0.2;
      }
      if (searchQuery) {
        return matchIds.has(d.id) ? 1 : 0.2;
      }
      return 1;
    });

  selection
    .select<SVGTextElement>("text")
    .text((d) => (d.label.length > 8 ? d.label.slice(0, 8) + "…" : d.label))
    .attr("dy", (d) => d.radius + 14)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("font-weight", "600")
    .attr("fill", config.isDark ? "#e5e1da" : "#1a1a18")
    .attr("font-family", '"Noto Sans SC", sans-serif')
    .attr("opacity", 0.95);
}
