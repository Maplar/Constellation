/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { type ReactNode, useEffect, useRef, useCallback } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * 移动端底部抽屉组件。
 * 从底部滑入，支持下滑手势关闭。
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = currentY.current - startY.current;
    if (delta > 80) {
      onClose();
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="relative w-full max-h-[85vh] bg-cloud rounded-t-2xl shadow-xl overflow-y-auto transition-transform duration-200"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-paper-deep/40 rounded-full" />
        </div>
        {title && (
          <div className="px-5 pb-3">
            <h2 className="text-[15px] font-display font-bold text-ink">
              {title}
            </h2>
          </div>
        )}
        <div className="px-5 pb-8">{children}</div>
      </div>
    </div>
  );
}
