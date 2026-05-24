/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

interface CanvasContainerProps {
  toolbar: React.ReactNode;
  infoText: string;
  children: React.ReactNode;
}

export function CanvasContainer({ toolbar, infoText, children }: CanvasContainerProps) {
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Toolbar — 36px */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 h-9 border-b"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        {toolbar}
      </div>

      {/* Canvas content — warm primary bg */}
      <div
        className="flex-1 min-h-0 relative"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        {children}
      </div>

      {/* Info bar — 28px */}
      <div
        className="shrink-0 flex items-center px-3 h-7 border-t"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <span
          className="text-[12px] truncate"
          style={{ color: "var(--text-muted)" }}
        >
          {infoText}
        </span>
      </div>
    </div>
  );
}
