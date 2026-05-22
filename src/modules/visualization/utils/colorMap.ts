/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

const CATEGORY_COLORS = [
  "#4faa70",
  "#5b9bd5",
  "#e8a838",
  "#d4584a",
  "#9b6fb5",
  "#45b5a0",
  "#d4869e",
  "#7cb850",
  "#6a8fd8",
  "#c9973b",
];

const CATEGORY_COLORS_DARK = [
  "#5fc085",
  "#6baee0",
  "#f0b848",
  "#e06858",
  "#b080d0",
  "#50ccB0",
  "#e098b0",
  "#8cd060",
  "#7aa0e8",
  "#d8a848",
];

const colorCache = new Map<string, string>();

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCategoryColor(category: string): string {
  if (!category) return CATEGORY_COLORS[0];

  const cached = colorCache.get(category);
  if (cached) return cached;

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark";
  const palette = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;

  const index = hashString(category) % palette.length;
  const color = palette[index];
  colorCache.set(category, color);
  return color;
}

export function getCategoryColorWithOpacity(
  category: string,
  opacity: number,
): string {
  const hex = getCategoryColor(category);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function getMixedColor(color1: string, color2: string): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function clearColorCache(): void {
  colorCache.clear();
}
