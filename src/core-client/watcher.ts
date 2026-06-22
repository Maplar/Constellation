/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export function startWorkspaceWatcher(notesDir: string): Promise<void> {
  return invoke("watcher_start", { notesDir });
}

export function stopWorkspaceWatcher(): Promise<void> {
  return invoke("watcher_stop");
}

export function getWorkspaceWatcherStatus(): Promise<string | null> {
  return invoke("watcher_status");
}
