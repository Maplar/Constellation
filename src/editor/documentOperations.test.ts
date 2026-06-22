/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, it } from "vitest";
import { toDocumentUpdateRequest } from "./documentOperations";

describe("toDocumentUpdateRequest", () => {
  it("uses the session revision for DocumentService writes", () => {
    expect(
      toDocumentUpdateRequest({
        constellationId: "note-1",
        relativePath: "研究/认识论.md",
        expectedRevision: "revision-1",
        title: "认识论",
        content: "正文",
        status: "dirty",
      }),
    ).toEqual({
      relativePath: "研究/认识论.md",
      expectedRevision: "revision-1",
      title: "认识论",
      content: "正文",
      folder: "研究",
    });
  });
});
