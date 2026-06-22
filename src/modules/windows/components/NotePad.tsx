/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：基于原设计做减法——删除笔记列表/打开Tab/模式切换，保留独立标题+正文+窗口池+磁贴，视觉改为冷灰独立调性
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  createNote,
  deleteNote,
  getErrorMessage,
  getNote,
  updateNote,
} from "../../notes/api";
import type { SaveNoteRequest } from "../../shared/types/notes";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  animateCurrentWindowBounds,
  closeCurrentWindow,
  getCurrentWindowBounds,
  recycleCurrentNotepad,
  setCurrentWindowAlwaysOnTop,
  showCurrentWindow,
  startCurrentWindowDrag,
  startCurrentWindowResize,
} from "../../windows/controls";
import type { ResizeDirection } from "../../windows/controls";
import { getConfig } from "../../settings/api";
import {
  DEFAULT_TILE_COLOR,
  normalizeTileColor,
  resolveTileColor,
} from "../../settings/tileColor";
import type { NoteSurfaceMode } from "../../windows/surfaceMode";
import {
  NOTE_SURFACE_MODE_EVENT,
  getSurfaceTargetBounds,
  surfaceModeFromEvent,
} from "../../windows/surfaceMode";
import {
  NOTE_SURFACE_ACTION_EVENT,
  surfaceActionFromEvent,
} from "../../windows/surfaceActions";
import type { TileColorMode } from "../../shared/types/settings";
import {
  emitTileWindowUnpinned,
  tileSurfaceModeUnpinNoteId,
} from "../../windows/tileWindowEvents";
import { Tile } from "./Tile";

const isStandby: boolean = (() => {
  try {
    return new URLSearchParams(window.location.search).get("standby") === "1";
  } catch {
    return false;
  }
})();

interface NotePadProps {
  initialNoteId?: string;
  initialSurfaceMode?: NoteSurfaceMode;
  initialAutoSave?: boolean;
  initialTileColor?: string;
}

interface ResizeHandleDef {
  direction: ResizeDirection;
  className: string;
}

const edgeResizeHandles: ResizeHandleDef[] = [
  { direction: "North", className: "top-0 left-2.5 right-2.5 h-[5px] cursor-n-resize" },
  { direction: "South", className: "bottom-0 left-2.5 right-2.5 h-[5px] cursor-s-resize" },
  { direction: "East", className: "top-2.5 right-0 bottom-2.5 w-[5px] cursor-e-resize" },
  { direction: "West", className: "top-2.5 left-0 bottom-2.5 w-[5px] cursor-w-resize" },
];

const cornerResizeHandles: ResizeHandleDef[] = [
  { direction: "NorthWest", className: "top-0 left-0 w-2.5 h-2.5 cursor-nwse-resize" },
  { direction: "NorthEast", className: "top-0 right-0 w-2.5 h-2.5 cursor-nesw-resize" },
  { direction: "SouthWest", className: "bottom-0 left-0 w-2.5 h-2.5 cursor-nesw-resize" },
  { direction: "SouthEast", className: "bottom-0 right-0 w-2.5 h-2.5 cursor-nwse-resize" },
];

