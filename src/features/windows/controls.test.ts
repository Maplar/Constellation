/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { getCurrentWindow } from "@tauri-apps/api/window";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { showCurrentWindow } from "./controls";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(),
}));

describe("window controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("focuses the current window after showing it", async () => {
    const show = vi.fn().mockResolvedValue(undefined);
    const setFocus = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getCurrentWindow).mockReturnValue({
      show,
      setFocus,
    } as unknown as ReturnType<typeof getCurrentWindow>);

    await showCurrentWindow();

    expect(show).toHaveBeenCalledTimes(1);
    expect(setFocus).toHaveBeenCalledTimes(1);
    expect(show.mock.invocationCallOrder[0]).toBeLessThan(
      setFocus.mock.invocationCallOrder[0],
    );
  });

});
