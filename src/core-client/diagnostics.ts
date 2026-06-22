/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface WorkspaceDiagnostics {
  fileCount: number;
  totalBytes: number;
  isolatedNotes: string[];
  brokenReferences: Array<{ source: string; target: string }>;
  duplicateIds: Array<{ constellationId: string; paths: string[] }>;
  largeFiles: Array<{ path: string; bytes: number }>;
  conflictFiles: string[];
  tantivyIndexExists: boolean;
  vectorIndexExists: boolean;
  recommendations: string[];
}

export function getWorkspaceDiagnostics(): Promise<WorkspaceDiagnostics> {
  return invoke("workspace_diagnostics");
}
