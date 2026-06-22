/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

export interface NoteMetadata {
  id: string;
  title: string;
  fileName: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  preview: string;
  noteType?: 'note';
}

export interface Note extends Omit<NoteMetadata, "preview"> {
  content: string;
}

export interface SaveNoteRequest {
  title: string;
  content: string;
  category: string;
}

export interface ExternalFile {
  id: string;
  title: string;
  filePath: string;
}

/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：Wiki-Link 图谱类型
 */

export interface WikiLink {
  sourceNoteId: string;
  targetTitle: string;
  alias: string | null;
  rawText: string;
}

export interface GraphNode {
  id: string;
  label: string;
  val: number;
  color: string;
  noteId: string;
  category?: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string | null;
  value: number;
  edgeType: 'wiki' | 'markdown' | 'embed' | 'similar';
}

export interface LinkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：预览子模式
 */

export type PreviewSubMode = "markdown" | "relation";
