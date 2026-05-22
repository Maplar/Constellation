/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useRef, useState } from "react";

export function useVisibility(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return [containerRef, isVisible];
}
