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
  const { apiKey, baseURL, model } = config;

  void (async () => {
    try {
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
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API 调用失败: ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("浏览器不支持流式读取");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              callbacks.onChunk(fullText);
            }
          } catch {
            // skip unparseable chunks
          }
        }
      }

      callbacks.onDone(fullText);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  })();

  return controller;
}
