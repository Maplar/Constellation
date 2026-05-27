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
let customCategoryColors: Record<string, string> = {};

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

  const custom = customCategoryColors[category];
  if (custom) return custom;

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

export function setCategoryColors(map: Record<string, string>): void {
  customCategoryColors = map;
  clearColorCache();
}

export function getCustomCategoryColors(): Record<string, string> {
  return customCategoryColors;
}

// ──────────────────────────────────────────────────────────────
// 颜色对比度工具函数（WCAG AA 标准）
// ──────────────────────────────────────────────────────────────

/**
 * 解析十六进制颜色为 RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/**
 * 计算相对亮度（WCAG 2.0）
 */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const [rv, gv, bv] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rv + 0.7152 * gv + 0.0722 * bv;
}

/**
 * 计算两个颜色之间的对比度
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 调整颜色亮度
 */
export function adjustBrightness(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const adjust = (c: number) => Math.min(255, Math.round(c * factor));

  const rr = adjust(r).toString(16).padStart(2, "0");
  const gg = adjust(g).toString(16).padStart(2, "0");
  const bb = adjust(b).toString(16).padStart(2, "0");

  return `#${rr}${gg}${bb}`;
}

/**
 * 获取适配当前主题的节点颜色（确保 3:1 对比度）
 * @param baseColor 基础颜色
 * @param bgColor 背景颜色（可选，默认根据主题自动检测）
 */
export function getAccessibleNodeColor(baseColor: string, bgColor?: string): string {
  if (typeof document === "undefined") return baseColor;

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const bg = bgColor || (isDark ? "#1a1a2e" : "#f5f5f5");
  const contrast = getContrastRatio(baseColor, bg);

  if (contrast >= 3.0) return baseColor;

  return isDark ? adjustBrightness(baseColor, 1.4) : adjustBrightness(baseColor, 0.7);
}

/**
 * 获取节点轮廓颜色（当对比度不足时添加轮廓）
 * @param baseColor 基础颜色
 * @param bgColor 背景颜色（可选）
 */
export function getAccessibleNodeStroke(baseColor: string, bgColor?: string): string {
  if (typeof document === "undefined") return "none";

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const bg = bgColor || (isDark ? "#1a1a2e" : "#f5f5f5");
  const contrast = getContrastRatio(baseColor, bg);

  if (contrast >= 3.0) return "none";

  return isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)";
}
