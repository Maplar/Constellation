/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { invoke } from "@tauri-apps/api/core";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function openNotepadWindow(
  noteId?: string,
  bounds?: WindowBounds,
): Promise<string> {
  return invoke("open_notepad_window", {
    noteId: noteId ?? null,
    bounds: bounds ?? null,
  });
}

export function openTileWindow(
  noteId: string,
  bounds?: WindowBounds,
): Promise<string> {
  return invoke("open_tile_window", { noteId, bounds: bounds ?? null });
}
