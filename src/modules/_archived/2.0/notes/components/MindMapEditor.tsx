/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：思维导图编辑区组件
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Tree from "react-d3-tree";
import type { RawNodeDatum } from "react-d3-tree";
import { useMindMapStore } from "../stores/useMindMapStore";
import { useMindMap } from "../hooks/useMindMap";
import { saveMindMapForNote } from "../services/mindMapStorage";
import type { MindMapData, MindMapNode } from "../../shared/types/notes";
import {
  addChildNode,
  deleteNode,
  renameNode,
  parseMindMapFile,
  exportMindMap,
} from "../services/mindMapParser";

// ──────────────────────────────────────────────────────────────
// 类型
// ──────────────────────────────────────────────────────────────

interface TreeDatum extends RawNodeDatum {
  attributes?: {
    nodeId: string;
    linkedNoteId: string | null;
  };
  children?: TreeDatum[];
}

interface EditingNode {
  nodeId: string;
  title: string;
}

// ──────────────────────────────────────────────────────────────
// 数据转换
// ──────────────────────────────────────────────────────────────

function mindMapToTreeDatum(node: MindMapNode): TreeDatum {
  return {
    name: node.title,
    attributes: {
      nodeId: node.nodeId,
      linkedNoteId: node.linkedNoteId,
    },
    children: node.children.map(mindMapToTreeDatum),
  };
}

function treeDatumToMindMap(node: TreeDatum): MindMapNode {
  return {
    nodeId: (node.attributes?.nodeId as string) || crypto.randomUUID(),
    title: node.name,
    children: (node.children || []).map(treeDatumToMindMap),
    linkedNoteId: (node.attributes?.linkedNoteId as string) || null,
  };
}

// ──────────────────────────────────────────────────────────────
// 自定义节点组件
// ──────────────────────────────────────────────────────────────

interface CustomNodeProps {
  nodeDatum: TreeDatum;
  onAddChild: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onStartEdit: (nodeId: string, title: string) => void;
}

function CustomNodeElement({
  nodeDatum,
  onAddChild,
  onDelete,
  onStartEdit,
}: CustomNodeProps) {
  const nodeId = nodeDatum.attributes?.nodeId as string;
  const linkedNoteId = nodeDatum.attributes?.linkedNoteId as string | null;
  const isLeaf = !nodeDatum.children || nodeDatum.children.length === 0;

  return (
    <g>
      {/* 节点圆形 */}
      <circle
        r={20}
        fill={isLeaf ? "#7ebea5" : "#a3c9b7"}
        stroke={linkedNoteId ? "#4a9d7d" : "none"}
        strokeWidth={linkedNoteId ? 2 : 0}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      />

      {/* 节点标题 */}
      <text
        x={28}
        y={5}
        className="text-[12px] fill-ink-soft"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {nodeDatum.name.length > 12
          ? nodeDatum.name.substring(0, 12) + "..."
          : nodeDatum.name}
      </text>

      {/* 关联笔记指示器 */}
      {linkedNoteId && (
        <circle cx={16} cy={-12} r={4} fill="#4a9d7d" />
      )}

      {/* 操作按钮（hover 时显示） */}
      <g className="opacity-0 hover:opacity-100 transition-opacity" style={{ pointerEvents: 'all' }}>
        {/* 添加子节点 */}
        <g
          transform="translate(25, -20)"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(nodeId);
          }}
          className="cursor-pointer"
        >
          <circle r={8} fill="#7ebea5" />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] fill-white"
          >
            +
          </text>
        </g>

        {/* 编辑标题 */}
        <g
          transform="translate(45, -15)"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(nodeId, nodeDatum.name);
          }}
          className="cursor-pointer"
        >
          <circle r={8} fill="#a3c9b7" />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[8px] fill-white"
          >
            ✎
          </text>
        </g>

        {/* 删除节点（不能删除根节点） */}
        {nodeDatum.name !== "root" && (
          <g
            transform="translate(25, 20)"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(nodeId);
            }}
            className="cursor-pointer"
          >
            <circle r={8} fill="#e57373" />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-white"
            >
              ×
            </text>
          </g>
        )}
      </g>
    </g>
  );
}

