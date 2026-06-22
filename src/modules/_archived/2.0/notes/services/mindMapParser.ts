/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：思维导图文件解析器
 */

import JSZip from "jszip";
import type { MindMapData, MindMapNode } from "../../shared/types/notes";

// 为节点生成 UUID
function generateNodeId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 为没有 nodeId 的节点分配 UUID
function ensureNodeIds(node: Partial<MindMapNode> & { title: string }): MindMapNode {
  return {
    nodeId: node.nodeId || generateNodeId(),
    title: node.title || "",
    children: (node.children || []).map((child) => ensureNodeIds(child)),
    linkedNoteId: node.linkedNoteId || null,
  };
}

// XML 特殊字符转义
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ──────────────────────────────────────────────────────────────
// 解析函数
// ──────────────────────────────────────────────────────────────

/**
 * 解析 .xmind 文件（ZIP + content.json）
 */
export async function parseXmind(buffer: ArrayBuffer): Promise<MindMapData> {
  const zip = await JSZip.loadAsync(buffer);

  // xmind 格式可能有 content.json 或 metadata.json
  const contentFile = zip.file("content.json");
  if (!contentFile) {
    throw new Error("Invalid .xmind file: missing content.json");
  }

  const contentText = await contentFile.async("text");
  const content = JSON.parse(contentText);

  // xmind 8/zen 格式：[{ rootTopic: { title, children: { attached: [...] } } }]
  const rootTopic = content[0]?.rootTopic;
  if (!rootTopic) {
    throw new Error("Invalid .xmind file: missing rootTopic");
  }

  const convertXmindNode = (topic: any): Omit<MindMapNode, "nodeId"> => ({
    title: topic.title || "",
    children: (topic.children?.attached || []).map(convertXmindNode),
    linkedNoteId: null,
  });

  const rootNode: MindMapNode = {
    ...convertXmindNode(rootTopic),
    nodeId: generateNodeId(),
  };

  // 递归为子节点生成 nodeId
  const assignIds = (node: MindMapNode): MindMapNode => ({
    ...node,
    nodeId: node.nodeId || generateNodeId(),
    children: node.children.map(assignIds),
  });

  return {
    version: "1.0",
    root: assignIds(rootNode),
  };
}

/**
 * 解析 .mm 文件（FreeMind XML 格式）
 */
export function parseMm(xml: string): MindMapData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  // 检查解析错误
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid .mm file: XML parse error");
  }

  const root = doc.querySelector("map > node");
  if (!root) {
    throw new Error("Invalid .mm file: missing root node");
  }

  const convertMmNode = (el: Element): MindMapNode => ({
    nodeId: generateNodeId(),
    title: el.getAttribute("TEXT") || "",
    children: Array.from(el.querySelectorAll(":scope > node")).map(convertMmNode),
    linkedNoteId: null,
  });

  return {
    version: "1.0",
    root: convertMmNode(root),
  };
}

/**
 * 解析自定义 JSON 格式
 */
export function parseJson(json: string): MindMapData {
  const data = JSON.parse(json);

  if (!data.version || !data.root) {
    throw new Error("Invalid mindmap JSON: missing version or root");
  }

  return {
    version: data.version,
    root: ensureNodeIds(data.root),
  };
}

/**
 * 根据文件扩展名自动选择解析器
 */
export async function parseMindMapFile(
  fileName: string,
  content: ArrayBuffer | string
): Promise<MindMapData> {
  const ext = fileName.toLowerCase().split(".").pop();

  switch (ext) {
    case "xmind":
      if (typeof content === "string") {
        throw new Error(".xmind file must be provided as ArrayBuffer");
      }
      return parseXmind(content);

    case "mm":
      if (typeof content !== "string") {
        content = new TextDecoder().decode(content);
      }
      return parseMm(content);

    case "json":
      if (typeof content !== "string") {
        content = new TextDecoder().decode(content);
      }
      return parseJson(content);

    default:
      throw new Error(`Unsupported mindmap format: .${ext}`);
  }
}

// ──────────────────────────────────────────────────────────────
// 导出函数
// ──────────────────────────────────────────────────────────────

/**
 * 导出为自定义 JSON 格式
 */
