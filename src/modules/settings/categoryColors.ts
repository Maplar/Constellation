/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { Store } from "@tauri-apps/plugin-store";

const STORE_FILE = "category-colors.json";
const KEY = "categoryColors";

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_FILE);
  }
  return storeInstance;
}

export async function loadCategoryColors(): Promise<Record<string, string>> {
  try {
    const store = await getStore();
    return (await store.get<Record<string, string>>(KEY)) ?? {};
  } catch {
    return {};
  }
}

export async function saveCategoryColors(colors: Record<string, string>): Promise<void> {
  const store = await getStore();
  await store.set(KEY, colors);
  await store.save();
}
