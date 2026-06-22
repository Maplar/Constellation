/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：图谱连线组件（含多种连线样式）
 */

export type EdgeType = "wiki-link" | "markdown-link" | "embed" | "ai-similar";

export interface GraphEdgeProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  edgeType: EdgeType;
  isHighlighted?: boolean;
  opacity?: number;
}

const EDGE_STYLES: Record<EdgeType, { color: string; width: number; dash: number[] }> = {
  "wiki-link": {
    color: "rgba(100, 100, 100, 0.6)",
    width: 2,
    dash: [],
  },
  "markdown-link": {
    color: "rgba(100, 100, 100, 0.4)",
    width: 1.5,
    dash: [6, 4],
  },
  "embed": {
    color: "rgba(100, 100, 100, 0.3)",
    width: 3,
    dash: [],
  },
  "ai-similar": {
    color: "rgba(100, 100, 100, 0.25)",
    width: 1,
    dash: [3, 5],
  },
};

const HIGHLIGHT_STYLES: Record<EdgeType, { color: string; width: number }> = {
  "wiki-link": {
    color: "rgba(59, 130, 246, 0.8)",
    width: 3,
  },
  "markdown-link": {
    color: "rgba(168, 85, 247, 0.8)",
    width: 2.5,
  },
  "embed": {
    color: "rgba(34, 197, 94, 0.8)",
    width: 4,
  },
  "ai-similar": {
    color: "rgba(59, 130, 246, 0.6)",
    width: 2,
  },
};

export function getEdgeStyle(edgeType: EdgeType, isHighlighted: boolean = false) {
  if (isHighlighted) {
    const highlight = HIGHLIGHT_STYLES[edgeType];
    const base = EDGE_STYLES[edgeType];
    return {
      stroke: highlight.color,
      strokeWidth: highlight.width,
      strokeDasharray: base.dash.join(" "),
    };
  }

  const base = EDGE_STYLES[edgeType];
  return {
    stroke: base.color,
    strokeWidth: base.width,
    strokeDasharray: base.dash.join(" "),
  };
}

export function drawEdge(
  ctx: CanvasRenderingContext2D,
  props: GraphEdgeProps
) {
  const { sourceX, sourceY, targetX, targetY, edgeType, isHighlighted = false, opacity = 1 } = props;

  const style = getEdgeStyle(edgeType, isHighlighted);

  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.beginPath();
  ctx.moveTo(sourceX, sourceY);
  ctx.lineTo(targetX, targetY);

  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.strokeWidth;

  if (style.strokeDasharray) {
    ctx.setLineDash(style.strokeDasharray.split(" ").map(Number));
  } else {
    ctx.setLineDash([]);
  }

  ctx.stroke();
  ctx.restore();
}

export function drawEdgeWithArrow(
  ctx: CanvasRenderingContext2D,
  props: GraphEdgeProps & { arrowSize?: number }
) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    edgeType,
    isHighlighted = false,
    opacity = 1,
    arrowSize = 8,
  } = props;

  const style = getEdgeStyle(edgeType, isHighlighted);

  ctx.save();
  ctx.globalAlpha = opacity;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  const midX = sourceX + dx * 0.6;
  const midY = sourceY + dy * 0.6;

  ctx.beginPath();
  ctx.moveTo(sourceX, sourceY);
  ctx.lineTo(targetX, targetY);

  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.strokeWidth;

  if (style.strokeDasharray) {
    ctx.setLineDash(style.strokeDasharray.split(" ").map(Number));
  } else {
    ctx.setLineDash([]);
  }

  ctx.stroke();

  ctx.setLineDash([]);

  if (length > arrowSize * 2) {
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(
      midX - arrowSize * Math.cos(angle - Math.PI / 6),
      midY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(midX, midY);
    ctx.lineTo(
      midX - arrowSize * Math.cos(angle + Math.PI / 6),
      midY - arrowSize * Math.sin(angle + Math.PI / 6)
    );

    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth * 0.8;
    ctx.stroke();
  }

  ctx.restore();
}

export function EdgeLegend() {
  const edges: Array<{ type: EdgeType; label: string }> = [
    { type: "wiki-link", label: "笔记引用 (Wiki-Link)" },
    { type: "markdown-link", label: "Markdown 链接" },
    { type: "embed", label: "内容嵌入" },
    { type: "ai-similar", label: "AI 相似建议" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        background: "var(--card-bg, white)",
        borderRadius: "8px",
        border: "1px solid var(--border, #e0e0e0)",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-muted, #666)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        连线图例
      </div>
      {edges.map(({ type, label }) => {
        const style = EDGE_STYLES[type];
        return (
          <div
            key={type}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="32" height="2" style={{ flexShrink: 0 }}>
              <line
                x1="0"
                y1="1"
                x2="32"
                y2="1"
                stroke={style.color}
                strokeWidth={style.width}
                strokeDasharray={style.dash.join(" ")}
              />
            </svg>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-secondary, #666)",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
