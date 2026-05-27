/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import chroma from "chroma-js";
import type { CSSProperties, HTMLAttributes } from "react";
import { useMemo } from "react";
import {
  DEFAULT_TILE_COLOR,
  normalizeTileColor,
} from "../../settings/tileColor";

export interface TileProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "color" | "content" | "title"> {
  title?: string;
  content: string;
  color?: string;
  width?: number | string;
  rotation?: number;
  fontSize?: number;
  onClose?: () => void;
}

const MARK_SIZE = 8;
const MARK_OFFSET = 6;

const cornerPaths = [
  {
    pos: { top: MARK_OFFSET, left: MARK_OFFSET },
    d: `M0,${MARK_SIZE} L0,0 L${MARK_SIZE},0`,
  },
  {
    pos: { top: MARK_OFFSET, right: MARK_OFFSET },
    d: `M0,0 L${MARK_SIZE},0 L${MARK_SIZE},${MARK_SIZE}`,
  },
  {
    pos: { bottom: MARK_OFFSET, left: MARK_OFFSET },
    d: `M0,0 L0,${MARK_SIZE} L${MARK_SIZE},${MARK_SIZE}`,
  },
  {
    pos: { bottom: MARK_OFFSET, right: MARK_OFFSET },
    d: `M${MARK_SIZE},0 L${MARK_SIZE},${MARK_SIZE} L0,${MARK_SIZE}`,
  },
];

function CornerMarks({ color }: { color: string }) {
  return (
    <>
      {cornerPaths.map((mark, index) => (
        <svg
          key={index}
          className="absolute pointer-events-none"
          data-tile-corner-mark="true"
          style={mark.pos as CSSProperties}
          width={MARK_SIZE}
          height={MARK_SIZE}
          viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}
        >
          <path
            d={mark.d}
            stroke={color}
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </>
  );
}

export function Tile({
  title,
  content,
  color = DEFAULT_TILE_COLOR,
  width = 260,
  rotation = 0,
  fontSize = 14,
  className = "",
  style,
  children,
  onClose,
  ...divProps
}: TileProps) {
  const tileColor = normalizeTileColor(color);
  const { borderColor, cornerColor, titleColor, contentColor, emptyColor } = useMemo(() => {
    const isLightBg = chroma(tileColor).luminance() > 0.18;
    const mixTarget = isLightBg ? "#1a1a18" : "#ffffff";
    return {
      borderColor: chroma.mix(tileColor, mixTarget, 0.18).alpha(0.55).css(),
      cornerColor: chroma.mix(tileColor, mixTarget, 0.3).alpha(0.26).css(),
      titleColor: chroma.mix(tileColor, mixTarget, 0.4).alpha(0.5).css(),
      contentColor: chroma.mix(tileColor, mixTarget, 0.65).alpha(0.85).css(),
      emptyColor: chroma.mix(tileColor, mixTarget, 0.25).alpha(0.4).css(),
    };
  }, [tileColor]);
  const mergedStyle: CSSProperties = {
    width,
    backgroundColor: tileColor,
    borderColor,
    transition: "box-shadow 0.3s ease",
    ...(rotation ? { transform: `rotate(${rotation}deg)` } : {}),
    ...style,
  };

  return (
    <div
      {...divProps}
      className={`relative rounded-2xl border overflow-hidden select-none shadow-[0_2px_12px_rgba(26,26,24,0.06)] hover:shadow-[0_8px_30px_rgba(26,26,24,0.10)] transition-shadow ${className}`}
      style={mergedStyle}
    >
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-md text-[12px] leading-none text-white/60 hover:text-white hover:bg-[#c0392b] transition-all duration-150 cursor-pointer"
          title="关闭"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className="px-4 pt-4 pb-4 h-full overflow-y-auto scrollbar-hidden">
        {title && (
          <div className="font-display tracking-wide mb-3 leading-snug" style={{ color: titleColor, fontSize: `${fontSize + 1}px` }}>
            {title}
          </div>
        )}
        {content ? (
          <div className="leading-[1.8] whitespace-pre-wrap font-body" style={{ color: contentColor, fontSize: `${fontSize}px` }}>
            {content}
          </div>
        ) : (
          <div className="font-body text-center py-6" style={{ color: emptyColor, fontSize: `${fontSize}px` }}>
            空
          </div>
        )}
      </div>

      <CornerMarks color={cornerColor} />
      {children}
    </div>
  );
}
