/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：测试适配新 QuickNote 设计（独立标题+正文，无笔记列表/Tab/状态栏）
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
    expect(markup).toContain("background-color:#f3f5f8");
    expect(markup.match(/data-surface-resize-handle="true"/g)).toHaveLength(8);
    expect(markup).toContain('data-resize-direction="North"');
    expect(markup).toContain('data-resize-direction="South"');
    expect(markup).toContain('data-resize-direction="East"');
    expect(markup).toContain('data-resize-direction="West"');
    expect(markup).toContain('data-resize-direction="NorthWest"');
    expect(markup).toContain('data-resize-direction="NorthEast"');
    expect(markup).toContain('data-resize-direction="SouthWest"');
    expect(markup).toContain('data-resize-direction="SouthEast"');
    expect(markup).toContain("h-[5px]");
    expect(markup).toContain("w-2.5 h-2.5");
    expect(markup).toContain("cursor-grab active:cursor-grabbing");
    // Separate title input
    expect(markup).toContain('<input');
    expect(markup).toContain('placeholder="标题');
    // Content textarea
    expect(markup).toContain('<textarea');
    expect(markup).toContain("写点什么");
    // Controls
    expect(markup).toContain('title="转为磁贴"');
    expect(markup).toContain('title="关闭"');
    // No notes list / tab switching
    expect(markup).not.toContain('mode="open"');
    expect(markup).not.toContain("bg-bamboo-mist/70 p-2");
    expect(markup).not.toContain("data-pad-editor-body");
  });

  test("can render the same surface as the confirmed read-only tile design", () => {
    const markup = renderToStaticMarkup(
      <NotePad initialNoteId="note-1" initialSurfaceMode="tile" />,
    );

    expect(markup).toContain('data-surface-mode="tile"');
    expect(markup).toContain("bg-transparent p-0");
    expect(markup).not.toContain("bg-transparent p-1");
    expect(markup).toContain("rounded-2xl");
    expect(markup).toContain("background-color:#f6f3ec");
    expect(markup).toContain("shadow-[");
    expect(markup).toContain('data-tile-corner-mark="true"');
    expect(markup.match(/data-tile-corner-mark="true"/g)).toHaveLength(4);
    expect(markup.match(/data-surface-resize-handle="true"/g)).toHaveLength(8);
    expect(markup).toContain('data-resize-direction="North"');
    expect(markup).toContain('data-resize-direction="South"');
    expect(markup).toContain('data-resize-direction="East"');
    expect(markup).toContain('data-resize-direction="West"');
    expect(markup).toContain('data-resize-direction="NorthWest"');
    expect(markup).toContain('data-resize-direction="NorthEast"');
    expect(markup).toContain('data-resize-direction="SouthWest"');
    expect(markup).toContain('data-resize-direction="SouthEast"');
    expect(markup).toContain("h-[5px]");
    expect(markup).toContain("w-2.5 h-2.5");
    expect(markup).toContain("cursor-grab");
    expect(markup).toContain("active:cursor-grabbing");
    // Tile mode has no input or textarea
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('<textarea');
    expect(markup).not.toContain(">保存<");
    expect(markup).toContain(">空<");
  });
});
