/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

/**
 * 平台类型：桌面端（Windows/Linux/macOS）和移动端（Android/iOS）。
 */
export type Platform = 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'unknown';

/**
 * 设备类别：用于 UI 适配判断。
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet';

/**
 * usePlatform Hook 的返回值。
 */
export interface PlatformInfo {
  /** 当前运行平台 */
  platform: Platform;
  /** 设备类别 */
  deviceType: DeviceType;
  /** 是否为移动端（手机或平板） */
  isMobile: boolean;
  /** 是否为桌面端 */
  isDesktop: boolean;
  /** 是否为平板 */
  isTablet: boolean;
  /** 是否支持触控 */
  hasTouch: boolean;
  /** 视口宽度（px） */
  width: number;
  /** 视口高度（px） */
  height: number;
  /** 是否在 Tauri 环境运行 */
  inTauri: boolean;
}
