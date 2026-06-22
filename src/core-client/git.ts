/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface GitSnapshot {
  id: string;
  message: string;
  author: string;
  createdAt: string;
}

export interface GitSnapshotChange {
  path: string;
  status: "added" | "deleted" | "renamed" | "copied" | "modified" | "ignored" | "unreadable" | "conflicted" | "unmodified";
}

export function enableGitSnapshots(notesDir: string): Promise<boolean> {
  return invoke("git_snapshot_enable", { notesDir });
}

export function createGitSnapshot(notesDir: string, message?: string): Promise<GitSnapshot> {
  return invoke("git_snapshot_create", { notesDir, message });
}

export function listGitSnapshots(notesDir: string, limit = 50): Promise<GitSnapshot[]> {
  return invoke("git_snapshot_history", { notesDir, limit });
}

export function compareGitSnapshot(
  notesDir: string,
  snapshotId: string,
): Promise<GitSnapshotChange[]> {
  return invoke("git_snapshot_compare", { notesDir, snapshotId });
}

export function restoreGitSnapshot(
  notesDir: string,
  snapshotId: string,
  targetDir: string,
): Promise<number> {
  return invoke("git_snapshot_restore", { notesDir, snapshotId, targetDir });
}
