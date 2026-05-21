/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useState } from "react";

interface AiSummaryModalProps {
  open: boolean;
  loading: boolean;
  result: string | null;
  error: string | null;
  onClose: () => void;
}

export function AiSummaryModal({
  open,
  loading,
  result,
  error,
  onClose,
}: AiSummaryModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 回退方案：选中文本手动复制
      const textarea = document.createElement("textarea");
      textarea.value = result;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-20 bg-shadow-deep/10 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-h-[70vh] bg-cloud border border-paper-deep/40 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-11 border-b border-paper-deep/25 shrink-0">
          <h3 className="text-[13px] font-display font-medium text-ink-soft">
            AI 总结
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer"
            title="关闭"
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

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-[24px] animate-pulse text-bamboo/50">
                ✦
              </span>
              <span className="ml-2 text-[13px] text-ink-ghost">
                AI 正在生成总结…
              </span>
            </div>
          ) : error ? (
            <p className="text-[13px] text-red-400 leading-relaxed">{error}</p>
          ) : result ? (
            <div className="text-[13px] text-ink-soft leading-relaxed whitespace-pre-wrap">
              {result}
            </div>
          ) : null}
        </div>

        {result && !loading && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-paper-deep/25 shrink-0">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-body transition-colors cursor-pointer ${
                copied
                  ? "text-bamboo bg-bamboo-mist/60 border border-bamboo/30"
                  : "text-ink-faint border border-paper-deep/45 hover:text-bamboo hover:border-bamboo/40 hover:bg-bamboo-mist/50"
              }`}
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  已复制
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  复制到剪贴板
                </>
              )}
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="h-8 px-3 rounded-lg text-[12px] font-body text-ink-faint border border-paper-deep/45 hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
