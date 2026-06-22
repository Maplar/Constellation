/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：v4 聚焦桌面端碎片记录、引用图谱与 AI 知识库
 */

import { useEffect, useState } from "react";
import "./App.css";
import { ContextMenuProvider } from "./modules/shared/components/ContextMenu";
import { NotePad } from "./modules/windows/components/NotePad";
import { TileShowcase } from "./modules/windows/components/TileShowcase";
import { getConfig, saveConfig } from "./modules/settings/api";
import { applyTheme, watchSystemTheme } from "./modules/settings/theme";
import type { AppConfig, ThemeOption } from "./modules/shared/types/settings";
import { getInitialRoute } from "./modules/windows/windowRoutes";
import { listen, emit } from "@tauri-apps/api/event";
import { SettingsPanel } from "./modules/settings/components/SettingsPanel";
import { IconSidebar } from "./components/IconSidebar";
import { TopBar } from "./components/TopBar";
import { EditorLayout } from "./components/EditorLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WorkspaceDirectoryBrowser } from "./workspace/components/WorkspaceDirectoryBrowser";
import { connectWorkspace } from "./core-client";

// ─── 桌面端布局 ────────────────────────────────────────────────────────────

function DesktopApp() {
  const [settingsConfig, setSettingsConfig] = useState<AppConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceBrowserOpen, setWorkspaceBrowserOpen] = useState(false);

  useEffect(() => {
    let themeCleanup = () => {};

    getConfig()
      .then((config) => {
        setSettingsConfig(config);
        const theme = (config.theme || "system") as ThemeOption;
        applyTheme(theme);
        themeCleanup = watchSystemTheme(theme);
      })
      .catch(() => {});

    const unlisten = listen<AppConfig>("config-changed", (event) => {
      setSettingsConfig(event.payload);
      const theme = (event.payload.theme || "system") as ThemeOption;
      applyTheme(theme);
      themeCleanup();
      themeCleanup = watchSystemTheme(theme);
    });
    const unlistenWorkspace = listen("workspace-changed", () => {
      void getConfig().then((config) => {
        setSettingsConfig(config);
        void emit("config-changed", config);
      });
    });

    return () => {
      themeCleanup();
      void unlisten.then((fn) => fn());
      void unlistenWorkspace.then((fn) => fn());
    };
  }, []);

  const handleSettingsChange = (nextConfig: AppConfig) => {
    setSettingsConfig(nextConfig);
    void emit("config-changed", nextConfig);
    persistSettings(nextConfig);
  };

  return (
    <div className="h-screen font-body text-ink overflow-hidden flex flex-col">
      <ErrorBoundary fallback={<div className="shrink-0 h-12 flex items-center px-4 text-[13px]" style={{ color: "var(--text-muted)" }}>搜索模块出错，请刷新</div>}>
        <TopBar onOpenSettings={() => setSettingsOpen((prev) => !prev)} />
      </ErrorBoundary>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <IconSidebar />
        <div className="flex-1 min-w-0 flex">
          <EditorLayout
            key={settingsConfig?.notesDir}
            initialConfig={settingsConfig ?? undefined}
          />
          {settingsConfig && settingsOpen && (
            <div className="shrink-0 w-[360px] h-full overflow-y-auto border-l" style={{ borderColor: "var(--border)" }}>
              <SettingsPanel
                config={settingsConfig}
                onChange={handleSettingsChange}
                onChooseNotesDir={() => setWorkspaceBrowserOpen(true)}
                onClose={() => setSettingsOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
      <WorkspaceDirectoryBrowser
        open={workspaceBrowserOpen}
        initialPath={settingsConfig?.notesDir}
        onCancel={() => setWorkspaceBrowserOpen(false)}
        onSelect={(notesDir) => {
          void connectWorkspace(notesDir)
            .then(() => getConfig())
            .then((config) => {
              handleSettingsChange(config);
              setWorkspaceBrowserOpen(false);
            })
            .catch(() => {
              // The browser keeps its recoverable error state visible for a retry.
            });
        }}
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
  const route = getInitialRoute();

  // 特殊视图路由优先 — 无论窗口大小/平台，直接渲染
  if (route.view === "notepad") {
    return (
      <ContextMenuProvider>
        <div className="h-screen font-body text-ink overflow-hidden">
          <NotePad initialNoteId={route.noteId} />
        </div>
      </ContextMenuProvider>
    );
  }

  if (route.view === "tile") {
    return (
      <ContextMenuProvider>
        <div className="h-screen font-body text-ink overflow-hidden">
          <TileShowcase noteId={route.noteId} />
        </div>
      </ContextMenuProvider>
    );
  }

  return (
    <ContextMenuProvider>
      <DesktopApp />
    </ContextMenuProvider>
  );
}

export default App;
