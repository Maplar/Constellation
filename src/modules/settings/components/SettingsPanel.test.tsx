/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";

const config = {
  notesDir: "D:\\Notes\\星座",
  globalShortcut: "Ctrl+Space",
  closeToTray: true,
  autostart: false,
  defaultViewMode: "split" as const,
  noteAutoSave: true,
  noteSurfaceAutoSave: true,
  tileColor: "#f6f3ec",
  tileColorMode: "custom" as const,
  theme: "light" as const,
  fontSize: 14,
  surfaceFontSize: 14,
};

describe("SettingsPanel", () => {
  test("renders the core configurable app settings", () => {
    const markup = renderToStaticMarkup(
      <SettingsPanel
        config={config}
        onChange={vi.fn()}
        onChooseNotesDir={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain("应用设置");
    expect(markup).toContain("D:\\Notes\\星座");
    expect(markup).toContain("选择文件夹");
    expect(markup).toContain("Ctrl+Space");
    expect(markup).toContain("Alt+Space");
    expect(markup).toContain("关闭到托盘");
    expect(markup).toContain("开机自启");
    expect(markup).toContain("自动保存笔记");
    expect(markup).toContain("小窗笔记自动保存");
    expect(markup).toContain("磁贴颜色");
    expect(markup).toContain("跟随主题");
    expect(markup).toContain("自定义");
    expect(markup).toContain('type="color"');
    expect(markup).toContain('value="#f6f3ec"');
    expect(markup).toContain("默认视图");
    expect(markup).toContain("编辑");
    expect(markup).toContain("分栏");
    expect(markup).toContain("预览");
  });
});
