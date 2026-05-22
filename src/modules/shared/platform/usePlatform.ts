/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { detectPlatform, detectDeviceType, detectTouch, isTauriEnv } from './index';
import type { PlatformInfo, Platform, DeviceType } from './types';

// ─── 窗口尺寸订阅（useSyncExternalStore 实现） ──────────────────────────────

function subscribeToResize(callback: () => void): () => void {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getSnapshotWidth(): number {
  return typeof window !== 'undefined' ? window.innerWidth : 1024;
}

function getSnapshotHeight(): number {
  return typeof window !== 'undefined' ? window.innerHeight : 768;
}

function getServerSnapshot(): number {
  return 1024;
}

// ─── 平台检测（一次性） ────────────────────────────────────────────────────

let cachedPlatform: Platform | null = null;

function getPlatformSnapshot(): Platform {
  if (cachedPlatform === null) {
    if (typeof window === 'undefined') return 'unknown';
    cachedPlatform = detectPlatform();
  }
  return cachedPlatform;
}

let cachedDeviceType: DeviceType | null = null;

function getDeviceTypeSnapshot(): DeviceType {
  if (cachedDeviceType === null) {
    if (typeof window === 'undefined') return 'desktop';
    cachedDeviceType = detectDeviceType();
  }
  return cachedDeviceType;
}

let cachedTouch: boolean | null = null;

function getTouchSnapshot(): boolean {
  if (cachedTouch === null) {
    if (typeof window === 'undefined') return false;
    cachedTouch = detectTouch();
  }
  return cachedTouch;
}

let cachedTauri: boolean | null = null;

function getTauriSnapshot(): boolean {
  if (cachedTauri === null) {
    if (typeof window === 'undefined') return false;
    cachedTauri = isTauriEnv();
  }
  return cachedTauri;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * 响应式平台信息 Hook。
 * 返回当前平台、设备类别、窗口尺寸等信息。
 * 窗口尺寸变化时自动更新。
 */
export function usePlatform(): PlatformInfo {
  const width = useSyncExternalStore(subscribeToResize, getSnapshotWidth, getServerSnapshot);
  const height = useSyncExternalStore(subscribeToResize, getSnapshotHeight, getServerSnapshot);

  const platform = getPlatformSnapshot();
  const deviceType = getDeviceTypeSnapshot();
  const hasTouch = getTouchSnapshot();
  const inTauri = getTauriSnapshot();

  return {
    platform,
    deviceType,
    isMobile: deviceType === 'mobile' || deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isTablet: deviceType === 'tablet',
    hasTouch,
    width,
    height,
    inTauri,
  };
}

/**
 * 响应式断点 Hook：返回当前是否匹配指定的媒体查询。
 *
 * @param query - CSS 媒体查询字符串，如 "(min-width: 768px)"
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ─── 便捷 Hook ─────────────────────────────────────────────────────────────

/**
 * 快捷 Hook：仅返回是否为移动端。
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => detectDeviceType() !== 'desktop');

  useEffect(() => {
    const onResize = () => setIsMobile(detectDeviceType() !== 'desktop');
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}

/**
 * 快捷 Hook：仅返回是否支持触控。
 */
export function useHasTouch(): boolean {
  return useCallback(() => detectTouch(), [])();
}