export function exportToJson(data: MindMapData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * 导出为 FreeMind XML 格式（丢失 linkedNoteId）
 */
export function exportToMm(data: MindMapData): string {
  const nodeToXml = (node: MindMapNode, indent: number = 1): string => {
    const spaces = "  ".repeat(indent);
    const childrenXml = node.children.map((c) => nodeToXml(c, indent + 1)).join("\n");

    if (node.children.length === 0) {
      return `${spaces}<node TEXT="${escapeXml(node.title)}" />`;
    }

    return `${spaces}<node TEXT="${escapeXml(node.title)}">\n${childrenXml}\n${spaces}</node>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n<map version="1.0">\n${nodeToXml(data.root)}\n</map>`;
}

/**
 * 导出为 .xmind 格式（丢失 linkedNoteId）
 */
export async function exportToXmind(data: MindMapData): Promise<Blob> {
  const topic = (node: MindMapNode): any => ({
    title: node.title,
    children:
      node.children.length > 0
        ? { attached: node.children.map(topic) }
        : undefined,
  });

  const content = [{ rootTopic: topic(data.root) }];

  const zip = new JSZip();
  zip.file("content.json", JSON.stringify(content));
  zip.file("metadata.json", JSON.stringify({ creator: { name: "Constellation" } }));

  return zip.generateAsync({ type: "blob" });
}

/**
 * 根据格式类型导出思维导图
 */
export async function exportMindMap(
  data: MindMapData,
  format: "json" | "xmind" | "mm"
): Promise<{ content: string | Blob; extension: string }> {
  switch (format) {
    case "json":
      return { content: exportToJson(data), extension: ".json" };
    case "mm":
      return { content: exportToMm(data), extension: ".mm" };
    case "xmind":
      return { content: await exportToXmind(data), extension: ".xmind" };
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// ──────────────────────────────────────────────────────────────
// 树操作工具函数
// ──────────────────────────────────────────────────────────────

/**
 * 在树中查找节点
 */
export function findNodeById(root: MindMapNode, nodeId: string): MindMapNode | null {
  if (root.nodeId === nodeId) return root;

  for (const child of root.children) {
    const found = findNodeById(child, nodeId);
    if (found) return found;
  }

  return null;
}

/**
 * 获取所有叶子节点
 */
export function getAllLeafNodes(node: MindMapNode): MindMapNode[] {
  if (node.children.length === 0) return [node];
  return node.children.flatMap(getAllLeafNodes);
}

/**
 * 获取节点路径（从根到目标节点的 nodeId 列表）
 */
export function getNodePath(root: MindMapNode, nodeId: string): string[] | null {
  if (root.nodeId === nodeId) return [root.nodeId];

  for (const child of root.children) {
    const path = getNodePath(child, nodeId);
    if (path) return [root.nodeId, ...path];
  }

  return null;
}

/**
 * 添加子节点
 */
export function addChildNode(
  root: MindMapNode,
  parentNodeId: string,
  title: string = "新节点"
): MindMapData {
  const newNode: MindMapNode = {
    nodeId: generateNodeId(),
    title,
    children: [],
    linkedNoteId: null,
  };

  const updateNode = (node: MindMapNode): MindMapNode => {
    if (node.nodeId === parentNodeId) {
      return { ...node, children: [...node.children, newNode] };
    }
    return { ...node, children: node.children.map(updateNode) };
  };

  return { version: "1.0", root: updateNode(root) };
}

/**
 * 删除节点（不能删除根节点）
 */
export function deleteNode(root: MindMapNode, nodeId: string): MindMapData {
  const removeFromChildren = (children: MindMapNode[]): MindMapNode[] =>
    children
      .filter((child) => child.nodeId !== nodeId)
      .map((child) => ({ ...child, children: removeFromChildren(child.children) }));

  return {
    version: "1.0",
    root: { ...root, children: removeFromChildren(root.children) },
  };
}

/**
 * 重命名节点
 */
export function renameNode(
  root: MindMapNode,
  nodeId: string,
  newTitle: string
): MindMapData {
  const updateNode = (node: MindMapNode): MindMapNode => {
    if (node.nodeId === nodeId) {
      return { ...node, title: newTitle };
    }
    return { ...node, children: node.children.map(updateNode) };
  };

  return { version: "1.0", root: updateNode(root) };
}

/**
 * 更新节点的 linkedNoteId
 */
export function updateNodeLink(
  root: MindMapNode,
  nodeId: string,
  linkedNoteId: string | null
): MindMapData {
  const updateNode = (node: MindMapNode): MindMapNode => {
    if (node.nodeId === nodeId) {
      return { ...node, linkedNoteId };
    }
    return { ...node, children: node.children.map(updateNode) };
  };

  return { version: "1.0", root: updateNode(root) };
}
