/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import type { DocumentUpdateRequest } from "../core-client";
import type { DocumentSession } from "./documentSession";

export function toDocumentUpdateRequest(session: DocumentSession): DocumentUpdateRequest {
  const separator = session.relativePath.lastIndexOf("/");
  return {
    relativePath: session.relativePath,
    expectedRevision: session.expectedRevision,
    title: session.title,
    content: session.content,
    folder: separator < 0 ? "" : session.relativePath.slice(0, separator),
  };
}
