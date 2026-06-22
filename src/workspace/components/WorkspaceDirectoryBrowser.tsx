/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useMemo, useState } from "react";
import { browseWorkspaceDirectories } from "../../core-client";
import type { BrowseEntry } from "../../core-client";

interface WorkspaceDirectoryBrowserProps {
  open: boolean;
  initialPath?: string;
  title?: string;
  includeFiles?: boolean;
  fileExtensions?: string[];
  selectLabel?: string;
  onCancel: () => void;
  onSelect: (path: string) => void;
}

export function WorkspaceDirectoryBrowser({
  open,
  initialPath,
  title = "选择工作区目录",
  includeFiles = false,
  fileExtensions,
  selectLabel = "选择当前目录",
  onCancel,
  onSelect,
}: WorkspaceDirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath ?? "");
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setCurrentPath(initialPath ?? "");
  }, [initialPath, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void browseWorkspaceDirectories(currentPath || undefined, {
      includeFiles,
      extensions: fileExtensions,
    })
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((reason) => {
        if (!cancelled) {
          setEntries([]);
          setError(String(reason));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPath, fileExtensions, includeFiles, open]);

  const parentPath = useMemo(() => {
    if (!currentPath) return "";
    const normalized = currentPath.replace(/[\\/]+$/, "");
    const separator = Math.max(normalized.lastIndexOf("\\"), normalized.lastIndexOf("/"));
    if (separator < 0) return "";
    const parent = normalized.slice(0, separator);
    return parent || normalized.slice(0, separator + 1);
  }, [currentPath]);

  if (!open) return null;

  const openEntry = (entry: BrowseEntry) => {
    if (entry.isDirectory) {
      setCurrentPath(entry.path);
    } else {
      onSelect(entry.path);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/25 backdrop-blur-[2px] flex items-center justify-center p-6">
      <section className="w-full max-w-[680px] max-h-[72vh] rounded-2xl border border-paper-deep/60 bg-cloud shadow-2xl flex flex-col overflow-hidden">
        <header className="h-12 px-4 flex items-center justify-between border-b border-paper-deep/40">
          <div>
            <h2 className="text-[13px] font-display text-ink">{title}</h2>
            <p className="text-[10px] text-ink-faint">应用内浏览，不调用系统文件管理器</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-warm"
          >
            关闭
          </button>
        </header>

        <div className="p-3 border-b border-paper-deep/30 flex gap-2">
          <button
            type="button"
            disabled={!parentPath || parentPath === currentPath}
            onClick={() => setCurrentPath(parentPath)}
            className="h-8 px-3 rounded-lg border border-paper-deep/50 text-[11px] text-ink-soft disabled:opacity-35"
          >
            上一级
          </button>
          <input
            value={currentPath}
            onChange={(event) => setCurrentPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setCurrentPath(event.currentTarget.value.trim());
            }}
            placeholder="输入目录路径并按 Enter"
            className="flex-1 h-8 px-3 rounded-lg border border-paper-deep/50 bg-paper-warm/65 text-[11px] font-mono text-ink outline-none focus:border-bamboo"
          />
        </div>

        <div className="flex-1 min-h-[280px] overflow-y-auto p-2">
          {loading ? (
            <div className="h-full flex items-center justify-center text-[12px] text-ink-faint">
              正在读取目录...
            </div>
          ) : error ? (
            <div className="m-2 rounded-xl border border-red-300/50 bg-red-50/60 p-3 text-[11px] text-red-600">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[12px] text-ink-faint">
              此目录没有可显示的内容
            </div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onDoubleClick={() => openEntry(entry)}
                onClick={() => openEntry(entry)}
                className="w-full h-10 px-3 rounded-xl flex items-center justify-between text-left hover:bg-bamboo-mist/60 focus:bg-bamboo-mist/60"
              >
                <span className="truncate text-[12px] text-ink-soft">{entry.name}</span>
                <span className="text-[10px] text-ink-ghost">
                  {entry.isDirectory
                    ? entry.isWorkspace
                      ? "Constellation 工作区"
                      : "文件夹"
                    : "Markdown"}
                </span>
              </button>
            ))
          )}
        </div>

        <footer className="p-3 border-t border-paper-deep/40 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[10px] font-mono text-ink-faint">
            {currentPath || "用户目录"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-8 px-4 rounded-lg border border-paper-deep/50 text-[11px] text-ink-soft"
            >
              取消
            </button>
            {!includeFiles && (
              <button
                type="button"
                disabled={!currentPath || Boolean(error)}
                onClick={() => onSelect(currentPath)}
                className="h-8 px-4 rounded-lg bg-bamboo text-white text-[11px] disabled:opacity-40"
              >
                {selectLabel}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
