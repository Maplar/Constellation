/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { useEffect, useRef, useState } from "react";
import type { AppConfig, ThemeOption, TileColorMode, ViewMode } from "../../shared/types/settings";
import { supportedShortcuts } from "../api";
import {
  DEFAULT_TILE_COLOR,
  normalizeTileColor,
} from "../tileColor";
import { applyTheme, watchSystemTheme } from "../theme";
import { SlidingButtonGroup } from "../../shared/components/SlidingButtonGroup";
import { loadAiSettings, saveAiSettings, testAiConnection } from "../ai";
import type { AiSettings } from "../ai";
import { AdvancedToolsPanel } from "./AdvancedToolsPanel";

const tileColorModes: Array<{ value: TileColorMode; label: string }> = [
  { value: "system", label: "跟随主题" },
  { value: "custom", label: "自定义" },
];

const LOCAL_MODEL_PRESETS = [
  { label: "Ollama (本地)", baseUrl: "http://localhost:11434/v1", models: ["llama3", "llama2", "mistral", "codellama", "phi3"] },
  { label: "LM Studio", baseUrl: "http://localhost:1234/v1", models: ["local-model"] },
  { label: "llama.cpp", baseUrl: "http://localhost:8080/v1", models: ["default"] },
  { label: "OpenAI (云端)", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"] },
  { label: "DeepSeek (云端)", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-coder"] },
  { label: "自定义", baseUrl: "", models: [] },
];

interface SettingsPanelProps {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
  onChooseNotesDir: () => void;
  onClose: () => void;
}

const themeOptions: Array<{ value: ThemeOption; label: string }> = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];

const viewModes: Array<{ value: ViewMode; label: string }> = [
  { value: "edit", label: "编辑" },
  { value: "split", label: "分栏" },
  { value: "preview", label: "预览" },
];

export function SettingsPanel({
  config,
  onChange,
  onChooseNotesDir,
  onClose,
}: SettingsPanelProps) {
  const setConfigValue = <Key extends keyof AppConfig>(
    key: Key,
    value: AppConfig[Key],
  ) => {
    onChange({ ...config, [key]: value });
  };

  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [aiTestStatus, setAiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [aiTestMessage, setAiTestMessage] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("OpenAI (云端)");
  const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);

  useEffect(() => {
    void loadAiSettings().then((loaded) => {
      setAiSettings(loaded);
      const preset = LOCAL_MODEL_PRESETS.find((p) => p.baseUrl === loaded.baseUrl);
      if (preset) {
        setSelectedPreset(preset.label);
      } else if (loaded.baseUrl) {
        setSelectedPreset("自定义");
      }
    });
  }, []);

  const handleAiChange = (partial: Partial<AiSettings>) => {
    if (!aiSettings) return;
    setAiSettings({ ...aiSettings, ...partial });
    setAiTestStatus("idle");
    setAiTestMessage("");
  };

  const handlePresetChange = (presetLabel: string) => {
    setSelectedPreset(presetLabel);
    const preset = LOCAL_MODEL_PRESETS.find((p) => p.label === presetLabel);
    if (preset && preset.baseUrl) {
      handleAiChange({ baseUrl: preset.baseUrl });
    }
  };

  const handleSaveAiConfig = async () => {
    if (!aiSettings) return;
    try {
      await saveAiSettings(aiSettings);
      setAiTestStatus("success");
      setAiTestMessage("保存成功");
      setTimeout(() => {
        setAiTestStatus((s) => (s === "success" ? "idle" : s));
        setAiTestMessage("");
      }, 2000);
    } catch {
      setAiTestStatus("error");
      setAiTestMessage("保存失败");
    }
  };

  const handleTestConnection = async () => {
    if (!aiSettings) return;
    setAiTestStatus("testing");
    setAiTestMessage("");
    try {
      const reply = await testAiConnection(aiSettings);
      setAiTestStatus("success");
      setAiTestMessage(reply);
    } catch (error) {
      setAiTestStatus("error");
      setAiTestMessage(String(error));
    }
  };

  if (advancedToolsOpen) {
    return (
      <aside className="w-[360px] h-full shrink-0 border-l border-paper-deep/30 bg-cloud/92 backdrop-blur-sm">
        <AdvancedToolsPanel
          notesDir={config.notesDir}
          onClose={() => setAdvancedToolsOpen(false)}
        />
      </aside>
    );
  }

  return (
    <aside className="w-[360px] h-full shrink-0 border-l border-paper-deep/30 bg-cloud/92 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between h-11 px-4 border-b border-paper-deep/25">
        <h2 className="text-[13px] font-display font-medium text-ink-soft">
          应用设置
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer"
          title="关闭设置"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hidden px-4 py-4 space-y-5">
        <section className="space-y-2">
          <label className="block text-[11px] font-body text-ink-faint">
            主题
          </label>
          <SlidingButtonGroup
            options={themeOptions}
            value={config.theme}
            onChange={(v: ThemeOption) => {
              setConfigValue("theme", v);
              applyTheme(v);
              watchSystemTheme(v);
            }}
          />
        </section>

        <section className="space-y-2">
          <label className="block text-[11px] font-body text-ink-faint">
            笔记目录
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.notesDir}
              readOnly
              className="min-w-0 flex-1 h-8 px-2.5 rounded-lg bg-paper-warm/70 border border-paper-deep/40 text-[11px] font-mono text-ink-faint truncate"
            />
            <button
              type="button"
              onClick={onChooseNotesDir}
              className="h-8 px-3 rounded-lg border border-paper-deep/45 text-[11px] text-ink-faint hover:text-bamboo hover:bg-bamboo-mist/50 transition-colors cursor-pointer"
            >
              选择文件夹
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <label className="block text-[11px] font-body text-ink-faint">
            快捷键
          </label>
          <ShortcutDropdown
            value={config.globalShortcut}
            options={[...supportedShortcuts]}
            onChange={(v) => setConfigValue("globalShortcut", v)}
          />
        </section>

        <section className="space-y-2">
          <ToggleRow
            label="关闭到托盘"
            checked={config.closeToTray}
            onChange={(checked) => setConfigValue("closeToTray", checked)}
          />
          <ToggleRow
            label="开机自启"
            checked={config.autostart}
            onChange={(checked) => setConfigValue("autostart", checked)}
          />
          <ToggleRow
            label="自动保存笔记"
            checked={config.noteAutoSave}
            onChange={(checked) => setConfigValue("noteAutoSave", checked)}
          />
          <ToggleRow
            label="小窗笔记自动保存"
            checked={config.noteSurfaceAutoSave}
            onChange={(checked) =>
              setConfigValue("noteSurfaceAutoSave", checked)
            }
          />
        </section>

        <section className="space-y-2">
          <label className="block text-[11px] font-body text-ink-faint">
            编辑器字号
          </label>
          <div className="flex items-center gap-3 h-9 rounded-lg px-2.5 bg-paper-warm/45 border border-paper-deep/25">
            <input
              type="range"
              min={8}
              max={30}
              step={1}
              value={config.fontSize ?? 14}
              onChange={(event) =>
                setConfigValue("fontSize", Number(event.target.value))
              }
              className="flex-1 h-1 accent-bamboo cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-paper-deep/50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bamboo [&::-webkit-slider-thumb]:-mt-[4.5px] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
            />
            <span className="text-[12px] font-mono text-ink-soft tabular-nums w-8 text-right">
              {config.fontSize ?? 14}px
            </span>
          </div>
        </section>

        <section className="space-y-2">
          <label className="block text-[11px] font-body text-ink-faint">
            小窗/磁贴字号
          </label>
          <div className="flex items-center gap-3 h-9 rounded-lg px-2.5 bg-paper-warm/45 border border-paper-deep/25">
            <input
              type="range"
              min={8}
              max={30}
              step={1}
              value={config.surfaceFontSize ?? 14}
              onChange={(event) =>
                setConfigValue("surfaceFontSize", Number(event.target.value))
              }
              className="flex-1 h-1 accent-bamboo cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-paper-deep/50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bamboo [&::-webkit-slider-thumb]:-mt-[4.5px] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
            />
            <span className="text-[12px] font-mono text-ink-soft tabular-nums w-8 text-right">
              {config.surfaceFontSize ?? 14}px
            </span>
          </div>
        </section>

        <section className="space-y-2">
          <label className="block text-[11px] font-body text-ink-faint">
            磁贴颜色
          </label>
          <SlidingButtonGroup
            options={tileColorModes}
            value={config.tileColorMode}
            onChange={(v: TileColorMode) => setConfigValue("tileColorMode", v)}
          />
          {config.tileColorMode === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalizeTileColor(config.tileColor)}
                onChange={(event) =>
                  setConfigValue("tileColor", event.target.value)
                }
                className="w-10 h-8 rounded-lg border border-paper-deep/40 bg-paper-warm/70 cursor-pointer"
              />
              <input
                type="text"
                value={config.tileColor}
                onChange={(event) =>
                  setConfigValue("tileColor", event.target.value)
                }
                placeholder="#f6f3ec"
                spellCheck={false}
                className="min-w-0 flex-1 h-8 px-2.5 rounded-lg bg-paper-warm/70 border border-paper-deep/40 text-[12px] font-mono text-ink-soft outline-none"
              />
              <button
                type="button"
                onClick={() => setConfigValue("tileColor", DEFAULT_TILE_COLOR)}
                className="h-8 px-2.5 rounded-lg border border-paper-deep/45 text-[11px] text-ink-faint hover:text-bamboo hover:bg-bamboo-mist/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                默认
              </button>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <label className="block text-[11px] font-body text-ink-faint">
            默认视图
          </label>
          <SlidingButtonGroup
            options={viewModes}
            value={config.defaultViewMode}
            onChange={(v) => setConfigValue("defaultViewMode", v)}
          />
        </section>

        <section className="space-y-3 pt-4 border-t border-paper-deep/20">
          <h3 className="text-[10px] font-mono tracking-wider text-ink-ghost uppercase">
            AI 服务
          </h3>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-body text-ink-faint">
              服务提供商
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-2.5 h-8 rounded-lg bg-paper-warm/80 border border-paper-deep/40 text-[12px] font-mono text-ink focus:border-bamboo/30 transition-colors cursor-pointer"
            >
              {LOCAL_MODEL_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-body text-ink-faint">
              API Key
            </label>
            <input
              type="password"
              value={aiSettings?.apiKey ?? ""}
              onChange={(e) => handleAiChange({ apiKey: e.target.value })}
              placeholder={aiSettings?.hasApiKey ? "已安全保存，留空表示保持不变" : "sk-... (本地模型可留空)"}
              autoComplete="off"
              className="w-full px-2.5 h-8 rounded-lg bg-paper-warm/80 border border-paper-deep/40 text-[12px] font-mono text-ink placeholder:text-ink-ghost/50 focus:border-bamboo/30 transition-colors"
            />
            <p className="text-[10px] text-ink-ghost/50 leading-relaxed">
              本地模型（如 Ollama）可留空，云端服务需要填写
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-body text-ink-faint">
              Base URL
            </label>
            <input
              type="text"
              value={aiSettings?.baseUrl ?? ""}
              onChange={(e) => handleAiChange({ baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1"
              className="w-full px-2.5 h-8 rounded-lg bg-paper-warm/80 border border-paper-deep/40 text-[12px] font-mono text-ink placeholder:text-ink-ghost/50 focus:border-bamboo/30 transition-colors"
            />
            <p className="text-[10px] text-ink-ghost/60 leading-relaxed">
              Ollama 默认 http://localhost:11434/v1，LM Studio 默认 http://localhost:1234/v1
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-body text-ink-faint">
              模型名称
            </label>
            {(() => {
              const preset = LOCAL_MODEL_PRESETS.find((p) => p.label === selectedPreset);
              if (preset && preset.models.length > 0) {
                return (
                  <select
                    value={aiSettings?.model ?? ""}
                    onChange={(e) => handleAiChange({ model: e.target.value })}
                    className="w-full px-2.5 h-8 rounded-lg bg-paper-warm/80 border border-paper-deep/40 text-[12px] font-mono text-ink focus:border-bamboo/30 transition-colors cursor-pointer"
                  >
                    <option value="">选择模型...</option>
                    {preset.models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                );
              }
              return (
                <input
                  type="text"
                  value={aiSettings?.model ?? ""}
                  onChange={(e) => handleAiChange({ model: e.target.value })}
                  placeholder="gpt-3.5-turbo"
                  className="w-full px-2.5 h-8 rounded-lg bg-paper-warm/80 border border-paper-deep/40 text-[12px] font-mono text-ink placeholder:text-ink-ghost/50 focus:border-bamboo/30 transition-colors"
                />
              );
            })()}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-body text-ink-faint">
              允许 AI 读取的文件夹
            </label>
            <textarea
              rows={3}
              value={(aiSettings?.allowedFolders ?? []).join("\n")}
              onChange={(event) =>
                handleAiChange({
                  allowedFolders: event.target.value
                    .split(/\r?\n/)
                    .map((value) =>
                      value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""),
                    )
                    .filter(Boolean),
                })
              }
              placeholder={"每行一个工作区相对路径\n留空表示整个工作区"}
              className="w-full px-2.5 py-2 rounded-lg bg-paper-warm/80 border border-paper-deep/40 text-[11px] font-mono text-ink placeholder:text-ink-ghost/50 focus:border-bamboo/30 transition-colors resize-y"
            />
            <p className="text-[10px] text-ink-ghost/60 leading-relaxed">
              文件夹范围由 Rust Core 强制执行，修改服务商后需要重新确认正文外发。
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveAiConfig}
              className="flex-1 h-8 rounded-lg border border-bamboo/40 text-[12px] font-body text-bamboo hover:bg-bamboo-mist/60 transition-colors cursor-pointer"
            >
              保存配置
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={aiTestStatus === "testing"}
              className={`flex-1 h-8 rounded-lg border text-[12px] font-body transition-colors cursor-pointer ${
                aiTestStatus === "testing"
                  ? "border-paper-deep/30 text-ink-ghost cursor-wait"
                  : "border-paper-deep/45 text-ink-faint hover:text-bamboo hover:border-bamboo/40 hover:bg-bamboo-mist/50"
              }`}
            >
              {aiTestStatus === "testing" ? "测试中…" : "测试连接"}
            </button>
          </div>

          {aiTestMessage && (
            <p
              className={`text-[11px] leading-relaxed px-2.5 py-1.5 rounded-lg ${
                aiTestStatus === "success"
                  ? "text-bamboo bg-bamboo-mist/40"
                  : "text-red-400 bg-danger-bg"
              }`}
            >
              {aiTestMessage}
            </p>
          )}
        </section>

        <section className="pt-4 border-t border-paper-deep/20">
          <button
            type="button"
            onClick={() => setAdvancedToolsOpen(true)}
            className="w-full min-h-10 rounded-xl border border-bamboo/40 text-[12px] text-bamboo hover:bg-bamboo-mist/50 transition-colors"
          >
            数据与高级工具
          </button>
        </section>
      </div>
    </aside>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between h-9 rounded-lg px-2.5 bg-paper-warm/45 border border-paper-deep/25 cursor-pointer">
      <span className="text-[12px] text-ink-soft">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <div
        className={`relative w-8 h-[18px] rounded-full transition-colors duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          checked ? "bg-bamboo" : "bg-paper-deep/50"
        }`}
      >
        <div
          className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
          style={{
            transform: `translateX(${checked ? 14 : 0}px)`,
            transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        />
      </div>
    </label>
  );
}

interface ShortcutDropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function ShortcutDropdown({ value, options, onChange }: ShortcutDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-8 px-2.5 rounded-lg bg-paper-warm/70 border border-paper-deep/40 text-[12px] text-ink-soft flex items-center justify-between cursor-pointer hover:border-paper-deep/60 transition-colors"
      >
        <span>{value}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-ink-ghost transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>
      <ul
        className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-paper-deep/30 bg-cloud/95 backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden z-10"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-4px)",
          transition: "opacity 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {options.map((opt) => (
          <li key={opt} className="list-none">
            <button
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full h-8 px-2.5 text-left text-[12px] transition-colors cursor-pointer ${
                opt === value
                  ? "text-bamboo bg-bamboo-mist/40 font-medium"
                  : "text-ink-soft hover:bg-paper-warm/60"
              }`}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
