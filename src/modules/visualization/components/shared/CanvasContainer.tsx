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
        backgroundColor: "var(--color-paper)",
        borderRadius: 10,
        border: "1px solid var(--color-paper-deep)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Toolbar */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 h-9 border-b"
        style={{
          borderColor: "var(--color-paper-deep)",
          backgroundColor: "var(--color-paper)",
        }}
      >
        {toolbar}
      </div>

      {/* Canvas content */}
      <div className="flex-1 min-h-0 relative">
        {children}
      </div>

      {/* Info bar */}
      <div
        className="shrink-0 flex items-center px-3 h-7 border-t"
        style={{
          borderColor: "var(--color-paper-deep)",
          backgroundColor: "var(--color-paper)",
        }}
      >
        <span
          className="text-[11px] truncate"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          {infoText}
        </span>
      </div>
    </div>
  );
}
