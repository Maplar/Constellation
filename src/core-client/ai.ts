/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { Channel, invoke } from "@tauri-apps/api/core";
import type { SemanticSearchResult } from "./vector";

export type AiStreamEvent =
  | { type: "sources"; payload: SemanticSearchResult[] }
  | { type: "delta"; payload: string }
  | { type: "done" }
  | { type: "cancelled" }
  | { type: "error"; payload: string };

export interface AiChatRequest {
  requestId: string;
  notesDir: string;
  query: string;
  sourceLimit?: number;
}

export function streamKnowledgeAnswer(
  request: AiChatRequest,
  onEvent: (event: AiStreamEvent) => void,
): Promise<void> {
  const channel = new Channel<AiStreamEvent>();
  channel.onmessage = onEvent;
  return invoke("ai_chat_stream", { request, onEvent: channel });
}

export function cancelKnowledgeAnswer(requestId: string): Promise<boolean> {
  return invoke("ai_cancel", { requestId });
}
