/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";
import type { AIConfig } from "../shared/types/settings";

export type AiSettings = AIConfig;

const DEFAULTS: AiSettings = {
  apiKey: "",
  hasApiKey: false,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  allowedFolders: [],
  consentProvider: "",
};

export async function loadAiSettings(): Promise<AiSettings> {
  return invoke<AiSettings>("load_ai_config")
    .then((settings) => ({ ...DEFAULTS, ...settings, apiKey: "" }))
    .catch(() => DEFAULTS);
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  await invoke("save_ai_config", { config: settings });
}

export async function testAiConnection(settings: AiSettings): Promise<string> {
  await saveAiSettings(settings);
  return invoke<string>("ai_test_connection");
}
