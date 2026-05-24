/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useState } from "react";
import type { DimensionMode } from "../../stores/useGraphStore";

interface GraphToolbarProps {
  onDimensionChange?: (mode: DimensionMode) => void;
  onForceStrengthChange?: (strength: number) => void;
  onReset?: () => void;
  defaultDimension?: DimensionMode;
  defaultForceStrength?: number;
}

export function GraphToolbar({
  onDimensionChange,
  onForceStrengthChange,
  onReset,
  defaultDimension = "2D",
  defaultForceStrength = 1.0,
}: GraphToolbarProps) {
  const [mode, setMode] = useState<DimensionMode>(defaultDimension);
  const [strength, setStrength] = useState(defaultForceStrength);

  const handleModeChange = (next: DimensionMode) => {
    if (next === mode) return;
    setMode(next);
    onDimensionChange?.(next);
  };

  const handleStrengthChange = (value: number) => {
    setStrength(value);
    onForceStrengthChange?.(value);
  };

  return (
    <div
      className="flex items-center gap-4 shrink-0 border-b"
      style={{
        height: 36,
        padding: "0 16px",
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      {/* 2D / 3D 切换 */}
      <DimensionToggle value={mode} onChange={handleModeChange} />

      {/* 力强度滑块 */}
      <div
        className="flex items-center gap-2 h-7 rounded-md px-2"
        style={{
          backgroundColor: "var(--bg-hover)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="text-[11px] shrink-0 select-none"
          style={{ color: "var(--text-muted)" }}
        >
          力度
        </span>
        <input
          type="range"
          min={0.1}
          max={2.0}
          step={0.1}
          value={strength}
          onChange={(e) => handleStrengthChange(Number(e.target.value))}
          className="w-16"
          style={{ accentColor: "var(--accent)" }}
        />
        <span
          className="font-mono text-[10px] w-7 text-right shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {strength.toFixed(1)}
        </span>
      </div>

      {/* 填充 */}
      <div className="flex-1" />

      {/* 重置布局 */}
      <button
        onClick={() => onReset?.()}
        title="重置布局"
        className="p-1 rounded transition-colors cursor-pointer"
        style={{ color: "var(--text-muted)" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  );
}

/* ── 内部 2D/3D 切换按钮组 ── */

function DimensionToggle({
  value,
  onChange,
}: {
  value: DimensionMode;
  onChange: (mode: DimensionMode) => void;
}) {
  return (
    <div
      className="flex rounded-md overflow-hidden border shrink-0"
      style={{ borderColor: "var(--border)" }}
    >
      {(["2D", "3D"] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className="px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: active ? "var(--accent-light)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
              borderRight:
                mode === "2D" ? "1px solid var(--border)" : undefined,
            }}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}
