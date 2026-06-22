/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：本地加密备份服务（含 zip 压缩）
 */

import { invoke } from "@tauri-apps/api/core";

export interface BackupMetadata {
  id: string;
  timestamp: string;
  fileCount: number;
  totalSize: number;
  compressedSize: number;
  encrypted: boolean;
  version: string;
}

export interface BackupConfig {
  backupDir: string;
  autoBackup: boolean;
  backupInterval: number;
  maxBackups: number;
  encrypt: boolean;
  compress: boolean;
  compressionLevel: number;
}

export interface RestoreResult {
  restoredFiles: number;
  skippedFiles: number;
  errors: string[];
}

export interface BackupProgress {
  phase: "scanning" | "compressing" | "encrypting" | "writing" | "complete";
  progress: number;
  total: number;
  currentFile?: string;
}

const DEFAULT_CONFIG: BackupConfig = {
  backupDir: "",
  autoBackup: false,
  backupInterval: 86400,
  maxBackups: 10,
  encrypt: true,
  compress: true,
  compressionLevel: 6,
};

export async function loadBackupConfig(): Promise<BackupConfig> {
  try {
    const config = await invoke<BackupConfig>("load_backup_config");
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveBackupConfig(config: BackupConfig): Promise<void> {
  await invoke("save_backup_config", { config });
}

export async function createBackup(
  notesDir: string,
  backupDir: string,
  options: {
    encrypt?: boolean;
    compress?: boolean;
    password?: string;
    onProgress?: (progress: BackupProgress) => void;
  } = {}
): Promise<BackupMetadata> {
  const {
    encrypt = true,
    compress = true,
    password,
    onProgress,
  } = options;

  if (onProgress) {
    onProgress({ phase: "scanning", progress: 0, total: 100 });
  }

  const metadata = await invoke<BackupMetadata>("create_backup", {
    notesDir,
    backupDir,
    encrypt,
    compress,
    password: password || null,
  });

  if (onProgress) {
    onProgress({ phase: "complete", progress: 100, total: 100 });
  }

  return metadata;
}

export async function listBackups(
  backupDir: string
): Promise<BackupMetadata[]> {
  return invoke<BackupMetadata[]>("list_backups", { backupDir });
}

export async function restoreBackup(
  backupId: string,
  backupDir: string,
  notesDir: string,
  options: {
    password?: string;
    onProgress?: (progress: BackupProgress) => void;
  } = {}
): Promise<RestoreResult> {
  const { password, onProgress } = options;

  if (onProgress) {
    onProgress({ phase: "scanning", progress: 0, total: 100 });
  }

  const result = await invoke<RestoreResult>("restore_backup", {
    backupId,
    backupDir,
    notesDir,
    password: password || null,
  });

  if (onProgress) {
    onProgress({ phase: "complete", progress: 100, total: 100 });
  }

  return result;
}

export async function deleteBackup(
  backupId: string,
  backupDir: string
): Promise<void> {
  await invoke("delete_backup", { backupId, backupDir });
}

export async function generateBackupKey(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyBackupPassword(
  backupId: string,
  backupDir: string,
  password: string
): Promise<boolean> {
  try {
    return await invoke<boolean>("verify_backup_password", {
      backupId,
      backupDir,
      password,
    });
  } catch {
    return false;
  }
}

export async function getBackupSize(
  backupId: string,
  backupDir: string
): Promise<{ originalSize: number; compressedSize: number }> {
  return invoke("get_backup_size", { backupId, backupDir });
}

export async function exportBackupKey(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function formatBackupSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatBackupDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getCompressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round((1 - compressed / original) * 100);
}
