/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useNoteStore } from "../stores/useNoteStore";
import { getDisplayTitle } from "../../shared/utils/noteUtils";

interface NotePickerModalProps {
  open: boolean;
  onSelect: (title: string) => void;
  onClose: () => void;
}

const MAX_VISIBLE = 100;

export function NotePickerModal({ open, onSelect, onClose }: NotePickerModalProps) {
  const notesMetadata = useNoteStore((s) => s.notesMetadata);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(notesMetadata, {
        keys: ["title"],
        threshold: 0.3,
      }),
    [notesMetadata],
  );

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return notesMetadata.slice(0, MAX_VISIBLE);
    return fuse
      .search(trimmed)
      .slice(0, MAX_VISIBLE)
      .map((r) => r.item);
  }, [query, notesMetadata, fuse]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
          onSelect(getDisplayTitle(selected));
        }
      }
    },
    [onClose, results, selectedIndex, onSelect],
  );

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-[420px] max-h-[480px] bg-cloud/95 backdrop-blur-sm border border-paper-deep/50 rounded-xl shadow-xl flex flex-col overflow-hidden animate-menu-enter"
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 pt-4 pb-2 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索笔记标题…"
            className="w-full px-3 h-8 rounded-lg text-[13px] font-body text-ink bg-paper-warm/80 border border-paper-deep/40 focus:border-bamboo/30 placeholder:text-ink-ghost/60 outline-none"
          />
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-ink-ghost">
              没有匹配的笔记
            </div>
          ) : (
            results.map((note, index) => {
              const title = getDisplayTitle(note);
              return (
                <button
                  key={note.id}
                  onClick={() => onSelect(title)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-body transition-colors cursor-pointer ${
                    index === selectedIndex
                      ? "bg-bamboo-mist/70 text-bamboo"
                      : "text-ink-soft hover:bg-paper-warm/70"
                  }`}
                >
                  <span className="truncate block">{title}</span>
                  {note.category && (
                    <span className="text-[10px] text-ink-ghost/60 font-mono truncate block mt-0.5">
                      {note.category}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-paper-deep/30 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-ink-ghost font-mono">
            {results.length > 0 ? `${selectedIndex + 1} / ${results.length}` : "无结果"}
          </span>
          <span className="text-[10px] text-ink-ghost/60">
            ↑↓ 导航 · Enter 选择 · Esc 取消
          </span>
        </div>
      </div>
    </div>
  );
}
