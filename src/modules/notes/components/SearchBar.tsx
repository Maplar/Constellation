/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useState, useEffect } from "react";
import { useNoteStore } from "../stores/useNoteStore";
import { useDebounce } from "../../shared/hooks/useDebounce";

interface SearchBarProps {
  resultCount?: number;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchBar({
  resultCount,
  placeholder = "搜索笔记…",
  debounceMs = 200,
}: SearchBarProps) {
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const searchResults = useNoteStore((s) => s.searchResults) ?? [];
  const setSearchQuery = useNoteStore((s) => s.setSearchQuery);

  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedValue = useDebounce(inputValue, debounceMs);

  // Sync debounced value to store
  useEffect(() => {
    setSearchQuery(debouncedValue);
    // setSearchQuery is stable (zustand selector)
  }, [debouncedValue]);

  // Sync store → local (handles clear from external sources)
  useEffect(() => {
    setInputValue(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleClear = () => {
    setInputValue("");
    setSearchQuery("");
  };

  const displayCount = resultCount ?? searchResults.length;

  return (
    <div className="px-3 pt-3 pb-2 shrink-0">
      <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-paper-warm/80 border border-paper-deep/40 focus-within:border-bamboo/30 focus-within:bg-cloud transition-all">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-ink-ghost shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-[12px] font-body text-ink placeholder:text-ink-ghost/60 bg-transparent outline-none"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="text-ink-ghost hover:text-ink-faint transition-colors cursor-pointer"
            title="清空搜索"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {searchQuery && (
        <div className="mt-1.5 px-1 text-[10px] text-ink-ghost font-mono">
          {displayCount > 0
            ? `${displayCount} 条结果`
            : "无匹配结果"}
        </div>
      )}
    </div>
  );
}