function SurfaceResizeHandles() {
  return (
    <>
      {edgeResizeHandles.map((handle) => (
        <div
          key={handle.direction}
          aria-hidden="true"
          data-surface-resize-handle="true"
          data-resize-direction={handle.direction}
          onMouseDown={(event) => {
            event.stopPropagation();
            void startCurrentWindowResize(handle.direction).catch(() => undefined);
          }}
          className={`absolute ${handle.className}`}
        />
      ))}
      {cornerResizeHandles.map((handle) => (
        <div
          key={handle.direction}
          aria-hidden="true"
          data-surface-resize-handle="true"
          data-resize-direction={handle.direction}
          onMouseDown={(event) => {
            event.stopPropagation();
            void startCurrentWindowResize(handle.direction).catch(() => undefined);
          }}
          className={`absolute ${handle.className}`}
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
  const [surfaceMode, setSurfaceMode] = useState<NoteSurfaceMode>(initialSurfaceMode);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [wasPreCreated, setWasPreCreated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tileColor, setTileColor] = useState(() =>
    resolveTileColor("system", normalizeTileColor(initialTileColor)),
  );
  const [surfaceFontSize, setSurfaceFontSize] = useState(14);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const markDirty = useCallback(() => setDirty(true), []);

  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    try {
      const category = "";
      const request: SaveNoteRequest = { title, content, category };
      const note = noteId
        ? await updateNote(noteId, request)
        : await createNote(request);
      if (note.id) setNoteId(note.id);
      setDirty(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, [noteId, title, content]);

  const handleClose = useCallback(() => {
    const closeSurface = surfaceMode === "tile" ? closeCurrentWindow : recycleCurrentNotepad;
    if (wasPreCreated && !title.trim() && !content.trim()) {
      if (noteId) {
        void deleteNote(noteId).finally(() => { void closeSurface(); });
      } else {
        void closeSurface();
      }
      return;
    }
    if (dirty) {
      void handleSave().finally(() => { void closeSurface(); });
    } else {
      void closeSurface();
    }
  }, [dirty, handleSave, surfaceMode, wasPreCreated, title, content, noteId]);

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
    if (target.closest("button,input,textarea,[data-no-window-drag]")) return;
    void startCurrentWindowDrag().catch(() => undefined);
  }, []);

  /* ── Init: load config + pre-create note ── */

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const config = await getConfig();
        if (!cancelled) {
          setSurfaceFontSize(config.surfaceFontSize ?? 14);
          setTileColor(
            resolveTileColor(config.tileColorMode ?? "system", config.tileColor),
          );
        }
        if (initialNoteId) {
          const note = await getNote(initialNoteId);
          if (!cancelled) {
            setTitle(note.title);
            setContent(note.content);
            setNoteId(note.id);
          }
        } else if (!isStandby) {
          try {
            const note = await createNote({ title: "", content: "", category: "" });
            if (!cancelled) {
              setNoteId(note.id);
              setWasPreCreated(true);
            }
          } catch {
            // pre-create failed; will save on first edit
          }
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(getErrorMessage(error));
      }
    }

    void init();
    return () => { cancelled = true; };
  }, [initialNoteId]);

  /* ── Show + focus ── */

  useEffect(() => {
    if (isStandby) return;
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
    return () => { cancelled = true; };
  }, []);

  /* ── Pool reactivation: reset on each Ctrl+Space ── */

  useEffect(() => {
    let myLabel = "";
    try {
      myLabel = getCurrentWindow().label;
    } catch {
      // not in Tauri environment
    }

    const unlisten = listen<string>("notepad:activate", (event) => {
      if (event.payload !== myLabel) return;

      setNoteId(null);
      setTitle("");
      setContent("");
      setDirty(false);
      setWasPreCreated(false);
      setErrorMessage(null);
      setSurfaceMode("pad");

      createNote({ title: "", content: "", category: "" })
        .then((note) => {
          setNoteId(note.id);
          setWasPreCreated(true);
        })
        .catch(() => undefined);

      void showCurrentWindow()
        .then(() => contentRef.current?.focus())
        .catch(() => undefined);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  /* ── Config change ── */

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
    return () => { void cleanup.then((fn) => fn()); };
  }, []);

  /* ── System theme ── */

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

  /* ── Surface actions (tile right-click menu) ── */

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
      window.removeEventListener(NOTE_SURFACE_ACTION_EVENT, handleSurfaceAction);
    };
  }, [content, handleSave, handleClose, handleUnpin]);

  /* ── Autosave 900ms ── */

  useEffect(() => {
    if (!dirty || !initialAutoSave) return;
    const timer = window.setTimeout(() => { void handleSave(); }, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, initialAutoSave, handleSave]);

  /* ── Ctrl+S ── */

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

  /* ── Always on top in tile mode ── */

  useEffect(() => {
    if (surfaceMode !== "tile") return;
    void setCurrentWindowAlwaysOnTop(true).catch(() => undefined);
  }, [surfaceMode]);

  /* ── Surface mode switch with animation ── */

  const tileNoteId = noteId ?? "";

  const switchSurfaceMode = useCallback(
    async (nextMode: NoteSurfaceMode) => {
      const unpinnedNoteId = tileSurfaceModeUnpinNoteId(
        surfaceMode,
        nextMode,
        tileNoteId,
      );
      setSurfaceMode(nextMode);
      if (unpinnedNoteId) {
        void emitTileWindowUnpinned(unpinnedNoteId).catch(() => undefined);
      }
      try {
        if (nextMode === "tile") {
          await setCurrentWindowAlwaysOnTop(true);
        }
        const currentBounds = await getCurrentWindowBounds();
        await animateCurrentWindowBounds(getSurfaceTargetBounds(nextMode, currentBounds));
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    },
    [surfaceMode, tileNoteId],
  );

  useEffect(() => {
    function handleSurfaceModeRequest(event: Event) {
      const nextMode = surfaceModeFromEvent(event);
      if (!nextMode) return;
      void switchSurfaceMode(nextMode);
    }
    window.addEventListener(NOTE_SURFACE_MODE_EVENT, handleSurfaceModeRequest);
    return () => {
      window.removeEventListener(NOTE_SURFACE_MODE_EVENT, handleSurfaceModeRequest);
    };
  }, [switchSurfaceMode]);

  const isTile = surfaceMode === "tile";
  const tileTitle = title.trim();

  return (
    <div className="w-full h-screen flex flex-col bg-transparent p-0">
      {isTile ? (
        <Tile
          title={tileTitle || undefined}
          content={errorMessage || content}
          color={tileColor}
          fontSize={surfaceFontSize}
          width="100%"
          className="h-full cursor-grab active:cursor-grabbing"
          data-surface-mode={surfaceMode}
          data-context-menu="tile"
          data-note-id={tileNoteId}
          onMouseDown={handleDrag}
        >
          <button
            type="button"
            aria-label="取消钉屏"
            title="取消钉屏"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => void handleClose()}
            className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full text-ink-ghost/70 hover:text-red-400 hover:bg-danger-bg/80 transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <SurfaceResizeHandles />
        </Tile>
      ) : (
        <div
          className="relative w-full h-full overflow-hidden flex flex-col"
          style={{ backgroundColor: "#f3f5f8" }}
          data-surface-mode={surfaceMode}
        >
          {/* Title bar */}
          <div
            className="flex items-center justify-between px-4 h-10 shrink-0 cursor-grab active:cursor-grabbing"
            style={{ borderBottom: "1px solid #dce1e8" }}
            onMouseDown={handleDrag}
          >
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                markDirty();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "ArrowDown") {
                  event.preventDefault();
                  contentRef.current?.focus();
                }
              }}
              placeholder="标题（可选）"
              className="flex-1 text-sm font-medium bg-transparent border-none focus:ring-0 outline-none placeholder:text-[#a0a8b4]"
              data-no-window-drag
              style={{ color: "#1e1e1e" }}
            />

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => void handlePin()}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer"
                style={{ color: "#8a94a3" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#e4e8f0"; e.currentTarget.style.color = "#5b7f95"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#8a94a3"; }}
                title="转为磁贴"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17v5" />
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                </svg>
              </button>

              <button
                onClick={() => void handleClose()}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer"
                style={{ color: "#8a94a3" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#c0392b"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#8a94a3"; }}
                title="关闭"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="flex-1 min-h-0 overflow-hidden" data-no-window-drag>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                markDirty();
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  const ta = contentRef.current;
                  if (ta && ta.selectionStart === ta.selectionEnd) {
                    const textBeforeCursor = content.slice(0, ta.selectionStart);
                    if (!textBeforeCursor.includes("\n")) {
                      event.preventDefault();
                      titleRef.current?.focus();
                    }
                  }
                }
              }}
              placeholder="写点什么……"
              className="w-full h-full px-4 pt-3 pb-3 leading-relaxed bg-transparent border-none focus:ring-0 outline-none resize-none placeholder:text-[#a0a8b4]"
              style={{
                fontSize: `${surfaceFontSize}px`,
                color: "#2d2d2d",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>

          <SurfaceResizeHandles />
        </div>
      )}
    </div>
  );
}
