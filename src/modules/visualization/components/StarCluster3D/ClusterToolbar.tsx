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
      <label className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: "var(--text-secondary)" }}>
        <span>自动旋转</span>
        <ToggleSwitch
          checked={graphParams.autoRotate}
          onChange={(v) => updateGraphParams({ autoRotate: v })}
        />
      </label>
      <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>
        <span>辉光强度:</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(graphParams.glowIntensity * 100)}
          onChange={(e) => updateGraphParams({ glowIntensity: Number(e.target.value) / 100 })}
          className="w-16 h-1"
          style={{ accentColor: "var(--accent)" }}
        />
        <span className="font-mono text-[10px] w-8">{Math.round(graphParams.glowIntensity * 100)}%</span>
      </div>
      <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>
        <span>粒子密度:</span>
        <input
          type="range"
          min={100}
          max={1000}
          step={50}
          value={graphParams.particleCount}
          onChange={(e) => updateGraphParams({ particleCount: Number(e.target.value) })}
          className="w-16 h-1"
          style={{ accentColor: "var(--accent)" }}
        />
        <span className="font-mono text-[10px] w-8">{graphParams.particleCount}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>
        <span>聚焦分类:</span>
        <select
          value={focusedCategory || ""}
          onChange={(e) => onFocusCategory(e.target.value || null)}
          className="px-1.5 py-0.5 text-[11px] border cursor-pointer"
          style={{
            backgroundColor: "var(--bg-hover)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
            borderRadius: "var(--radius-sm)",
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
      style={{ width: 40, height: 22 }}
    >
      <span
        className="absolute inset-0 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? "var(--accent)" : "#ccc",
        }}
      />
      <span
        className="absolute top-[2px] rounded-full bg-white transition-transform"
        style={{
          width: 18,
          height: 18,
          left: 2,
          transform: checked ? "translateX(18px)" : "translateX(0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}
