/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, it } from "vitest";
import { openDocumentSession, updateDocumentDraft } from "./documentSession";

describe("documentSession", () => {
  it("marks a loaded document dirty without changing its expected revision", () => {
    const loaded = openDocumentSession({
      constellationId: "note-1",
      relativePath: "研究/认识论.md",
      revision: "revision-1",
      title: "认识论",
      folder: "研究",
      createdAt: "2026-06-22T00:00:00Z",
      updatedAt: "2026-06-22T00:00:00Z",
      content: "原正文",
      frontmatter: {},
    });

    const dirty = updateDocumentDraft(loaded, { content: "新正文" });

    expect(dirty.status).toBe("dirty");
    expect(dirty.expectedRevision).toBe("revision-1");
    expect(dirty.content).toBe("新正文");
  });
});
