/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import type { Platform, DeviceType } from './types';

/**
 * 通过 UA 检测获取当前平台。
 * 同时适用于 Tauri WebView 和普通浏览器（开发模式）。
 */
export function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();

  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/win/i.test(ua)) return 'windows';
  if (/mac/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';

  return 'unknown';
}

/**
 * 通过 UA 和屏幕尺寸判断设备类别。
 */
export function detectDeviceType(): DeviceType {
  const { userAgent } = navigator;
  const isMobileUA = /android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTabletUA = /ipad|android(?!.*mobile)/i.test(userAgent);
  const width = window.innerWidth;

  if (isTabletUA || (isMobileUA && width >= 768)) {
    return 'tablet';
  }
  if (isMobileUA || width < 768) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * 检测设备是否支持触控。
 */
export function detectTouch(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error msMaxTouchPoints is IE/Edge legacy
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * 获取当前平台（同步版本，使用 UA 检测）。
 * 用于需要在渲染前同步获取平台信息的场景。
 */
export function getPlatform(): Platform {
  return detectPlatform();
}

/**
 * 同步判断是否为移动端。
 */
export function isMobile(): boolean {
  const dt = detectDeviceType();
  return dt === 'mobile' || dt === 'tablet';
}

/**
 * 同步判断是否为桌面端。
 */
export function isDesktop(): boolean {
  return detectDeviceType() === 'desktop';
}

/**
 * 是否为 Tauri 环境。优先使用 Tauri API，失败时回退到 window.__TAURI__ 检查。
 */
export function isTauriEnv(): boolean {
  try {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  } catch {
    return false;
  }
}

/**
 * 平板断点宽度（px）。
 */
export const TABLET_BREAKPOINT = 768;

/**
 * 移动端触摸目标最小尺寸（px），符合 WCAG 2.5.5 Target Size 建议。
 */
export const MIN_TOUCH_SIZE = 44;
