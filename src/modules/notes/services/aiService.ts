/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { invoke } from "@tauri-apps/api/core";
import type { AIConfig } from "../../shared/types/settings";

export interface AITag {
  name: string;
  confidence: number;
}

export interface AISummary {
  summary: string;
  keyPoints: string[];
  tags: AITag[];
}

interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

async function complete(request: CompletionRequest): Promise<string> {
  return invoke<string>("ai_complete", {
    request: {
      systemPrompt: request.systemPrompt,
      userPrompt: request.userPrompt,
      temperature: request.temperature ?? 0.3,
      maxTokens: request.maxTokens ?? 800,
    },
  });
}

export async function summarizeNote(
  content: string,
  _config?: AIConfig,
): Promise<string> {
  return complete({
    systemPrompt:
      "你是笔记摘要助手。请用简洁中文总结核心内容，不超过 300 字，不添加原文没有的事实。",
    userPrompt: content,
    temperature: 0.3,
    maxTokens: 600,
  });
}

export async function generateEnhancedSummary(
  content: string,
  _config?: AIConfig,
): Promise<AISummary> {
  const response = await complete({
    systemPrompt:
      '分析笔记并仅返回 JSON：{"summary":"摘要","keyPoints":["要点"],"tags":[{"name":"标签","confidence":0.9}]}。',
    userPrompt: content,
    temperature: 0.2,
    maxTokens: 1_000,
  });
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("missing JSON");
    return JSON.parse(match[0]) as AISummary;
  } catch {
    return { summary: response, keyPoints: [], tags: [] };
  }
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export function summarizeNoteStream(
  content: string,
  config: AIConfig,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();
  void summarizeNote(content, config)
    .then((result) => {
      if (controller.signal.aborted) return;
      callbacks.onChunk(result);
      callbacks.onDone(result);
    })
    .catch((error) => {
      if (!controller.signal.aborted) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
    });
  return controller;
}

export async function generateTags(
  content: string,
  _config?: AIConfig,
): Promise<string[]> {
  const response = await complete({
    systemPrompt: "从文本中提取 3 到 7 个简短中文标签，仅用逗号分隔。",
    userPrompt: content.slice(0, 4_000),
    maxTokens: 160,
  });
  return splitTerms(response);
}

export async function generateKeywords(
  content: string,
  _config?: AIConfig,
): Promise<string[]> {
  const response = await complete({
    systemPrompt: "提取 3 到 5 个关键词，仅用逗号分隔。",
    userPrompt: content.slice(0, 4_000),
    maxTokens: 120,
  });
  return splitTerms(response);
}

export async function explainCode(
  code: string,
  language: string,
  _config?: AIConfig,
): Promise<string> {
  return complete({
    systemPrompt: "用简洁中文解释代码功能、关键逻辑和风险。",
    userPrompt: `语言: ${language}\n\n${code}`,
    maxTokens: 1_000,
  });
}

export async function optimizeNote(
  content: string,
  _config?: AIConfig,
): Promise<string> {
  return complete({
    systemPrompt:
      "在不改变事实和含义的前提下改善 Markdown 排版、语法和表达。只返回修改后的正文。",
    userPrompt: content,
    temperature: 0.2,
    maxTokens: 3_000,
  });
}

function splitTerms(value: string): string[] {
  return value
    .split(/[,，、\n]/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0 && term.length < 30);
}
