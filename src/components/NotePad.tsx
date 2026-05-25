/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：简化小窗界面与逻辑，移除笔记列表/模式切换/窗口池/外部事件监听
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  createNote,
  getErrorMessage,
  getNote,
  updateNote,
} from "../modules/notes/api";
import type { SaveNoteRequest } from "../modules/shared/types/notes";
import { listen } from "@tauri-apps/api/event";
import {
  closeCurrentWindow,
  setCurrentWindowAlwaysOnTop,
  showCurrentWindow,
  startCurrentWindowDrag,
  startCurrentWindowResize,
} from "../modules/windows/controls";
import type { ResizeDirection } from "../modules/windows/controls";
import { getConfig } from "../modules/settings/api";
import {
  DEFAULT_TILE_COLOR,
  normalizeTileColor,
  resolveTileColor,
} from "../modules/settings/tileColor";
import type { NoteSurfaceMode } from "../modules/windows/surfaceMode";
import {
  NOTE_SURFACE_ACTION_EVENT,
  surfaceActionFromEvent,
} from "../modules/windows/surfaceActions";
import type { TileColorMode } from "../modules/shared/types/settings";
import { Tile } from "./Tile";

interface NotePadProps {
  initialNoteId?: string;
  initialSurfaceMode?: NoteSurfaceMode;
  initialAutoSave?: boolean;
  initialTileColor?: string;
}

const surfaceResizeHandles: Array<{
  direction: ResizeDirection;
  className: string;
  size: string;
}> = [
  {
    direction: "NorthWest",
    size: "w-8 h-8",
    className: "top-0 left-0 cursor-nwse-resize",
  },
  {
    direction: "NorthEast",
    size: "w-5 h-5",
    className: "top-0 right-0 cursor-nesw-resize",
  },
  {
    direction: "SouthWest",
    size: "w-8 h-8",
    className: "bottom-0 left-0 cursor-nesw-resize",
  },
  {
    direction: "SouthEast",
    size: "w-5 h-5",
    className: "bottom-0 right-0 cursor-nwse-resize",
  },
];

function SurfaceResizeHandles() {
  return (
    <>
      {surfaceResizeHandles.map((handle) => (
        <div
          key={handle.direction}
          aria-hidden="true"
          data-surface-resize-handle="true"
          data-resize-direction={handle.direction}
          onMouseDown={(event) => {
            event.stopPropagation();
            void startCurrentWindowResize(handle.direction).catch(
              () => undefined,
            );
          }}
          className={`absolute ${handle.size} opacity-0 ${handle.className}`}
        />
      ))}
    </>
  );
}

