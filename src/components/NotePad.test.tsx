/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { NotePad } from "./NotePad";

describe("NotePad surface modes", () => {
  test("renders the default small window as an editable pad", () => {
    const markup = renderToStaticMarkup(<NotePad />);

    expect(markup).toContain('data-surface-mode="pad"');
    expect(markup).toContain("bg-transparent p-0");
    expect(markup).not.toContain("bg-transparent p-1");
    expect(markup).toContain("border-[#e5e1d8]/60 rounded-xl");
    expect(markup.match(/data-surface-resize-handle="true"/g)).toHaveLength(4);
    expect(markup).toContain('data-resize-direction="NorthWest"');
    expect(markup).toContain('data-resize-direction="NorthEast"');
    expect(markup).toContain('data-resize-direction="SouthWest"');
    expect(markup).toContain('data-resize-direction="SouthEast"');
    expect(markup).toContain("w-8 h-8");
    expect(markup).toContain('data-pad-editor-body="true"');
    expect(markup).not.toContain("min-h-[96px]");
    expect(markup).toContain("pb-2");
    expect(markup).toContain("<input");
    expect(markup).toContain("<textarea");
    expect(markup).toContain("cursor-default");
    expect(markup).not.toContain("cursor-grab");
    expect(markup).not.toContain("cursor-grabbing");
  });

  test("can render the same surface as the confirmed read-only tile design", () => {
    const markup = renderToStaticMarkup(
      <NotePad initialNoteId="note-1" initialSurfaceMode="tile" />,
    );

    expect(markup).toContain('data-surface-mode="tile"');
    expect(markup).toContain("bg-transparent p-0");
    expect(markup).not.toContain("bg-transparent p-1");
    expect(markup).toContain("rounded-xl");
    expect(markup).toContain("background-color:#f6f3ec");
    expect(markup).toContain("shadow-sm");
    expect(markup).toContain('data-tile-corner-mark="true"');
    expect(markup.match(/data-tile-corner-mark="true"/g)).toHaveLength(4);
    expect(markup.match(/data-surface-resize-handle="true"/g)).toHaveLength(4);
    expect(markup).toContain('data-resize-direction="NorthWest"');
    expect(markup).toContain('data-resize-direction="NorthEast"');
    expect(markup).toContain('data-resize-direction="SouthWest"');
    expect(markup).toContain('data-resize-direction="SouthEast"');
    expect(markup).toContain("w-8 h-8");
    expect(markup).toContain("cursor-default");
    expect(markup).not.toContain("cursor-grab");
    expect(markup).not.toContain("cursor-grabbing");
    expect(markup).not.toContain("bg-bamboo-mist/70 p-2");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("<textarea");
    expect(markup).not.toContain(">保存<");
    expect(markup).toContain(">空<");
  });
});
