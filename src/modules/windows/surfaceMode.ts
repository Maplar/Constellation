/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import type { WindowBounds } from "./api";

export type NoteSurfaceMode = "pad" | "tile";

export const NOTE_SURFACE_MODE_EVENT = "constellation:surface-mode";

export const SURFACE_WINDOW_SIZES: Record<
  NoteSurfaceMode,
  Pick<WindowBounds, "width" | "height">
> = {
  pad: { width: 260, height: 260 },
  tile: { width: 260, height: 260 },
};

export function isNoteSurfaceMode(value: unknown): value is NoteSurfaceMode {
  return value === "pad" || value === "tile";
}

export function getSurfaceTargetBounds(
  _mode: NoteSurfaceMode,
  current: WindowBounds,
): WindowBounds {
  return current;
}

export function requestSurfaceMode(mode: NoteSurfaceMode): void {
  window.dispatchEvent(
    new CustomEvent(NOTE_SURFACE_MODE_EVENT, { detail: { mode } }),
  );
}

export function surfaceModeFromEvent(event: Event): NoteSurfaceMode | null {
  if (!(event instanceof CustomEvent)) return null;
  const mode = (event.detail as { mode?: unknown } | null)?.mode;
  return isNoteSurfaceMode(mode) ? mode : null;
}
