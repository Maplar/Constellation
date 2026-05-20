/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { describe, expect, it } from "vitest";
import {
  buildNotepadUrl,
  buildTileUrl,
  getInitialRoute,
  routeFromSearch,
} from "./windowRoutes";

describe("window routes", () => {
  it("parses supported routes and note ids", () => {
    expect(routeFromSearch("?view=notepad&noteId=abc-123")).toEqual({
      view: "notepad",
      noteId: "abc-123",
    });
    expect(routeFromSearch("?view=tile&noteId=note-1")).toEqual({
      view: "tile",
      noteId: "note-1",
    });
    expect(routeFromSearch("?view=unknown")).toEqual({ view: "main" });
  });

  it("builds app urls for dynamic windows", () => {
    expect(buildNotepadUrl()).toBe("index.html?view=notepad");
    expect(buildNotepadUrl("abc 123")).toBe(
      "index.html?view=notepad&noteId=abc+123",
    );
    expect(buildTileUrl("note-1")).toBe("index.html?view=tile&noteId=note-1");
  });

  it("reads the browser location by default", () => {
    expect(getInitialRoute(new URL("https://floral-notepaper.test/?view=main"))).toEqual({
      view: "main",
    });
  });
});
