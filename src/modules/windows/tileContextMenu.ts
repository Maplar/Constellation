/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import type { NoteSurfaceAction } from "./surfaceActions";

export interface TileContextMenuItem {
  action: NoteSurfaceAction;
  label: string;
  tone?: "danger";
}

export const tileContextMenuItems: TileContextMenuItem[] = [
  { action: "copy", label: "复制" },
  { action: "save", label: "保存" },
  { action: "switchToPad", label: "转为小窗" },
  { action: "close", label: "取消钉屏", tone: "danger" },
];
