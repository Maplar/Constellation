/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, ViewMode } from "../shared/types/settings";

export const supportedShortcuts = ["Ctrl+Space", "Alt+Space"] as const;

export function getConfig(): Promise<AppConfig> {
  return invoke("config_get");
}

export function saveConfig(config: AppConfig): Promise<AppConfig> {
  return invoke("config_save", { config });
}

export function normalizeViewMode(value: string): ViewMode {
  if (value === "edit" || value === "split" || value === "preview") {
    return value;
  }

  return "split";
}
