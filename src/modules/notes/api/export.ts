/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { invoke } from "@tauri-apps/api/core";
import type { Note } from "../../shared/types/notes";

interface ExportableNote {
  id: string;
  title: string;
}

export async function importMarkdownNote(path: string, category = ""): Promise<Note> {
  return invoke("notes_import_markdown", { path, category });
}

export async function exportMarkdownNote(
  note: ExportableNote,
  targetDirectory: string,
): Promise<void> {
  const separator = targetDirectory.includes("\\") ? "\\" : "/";
  const path = `${targetDirectory.replace(/[\\/]+$/, "")}${separator}${markdownFileName(note.title)}`;
  await invoke("notes_export_markdown", { id: note.id, path });
}

function markdownFileName(title: string): string {
  const safeTitle = safeFileStem(title) || "无标题笔记";
  return `${safeTitle}.md`;
}

function safeFileStem(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
