/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { useAppModeStore } from "../modules/shared/stores/useAppModeStore";
import { useNoteStore } from "../modules/notes/stores/useNoteStore";
import { useEditorStore } from "../modules/shared/stores/useEditorStore";
import { getDisplayTitle } from "../modules/shared/utils/noteUtils";

interface ContextMenuState {
  x: number;
  y: number;
  title: string;
}

export function TopBarSearch() {
  const mode = useAppModeStore((s) => s.mode);
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const searchResults = useNoteStore((s) => s.searchResults);
  const setNoteSearch = useNoteStore((s) => s.setSearchQuery);

  const [inputValue, setInputValue] = useState(searchQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleChange = useCallback(
    (value: string) => {
      setInputValue(value);
      setNoteSearch(value);
      setDropdownOpen(mode === "edit" && value.trim().length > 0);
      setSelectedIndex(0);
    },
    [mode, setNoteSearch],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    setNoteSearch("");
    setDropdownOpen(false);
    setContextMenu(null);
  }, [mode, setNoteSearch]);

  const handleFocus = useCallback(() => {
    if (mode === "edit" && inputValue.trim()) {
      setDropdownOpen(true);
    }
  }, [mode, inputValue]);

  const handleInsertReference = useCallback((title: string) => {
    useEditorStore.getState().insertAtCursor?.(`[[${title}]]`);
    setDropdownOpen(false);
    setContextMenu(null);
    handleClear();
  }, [handleClear]);

  const handleContextMenu = useCallback(
    (e: MouseEvent, title: string) => {
      e.preventDefault();
      e.stopPropagation();
      const x = Math.min(e.clientX, window.innerWidth - 160 - 4);
      const y = Math.min(e.clientY, window.innerHeight - 40 - 4);
      setContextMenu({ x: Math.max(4, x), y: Math.max(4, y), title });
    },
    [],
  );

  // Click outside closes dropdown and context menu
  useEffect(() => {
    function handleClick(e: globalThis.MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!dropdownOpen) return;
      const results = searchResults.slice(0, 50);

      if (e.key === "Escape") {
        e.preventDefault();
        setDropdownOpen(false);
        setContextMenu(null);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          handleInsertReference(getDisplayTitle(selected.note));
        }
      }
    },
    [dropdownOpen, searchResults, selectedIndex, handleInsertReference],
  );

  const placeholder = mode === "edit" ? "搜索笔记…" : "搜索节点高亮…";

  const displayResults = searchResults.slice(0, 50);

  return (
    <div ref={containerRef} className="relative flex items-center">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="absolute left-3"
        style={{ color: "var(--text-muted)" }}
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="text-[13px] font-body outline-none transition-all"
        style={{
          width: 240,
          borderRadius: 20,
          backgroundColor: "#f0ede5",
          border: "none",
          padding: "8px 12px 8px 32px",
          color: "var(--text-secondary)",
        }}
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 cursor-pointer"
          style={{ color: "var(--text-muted)" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      {dropdownOpen && mode === "edit" && displayResults.length > 0 && (
        <div
          className="absolute top-full left-0 mt-1 w-[320px] max-h-[360px] bg-cloud/95 backdrop-blur-sm border border-paper-deep/50 rounded-lg shadow-xl overflow-y-auto z-[9998]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {displayResults.map((result, index) => {
            const meta = result.note;
            const title = getDisplayTitle(meta);
            return (
              <div
                key={result.note.id}
                onClick={() => handleInsertReference(title)}
                onContextMenu={(e) => handleContextMenu(e, title)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? "bg-bamboo-mist/70"
                    : "hover:bg-paper-warm/70"
                }`}
              >
                <div className="text-[13px] font-body text-ink-soft truncate">
                  {title}
                </div>
                {meta.category && (
                  <div className="text-[10px] text-ink-ghost/60 font-mono truncate mt-0.5">
                    {meta.category}
                  </div>
                )}
              </div>
            );
          })}
          {searchResults.length > 50 && (
            <div className="px-3 py-1.5 text-[10px] text-ink-ghost/60 text-center border-t border-paper-deep/30">
              仅显示前 50 条结果
            </div>
          )}
        </div>
      )}

      {dropdownOpen && mode === "edit" && inputValue.trim() && displayResults.length === 0 && (
        <div
          className="absolute top-full left-0 mt-1 w-[320px] bg-cloud/95 backdrop-blur-sm border border-paper-deep/50 rounded-lg shadow-xl z-[9998]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-4 text-center text-[12px] text-ink-ghost">
            没有匹配的笔记
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-[9999] min-w-[120px] py-1.5 bg-cloud/95 backdrop-blur-sm border border-paper-deep/50 rounded-lg overflow-hidden select-none animate-menu-enter"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleInsertReference(contextMenu.title)}
            className="w-full flex items-center px-3 py-1.5 text-[12px] font-body text-ink-soft hover:bg-bamboo-mist/60 hover:text-bamboo transition-colors cursor-pointer"
          >
            引用笔记
          </button>
        </div>
      )}
    </div>
  );
}
