/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useMemo } from "react";
import { useGraphStore } from "../../stores/useGraphStore";
import { useNoteStore } from "../../../notes/stores/useNoteStore";

interface ClusterToolbarProps {
  focusedCategory: string | null;
  onFocusCategory: (cat: string | null) => void;
}

export function ClusterToolbar({ focusedCategory, onFocusCategory }: ClusterToolbarProps) {
  const { graphParams, updateGraphParams } = useGraphStore();
  const { notesMetadata } = useNoteStore();

  const categories = useMemo(() => {
    const set = new Set(notesMetadata.map((n) => n.category || "未分类"));
    return Array.from(set).sort();
  }, [notesMetadata]);

  return (
    <>
      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "var(--color-ink-faint)" }}>
        <span>旋转</span>
        <ToggleSwitch
          checked={graphParams.autoRotate}
          onChange={(v) => updateGraphParams({ autoRotate: v })}
        />
      </label>
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-ink-ghost)" }}>
        <span>辉光</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(graphParams.glowIntensity * 100)}
          onChange={(e) => updateGraphParams({ glowIntensity: Number(e.target.value) / 100 })}
          className="w-16 h-1"
          style={{ accentColor: "var(--color-bamboo)" }}
        />
      </div>
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-ink-ghost)" }}>
        <span>粒子</span>
        <input
          type="range"
          min={100}
          max={1000}
          step={50}
          value={graphParams.particleCount}
          onChange={(e) => updateGraphParams({ particleCount: Number(e.target.value) })}
          className="w-16 h-1"
          style={{ accentColor: "var(--color-bamboo)" }}
        />
      </div>
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-ink-ghost)" }}>
        <span>聚焦:</span>
        <select
          value={focusedCategory || ""}
          onChange={(e) => onFocusCategory(e.target.value || null)}
          className="px-1.5 py-0.5 rounded text-[11px] border cursor-pointer"
          style={{
            backgroundColor: "var(--color-paper-warm)",
            borderColor: "var(--color-paper-deep)",
            color: "var(--color-ink-soft)",
          }}
        >
          <option value="">全部</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="flex-1" />
    </>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center cursor-pointer"
      style={{ width: 32, height: 18 }}
    >
      <span
        className="absolute inset-0 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? "var(--color-bamboo)" : "var(--color-paper-deep)",
        }}
      />
      <span
        className="absolute top-[2px] rounded-full bg-white transition-transform"
        style={{
          width: 14,
          height: 14,
          left: 2,
          transform: checked ? "translateX(14px)" : "translateX(0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}
