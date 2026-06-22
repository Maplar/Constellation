/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：将文件夹颜色迁移到工作区 .constellation/folders.json
 */

import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";

const LEGACY_STORE_FILE = "category-colors.json";
const LEGACY_KEY = "categoryColors";

export async function loadCategoryColors(): Promise<Record<string, string>> {
  const workspaceColors = await invoke<Record<string, string>>("folder_colors_load");
  if (Object.keys(workspaceColors).length > 0) return workspaceColors;

  try {
    const legacyStore = await Store.load(LEGACY_STORE_FILE);
    const legacy = (await legacyStore.get<Record<string, string>>(LEGACY_KEY)) ?? {};
    if (Object.keys(legacy).length > 0) {
      await saveCategoryColors(legacy);
      await legacyStore.delete(LEGACY_KEY);
      await legacyStore.save();
    }
    return legacy;
  } catch {
    return {};
  }
}

export function saveCategoryColors(colors: Record<string, string>): Promise<void> {
  return invoke("folder_colors_save", { colors });
}
