/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：WebDAV 同步设置面板
 */

import { useEffect, useRef, useState } from "react";
import {
  loadSyncConfig,
  saveSyncConfig,
  syncWorkspaceWithRetry,
  testWebDavConnection,
  type SyncConfig,
} from "../../../core-client";
import { getConfig } from "../api";

export interface WebDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  remotePath: string;
  syncDirection: "upload" | "download" | "bidirectional";
  autoSync: boolean;
  syncInterval: number;
}

const DEFAULT_CONFIG: WebDAVConfig = {
  serverUrl: "",
  username: "",
  password: "",
  remotePath: "/notes",
  syncDirection: "bidirectional",
  autoSync: false,
  syncInterval: 300,
};

interface SyncSettingsPanelProps {
  onClose: () => void;
}

export function SyncSettingsPanel({ onClose }: SyncSettingsPanelProps) {
  const [config, setConfig] = useState<WebDAVConfig>(DEFAULT_CONFIG);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [notesDir, setNotesDir] = useState("");
  const initialized = useRef(false);

  const coreConfig = (value: WebDAVConfig): SyncConfig => ({
    serverUrl: value.serverUrl,
    username: value.username,
    password: value.password,
    remotePath: value.remotePath,
    syncDirection: value.syncDirection,
    forceFullSync: false,
    autoSync: value.autoSync,
    syncInterval: value.syncInterval,
  });

  useEffect(() => {
    let cancelled = false;
    void getConfig()
      .then(async (appConfig) => {
        const saved = await loadSyncConfig(appConfig.notesDir);
        if (!cancelled) {
          setNotesDir(appConfig.notesDir);
          setConfig((current) => ({ ...current, ...saved, password: "" }));
          initialized.current = true;
        }
      })
      .catch((error) => {
        if (!cancelled) setSyncMessage(String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialized.current || !notesDir) return;
    const timer = window.setTimeout(() => {
      void saveSyncConfig(notesDir, coreConfig(config)).catch((error) =>
        setSyncMessage(String(error)),
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [config, notesDir]);

  useEffect(() => {
    if (!config.autoSync || !notesDir || !config.serverUrl) return;
    let cancelled = false;
    let timer: number | undefined;
    let failures = 0;
    const run = async () => {
      try {
        setSyncStatus("syncing");
        const result = await syncWorkspaceWithRetry(coreConfig(config), notesDir, 3);
        if (cancelled) return;
        failures = 0;
        setSyncStatus("success");
        setSyncMessage(
          `上传 ${result.uploaded}，下载 ${result.downloaded}，冲突 ${result.conflicts}`,
        );
      } catch (error) {
        if (cancelled) return;
        failures += 1;
        setSyncStatus("error");
        setSyncMessage(String(error));
      }
      const base = Math.max(60, config.syncInterval) * 1000;
      const delay = Math.min(base * 2 ** failures, 3_600_000);
      timer = window.setTimeout(run, delay);
    };
    timer = window.setTimeout(run, Math.max(60, config.syncInterval) * 1000);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [config, notesDir]);

  const handleChange = (partial: Partial<WebDAVConfig>) => {
    setConfig({ ...config, ...partial });
    setTestStatus("idle");
    setTestMessage("");
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const result = await testWebDavConnection(
        config.serverUrl,
        config.username,
        config.password,
      );
      setTestStatus("success");
      setTestMessage(result || "连接成功");
    } catch (error) {
      setTestStatus("error");
      setTestMessage(String(error));
    }
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    setSyncMessage("");
    try {
      const appConfig = await getConfig();
      await saveSyncConfig(appConfig.notesDir, coreConfig(config));
      const result = await syncWorkspaceWithRetry(coreConfig(config), appConfig.notesDir, 3);
      setSyncStatus("success");
      setSyncMessage(
        `上传 ${result.uploaded}，下载 ${result.downloaded}，冲突 ${result.conflicts}，跳过 ${result.skipped}`,
      );
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(String(error));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          WebDAV 同步设置
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--hover-bg)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--card-bg)" }}>
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            服务器配置
          </h3>

          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>
              服务器地址
            </label>
            <input
              type="url"
              value={config.serverUrl}
              onChange={(e) => handleChange({ serverUrl: e.target.value })}
              placeholder="https://your-nas.example.com:5006"
              className="w-full px-3 h-8 rounded border text-sm"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              支持群晖、威联通、Nextcloud、坚果云等 WebDAV 服务
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>
              用户名
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => handleChange({ username: e.target.value })}
              placeholder="your-username"
              className="w-full px-3 h-8 rounded border text-sm"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>
              密码
            </label>
            <input
              type="password"
              value={config.password}
              onChange={(e) => handleChange({ password: e.target.value })}
              placeholder="••••••••"
              autoComplete="off"
              className="w-full px-3 h-8 rounded border text-sm"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              密码加密存储于本地
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>
              远程路径
            </label>
            <input
              type="text"
              value={config.remotePath}
              onChange={(e) => handleChange({ remotePath: e.target.value })}
              placeholder="/notes"
              className="w-full px-3 h-8 rounded border text-sm"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              这是 WebDAV 服务器内的目录，不是本机文件夹。
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>
              同步方向
            </label>
            <select
              value={config.syncDirection}
              onChange={(e) => handleChange({ syncDirection: e.target.value as WebDAVConfig["syncDirection"] })}
              className="w-full px-3 h-8 rounded border text-sm cursor-pointer"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="bidirectional">双向同步</option>
              <option value="upload">仅上传</option>
              <option value="download">仅下载</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
              自动同步
            </label>
            <input
              type="checkbox"
              checked={config.autoSync}
              onChange={(e) => handleChange({ autoSync: e.target.checked })}
              className="cursor-pointer"
            />
          </div>

          {config.autoSync && (
            <div className="space-y-1.5">
              <label className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                同步间隔（秒）
              </label>
              <input
                type="number"
                value={config.syncInterval}
                onChange={(e) => handleChange({ syncInterval: parseInt(e.target.value) || 300 })}
                min={60}
                max={3600}
                className="w-full px-3 h-8 rounded border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleTestConnection()}
            disabled={testStatus === "testing"}
            className="flex-1 h-9 rounded border text-sm transition-colors"
            style={{
              borderColor: testStatus === "testing" ? "var(--border)" : "var(--accent-border)",
              color: testStatus === "testing" ? "var(--text-muted)" : "var(--accent)",
              opacity: testStatus === "testing" ? 0.6 : 1,
            }}
          >
            {testStatus === "testing" ? "测试中…" : "测试连接"}
          </button>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncStatus === "syncing"}
            className="flex-1 h-9 rounded text-sm transition-colors"
            style={{
              backgroundColor: syncStatus === "syncing" ? "var(--hover-bg)" : "var(--accent)",
              color: "white",
              opacity: syncStatus === "syncing" ? 0.6 : 1,
            }}
          >
            {syncStatus === "syncing" ? "同步中…" : "立即同步"}
          </button>
        </div>

        {testMessage && (
          <div
            className="p-3 rounded text-xs"
            style={{
              backgroundColor: testStatus === "success" ? "var(--success-bg)" : "var(--error-bg)",
              color: testStatus === "success" ? "var(--success-text)" : "var(--error-text)",
            }}
          >
            {testMessage}
          </div>
        )}

        {syncMessage && (
          <div
            className="p-3 rounded text-xs"
            style={{
              backgroundColor: syncStatus === "success" ? "var(--success-bg)" : "var(--error-bg)",
              color: syncStatus === "success" ? "var(--success-text)" : "var(--error-text)",
            }}
          >
            {syncMessage}
          </div>
        )}

        <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--card-bg)" }}>
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            同步说明
          </h3>
          <ul className="text-[11px] space-y-1" style={{ color: "var(--text-secondary)" }}>
            <li>• 双向同步会自动检测文件变更，保留最新版本</li>
            <li>• 冲突时会保留两个版本（重命名策略）</li>
            <li>• 支持 .md 文件和附件（图片等）同步</li>
            <li>• 首次同步会上传本地所有笔记</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
