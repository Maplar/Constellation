/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { load } from "@tauri-apps/plugin-store";

const STORE_FILENAME = "ai-settings.json";

export interface AiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const storeDefaults = {
  aiApiKey: "",
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "gpt-3.5-turbo",
};

export async function loadAiSettings(): Promise<AiSettings> {
  const store = await load(STORE_FILENAME, {
    defaults: storeDefaults,
    autoSave: false,
  });

  const apiKey = (await store.get<string>("aiApiKey")) ?? storeDefaults.aiApiKey;
  const baseUrl = (await store.get<string>("aiBaseUrl")) ?? storeDefaults.aiBaseUrl;
  const model = (await store.get<string>("aiModel")) ?? storeDefaults.aiModel;

  return { apiKey, baseUrl, model };
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  const store = await load(STORE_FILENAME, {
    defaults: storeDefaults,
    autoSave: false,
  });

  await store.set("aiApiKey", settings.apiKey);
  await store.set("aiBaseUrl", settings.baseUrl);
  await store.set("aiModel", settings.model);
  await store.save();
}
