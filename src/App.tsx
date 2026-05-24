/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：新增移动端 TabBar 布局与平台自适应路由
 */

import { useEffect, useState } from "react";
import "./App.css";
import { ContextMenuProvider } from "./modules/shared/components/ContextMenu";
import { MainWindow } from "./modules/notes/components/MainWindow";
import { NotePad } from "./modules/windows/components/NotePad";
import { TileShowcase } from "./modules/windows/components/TileShowcase";
import { GraphView } from "./modules/notes/components/GraphView";
import { getConfig, chooseNotesDirectory, saveConfig } from "./modules/settings/api";
import { applyTheme, watchSystemTheme } from "./modules/settings/theme";
import type { AppConfig, ThemeOption } from "./modules/shared/types/settings";
import { getInitialRoute } from "./modules/windows/windowRoutes";
import { listen, emit } from "@tauri-apps/api/event";
import { usePlatform } from "./modules/shared/platform/usePlatform";
import { MobileTabBar } from "./modules/shared/components/MobileTabBar";
import { SettingsPanel } from "./modules/settings/components/SettingsPanel";
import { useAppModeStore } from "./modules/shared/stores/useAppModeStore";
import { IconSidebar } from "./components/IconSidebar";
import { TopBar } from "./components/TopBar";
import { EditorLayout } from "./components/EditorLayout";
import { DashboardView } from "./components/DashboardView";

// ─── 桌面端布局 ────────────────────────────────────────────────────────────

function DesktopApp() {
  const route = getInitialRoute();
  const activeView = route.view;
  const mode = useAppModeStore((s) => s.mode);
  const [settingsConfig, setSettingsConfig] = useState<AppConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cleanup = () => {};
    getConfig()
      .then((config) => {
        setSettingsConfig(config);
        const theme = (config.theme || "system") as ThemeOption;
        applyTheme(theme);
        cleanup = watchSystemTheme(theme);
      })
      .catch(() => {});
    return () => cleanup();
  }, []);

  useEffect(() => {
    const unlisten = listen<AppConfig>("config-changed", (event) => {
      setSettingsConfig(event.payload);
      const theme = (event.payload.theme || "system") as ThemeOption;
      applyTheme(theme);
      watchSystemTheme(theme);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const handleSettingsChange = (nextConfig: AppConfig) => {
    setSettingsConfig(nextConfig);
    void emit("config-changed", nextConfig);
    persistSettings(nextConfig);
  };

  const handleChooseNotesDir = async () => {
    const dir = await chooseNotesDirectory();
    if (dir && settingsConfig) {
      handleSettingsChange({ ...settingsConfig, notesDir: dir });
    }
  };

  if (activeView === "notepad") {
    return (
      <div className="h-screen font-body text-ink overflow-hidden">
        <NotePad initialNoteId={route.noteId} />
      </div>
    );
  }

  if (activeView === "tile") {
    return (
      <div className="h-screen font-body text-ink overflow-hidden">
        <TileShowcase noteId={route.noteId} />
      </div>
    );
  }

  if (activeView === "graph") {
    return (
      <div className="h-screen font-body text-ink overflow-hidden">
        <GraphView />
      </div>
    );
  }

  return (
    <div className="h-screen font-body text-ink overflow-hidden flex">
      <IconSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenSettings={() => setSettingsOpen((prev) => !prev)} />
        <div className="flex-1 min-h-0 flex">
          {mode === "edit" ? (
            <EditorLayout initialConfig={settingsConfig ?? undefined} />
          ) : (
            <DashboardView />
          )}
          {settingsConfig && settingsOpen && (
            <div className="shrink-0 w-[360px] h-full overflow-y-auto border-l" style={{ borderColor: "var(--border)" }}>
              <SettingsPanel
                config={settingsConfig}
                onChange={handleSettingsChange}
                onChooseNotesDir={() => void handleChooseNotesDir()}
                onClose={() => setSettingsOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 移动端布局 ────────────────────────────────────────────────────────────

type MobileTab = "notes" | "graph" | "settings";

function MobileApp() {
  const [activeTab, setActiveTab] = useState<MobileTab>("notes");
  const [settingsConfig, setSettingsConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    let cleanup = () => {};
    getConfig()
      .then((config) => {
        setSettingsConfig(config);
        const theme = (config.theme || "system") as ThemeOption;
        applyTheme(theme);
        cleanup = watchSystemTheme(theme);
      })
      .catch(() => {});
    return () => cleanup();
  }, []);

  useEffect(() => {
    const unlisten = listen<AppConfig>("config-changed", (event) => {
      setSettingsConfig(event.payload);
      const theme = (event.payload.theme || "system") as ThemeOption;
      applyTheme(theme);
      watchSystemTheme(theme);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const handleSettingsChange = (nextConfig: AppConfig) => {
    setSettingsConfig(nextConfig);
    void emit("config-changed", nextConfig);
    persistSettings(nextConfig);
  };

  const handleChooseNotesDir = async () => {
    const dir = await chooseNotesDirectory();
    if (dir && settingsConfig) {
      handleSettingsChange({ ...settingsConfig, notesDir: dir });
    }
  };

  const handleCloseSettings = () => {
    setActiveTab("notes");
  };

  const tabs = [
    {
      key: "notes" as const,
      label: "笔记",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
    },
    {
      key: "graph" as const,
      label: "图谱",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="6" r="3" />
          <circle cx="5" cy="18" r="3" />
          <circle cx="19" cy="18" r="3" />
          <line x1="10.5" y1="8.5" x2="6.5" y2="15.5" />
          <line x1="13.5" y1="8.5" x2="17.5" y2="15.5" />
          <line x1="9" y1="16" x2="15" y2="16" />
        </svg>
      ),
    },
    {
      key: "settings" as const,
      label: "设置",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen font-body text-ink overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: 0 }}>
        {activeTab === "notes" && (
          <MainWindow initialConfig={settingsConfig ?? undefined} />
        )}
        {activeTab === "graph" && <GraphView />}
        {activeTab === "settings" && settingsConfig && (
          <div className="h-full overflow-y-auto pb-14" style={{ paddingBottom: '56px' }}>
            <SettingsPanel
              config={settingsConfig}
              onChange={handleSettingsChange}
              onChooseNotesDir={() => void handleChooseNotesDir()}
              onClose={handleCloseSettings}
            />
          </div>
        )}
        {activeTab === "settings" && !settingsConfig && (
          <div className="flex items-center justify-center h-full text-ink-ghost text-[13px]">
            加载中…
          </div>
        )}
      </div>
      <MobileTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as MobileTab)}
      />
    </div>
  );
}

// ─── 持久化工具 ────────────────────────────────────────────────────────────

async function persistSettings(config: AppConfig): Promise<void> {
  try {
    await saveConfig(config);
  } catch {
    // 静默失败，主窗口已通过事件同步
  }
}

// ─── 根组件 ────────────────────────────────────────────────────────────────

function App() {
  const { isMobile } = usePlatform();

  return (
    <ContextMenuProvider>
      {isMobile ? <MobileApp /> : <DesktopApp />}
    </ContextMenuProvider>
  );
}

export default App;
