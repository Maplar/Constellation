/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import OpenAI from "openai";
import { invoke } from "@tauri-apps/api/core";

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

export async function loadAiSettings(): Promise<AiSettings> {
  return invoke<AiSettings>("load_ai_config").catch(() => DEFAULTS);
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  await invoke("save_ai_config", { config: settings });
}

export async function testAiConnection(settings: AiSettings): Promise<string> {
  if (!settings.apiKey) {
    throw new Error("请先填写 API Key");
  }

  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: settings.model,
    messages: [
      { role: "user", content: "Hi" },
    ],
    max_tokens: 10,
    temperature: 0,
  });

  const reply = response.choices[0]?.message?.content ?? "";
  return reply || "连接成功 (无内容返回)";
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
