/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：从原项目移植，适配模块化目录结构
 */

import { emit } from "@tauri-apps/api/event";
import type { NoteSurfaceMode } from "./surfaceMode";

export const TILE_WINDOW_UNPINNED_EVENT = "tile-window-unpinned";

export function tileSurfaceModeUnpinNoteId(
  currentMode: NoteSurfaceMode,
  nextMode: NoteSurfaceMode,
  noteId: string,
): string | null {
  return currentMode === "tile" && nextMode === "pad" && noteId
    ? noteId
    : null;
}

export function emitTileWindowUnpinned(noteId: string): Promise<void> {
  return emit(TILE_WINDOW_UNPINNED_EVENT, noteId);
}
