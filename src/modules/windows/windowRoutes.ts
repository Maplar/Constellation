/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

export type AppView = "main" | "notepad" | "tile" | "graph";

export interface AppRoute {
  view: AppView;
  noteId?: string;
}

export function getInitialRoute(url: URL = new URL(window.location.href)): AppRoute {
  return routeFromSearch(url.search);
}

export function routeFromSearch(search: string): AppRoute {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  const noteId = params.get("noteId") ?? undefined;

  if (view === "notepad") return noteId ? { view, noteId } : { view };
  if (view === "tile") return noteId ? { view, noteId } : { view };
  if (view === "graph") return { view };
  return { view: "main" };
}

export function buildNotepadUrl(noteId?: string): string {
  return buildUrl("notepad", noteId);
}

export function buildTileUrl(noteId: string): string {
  return buildUrl("tile", noteId);
}

function buildUrl(view: AppView, noteId?: string): string {
  const params = new URLSearchParams({ view });
  if (noteId) params.set("noteId", noteId);
  return `index.html?${params.toString()}`;
}
