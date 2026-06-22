/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";

export interface MigrationAnalysis {
  markdownFiles: number;
  attachmentFiles: number;
  legacyVisualFiles: number;
  sourcePath: string;
  targetPath: string;
  targetExists: boolean;
}

export interface MigrationReport {
  copiedMarkdown: number;
  copiedAttachments: number;
  archivedLegacyFiles: number;
  skippedFiles: string[];
  errors: string[];
  idMappings: Record<string, string>;
  targetPath: string;
}

export function analyzeMigration(
  sourceDir: string,
  targetDir: string,
): Promise<MigrationAnalysis> {
  return invoke("migration_analyze", { sourceDir, targetDir });
}

export function executeMigration(
  sourceDir: string,
  targetDir: string,
): Promise<MigrationReport> {
  return invoke("migration_execute", { sourceDir, targetDir });
}
