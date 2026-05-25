/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

import { useEffect, useState, useRef } from "react";

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const tauriWindowRef = useRef<{
    isMaximized(): Promise<boolean>;
    minimize(): Promise<void>;
    unmaximize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
    onResized(handler: () => void): Promise<() => void>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unlistenFn: (() => void) | null = null;

    import("@tauri-apps/api/window")
      .then((mod) => {
        if (cancelled) return;
        const win = mod.getCurrentWindow();
        tauriWindowRef.current = win as typeof tauriWindowRef.current;
        win.isMaximized().then((max) => {
          if (!cancelled) setIsMaximized(max);
        });
        win.onResized(() => {
          win.isMaximized().then((max) => {
            if (!cancelled) setIsMaximized(max);
          });
        }).then((unlisten) => {
          if (!cancelled) unlistenFn = unlisten;
        });
      })
      .catch(() => {
        // not in Tauri environment
      });

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []);

  const minimize = () => { void tauriWindowRef.current?.minimize(); };
  const toggleMaximize = () => {
    const win = tauriWindowRef.current;
    if (!win) return;
    if (isMaximized) { void win.unmaximize(); }
    else { void win.maximize(); }
  };
  const close = () => { void tauriWindowRef.current?.close(); };

  return { isMaximized, minimize, toggleMaximize, close };
}
