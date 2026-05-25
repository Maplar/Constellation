/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useState, useCallback, useEffect } from "react";
import { useAppModeStore } from "../modules/shared/stores/useAppModeStore";
import { useNoteStore } from "../modules/notes/stores/useNoteStore";
import { useGraphStore } from "../modules/visualization/stores/useGraphStore";

export function TopBarSearch() {
  const mode = useAppModeStore((s) => s.mode);
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const setNoteSearch = useNoteStore((s) => s.setSearchQuery);
  const setGraphSearch = useGraphStore((s) => s.setSearchQuery);

  const [inputValue, setInputValue] = useState(searchQuery);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleChange = useCallback(
    (value: string) => {
      setInputValue(value);
      setNoteSearch(value);
      if (mode !== "edit") setGraphSearch(value);
    },
    [mode, setNoteSearch, setGraphSearch],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    setNoteSearch("");
    if (mode !== "edit") setGraphSearch("");
  }, [mode, setNoteSearch, setGraphSearch]);

  const placeholder = mode === "edit" ? "搜索笔记…" : "搜索节点高亮…";

  return (
    <div className="relative flex items-center">
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
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
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
    </div>
  );
}
