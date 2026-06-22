/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useAppModeStore } from "../modules/shared/stores/useAppModeStore";
import type { AppMode } from "../modules/shared/stores/useAppModeStore";

interface IconItem {
  key: AppMode;
  icon: React.ReactNode;
  label: string;
}

const icons: IconItem[] = [
  {
    key: "edit",
    label: "编辑",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
];

const bottomIcons = [
  {
    key: "settings" as const,
    label: "设置",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function IconSidebar() {
  const mode = useAppModeStore((s) => s.mode);
  const setMode = useAppModeStore((s) => s.setMode);

  return (
    <div
      className="shrink-0 flex flex-col items-center border-r h-screen select-none"
      style={{
        width: 48,
        backgroundColor: "var(--bg-sidebar)",
        borderColor: "var(--border)",
      }}
    >
      {/* Top icons (mode switcher) */}
      <div className="flex flex-col items-center gap-1 pt-2">
        {icons.map((item) => {
          const isActive = mode === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setMode(item.key)}
              title={item.label}
              className="relative w-full flex items-center justify-center h-10 cursor-pointer transition-colors duration-200"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                backgroundColor: isActive ? "#eaf5ef" : "transparent",
                borderLeft: isActive ? "3px solid #3a7d5e" : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "#f0ede5";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {item.icon}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom icons */}
      <div className="flex flex-col items-center gap-1 pb-2">
        {bottomIcons.map((item) => (
          <button
            key={item.key}
            title={item.label}
            className="w-full flex items-center justify-center h-10 cursor-pointer transition-colors duration-200"
            style={{
              color: "var(--text-muted)",
              borderLeft: "3px solid transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f0ede5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
