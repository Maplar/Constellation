/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useGraphStore } from "../../stores/useGraphStore";

export function GalaxyToolbar() {
  const { graphParams, updateGraphParams } = useGraphStore();

  return (
    <>
      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: "var(--color-ink-faint)" }}>
        <span>轨道</span>
        <ToggleSwitch
          checked={graphParams.showOrbits}
          onChange={(v) => updateGraphParams({ showOrbits: v })}
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
