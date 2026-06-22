/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { describe, expect, it } from "vitest";
import { toCoreError } from "./core";

describe("toCoreError", () => {
  it("normalizes a serialized Rust CoreError", () => {
    expect(
      toCoreError({ code: "revisionConflict", message: "文档已被外部修改", retryable: false }),
    ).toEqual({
      code: "revisionConflict",
      message: "文档已被外部修改",
      details: null,
      retryable: false,
    });
  });
});
