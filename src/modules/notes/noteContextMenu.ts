/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

export type NoteContextMenuAction = "reference" | "export" | "move" | "delete";

export interface NoteContextMenuItem {
  action: NoteContextMenuAction;
  label: string;
  tone?: "danger";
}

export const noteContextMenuItems: NoteContextMenuItem[] = [
  { action: "reference", label: "引用笔记" },
  { action: "export", label: "导出 Markdown" },
  { action: "move", label: "移动到分类…" },
  { action: "delete", label: "删除笔记", tone: "danger" },
];
