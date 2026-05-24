/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useState, useEffect, useCallback } from "react";
import { TopBarSearch } from "./TopBarSearch";
import { useAppModeStore } from "../modules/shared/stores/useAppModeStore";
import { isTauriEnv } from "../modules/shared/platform";
import {
  closeCurrentWindow,
  minimizeCurrentWindow,
  toggleMaximizeCurrentWindow,
  isCurrentWindowMaximized,
  startCurrentWindowDrag,
} from "../modules/windows/controls";
import { openNotepadWindow } from "../modules/windows/api";

interface TopBarProps {
  onOpenSettings?: () => void;
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const mode = useAppModeStore((s) => s.mode);
  const [isMaximized, setIsMaximized] = useState(false);
  const tauri = isTauriEnv();

  useEffect(() => {
    if (!tauri) return;
    void isCurrentWindowMaximized().then(setIsMaximized).catch(() => {});
  }, [tauri]);

  const handleToggleMaximize = useCallback(() => {
    if (!tauri) return;
    void toggleMaximizeCurrentWindow()
      .then(() => isCurrentWindowMaximized().then(setIsMaximized))
      .catch(() => {});
  }, [tauri]);

  const handleDrag = useCallback(() => {
    if (!tauri) return;
    void startCurrentWindowDrag().catch(() => {});
  }, [tauri]);

  const modeLabel = mode === "edit" ? "编辑" : "仪表盘";

  return (
    <div
      className="flex items-center shrink-0 h-11 border-b select-none cursor-default"
      style={{
        backgroundColor: "var(--bg-sidebar)",
        borderColor: "var(--border)",
        paddingLeft: 16,
        paddingRight: 0,
      }}
      onMouseDown={handleDrag}
      onDoubleClick={handleToggleMaximize}
    >
      {/* Left: app title + mode indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="text-[13px] font-display font-medium tracking-wide"
          style={{ color: "var(--text-primary)" }}
        >
          星座
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
        <span
          className="text-[11px] font-body truncate max-w-[160px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {modeLabel}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center: search bar */}
      <div className="flex items-center gap-2">
        <TopBarSearch />
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center ml-2">
        {/* Quick note — only in Tauri */}
        {tauri && (
          <button
            onClick={() => { void openNotepadWindow().catch(() => {}); }}
            className="w-10 h-11 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="快捷便签"
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.backgroundColor = "var(--accent-light)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v14H7l-3 3V4z" />
              <path d="M8 9h8M8 13h5" />
            </svg>
          </button>
        )}

        {/* Settings */}
        {onOpenSettings && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
            className="w-10 h-11 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="设置"
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 12h4" />
            </svg>
          </button>
        )}

        {/* Window controls — only in Tauri */}
        {tauri && (<>
          <button
            onClick={() => { void minimizeCurrentWindow().catch(() => {}); }}
            className="w-11 h-11 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="最小化"
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2 6h8" />
            </svg>
          </button>
          <button
            onClick={handleToggleMaximize}
            className="w-11 h-11 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
            title={isMaximized ? "还原" : "最大化"}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <path d="M3 5H2V2a1 1 0 0 1 1-1h5v1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" />
              </svg>
            )}
          </button>
          <button
            onClick={() => { void closeCurrentWindow().catch(() => {}); }}
            className="w-11 h-11 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="关闭"
            onMouseEnter={(e) => { e.currentTarget.style.color = "#c0392b"; e.currentTarget.style.backgroundColor = "var(--danger-bg, #fef2f2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </>)}
      </div>
    </div>
  );
}
