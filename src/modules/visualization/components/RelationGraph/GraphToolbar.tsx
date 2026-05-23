/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useGraphStore, type DimensionMode } from "../../stores/useGraphStore";

interface GraphToolbarProps {
  onReset: () => void;
}

export function GraphToolbar({ onReset }: GraphToolbarProps) {
  const { dimensionMode, toggleDimension, graphParams, updateGraphParams } = useGraphStore();

  return (
    <>
      <DimensionToggle value={dimensionMode} onChange={toggleDimension} />
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-ink-ghost)" }}>
        <span>力强度:</span>
        <input
          type="range"
          min={10}
          max={200}
          value={Math.round(graphParams.forceStrength * 100)}
          onChange={(e) => updateGraphParams({ forceStrength: Number(e.target.value) / 100 })}
          className="w-16 h-1"
          style={{ accentColor: "var(--color-bamboo)" }}
        />
      </div>
      <div className="flex-1" />
      <ToolbarButton onClick={onReset} title="重置布局">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </ToolbarButton>
    </>
  );
}

function DimensionToggle({ value, onChange }: { value: DimensionMode; onChange: () => void }) {
  return (
    <div
      className="flex rounded-md overflow-hidden border"
      style={{ borderColor: "var(--color-paper-deep)" }}
    >
      {(["2D", "3D"] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            onClick={() => { if (!active) onChange(); }}
            className="px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: active ? "var(--color-bamboo-mist)" : "transparent",
              color: active ? "var(--color-bamboo)" : "var(--color-ink-ghost)",
              borderRight: mode === "2D" ? "1px solid var(--color-paper-deep)" : undefined,
            }}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-[var(--color-paper-warm)]"
      style={{ color: "var(--color-ink-ghost)" }}
    >
      {children}
    </button>
  );
}
