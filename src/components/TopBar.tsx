/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { TopBarSearch } from "./TopBarSearch";
import { useAppModeStore } from "../modules/shared/stores/useAppModeStore";
import { isTauriEnv } from "../modules/shared/platform";
import { openNotepadWindow } from "../modules/windows/api";
import { useWindowControls } from "../hooks/useWindowControls";

interface TopBarProps {
  onOpenSettings?: () => void;
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const mode = useAppModeStore((s) => s.mode);
  const tauri = isTauriEnv();
  const { isMaximized, minimize, toggleMaximize, close } = useWindowControls();

  const modeLabel = mode === "edit" ? "编辑" : "仪表盘";

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between shrink-0 h-12 px-4 border-b select-none"
      style={{ backgroundColor: "#faf8f3", borderColor: "#e5e1d8" }}
      onDoubleClick={toggleMaximize}
    >
      {/* Left: app title — draggable */}
      <div data-tauri-drag-region className="flex items-center gap-3 min-w-0">
        <span className="text-[13px] font-display font-medium tracking-wide" style={{ color: "var(--text-primary)" }}>
          星座
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
        <span className="text-[11px] font-body truncate max-w-[160px]" style={{ color: "var(--text-secondary)" }}>
          {modeLabel}
        </span>
      </div>

      {/* Right: search + buttons — not draggable */}
      <div data-tauri-drag-region={false} className="flex items-center gap-1">
        <TopBarSearch />

        {tauri && (
          <button
            onClick={() => { void openNotepadWindow().catch(() => {}); }}
            className="win-btn w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors text-[#6b6b6b] hover:bg-[#e5e1d8]"
            title="快捷便签"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v14H7l-3 3V4z" />
              <path d="M8 9h8M8 13h5" />
            </svg>
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
            className="win-btn w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors text-[#6b6b6b] hover:bg-[#e5e1d8]"
            title="设置"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}

        {tauri && (
          <WindowControls
            isMaximized={isMaximized}
            onMinimize={minimize}
            onToggleMaximize={toggleMaximize}
            onClose={close}
          />
        )}
      </div>
    </div>
  );
}

/* ── Window control buttons ── */

interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

function WindowControls({
  isMaximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlsProps) {
  const btnBase = "win-btn w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors text-[#6b6b6b]";

  return (
    <div className="flex gap-1 ml-1">
      {/* Minimize — Lucide Minus */}
      <button onClick={onMinimize} className={`${btnBase} hover:bg-[#e5e1d8]`} title="最小化">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>

      {/* Maximize / Restore — Square / Minimize2 */}
      <button onClick={onToggleMaximize} className={`${btnBase} hover:bg-[#e5e1d8]`} title={isMaximized ? "还原" : "最大化"}>
        {isMaximized ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        )}
      </button>

      {/* Close — Lucide X */}
      <button
        onClick={onClose}
        className={`${btnBase} hover:bg-[#c0392b] hover:text-white`}
        title="关闭"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}
