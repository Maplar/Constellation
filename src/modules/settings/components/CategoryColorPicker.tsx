/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface CategoryColorPickerProps {
  open: boolean;
  category: string;
  currentColor?: string;
  onConfirm: (color: string) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#f43f5e", "#6b7280", "#d1d5db",
];

const WHEEL_SIZE = 200;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const RING_WIDTH = 22;
const INNER_RADIUS = WHEEL_RADIUS - RING_WIDTH;
const SQUARE_SIZE = INNER_RADIUS * Math.sqrt(2) * 0.85;

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rf) h = 60 * (((gf - bf) / d) % 6);
    else if (max === gf) h = 60 * ((bf - rf) / d + 2);
    else h = 60 * ((rf - gf) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function CategoryColorPicker({
  open,
  category,
  currentColor,
  onConfirm,
  onCancel,
}: CategoryColorPickerProps) {
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1);
  const [val, setVal] = useState(1);
  const [dragging, setDragging] = useState<"ring" | "square" | null>(null);

  const wheelRef = useRef<HTMLCanvasElement>(null);
  const squareRef = useRef<HTMLCanvasElement>(null);

  // Initialize from currentColor
  useEffect(() => {
    if (!open) return;
    if (currentColor) {
      const [r, g, b] = hexToRgb(currentColor);
      const [h, s, v] = rgbToHsv(r, g, b);
      setHue(h);
      setSat(s);
      setVal(v);
    } else {
      setHue(0);
      setSat(1);
      setVal(1);
    }
  }, [open, currentColor]);

  const currentRgb = hsvToRgb(hue, sat, val);
  const currentHex = rgbToHex(...currentRgb);

  // Draw hue ring
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = WHEEL_SIZE;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2, cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Draw hue ring
    for (let angle = 0; angle < 360; angle += 0.5) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, WHEEL_RADIUS, startAngle, endAngle);
      ctx.arc(cx, cy, INNER_RADIUS, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    // Draw hue indicator
    const indicatorAngle = (hue * Math.PI) / 180;
    const indicatorR = (WHEEL_RADIUS + INNER_RADIUS) / 2;
    const ix = cx + Math.cos(indicatorAngle) * indicatorR;
    const iy = cy + Math.sin(indicatorAngle) * indicatorR;
    ctx.beginPath();
    ctx.arc(ix, iy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy, 6, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fill();
  }, [hue]);

  // Draw SV square
  useEffect(() => {
    const canvas = squareRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = SQUARE_SIZE;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // White to hue gradient (horizontal = saturation)
    const gradH = ctx.createLinearGradient(0, 0, size, 0);
    gradH.addColorStop(0, "#fff");
    gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, size, size);

    // Black gradient (vertical = value)
    const gradV = ctx.createLinearGradient(0, 0, 0, size);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, size, size);

    // SV indicator
    const ix = sat * size;
    const iy = (1 - val) * size;
    ctx.beginPath();
    ctx.arc(ix, iy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue, sat, val]);

  const handleWheelInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = wheelRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left - WHEEL_RADIUS;
      const y = clientY - rect.top - WHEEL_RADIUS;
      const dist = Math.sqrt(x * x + y * y);

      if (dragging === "ring" || (dragging === null && dist >= INNER_RADIUS - 4 && dist <= WHEEL_RADIUS + 4)) {
        let angle = (Math.atan2(y, x) * 180) / Math.PI;
        if (angle < 0) angle += 360;
        setHue(angle);
        setDragging("ring");
        return;
      }

      const half = SQUARE_SIZE / 2;
      if (dist <= half + 4) {
        const ns = Math.max(0, Math.min(1, (x + half) / SQUARE_SIZE));
        const nv = Math.max(0, Math.min(1, 1 - (y + half) / SQUARE_SIZE));
        setSat(ns);
        setVal(nv);
        setDragging("square");
      }
    },
    [dragging],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleWheelInteraction(e.clientX, e.clientY);
    },
    [handleWheelInteraction],
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: globalThis.MouseEvent) => {
      e.preventDefault();
      handleWheelInteraction(e.clientX, e.clientY);
    };
    const handleUp = () => setDragging(null);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, handleWheelInteraction]);

  const handleRgbChange = useCallback((channel: "r" | "g" | "b", value: number) => {
    const rgb = [...currentRgb] as [number, number, number];
    const idx = channel === "r" ? 0 : channel === "g" ? 1 : 2;
    rgb[idx] = Math.max(0, Math.min(255, value));
    const [h, s, v] = rgbToHsv(...rgb);
    setHue(h);
    setSat(s);
    setVal(v);
  }, [currentRgb]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/30"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-[320px] rounded-xl shadow-xl flex flex-col overflow-hidden animate-menu-enter"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter") onConfirm(currentHex);
        }}
      >
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
            设置颜色：{category}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 px-4 pb-3">
          <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
            <canvas
              ref={wheelRef}
              width={WHEEL_SIZE}
              height={WHEEL_SIZE}
              className="cursor-crosshair"
              onMouseDown={handleMouseDown}
            />
            <canvas
              ref={squareRef}
              width={SQUARE_SIZE}
              height={SQUARE_SIZE}
              className="absolute cursor-crosshair"
              style={{
                left: WHEEL_RADIUS - SQUARE_SIZE / 2,
                top: WHEEL_RADIUS - SQUARE_SIZE / 2,
              }}
              onMouseDown={handleMouseDown}
            />
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg shrink-0"
              style={{
                backgroundColor: currentHex,
                border: "2px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            />
            <span className="text-[12px] font-mono" style={{ color: "var(--text-muted)" }}>
              {currentHex.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  const [r, g, b] = hexToRgb(color);
                  const [h, s, v] = rgbToHsv(r, g, b);
                  setHue(h);
                  setSat(s);
                  setVal(v);
                }}
                className="w-6 h-6 rounded-md cursor-pointer transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  border: currentHex === color ? "2px solid var(--text-primary)" : "1px solid var(--border)",
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="px-4 pb-3 space-y-1.5">
          {(["r", "g", "b"] as const).map((ch, idx) => {
            const label = ch.toUpperCase();
            const val = currentRgb[idx];
            return (
              <div key={ch} className="flex items-center gap-2">
                <span className="w-4 text-[11px] font-mono text-center" style={{ color: "var(--text-muted)" }}>
                  {label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={val}
                  onChange={(e) => handleRgbChange(ch, Number(e.target.value))}
                  className="flex-1 h-1.5 accent-bamboo cursor-pointer"
                  style={{ accentColor: ch === "r" ? "#ef4444" : ch === "g" ? "#22c55e" : "#3b82f6" }}
                />
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={val}
                  onChange={(e) => handleRgbChange(ch, Number(e.target.value))}
                  className="w-12 h-6 text-[11px] font-mono text-center rounded border outline-none"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-[12px] cursor-pointer transition-colors"
            style={{
              color: "var(--text-muted)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(currentHex)}
            className="px-3 py-1.5 rounded-lg text-[12px] text-white cursor-pointer transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--accent)" }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