export function NotePad({
  initialNoteId,
  initialSurfaceMode = "pad",
  initialAutoSave = true,
  initialTileColor = DEFAULT_TILE_COLOR,
}: NotePadProps) {
  const [surfaceMode, setSurfaceMode] =
    useState<NoteSurfaceMode>(initialSurfaceMode);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("空");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tileColor, setTileColor] = useState(() =>
    resolveTileColor("system", normalizeTileColor(initialTileColor)),
  );
  const [surfaceFontSize, setSurfaceFontSize] = useState(14);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const markDirty = useCallback(() => setDirty(true), []);

  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    try {
      const category = "default";
      const request: SaveNoteRequest = { title, content, category };
      const note = noteId
        ? await updateNote(noteId, request)
        : await createNote(request);
      if (note.id) setNoteId(note.id);
      setDirty(false);
      setStatus("已保存");
    } catch (error) {
      setStatus("保存失败");
      setErrorMessage(getErrorMessage(error));
    }
  }, [noteId, title, content]);

  const handleClose = useCallback(() => {
    if (dirty) {
      void handleSave().finally(() => {
        void closeCurrentWindow();
      });
    } else {
      void closeCurrentWindow();
    }
  }, [dirty, handleSave]);

  const handlePin = useCallback(async () => {
    if (dirty) await handleSave();
    setSurfaceMode("tile");
    await setCurrentWindowAlwaysOnTop(true);
  }, [dirty, handleSave]);

  const handleUnpin = useCallback(async () => {
    setSurfaceMode("pad");
    await setCurrentWindowAlwaysOnTop(false);
  }, []);

  const handleDrag = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button,input,textarea")) return;
    void startCurrentWindowDrag().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const config = await getConfig();
        if (!cancelled) {
          setSurfaceFontSize(config.surfaceFontSize ?? 14);
          setTileColor(
            resolveTileColor(
              config.tileColorMode ?? "system",
              config.tileColor,
            ),
          );
        }
        if (initialNoteId) {
          const note = await getNote(initialNoteId);
          if (!cancelled) {
            setTitle(note.title);
            setContent(note.content);
            setNoteId(note.id);
            setStatus("已打开");
          }
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(getErrorMessage(error));
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [initialNoteId]);

  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          void showCurrentWindow()
            .then(() => contentRef.current?.focus())
            .catch(() => undefined);
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = listen<{
      tileColor?: string;
      tileColorMode?: TileColorMode;
      surfaceFontSize?: number;
    }>("config-changed", (event) => {
      const mode = event.payload.tileColorMode ?? "system";
      const raw = event.payload.tileColor ?? DEFAULT_TILE_COLOR;
      setTileColor(resolveTileColor(mode, raw));
      if (event.payload.surfaceFontSize != null)
        setSurfaceFontSize(event.payload.surfaceFontSize);
    });
    return () => {
      void cleanup.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTileColor(resolveTileColor("system", DEFAULT_TILE_COLOR));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleSurfaceAction(event: Event) {
      const action = surfaceActionFromEvent(event);
      if (!action) return;

      if (action === "copy") {
        void navigator.clipboard?.writeText(content);
        return;
      }
      if (action === "save") {
        void handleSave();
        return;
      }
      if (action === "close") {
        void handleClose();
        return;
      }
      void handleUnpin();
    }

    window.addEventListener(NOTE_SURFACE_ACTION_EVENT, handleSurfaceAction);
    return () => {
      window.removeEventListener(
        NOTE_SURFACE_ACTION_EVENT,
        handleSurfaceAction,
      );
    };
  }, [content, handleSave, handleClose, handleUnpin]);

  useEffect(() => {
    if (!dirty || !initialAutoSave) return;

    const timer = window.setTimeout(() => {
      void handleSave();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [dirty, initialAutoSave, handleSave]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void handleSave();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  useEffect(() => {
    if (surfaceMode !== "tile") return;
    void setCurrentWindowAlwaysOnTop(true).catch(() => undefined);
  }, [surfaceMode]);

  const isTile = surfaceMode === "tile";

  return (
    <div className="w-full h-screen flex flex-col bg-transparent p-0">
      {isTile ? (
        <Tile
          title={title.trim() || undefined}
          content={errorMessage || content}
          color={tileColor}
          fontSize={surfaceFontSize}
          width="100%"
          className="h-full cursor-default"
          data-surface-mode={surfaceMode}
          data-context-menu="tile"
          onMouseDown={handleDrag}
          onClose={handleClose}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleUnpin();
            }}
            className="absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-[#3a7d5e] transition-all duration-150 cursor-pointer"
            title="转为小窗"
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
          <SurfaceResizeHandles />
        </Tile>
      ) : (
        <div
          className="relative noise-bg w-full h-full min-h-0 bg-[#fefaf5] overflow-hidden flex flex-col flex-1 border border-[#e5e1d8]/60 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
          data-surface-mode={surfaceMode}
        >
          <div
            className="flex items-center justify-between px-3 py-2 bg-white border-b border-[#e5e1d8] rounded-t-xl cursor-default"
            data-tauri-drag-region
            onMouseDown={handleDrag}
          >
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              placeholder="标题"
              className="flex-1 text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-[#3a7d5e] placeholder:text-[#a0a0a0]"
              data-tauri-drag-region={false}
            />
            <div className="flex items-center gap-1" data-tauri-drag-region={false}>
              <button
                onClick={() => void handleSave()}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-all duration-200 cursor-pointer text-[#8a8578] hover:text-[#3a7d5e] hover:bg-[#e5e1d8]"
                title="保存"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </button>
              <button
                onClick={() => void handlePin()}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-all duration-200 cursor-pointer text-[#8a8578] hover:text-[#3a7d5e] hover:bg-[#e5e1d8]"
                title="转为磁贴"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 17v5" />
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                </svg>
              </button>
              <button
                onClick={() => void handleClose()}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[#8a8578] hover:bg-[#c0392b] hover:text-white transition-all duration-200 cursor-pointer"
                title="关闭"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div
            data-pad-editor-body="true"
            className="px-3 pt-3 pb-2 flex flex-col flex-1 min-h-0"
          >
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                markDirty();
              }}
              placeholder="写点什么……"
              className="w-full flex-1 min-h-0 pb-2 leading-relaxed text-[#5c5544] font-body placeholder:text-[#8a8578]/50 bg-transparent border-none focus:ring-0 resize-none"
              style={{ fontSize: `${surfaceFontSize}px` }}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#e5e1d8] shrink-0">
            <span className="text-[11px] text-[#8a8578] font-mono tabular-nums truncate max-w-[250px]">
              {errorMessage ?? status}
            </span>
            <button
              onClick={() => void handleClose()}
              className="px-3 py-1 text-[11px] text-[#5c5544] hover:text-[#c0392b] rounded-md hover:bg-[#e5e1d8] transition-all duration-200 cursor-pointer"
            >
              关闭
            </button>
          </div>
          <SurfaceResizeHandles />
        </div>
      )}
    </div>
  );
}
