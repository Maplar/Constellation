/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：思维导图文件存储服务
 */

import { invoke } from "@tauri-apps/api/core";
import type { MindMapData, MindMapIndex } from "../../shared/types/notes";
import { exportToJson, parseJson } from "./mindMapParser";

// ──────────────────────────────────────────────────────────────
// Tauri 命令调用
// ──────────────────────────────────────────────────────────────

/**
 * 确保 .mindmaps 目录存在
 */
export async function ensureMindMapDir(notesDir: string): Promise<void> {
  await invoke("mindmap_ensure_dir", { notesDir });
}

/**
 * 读取思维导图 JSON 文件
 */
export async function readMindMapFile(filePath: string): Promise<MindMapData | null> {
  try {
    const content = await invoke<string>("mindmap_read", { path: filePath });
    return parseJson(content);
  } catch {
    return null;
  }
}

/**
 * 写入思维导图 JSON 文件
 */
export async function writeMindMapFile(
  filePath: string,
  data: MindMapData
): Promise<void> {
  const json = exportToJson(data);
  await invoke("mindmap_write", { path: filePath, data: json });
}

/**
 * 读取思维导图索引文件
 */
export async function readMindMapIndex(notesDir: string): Promise<MindMapIndex> {
  try {
    const content = await invoke<string>("mindmap_read_index", { notesDir });
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * 写入思维导图索引文件
 */
export async function writeMindMapIndex(
  notesDir: string,
  index: MindMapIndex
): Promise<void> {
  const json = JSON.stringify(index, null, 2);
  await invoke("mindmap_write_index", { notesDir, index: json });
}

// ──────────────────────────────────────────────────────────────
// 高级操作
// ──────────────────────────────────────────────────────────────

/**
 * 根据 noteId 获取关联的思维导图
 */
export async function getMindMapForNote(
  notesDir: string,
  noteId: string
): Promise<MindMapData | null> {
  const index = await readMindMapIndex(notesDir);
  const filePath = index[noteId];

  if (!filePath) return null;

  // filePath 是相对于 .mindmaps 目录的路径
  const fullPath = `${notesDir}/.mindmaps/${filePath}`;
  return readMindMapFile(fullPath);
}

/**
 * 保存思维导图并更新索引
 */
export async function saveMindMapForNote(
  notesDir: string,
  noteId: string,
  data: MindMapData
): Promise<void> {
  await ensureMindMapDir(notesDir);

  const index = await readMindMapIndex(notesDir);

  // 如果该笔记已有思维导图，使用现有路径
  let filePath = index[noteId];
  if (!filePath) {
    // 生成新文件名：使用 noteId 的前 8 位 + 时间戳
    const shortId = noteId.substring(0, 8);
    const timestamp = Date.now();
    filePath = `mindmap_${shortId}_${timestamp}.json`;
  }

  const fullPath = `${notesDir}/.mindmaps/${filePath}`;
  await writeMindMapFile(fullPath, data);

  // 更新索引
  index[noteId] = filePath;
  await writeMindMapIndex(notesDir, index);
}

/**
 * 删除笔记关联的思维导图
 */
export async function deleteMindMapForNote(
  notesDir: string,
  noteId: string
): Promise<void> {
  const index = await readMindMapIndex(notesDir);

  if (index[noteId]) {
    delete index[noteId];
    await writeMindMapIndex(notesDir, index);
  }
}

/**
 * 导入思维导图文件并关联到笔记
 */
export async function importMindMapFile(
  notesDir: string,
  noteId: string,
  data: MindMapData
): Promise<void> {
  await saveMindMapForNote(notesDir, noteId, data);
}

/**
 * 获取所有思维导图索引
 */
export async function getAllMindMapIndex(
  notesDir: string
): Promise<MindMapIndex> {
  return readMindMapIndex(notesDir);
}
