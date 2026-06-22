/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface SyncConfig {
  serverUrl: string;
  username: string;
  password: string;
  remotePath: string;
  syncDirection: "upload" | "download" | "bidirectional";
  forceFullSync: boolean;
  autoSync: boolean;
  syncInterval: number;
}

export interface SyncResult {
  uploaded: number;
  downloaded: number;
  deletedLocal: number;
  deletedRemote: number;
  skipped: number;
  conflicts: number;
  errors: number;
  lastSyncTime: string;
  conflictFiles: string[];
}

export function testWebDavConnection(
  serverUrl: string,
  username: string,
  password: string,
): Promise<string> {
  return invoke("test_webdav_connection", { serverUrl, username, password });
}

export function syncWorkspace(
  config: SyncConfig,
  notesDir: string,
): Promise<SyncResult> {
  return invoke("sync_notes_dir", {
    config,
    notesDir,
    conflictStrategy: "keep_both",
  });
}

export function loadSyncConfig(notesDir: string): Promise<SyncConfig> {
  return invoke("load_sync_config", { notesDir });
}

export function saveSyncConfig(notesDir: string, config: SyncConfig): Promise<void> {
  return invoke("save_sync_config", { notesDir, config });
}

export function syncWorkspaceWithRetry(
  config: SyncConfig,
  notesDir: string,
  maxAttempts = 3,
): Promise<SyncResult> {
  return invoke("sync_notes_dir_with_retry", {
    config,
    notesDir,
    conflictStrategy: "keep_both",
    maxAttempts,
  });
}
