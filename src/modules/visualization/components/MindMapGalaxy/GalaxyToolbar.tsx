/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useGraphStore } from "../../stores/useGraphStore";

export function GalaxyToolbar() {
  const { graphParams, updateGraphParams } = useGraphStore();

  return (
    <>
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-ink-ghost)" }}>
        <span>展开距离:</span>
        <input
          type="range"
          min={100}
          max={500}
          value={graphParams.orbitDistance}
          onChange={(e) => updateGraphParams({ orbitDistance: Number(e.target.value) })}
          className="w-16 h-1"
          style={{ accentColor: "var(--color-bamboo)" }}
        />
      </div>
      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "var(--color-ink-faint)" }}>
        <span>轨道</span>
        <ToggleSwitch
          checked={graphParams.orbitDensity}
          onChange={(v) => updateGraphParams({ orbitDensity: v })}
        />
      </label>
      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "var(--color-ink-faint)" }}>
        <span>连线</span>
        <ToggleSwitch
          checked={graphParams.showLinks}
          onChange={(v) => updateGraphParams({ showLinks: v })}
        />
      </label>
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
