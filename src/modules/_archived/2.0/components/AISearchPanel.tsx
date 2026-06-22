/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：AI 数据库检索面板
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useDebounce } from "../modules/shared/hooks/useDebounce";
import { searchWithTantivy } from "../modules/notes/services/searchService";
import { listNotes } from "../modules/notes/api";
import { getConfig } from "../modules/settings/api";
import type { NoteMetadata } from "../modules/shared/types/notes";

interface KnowledgeSearchResult {
  note: NoteMetadata;
  score: number;
  snippet: string;
}

interface AISearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote?: (noteId: string) => void;
}

export function AISearchPanel({ isOpen, onClose, onSelectNote }: AISearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getConfig(), listNotes()])
      .then(async ([config, notes]) => {
        const results = await searchWithTantivy(config.notesDir, debouncedQuery, 8);
        const noteMap = new Map(notes.map((note) => [note.id, note]));
        return results.flatMap((result) => {
          const note = noteMap.get(result.noteId);
          return note ? [{ note, score: result.score, snippet: result.snippet }] : [];
        });
      })
      .then((searchResults) => {
        if (!cancelled) setResults(searchResults);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setError("知识索引尚未就绪，请先保存或重新打开笔记库");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-dark w-full max-w-[640px] max-h-[80vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 搜索输入区 */}
        <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="relative">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索知识库，例如「React 性能优化」..."
              className="w-full px-4 py-3 pl-10 rounded-xl text-[14px] outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                color: "var(--text-primary)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
            AI 数据库 · Rust 全文索引 · 来源可追踪
          </div>
        </div>

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading && (
            <div className="text-center py-12 text-[13px]" style={{ color: "var(--text-muted)" }}>
              <div className="inline-block w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
              <div className="mt-2">正在搜索...</div>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-12 text-[13px]" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && debouncedQuery && (
            <div className="text-center py-12 text-[13px]" style={{ color: "var(--text-muted)" }}>
              未找到相关笔记
            </div>
          )}

          {!loading && !error && !debouncedQuery && (
            <div className="text-center py-12 text-[13px]" style={{ color: "var(--text-muted)" }}>
              输入问题或关键词检索知识库
            </div>
          )}

          {results.map((r) => (
            <div
              key={r.note.id}
              className="glass-card p-4 cursor-pointer hover:scale-[1.01] transition-all duration-200"
              onClick={() => {
                onSelectNote?.(r.note.id);
                onClose();
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium mb-1 truncate" style={{ color: "var(--text-primary)" }}>
                    {r.note.title}
                  </div>
                  <div className="text-[12px] line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {r.snippet}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                  >
                    {r.score.toFixed(1)}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {r.note.category || "未分类"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-2 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Esc 关闭 · 点击结果跳转笔记
          </span>
        </div>
      </div>
    </div>
  );
}
