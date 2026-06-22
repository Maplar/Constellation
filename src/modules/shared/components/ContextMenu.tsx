/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { requestSurfaceAction } from "../../windows/surfaceActions";
import { tileContextMenuItems } from "../../windows/tileContextMenu";
import { useEditorStore } from "../stores/useEditorStore";
import { NotePickerModal } from "../../notes/components/NotePickerModal";

interface MenuState {
  x: number;
  y: number;
  hasSelection: boolean;
  type: "edit" | "tile";
}

type EditableTarget = HTMLInputElement | HTMLTextAreaElement;

function isEditableTarget(target: EventTarget | null): target is EditableTarget {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function replaceEditableSelection(target: EditableTarget, text: string): void {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? start;
  target.setRangeText(text, start, end, "end");
  target.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    inputType: "insertFromPaste",
    data: text,
  }));
  target.focus();
}

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const editableTargetRef = useRef<EditableTarget | null>(null);

  useEffect(() => {
    function handleContextMenu(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const isEditable = isEditableTarget(target) || target.isContentEditable;
      const tileTarget = target.closest<HTMLElement>('[data-context-menu="tile"]');

      if (!isEditable && !tileTarget) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      if (tileTarget && event.ctrlKey) {
        requestSurfaceAction("close");
        return;
      }
      const selection = window.getSelection()?.toString() || "";

      let x = event.clientX;
      let y = event.clientY;
      const menuWidth = 160;
      const menuHeight = tileTarget ? 150 : 210;
      if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 4;
      if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 4;

      if (tileTarget) {
        editableTargetRef.current = null;
        setMenuClosing(false);
        setMenu({
          x,
          y,
          hasSelection: false,
          type: "tile",
        });
        return;
      }

      editableTargetRef.current = isEditableTarget(target) ? target : null;
      setMenuClosing(false);
      const hasInputSelection = isEditableTarget(target)
        && (target.selectionStart ?? 0) !== (target.selectionEnd ?? 0);
      setMenu({ x, y, hasSelection: hasInputSelection || selection.length > 0, type: "edit" });
    }

    function handleClick() {
      setMenuClosing(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuClosing(true);
    }

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!menuClosing || !menu) return;
    const timer = window.setTimeout(() => {
      setMenu(null);
      setMenuClosing(false);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [menuClosing, menu]);

  const dismissMenu = useCallback(() => {
    setMenuClosing(true);
  }, []);

  const runCommand = async (command: "cut" | "copy" | "paste" | "selectAll") => {
    const target = editableTargetRef.current;
    if (!target) {
      document.execCommand(command);
      dismissMenu();
      return;
    }

    if (command === "selectAll") {
      target.focus();
      target.select();
      dismissMenu();
      return;
    }

    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? start;
    if (command === "copy" || command === "cut") {
      const selected = target.value.slice(start, end);
      if (selected) {
        await navigator.clipboard?.writeText(selected);
        if (command === "cut") replaceEditableSelection(target, "");
      }
      dismissMenu();
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      replaceEditableSelection(target, text);
    } catch {
      target.focus();
      document.execCommand("paste");
    }
    dismissMenu();
  };

  const runSurfaceAction = (
    action: (typeof tileContextMenuItems)[number]["action"],
  ) => {
    requestSurfaceAction(action);
    dismissMenu();
  };

  const items = menu
    ? menu.type === "tile"
      ? tileContextMenuItems.map((item) => ({
          ...item,
          shortcut: "",
          action: () => runSurfaceAction(item.action),
          disabled: false,
        }))
      : [
          {
            label: "剪切",
            shortcut: "Ctrl+X",
            action: () => void runCommand("cut"),
            disabled: !menu.hasSelection,
          },
          {
            label: "复制",
            shortcut: "Ctrl+C",
            action: () => void runCommand("copy"),
            disabled: !menu.hasSelection,
          },
          {
            label: "粘贴",
            shortcut: "Ctrl+V",
            action: () => void runCommand("paste"),
            disabled: false,
          },
          { separator: true as const },
          {
            label: "全选",
            shortcut: "Ctrl+A",
            action: () => void runCommand("selectAll"),
            disabled: false,
          },
          { separator: true as const },
          {
            label: "引用笔记",
            shortcut: "",
            action: () => {
              setPickerOpen(true);
              dismissMenu();
            },
            disabled: false,
          },
        ]
    : [];

  return (
    <>
      {children}
      {menu && (
        <div
          ref={menuRef}
          className={`fixed z-[9999] min-w-[152px] py-1.5 bg-cloud/95 backdrop-blur-sm border border-paper-deep/50 rounded-lg overflow-hidden select-none ${menuClosing ? "animate-menu-exit" : "animate-menu-enter"}`}
          style={{
            left: menu.x,
            top: menu.y,
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {items.map((item, index) =>
            "separator" in item ? (
              <div key={index} className="mx-2 my-1 h-px bg-paper-deep/40" />
            ) : (
              <button
                key={item.label}
                onClick={() => void item.action()}
                disabled={item.disabled}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] font-body transition-colors cursor-pointer disabled:text-ink-ghost/40 disabled:cursor-default disabled:hover:bg-transparent ${
                  "tone" in item && item.tone === "danger"
                    ? "text-red-400 hover:bg-danger-bg hover:text-red-500"
                    : "text-ink-soft hover:bg-bamboo-mist/60 hover:text-bamboo"
                }`}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] text-ink-ghost/60 font-mono ml-6">
                    {item.shortcut}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      )}
      <NotePickerModal
        open={pickerOpen}
        onSelect={(title) => {
          useEditorStore.getState().insertAtCursor?.(`[[${title}]]`);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
