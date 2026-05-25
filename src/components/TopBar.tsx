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
  const isEditingDashboard = useAppModeStore((s) => s.isEditingDashboard);
  const toggleEditingDashboard = useAppModeStore((s) => s.toggleEditingDashboard);
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

        {/* Dashboard edit toggle — only in dashboard mode */}
        {mode === "dashboard" && (
          <button
            onClick={toggleEditingDashboard}
            className="win-btn w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150"
            title={isEditingDashboard ? "完成编辑" : "编辑卡片"}
            style={{
              color: isEditingDashboard ? "#fff" : "#4a4a4a",
              backgroundColor: isEditingDashboard ? "#3a7d5e" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!isEditingDashboard) e.currentTarget.style.backgroundColor = "#e8e4db";
            }}
            onMouseLeave={(e) => {
              if (!isEditingDashboard) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {isEditingDashboard ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            )}
          </button>
        )}

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
  const btnBase = "win-btn w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150";

  return (
    <div className="flex gap-1 ml-1">
      {/* Minimize */}
      <button onClick={onMinimize} className={`${btnBase} text-[#4a4a4a] hover:bg-[#e8e4db] hover:text-[#1a1a1a]`} title="最小化">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>

      {/* Maximize / Restore */}
      <button onClick={onToggleMaximize} className={`${btnBase} text-[#4a4a4a] hover:bg-[#e8e4db] hover:text-[#1a1a1a]`} title={isMaximized ? "还原" : "最大化"}>
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

      {/* Close */}
      <button
        onClick={onClose}
        className={`${btnBase} text-[#4a4a4a] hover:bg-[#d64045] hover:text-white`}
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
