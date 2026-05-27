/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Tile } from "./Tile";

describe("Tile", () => {
  test("renders the confirmed tile design structure", () => {
    const markup = renderToStaticMarkup(
      <Tile title="读书笔记" content={"满地都是六便士，\n他却抬头看见了月亮。"} />,
    );

    expect(markup).toContain("rounded-2xl");
    expect(markup).toContain("background-color:#f6f3ec");
    expect(markup).not.toContain("bg-[#d8eee9]");
    expect(markup).toContain("shadow-[");
    expect(markup).not.toContain("hover:scale");
    expect(markup).not.toContain("scale(");
    expect(markup).toContain("font-size:15px");
    expect(markup).toContain("font-size:14px");
    expect(markup).toContain("leading-[1.8]");
    expect(markup).toContain(">读书笔记<");
    expect(markup).toContain("满地都是六便士");
    expect(markup.match(/data-tile-corner-mark="true"/g)).toHaveLength(4);
  });

  test("renders the same empty state as the design draft", () => {
    const markup = renderToStaticMarkup(<Tile content="" />);

    expect(markup).toContain(">空<");
  });

  test("uses a custom hex color instead of preset tile palettes", () => {
    const markup = renderToStaticMarkup(
      <Tile color="#efe8dc" content="磁贴内容" />,
    );

    expect(markup).toContain("background-color:#efe8dc");
    expect(markup).not.toContain("bg-[#d8eee9]");
  });
});
