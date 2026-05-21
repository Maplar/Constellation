/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import type { AIConfig } from "../../shared/types/settings";

export async function summarizeNote(
  content: string,
  config: AIConfig,
): Promise<string> {
  const { apiKey, baseURL, model } = config;

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个笔记摘要助手。请用简洁的中文总结以下笔记的核心内容，不超过200字。",
        },
        { role: "user", content },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API 调用失败: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