// ──────────────────────────────────────────────────────────────
// 主组件
// ──────────────────────────────────────────────────────────────

interface MindMapEditorProps {
  noteId: string;
  notesDir?: string;
  onSave?: (data: MindMapData) => void;
}

export function MindMapEditor({
  noteId,
  notesDir,
  onSave,
}: MindMapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [editingNode, setEditingNode] = useState<EditingNode | null>(null);
  const [importing, setImporting] = useState(false);

  const {
    mindMap,
    isLoading,
    error,
    loadMindMap,
    saveMindMap: saveMindMapHook,
    importMindMap,
    exportMindMapFile,
  } = useMindMap({
    notesDir: notesDir || "",
    noteId,
    autoLoad: !!notesDir,
  });

  const { currentMindMap, setMindMap, addChild, deleteChild, rename } =
    useMindMapStore();

  // 同步数据
  useEffect(() => {
    if (mindMap) {
      setMindMap(mindMap, noteId);
    }
  }, [mindMap, noteId, setMindMap]);

  // 监听容器尺寸
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 转换数据格式
  const treeData = useMemo(() => {
    if (!currentMindMap) return null;
    return mindMapToTreeDatum(currentMindMap.root);
  }, [currentMindMap]);

  // 添加子节点
  const handleAddChild = useCallback(
    (parentNodeId: string) => {
      addChild(parentNodeId, "新节点");
    },
    [addChild]
  );

  // 删除节点
  const handleDelete = useCallback(
    (nodeId: string) => {
      if (confirm("确定要删除该节点及其所有子节点吗？")) {
        deleteChild(nodeId);
      }
    },
    [deleteChild]
  );

  // 开始编辑
  const handleStartEdit = useCallback(
    (nodeId: string, title: string) => {
      setEditingNode({ nodeId, title });
    },
    []
  );

  // 完成编辑
  const handleFinishEdit = useCallback(
    (newTitle: string) => {
      if (editingNode && newTitle.trim()) {
        rename(editingNode.nodeId, newTitle.trim());
      }
      setEditingNode(null);
    },
    [editingNode, rename]
  );

  // 保存
  const handleSave = useCallback(async () => {
    if (!notesDir || !currentMindMap) return;

    try {
      await saveMindMapForNote(notesDir, noteId, currentMindMap);
      onSave?.(currentMindMap);
    } catch (err) {
      console.error("保存失败:", err);
    }
  }, [notesDir, noteId, currentMindMap, onSave]);

  // 导入
  const handleImport = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        await importMindMap(file);
      } catch (err) {
        console.error("导入失败:", err);
      } finally {
        setImporting(false);
      }
    },
    [importMindMap]
  );

  // 导出
  const handleExport = useCallback(
    async (format: "json" | "xmind" | "mm") => {
      try {
        await exportMindMapFile(format);
      } catch (err) {
        console.error("导出失败:", err);
      }
    },
    [exportMindMapFile]
  );

  // 渲染
  if (!notesDir) {
    return (
      <div className="flex items-center justify-center h-full text-ink-ghost text-sm">
        请先配置笔记目录
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-ink-ghost text-sm">
        <svg
          className="animate-spin h-5 w-5 mr-2 text-bamboo"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        加载中...
      </div>
    );
  }

  if (!currentMindMap) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-ink-ghost">
        <p className="text-sm">无思维导图数据</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const newMindMap: MindMapData = {
                version: "1.0",
                root: {
                  nodeId: crypto.randomUUID(),
                  title: "根节点",
                  children: [],
                  linkedNoteId: null,
                },
              };
              if (notesDir) {
                await saveMindMapForNote(notesDir, noteId, newMindMap);
                setMindMap(newMindMap, noteId);
              }
            }}
            className="px-3 py-1.5 text-xs bg-bamboo/10 text-bamboo hover:bg-bamboo/20 rounded-md transition-colors"
          >
            创建思维导图
          </button>
          <label className="px-3 py-1.5 text-xs bg-paper-warm text-ink-ghost hover:bg-paper-warm/80 rounded-md transition-colors cursor-pointer">
            导入文件
            <input
              type="file"
              accept=".xmind,.mm,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await handleImport(file);
                }
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-paper-deep/20 bg-paper/50">
        <button
          onClick={handleSave}
          className="px-3 py-1 text-xs bg-bamboo/10 text-bamboo hover:bg-bamboo/20 rounded transition-colors"
        >
          保存
        </button>

        <div className="w-px h-4 bg-paper-deep/20" />

        <label className="px-3 py-1 text-xs bg-paper-warm text-ink-ghost hover:bg-paper-warm/80 rounded transition-colors cursor-pointer">
          {importing ? "导入中..." : "导入"}
          <input
            type="file"
            accept=".xmind,.mm,.json"
            className="hidden"
            disabled={importing}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await handleImport(file);
              }
            }}
          />
        </label>

        <div className="relative group">
          <button className="px-3 py-1 text-xs bg-paper-warm text-ink-ghost hover:bg-paper-warm/80 rounded transition-colors">
            导出
          </button>
          <div className="absolute top-full left-0 mt-1 bg-paper border border-paper-deep/20 rounded-lg shadow-lg py-1 min-w-[100px] hidden group-hover:block z-10">
            <button
              onClick={() => handleExport("json")}
              className="w-full px-3 py-1.5 text-left text-xs text-ink-soft hover:bg-paper-warm transition-colors"
            >
              JSON
            </button>
            <button
              onClick={() => handleExport("xmind")}
              className="w-full px-3 py-1.5 text-left text-xs text-ink-soft hover:bg-paper-warm transition-colors"
            >
              XMind
            </button>
            <button
              onClick={() => handleExport("mm")}
              className="w-full px-3 py-1.5 text-left text-xs text-ink-soft hover:bg-paper-warm transition-colors"
            >
              FreeMind
            </button>
          </div>
        </div>
      </div>

      {/* 树状图 */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        {dimensions.width > 0 && dimensions.height > 0 && treeData && (
          <Tree
            data={treeData}
            orientation="horizontal"
            translate={{ x: 50, y: dimensions.height / 2 }}
            nodeSize={{ x: 200, y: 80 }}
            separation={{ siblings: 1, nonSiblings: 1.5 }}
            renderCustomNodeElement={(rd3tProps) => (
              <CustomNodeElement
                nodeDatum={rd3tProps.nodeDatum as TreeDatum}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
                onStartEdit={handleStartEdit}
              />
            )}
            pathClassFunc={() => "stroke-ink-ghost/30 stroke-[1.5px] fill-none"}
            enableLegacyTransitions={true}
          />
        )}
      </div>

      {/* 编辑对话框 */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-paper rounded-lg shadow-xl p-4 w-80">
            <h3 className="text-sm font-semibold text-ink mb-3">编辑节点标题</h3>
            <input
              type="text"
              defaultValue={editingNode.title}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-paper-deep/20 rounded-md focus:outline-none focus:border-bamboo/50 bg-paper-warm text-ink"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFinishEdit(e.currentTarget.value);
                }
                if (e.key === "Escape") {
                  setEditingNode(null);
                }
              }}
              onBlur={(e) => {
                handleFinishEdit(e.target.value);
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setEditingNode(null)}
                className="px-3 py-1 text-xs text-ink-ghost hover:bg-paper-warm rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector(
                    ".fixed input"
                  ) as HTMLInputElement;
                  if (input) {
                    handleFinishEdit(input.value);
                  }
                }}
                className="px-3 py-1 text-xs bg-bamboo text-white rounded hover:bg-bamboo/90 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
