/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import OpenAI from "openai";
import { load } from "@tauri-apps/plugin-store";

const STORE_FILENAME = "ai-settings.json";

export interface AiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULTS: AiSettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-3.5-turbo",
};

const storeDefaults = {
  aiApiKey: "",
  aiBaseUrl: DEFAULTS.baseUrl,
  aiModel: DEFAULTS.model,
};

async function getStore() {
  return load(STORE_FILENAME, { defaults: storeDefaults, autoSave: false });
}

export async function loadAiSettings(): Promise<AiSettings> {
  const store = await getStore();

  const apiKey = (await store.get<string>("aiApiKey")) ?? DEFAULTS.apiKey;
  const baseUrl = (await store.get<string>("aiBaseUrl")) ?? DEFAULTS.baseUrl;
  const model = (await store.get<string>("aiModel")) ?? DEFAULTS.model;

  return { apiKey, baseUrl, model };
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  const store = await getStore();

  await store.set("aiApiKey", settings.apiKey);
  await store.set("aiBaseUrl", settings.baseUrl);
  await store.set("aiModel", settings.model);
  await store.save();
}

export async function summarizeNote(content: string): Promise<string> {
  const settings = await loadAiSettings();

  if (!settings.apiKey) {
    throw new Error("请先在设置中配置 AI API Key");
  }

  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: settings.model,
    messages: [
      {
        role: "system",
        content:
          "你是一个专业的笔记总结助手。请对用户提供的笔记内容进行简洁准确的总结，突出关键信息。使用中文回复。",
      },
      {
        role: "user",
        content,
      },
    ],
    temperature: 0.5,
    max_tokens: 800,
  });

  const summary = response.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("AI 未返回总结内容");
  }

  return summary;
}
