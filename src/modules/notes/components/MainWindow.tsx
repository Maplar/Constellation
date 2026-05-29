/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：二次开发修改
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { exportMarkdownNote, importMarkdownNote } from "../api/export";
import { MarkdownPreview } from "./MarkdownPreview";
import { RelationPreview } from "./RelationPreview";
import { GalaxyPreview } from "./GalaxyPreview";
import { MindMapEditor } from "./MindMapEditor";
import {
  chooseNotesDirectory,
  getConfig,
  normalizeViewMode,
  saveConfig,
} from "../../settings/api";
import type { AppConfig, ViewMode } from "../../shared/types/settings";
import { normalizeTileColor } from "../../settings/tileColor";
import { SettingsPanel } from "../../settings/components/SettingsPanel";
import { SlidingButtonGroup } from "../../shared/components/SlidingButtonGroup";
import {
  createNote,
  createCategory,
  deleteCategory,
  deleteNote,
  getErrorMessage,
  getNote,
  listCategories,
  listNotes,
  moveNoteCategory,
  readExternalFile,
  renameCategory,
  saveExternalFile,
  updateNote,
} from "../api";
import type { ExternalFile, Note, NoteMetadata } from "../../shared/types/notes";
import {
  countNoteChars,
  filterNotes,
  formatShortDate,
  formatTime,
  getDisplayTitle,
  groupNotesByCategory,
  metadataFromNote,
} from "../../shared/utils/noteUtils";
import type { CategoryGroup } from "../../shared/utils/noteUtils";
import { useNoteStore } from "../stores/useNoteStore";
import { useEditorStore } from "../../shared/stores/useEditorStore";
import { usePlatform } from "../../shared/platform/usePlatform";
import { getNotesInCategoryTree } from "../../shared/utils/categoryTree";
import { SearchBar } from "./SearchBar";
import { highlightText } from "../../shared/utils/highlightUtils";
import { summarizeNote } from "../services/aiService";
import { exportToPDF, pdfFileName } from "../services/pdfExportService";
import { createRoot } from "react-dom/client";
import { loadAiSettings } from "../../settings/ai";
import { AiSummaryModal } from "./AiSummaryModal";
import {
  noteContextMenuItems,
  type NoteContextMenuAction,
} from "../noteContextMenu";
import { openNotepadWindow, openTileWindow } from "../../windows/api";
import { GraphView } from "./GraphView";
import { getCategoryColor, setCategoryColors, getCustomCategoryColors } from "../../visualization/utils/colorMap";
import { loadCategoryColors, saveCategoryColors } from "../../settings/categoryColors";
import { CategoryColorPicker } from "../../settings/components/CategoryColorPicker";
import {
  closeCurrentWindow,
  minimizeCurrentWindow,
  toggleMaximizeCurrentWindow,
  isCurrentWindowMaximized,
  startCurrentWindowDrag,
} from "../../windows/controls";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface NoteMenuState {
  x: number;
  y: number;
  noteId: string;
}

const saveStateLabel: Record<SaveState, string> = {
  idle: "未选择",
  dirty: "未保存",
  saving: "保存中",
  saved: "已保存",
  error: "保存失败",
};

type FormatAction = "bold" | "italic" | "heading" | "hr" | "ul" | "ol" | "code" | "quote";

const toolbarButtons: { label: string; title: string; style: string; action: FormatAction }[] = [
  { label: "B", title: "粗体", style: "font-bold", action: "bold" },
  { label: "I", title: "斜体", style: "italic", action: "italic" },
  { label: "H", title: "标题", style: "font-bold", action: "heading" },
  { label: "—", title: "分割线", style: "", action: "hr" },
  { label: "•", title: "无序列表", style: "", action: "ul" },
  { label: "1.", title: "有序列表", style: "font-mono text-[9px]", action: "ol" },
  { label: "<>", title: "代码", style: "font-mono text-[9px]", action: "code" },
  { label: "❝", title: "引用", style: "", action: "quote" },
];

function applyFormat(
  textarea: HTMLTextAreaElement,
  action: FormatAction,
  setContent: (v: string) => void,
  markDirty: () => void,
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  const lineStart = before.lastIndexOf("\n") + 1;
  const currentLine = before.slice(lineStart);

  let result: string;
  let cursorStart: number;
  let cursorEnd: number;

  switch (action) {
    case "bold": {
      const wrapped = `**${selected || "粗体文本"}**`;
      result = before + wrapped + after;
      cursorStart = start + 2;
      cursorEnd = cursorStart + (selected || "粗体文本").length;
      break;
    }
    case "italic": {
      const wrapped = `*${selected || "斜体文本"}*`;
      result = before + wrapped + after;
      cursorStart = start + 1;
      cursorEnd = cursorStart + (selected || "斜体文本").length;
      break;
    }
    case "heading": {
      const prefix = currentLine.match(/^(#{1,5})\s/);
      if (prefix) {
        const newLevel = prefix[1].length < 5 ? "#".repeat(prefix[1].length + 1) : "#";
        const beforeLine = value.slice(0, lineStart);
        const afterPrefix = value.slice(lineStart + prefix[0].length);
        result = beforeLine + newLevel + " " + afterPrefix;
        const offset = newLevel.length + 1 - prefix[0].length;
        cursorStart = start + offset;
        cursorEnd = end + offset;
      } else if (currentLine.length > 0 && start === end) {
        result = value.slice(0, lineStart) + "## " + value.slice(lineStart);
        cursorStart = start + 3;
        cursorEnd = cursorStart;
      } else if (selected) {
        result = before + `## ${selected}` + after;
        cursorStart = start + 3;
        cursorEnd = cursorStart + selected.length;
      } else {
        result = before + "## 标题" + after;
        cursorStart = start + 3;
        cursorEnd = cursorStart + 2;
      }
      break;
    }
    case "hr": {
      const newlineBefore = before.endsWith("\n") || before === "" ? "" : "\n";
      const newlineAfter = after.startsWith("\n") || after === "" ? "" : "\n";
      result = before + `${newlineBefore}---${newlineAfter}` + after;
      cursorStart = cursorEnd = before.length + newlineBefore.length + 3;
      break;
    }
    case "ul": {
      if (selected.includes("\n")) {
        const lines = selected.split("\n").map((l) => `- ${l}`).join("\n");
        result = before + lines + after;
        cursorStart = start;
        cursorEnd = start + lines.length;
      } else {
        const item = `- ${selected || "列表项"}`;
        result = before + item + after;
        cursorStart = start + 2;
        cursorEnd = cursorStart + (selected || "列表项").length;
      }
      break;
    }
    case "ol": {
      if (selected.includes("\n")) {
        const lines = selected.split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n");
        result = before + lines + after;
        cursorStart = start;
        cursorEnd = start + lines.length;
      } else {
        const item = `1. ${selected || "列表项"}`;
        result = before + item + after;
        cursorStart = start + 3;
        cursorEnd = cursorStart + (selected || "列表项").length;
      }
      break;
    }
    case "code": {
      if (selected.includes("\n")) {
        const wrapped = "```\n" + selected + "\n```";
        result = before + wrapped + after;
        cursorStart = start + 4;
        cursorEnd = cursorStart + selected.length;
      } else {
        const wrapped = `\`${selected || "代码"}\``;
        result = before + wrapped + after;
        cursorStart = start + 1;
        cursorEnd = cursorStart + (selected || "代码").length;
      }
      break;
    }
    case "quote": {
      if (selected.includes("\n")) {
        const lines = selected.split("\n").map((l) => `> ${l}`).join("\n");
        result = before + lines + after;
        cursorStart = start;
        cursorEnd = start + lines.length;
      } else {
        const item = `> ${selected || "引用文本"}`;
        result = before + item + after;
        cursorStart = start + 2;
        cursorEnd = cursorStart + (selected || "引用文本").length;
      }
      break;
    }
  }

  setContent(result);
  markDirty();
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorStart, cursorEnd);
  });
}

type UndoDocument = Pick<Document, "execCommand">;

export function runEditorUndo(
  textarea: HTMLTextAreaElement | null,
  doc: UndoDocument = document,
): boolean {
  if (!textarea || textarea.disabled) return false;
  textarea.focus();
  return doc.execCommand("undo");
}

interface MainWindowProps {
  initialSettingsOpen?: boolean;
  initialConfig?: AppConfig;
  hideTitleBar?: boolean;
}

export function MainWindow({
  initialSettingsOpen = false,
  initialConfig = undefined,
  hideTitleBar = false,
}: MainWindowProps = {}) {
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [externalFiles, setExternalFiles] = useState<ExternalFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const searchResults = useNoteStore((s) => s.searchResults);
  const loadFullNotes = useNoteStore((s) => s.loadFullNotes);
  const loadStoreNotes = useNoteStore((s) => s.loadNotes);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(
    normalizeViewMode(initialConfig?.defaultViewMode ?? "split"),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showMindMapEditor, setShowMindMapEditor] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noteMenu, setNoteMenu] = useState<NoteMenuState | null>(null);
  const [noteMenuClosing, setNoteMenuClosing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(initialSettingsOpen);
  const [settingsConfig, setSettingsConfig] = useState<AppConfig | null>(
    initialConfig ?? null,
  );
  const [savedNotesDir, setSavedNotesDir] = useState<string | null>(
    initialConfig?.notesDir ?? null,
  );
  const [noteTransitionKey, setNoteTransitionKey] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteExiting, setDeleteExiting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [categoryInputValue, setCategoryInputValue] = useState("");
  const [noteMenuMode, setNoteMenuMode] = useState<"main" | "move">("main");
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryValue, setRenameCategoryValue] = useState("");
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [colorPickerCategory, setColorPickerCategory] = useState<string | null>(null);
  const [categoryMenu, setCategoryMenu] = useState<{ x: number; y: number; category: string } | null>(null);
  const [categoryMenuClosing, setCategoryMenuClosing] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const { isMobile } = usePlatform();
  const previewSubMode = useEditorStore((s) => s.previewSubMode);
  const setPreviewSubMode = useEditorStore((s) => s.setPreviewSubMode);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const selectedExternalFile = useMemo(
    () => externalFiles.find((f) => f.id === selectedId) ?? null,
    [externalFiles, selectedId],
  );

  const isExternal = selectedExternalFile !== null;

  const noteMenuTarget = useMemo(
    () => notes.find((note) => note.id === noteMenu?.noteId) ?? null,
    [noteMenu?.noteId, notes],
  );

  const filteredNotes = useMemo(() => {
    // Category-scoped local search (sidebar search bar)
    if (categorySearchQuery.trim()) {
      const scoped = getNotesInCategoryTree(notes, activeCategory);
      return filterNotes(scoped, categorySearchQuery);
    }
    // Global search (top bar search)
    if (searchQuery.trim()) {
      if (searchResults.length > 0) {
        return searchResults.map((r) => metadataFromNote(r.note));
      }
      return filterNotes(notes, searchQuery);
    }
    // No search: show all notes
    return notes;
  }, [notes, activeCategory, categorySearchQuery, searchQuery, searchResults]);

  const categoryGroups = useMemo(
    () => groupNotesByCategory(filteredNotes, categories),
    [filteredNotes, categories],
  );

  const sidebarSearchQuery = categorySearchQuery.trim() || searchQuery;

  const lineCount = useMemo(() => content.split("\n").length, [content]);
  const byteSize = useMemo(
    () => (new TextEncoder().encode(content).length / 1024).toFixed(1),
    [content],
  );
  const charCount = useMemo(() => countNoteChars(content), [content]);

  const applyNote = useCallback((note: Note) => {
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setSaveState("saved");
    setErrorMessage(null);
    setNoteTransitionKey((k) => k + 1);
  }, []);

  const replaceNoteMetadata = useCallback((note: Note) => {
    const metadata = metadataFromNote(note);
    setNotes((current) => {
      const exists = current.some((item) => item.id === metadata.id);
      const next = exists
        ? current.map((item) => (item.id === metadata.id ? metadata : item))
        : [metadata, ...current];
      return [...next].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
    });
  }, []);

  const loadNote = useCallback(
    async (id: string) => {
      setErrorMessage(null);
      const note = await getNote(id);
      applyNote(note);
      replaceNoteMetadata(note);
    },
    [applyNote, replaceNoteMetadata],
  );

  const refreshNotes = useCallback(async () => {
    const [loadedNotes, loadedCategories] = await Promise.all([
      listNotes(),
      listCategories(),
    ]);
    setNotes(loadedNotes);
    setCategories(loadedCategories);
    void loadStoreNotes().then(() => {
      void loadFullNotes();
    });
    return loadedNotes;
  }, [loadStoreNotes, loadFullNotes]);

  const clearCurrentNote = useCallback(() => {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setSaveState("idle");
  }, []);

  const handleAiSummarize = useCallback(async () => {
    if (!content.trim()) {
      setAiError("笔记内容为空");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const config = await loadAiSettings();
      if (!config.apiKey) {
        throw new Error("请先在设置中配置 AI API Key");
      }
      const summary = await summarizeNote(content, {
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        model: config.model,
      });
      setAiResult(summary);
    } catch (error) {
      setAiError(String(error));
    } finally {
      setAiLoading(false);
    }
  }, [content]);

  const handleExportPdf = useCallback(async () => {
    if (!content.trim()) {
      setErrorMessage("笔记内容为空，无法导出 PDF");
      return;
    }

    setExportingPdf(true);
    setErrorMessage(null);

    const filename = pdfFileName(title || selectedNote?.title || "无标题笔记");

    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute;left:0;top:-99999px;width:794px;visibility:visible;";
    document.body.appendChild(container);

    try {
      const root = createRoot(container);
      root.render(
        <MarkdownPreview content={content} fontSize={14} />,
      );

      await new Promise((resolve) => setTimeout(resolve, 400));

      await exportToPDF(container, filename);
    } catch (err) {
      setErrorMessage(
        "PDF 导出失败：" +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setExportingPdf(false);
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    }
  }, [content, title, selectedNote]);

  const loadExternalFile = useCallback(async (filePath: string) => {
    setErrorMessage(null);
    try {
      const fileContent = await readExternalFile(filePath);
      const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
      const displayTitle = fileName.replace(/\.md$/i, "");

      setExternalFiles((current) => {
        if (current.some((f) => f.id === filePath)) {
          return current;
        }
        return [
          ...current,
          {
            id: filePath,
            title: displayTitle,
            filePath,
          },
        ];
      });

      setSelectedId(filePath);
      setTitle(displayTitle);
      setContent(fileContent);
      setSaveState("saved");
      setNoteTransitionKey((k) => k + 1);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      try {
        const [loadedConfig, loadedNotes, loadedCategories, loadedColors] = await Promise.all([
          getConfig(),
          listNotes(),
          listCategories(),
          loadCategoryColors(),
        ]);
        if (cancelled) return;
        setSettingsConfig(loadedConfig);
        setSavedNotesDir(loadedConfig.notesDir);
        setViewMode(normalizeViewMode(loadedConfig.defaultViewMode));
        setNotes(loadedNotes);
        setCategories(loadedCategories);
        setCategoryColors(loadedColors);
        void loadFullNotes();
        if (loadedNotes[0]) {
          const note = await getNote(loadedNotes[0].id);
          if (!cancelled) applyNote(note);
        } else {
          clearCurrentNote();
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyNote, clearCurrentNote]);

  useEffect(() => {
    const unlisten = listen("notes-changed", () => {
      void refreshNotes().then((loaded) => {
        if (selectedId && !loaded.some((n) => n.id === selectedId)) {
          if (loaded[0]) {
            void loadNote(loaded[0].id);
          } else {
            clearCurrentNote();
          }
        }
      });
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [refreshNotes, selectedId, loadNote, clearCurrentNote]);

  useEffect(() => {
    const unlisten = listen<string>("open-external-file", (event) => {
      void loadExternalFile(event.payload);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [loadExternalFile]);

  useEffect(() => {
    function closeNoteMenu() {
      setNoteMenuClosing(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNoteMenu();
    }

    document.addEventListener("mousedown", closeNoteMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", closeNoteMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!noteMenuClosing || !noteMenu) return;
    const timer = window.setTimeout(() => {
      setNoteMenu(null);
      setNoteMenuClosing(false);
      setNoteMenuMode("main");
    }, 150);
    return () => window.clearTimeout(timer);
  }, [noteMenuClosing, noteMenu]);

  useEffect(() => {
    function closeCategoryMenu() {
      setCategoryMenuClosing(true);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCategoryMenu();
    }
    document.addEventListener("mousedown", closeCategoryMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", closeCategoryMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!categoryMenuClosing || !categoryMenu) return;
    const timer = window.setTimeout(() => {
      setCategoryMenu(null);
      setCategoryMenuClosing(false);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [categoryMenuClosing, categoryMenu]);

  const handleCategoryColorConfirm = useCallback(
    async (color: string) => {
      if (!colorPickerCategory) return;
      const newColors = { ...getCustomCategoryColors(), [colorPickerCategory]: color };
      setCategoryColors(newColors);
      await saveCategoryColors(newColors);
      setColorPickerCategory(null);
      void loadFullNotes();
    },
    [colorPickerCategory, loadFullNotes],
  );

  const saveCurrentNote = useCallback(async () => {
    if (!selectedId) return null;

    if (isExternal && selectedExternalFile) {
      setSaveState("saving");
      try {
        await saveExternalFile(selectedExternalFile.filePath, content);
        setSaveState("saved");
        setErrorMessage(null);
        return { id: selectedId, title, content } as Note;
      } catch (error) {
        setSaveState("error");
        setErrorMessage(getErrorMessage(error));
        return null;
      }
    }

    setSaveState("saving");
    try {
      const category = selectedNote?.category ?? "";
      const note = await updateNote(selectedId, { title, content, category });
      replaceNoteMetadata(note);
      setSaveState("saved");
      setErrorMessage(null);
      return note;
    } catch (error) {
      setSaveState("error");
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  }, [content, isExternal, replaceNoteMetadata, selectedExternalFile, selectedId, selectedNote, title]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void saveCurrentNote();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [saveCurrentNote]);

  useEffect(() => {
    if (!selectedId || saveState !== "dirty") return undefined;
    if (isExternal) return undefined;
    if (!settingsConfig?.noteAutoSave) return undefined;

    const timer = window.setTimeout(() => {
      void saveCurrentNote();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isExternal, saveCurrentNote, saveState, selectedId, settingsConfig?.noteAutoSave]);

  const handleNewNote = async () => {
    setErrorMessage(null);
    try {
      const note = await createNote({ title: "", content: "", category: activeCategory });
      replaceNoteMetadata(note);
      applyNote(note);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleOpenSettings = async () => {
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    setSettingsOpen(true);
    if (settingsConfig) return;

    setErrorMessage(null);
    try {
      const config = await getConfig();
      setSettingsConfig(config);
      setSavedNotesDir(config.notesDir);
      setViewMode(normalizeViewMode(config.defaultViewMode));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleChooseNotesDir = async () => {
    if (!settingsConfig) return;

    setErrorMessage(null);
    try {
      const notesDir = await chooseNotesDirectory();
      if (!notesDir) return;
      handleSettingsChange({ ...settingsConfig, notesDir });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSettings = useCallback(
    (nextConfig: AppConfig) => {
      if (settingsSaveTimer.current) {
        clearTimeout(settingsSaveTimer.current);
      }
      settingsSaveTimer.current = setTimeout(async () => {
        const previousNotesDir = savedNotesDir ?? nextConfig.notesDir;
        const normalizedConfig = {
          ...nextConfig,
          defaultViewMode: normalizeViewMode(nextConfig.defaultViewMode),
          tileColor: normalizeTileColor(nextConfig.tileColor),
        };
        try {
          const savedConfig = await saveConfig(normalizedConfig);
          setSettingsConfig(savedConfig);
          setSavedNotesDir(savedConfig.notesDir);
          setViewMode(normalizeViewMode(savedConfig.defaultViewMode));

          if (savedConfig.notesDir !== previousNotesDir) {
            const loadedNotes = await refreshNotes();
            if (loadedNotes[0]) {
              await loadNote(loadedNotes[0].id);
            } else {
              clearCurrentNote();
            }
          }
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
        }
      }, 300);
    },
    [savedNotesDir, refreshNotes, loadNote, clearCurrentNote],
  );

  const handleSettingsChange = useCallback(
    (nextConfig: AppConfig) => {
      setSettingsConfig(nextConfig);
      void emit("config-changed", nextConfig);
      persistSettings(nextConfig);
    },
    [persistSettings],
  );

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleImportNote = async () => {
    setErrorMessage(null);
    try {
      if (selectedId && saveState === "dirty") {
        const saved = await saveCurrentNote();
        if (!saved) return;
      }

      const note = await importMarkdownNote(activeCategory);
      if (!note) return;

      replaceNoteMetadata(note);
      applyNote(note);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleSelectNote = async (id: string) => {
    if (id === selectedId) return;
    setDeleteConfirm(false);
    if (saveState === "dirty") {
      await saveCurrentNote();
    }

    setIsLoading(true);
    try {
      await loadNote(id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExternalFile = async (id: string) => {
    if (id === selectedId) return;
    setDeleteConfirm(false);
    if (saveState === "dirty") {
      await saveCurrentNote();
    }

    const file = externalFiles.find((f) => f.id === id);
    if (!file) return;

    setIsLoading(true);
    try {
      const fileContent = await readExternalFile(file.filePath);
      setSelectedId(id);
      setTitle(file.title);
      setContent(fileContent);
      setSaveState("saved");
      setErrorMessage(null);
      setNoteTransitionKey((k) => k + 1);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveExternalFile = async (id: string) => {
    if (selectedId === id && saveState === "dirty") {
      const shouldSave = window.confirm(
        `「${title || "未命名文件"}」有未保存的更改，是否保存到原文件？`,
      );
      if (shouldSave) {
        const saved = await saveCurrentNote();
        if (!saved) return;
      }
    }
    setExternalFiles((current) => current.filter((f) => f.id !== id));
    if (selectedId === id) {
      clearCurrentNote();
    }
  };

  const handleDeleteNote = async (noteId = selectedId) => {
    if (!noteId) return;

    setDeleteConfirm(false);
    setErrorMessage(null);
    try {
      await deleteNote(noteId);
      const remaining = await refreshNotes();
      if (noteId === selectedId && remaining[0]) {
        await loadNote(remaining[0].id);
      } else if (noteId === selectedId) {
        clearCurrentNote();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleOpenNoteMenu = (
    event: MouseEvent<HTMLElement>,
    noteId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 168;
    const menuHeight = 76;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 4);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 4);

    setNoteMenuClosing(false);
    setHoveredId(noteId);
    setNoteMenu({
      x: Math.max(4, x),
      y: Math.max(4, y),
      noteId,
    });
  };

  const handleExportNote = async (note: NoteMetadata) => {
    setErrorMessage(null);
    try {
      if (note.id === selectedId && saveState === "dirty") {
        const saved = await saveCurrentNote();
        if (!saved) return;
      }

      await exportMarkdownNote({
        id: note.id,
        title: note.id === selectedId ? title : note.title,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleNoteMenuAction = (action: NoteContextMenuAction) => {
    const note = noteMenuTarget;
    if (!note) return;

    if (action === "reference") {
      const title = note.title || "无标题笔记";
      setNoteMenuClosing(true);
      useEditorStore.getState().insertAtCursor?.(`[[${title}]]`);
      return;
    }

    if (action === "export") {
      setNoteMenuClosing(true);
      void handleExportNote(note);
      return;
    }

    if (action === "move") {
      setNoteMenuMode("move");
      return;
    }

    setNoteMenuClosing(true);
    void handleDeleteNote(note.id);
  };

  const handleMoveNote = async (noteId: string, targetCategory: string) => {
    setNoteMenuClosing(true);
    setErrorMessage(null);
    try {
      await moveNoteCategory(noteId, targetCategory);
      await refreshNotes();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleCreateCategory = async () => {
    const name = categoryInputValue.trim();
    if (!name) {
      setShowCategoryInput(false);
      return;
    }
    setErrorMessage(null);
    try {
      await createCategory(name);
      setCategories((prev) => [...prev, name].sort());
      setShowCategoryInput(false);
      setCategoryInputValue("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleRenameCategory = async (oldName: string) => {
    const newName = renameCategoryValue.trim();
    if (!newName || newName === oldName) {
      setRenamingCategory(null);
      return;
    }
    setErrorMessage(null);
    try {
      await renameCategory(oldName, newName);
      await refreshNotes();
      setRenamingCategory(null);
      setRenameCategoryValue("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleDeleteCategory = async (name: string) => {
    setErrorMessage(null);
    try {
      await deleteCategory(name);
      await refreshNotes();
      if (activeCategory === name) {
        setActiveCategory("");
        setCategorySearchQuery("");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const markDirty = () => {
    if (selectedId) setSaveState("dirty");
  };

  const insertAtCursor = useCallback(
    (text: string): boolean => {
      const textarea = contentRef.current;
      if (!textarea || !selectedId) {
        alert("请先打开一篇笔记");
        return false;
      }
      const { selectionStart, value } = textarea;
      const before = value.slice(0, selectionStart);
      const after = value.slice(selectionStart);
      const newContent = before + text + after;
      setContent(newContent);
      markDirty();
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = selectionStart + text.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
      return true;
    },
    [selectedId],
  );

  useEffect(() => {
    const store = useEditorStore.getState();
    store.registerInsertAtCursor(insertAtCursor);
    return () => store.unregisterInsertAtCursor();
  }, [insertAtCursor]);

  const handleUndo = () => {
    if (!selectedId) return;
    const textarea = contentRef.current;
    if (runEditorUndo(textarea)) {
      setContent(textarea?.value ?? content);
      markDirty();
    }
  };

  const handleWikiLinkClick = useCallback(
    (title: string) => {
      const match = notes.find(
        (n) => n.title.trim() === title.trim() || n.title === title,
      );
      if (match) {
        void handleSelectNote(match.id);
      }
    },
    [notes, handleSelectNote],
  );

  const handleOpenNotepad = async () => {
    setErrorMessage(null);
    try {
      await openNotepadWindow();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    void isCurrentWindowMaximized().then(setIsMaximized);
  }, []);

  const handlePinEntry = async () => {
    if (!selectedId) return;
    if (saveState === "dirty") {
      await saveCurrentNote();
    }

    setErrorMessage(null);
    try {
      await openTileWindow(selectedId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleTitleBarDrag = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    void startCurrentWindowDrag().catch(() => undefined);
  };

  const toggleMaximize = () => {
    void toggleMaximizeCurrentWindow().then(() =>
      isCurrentWindowMaximized().then(setIsMaximized),
    );
  };

  const handleTitleBarDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    toggleMaximize();
  };

  const handleMinimize = () => {
    void minimizeCurrentWindow();
  };

  const handleMaximize = () => {
    toggleMaximize();
  };

  const handleClose = () => {
    void closeCurrentWindow();
  };

  const outerClass = hideTitleBar
    ? "flex-1 flex flex-col min-h-0"
    : "w-full h-screen flex flex-col";

  return (
    <div className={outerClass}>
      <div className="noise-bg bg-cloud overflow-hidden flex flex-col flex-1">
        {!hideTitleBar && (
        <div
          className="flex items-center justify-between pl-5 pr-0 h-11 bg-paper/60 border-b border-paper-deep/30 shrink-0 select-none cursor-default"
          onMouseDown={handleTitleBarDrag}
          onDoubleClick={handleTitleBarDoubleClick}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[13px] font-display font-medium text-ink-soft tracking-wide">
              星座
            </span>
            <span className="text-[11px] text-ink-ghost font-body">—</span>
            <span className="text-[11px] text-ink-faint font-body truncate max-w-[240px]">
              {title || selectedNote?.preview || "无标题笔记"}
            </span>
          </div>
          <div className="flex items-center">
            {errorMessage && (
              <span className="max-w-[200px] truncate text-[11px] text-red-400 mr-2">
                {errorMessage}
              </span>
            )}
            {isMobile && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-10 h-11 flex items-center justify-center text-ink-ghost hover:text-bamboo hover:bg-bamboo-mist/50 transition-all cursor-pointer"
                title="笔记列表"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            {!isMobile && (
              <>
                <button
                  onClick={() => setShowGraph(true)}
                  className="w-10 h-11 flex items-center justify-center text-ink-ghost hover:text-bamboo hover:bg-bamboo-mist/50 transition-all cursor-pointer"
                  title="图谱仪表盘"
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
                    <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
                    <path d="M8.5 7.5L15.5 16.5M15.5 7.5L8.5 16.5" />
                  </svg>
                </button>
                <button
                  onClick={() => void handleOpenNotepad()}
                  className="w-10 h-11 flex items-center justify-center text-ink-ghost hover:text-bamboo hover:bg-bamboo-mist/50 transition-all cursor-pointer"
                  title="快捷便签"
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
                    <path d="M4 4h16v14H7l-3 3V4z" />
                    <path d="M8 9h8M8 13h5" />
                  </svg>
                </button>
                <button
                  onClick={() => void handleOpenSettings()}
                  className="w-10 h-11 flex items-center justify-center text-ink-ghost hover:text-ink-faint hover:bg-paper-warm transition-all cursor-pointer"
                  title="设置"
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
                    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 12h4" />
                  </svg>
                </button>
                <button
                  onClick={handleMinimize}
                  className="w-11 h-11 flex items-center justify-center text-ink-ghost hover:text-ink-soft hover:bg-paper-warm transition-all cursor-pointer"
                  title="最小化"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M2 6h8" />
                  </svg>
                </button>
                <button
                  onClick={handleMaximize}
                  className="w-11 h-11 flex items-center justify-center text-ink-ghost hover:text-ink-soft hover:bg-paper-warm transition-all cursor-pointer"
                  title={isMaximized ? "还原" : "最大化"}
                >
                  {isMaximized ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <path d="M3 5H2V2a1 1 0 0 1 1-1h5v1" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleClose}
                  className="w-11 h-11 flex items-center justify-center text-ink-ghost hover:text-red-500 hover:bg-danger-bg transition-all cursor-pointer"
                  title="关闭"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
        )}

        <div className="flex flex-1 min-h-0 relative">
          {/* Mobile sidebar backdrop */}
          {isMobile && !sidebarCollapsed && (
            <div
              className="fixed inset-0 bg-black/30 z-30 animate-fade-in"
              onClick={() => setSidebarCollapsed(true)}
              aria-hidden="true"
            />
          )}
          <div
            className={`border-r border-paper-deep/30 bg-paper/40 flex flex-col shrink-0 transition-all duration-[600ms] ${
              isMobile
                ? sidebarCollapsed
                  ? "w-0 overflow-hidden"
                  : "fixed inset-y-0 left-0 w-4/5 max-w-[320px] z-40 shadow-xl animate-slide-in-left border-r"
                : sidebarCollapsed
                  ? "w-0 overflow-hidden"
                  : "w-[280px]"
            }`}
          >
            <SearchBar
              resultCount={filteredNotes.length}
              localValue={categorySearchQuery}
              onLocalChange={setCategorySearchQuery}
              onLocalClear={() => setCategorySearchQuery("")}
            />

            <div className="px-3 pb-2 shrink-0 space-y-1">
              <button
                onClick={handleNewNote}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-body text-bamboo hover:bg-bamboo-mist/60 transition-all cursor-pointer group"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="group-hover:rotate-90 transition-transform duration-200"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>新建笔记</span>
              </button>
              <button
                onClick={() => setShowCategoryInput(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-body text-ink-faint hover:text-bamboo hover:bg-bamboo-mist/50 transition-all cursor-pointer group"
                title="新建文件夹"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M12 10v6M9 13h6" />
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>新建文件夹</span>
              </button>
              <button
                onClick={() => void handleImportNote()}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-body text-ink-faint hover:text-bamboo hover:bg-bamboo-mist/50 transition-all cursor-pointer group"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="m7 8 5-5 5 5" />
                  <path d="M5 21h14" />
                </svg>
                <span>导入 Markdown</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-5 pb-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-ink-ghost font-mono tracking-wider uppercase">
                  {filteredNotes.length} 篇笔记{externalFiles.length > 0 ? ` · ${externalFiles.length} 个外部文件` : ""}
                </span>
                {activeCategory && (
                  <button
                    onClick={() => {
                      setActiveCategory("");
                      setCategorySearchQuery("");
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-bamboo bg-bamboo-mist/50 hover:bg-bamboo-mist transition-colors cursor-pointer"
                    title="点击取消筛选，显示全部笔记"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {activeCategory}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {showCategoryInput && (
              <div className="px-3 pb-2 shrink-0">
                <input
                  type="text"
                  autoFocus
                  value={categoryInputValue}
                  onChange={(e) => setCategoryInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreateCategory();
                    if (e.key === "Escape") {
                      setShowCategoryInput(false);
                      setCategoryInputValue("");
                    }
                  }}
                  onBlur={() => void handleCreateCategory()}
                  placeholder="输入分类名…"
                  className="w-full px-2.5 h-7 rounded-lg text-[12px] font-body text-ink bg-paper-warm/80 border border-paper-deep/40 focus:border-bamboo/30 placeholder:text-ink-ghost/60"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="space-y-0.5">
                {externalFiles.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] text-ink-ghost/50 font-mono tracking-wider uppercase">
                      外部文件
                    </div>
                    {externalFiles.map((file) => {
                      const isSelected = file.id === selectedId;
                      const isHovered = file.id === hoveredId;

                      return (
                        <button
                          key={file.id}
                          onClick={() => void handleSelectExternalFile(file.id)}
                          onMouseEnter={() => setHoveredId(file.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-[600ms] cursor-pointer group relative ${
                            isSelected
                              ? "bg-bamboo-mist/70"
                              : isHovered
                                ? "bg-paper-warm/70"
                                : "bg-transparent"
                          }`}
                        >
                          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-bamboo/60 transition-all duration-[600ms] ${
                            isSelected ? "h-5 opacity-100" : "h-0 opacity-0"
                          }`} />

                          <div className="flex items-baseline justify-between mb-0.5">
                            <span
                              className={`text-[13px] font-display font-medium truncate pr-2 transition-colors flex items-center gap-1.5 ${
                                isSelected ? "text-bamboo" : "text-ink-soft"
                              }`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              {file.title}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveExternalFile(file.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-red-400 transition-all p-0.5"
                              title="从列表移除"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>

                          <p className="text-[11px] text-ink-ghost leading-relaxed line-clamp-2 group-hover:text-ink-faint transition-colors pl-[18px]">
                            {file.filePath}
                          </p>
                        </button>
                      );
                    })}
                  </>
                )}

                {categoryGroups.map((group: CategoryGroup) => {
                  if (!group.category) {
                    return group.notes.map((note) => {
                      const isSelected = note.id === selectedId;
                      const isHovered = note.id === hoveredId;
                      return (
                        <button
                          key={note.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/note-id", note.id)}
                          onClick={() => void handleSelectNote(note.id)}
                          onContextMenu={(event) => handleOpenNoteMenu(event, note.id)}
                          onMouseEnter={() => setHoveredId(note.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-[600ms] cursor-pointer group relative ${
                            isSelected
                              ? "bg-bamboo-mist/70"
                              : isHovered
                                ? "bg-paper-warm/70"
                                : "bg-transparent"
                          }`}
                        >
                          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-bamboo/60 transition-all duration-[600ms] ${
                            isSelected ? "h-5 opacity-100" : "h-0 opacity-0"
                          }`} />
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className={`text-[13px] font-display font-medium truncate pr-2 transition-colors ${
                              isSelected ? "text-bamboo" : "text-ink-soft"
                            }`}>
                              {searchQuery
                                ? highlightText(getDisplayTitle(note), sidebarSearchQuery)
                                : getDisplayTitle(note)}
                            </span>
                            <span className="text-[10px] text-ink-ghost font-mono tabular-nums shrink-0">
                              {formatShortDate(note.updatedAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-ghost leading-relaxed line-clamp-2 group-hover:text-ink-faint transition-colors">
                            {sidebarSearchQuery
                              ? highlightText(note.preview || "空白笔记", sidebarSearchQuery)
                              : (note.preview || "空白笔记")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-ink-ghost/60 font-mono tabular-nums">
                              {formatTime(note.updatedAt)}
                            </span>
                            <span className="text-[10px] text-ink-ghost/40">·</span>
                            <span className="text-[10px] text-ink-ghost/60 font-mono tabular-nums">
                              {note.wordCount} 字
                            </span>
                          </div>
                        </button>
                      );
                    });
                  }

                  const isCollapsed = collapsedCategories.has(group.category);
                  const isActiveForFilter = activeCategory === group.category;

                  return (
                    <div key={group.category} className="px-2 mb-1.5">
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg group/cat cursor-pointer select-none transition-all duration-200 ${
                          dragOverCategory === group.category
                            ? "bg-bamboo/15 border border-bamboo/40 ring-1 ring-bamboo/20"
                            : isActiveForFilter
                              ? "bg-bamboo/12 border border-bamboo/25"
                              : isCollapsed
                                ? "bg-bamboo/8 border border-bamboo/15"
                                : "bg-bamboo/5 border border-bamboo/10 rounded-b-none"
                        }`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const menuWidth = 136;
                          const menuHeight = 76;
                          const x = Math.min(e.clientX, window.innerWidth - menuWidth - 4);
                          const y = Math.min(e.clientY, window.innerHeight - menuHeight - 4);
                          setCategoryMenuClosing(false);
                          setCategoryMenu({ x: Math.max(4, x), y: Math.max(4, y), category: group.category });
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDragOverCategory(group.category);
                        }}
                        onDragLeave={() => setDragOverCategory(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverCategory(null);
                          const noteId = e.dataTransfer.getData("text/note-id");
                          if (noteId) void handleMoveNote(noteId, group.category);
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`text-bamboo/50 shrink-0 transition-transform duration-200 cursor-pointer ${isCollapsed ? "" : "rotate-90"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategoryCollapse(group.category);
                          }}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0"
                          style={{ color: getCategoryColor(group.category) }}
                        >
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: getCategoryColor(group.category) }}
                        />
                        {renamingCategory === group.category ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameCategoryValue}
                            onChange={(e) => setRenameCategoryValue(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") void handleRenameCategory(group.category);
                              if (e.key === "Escape") setRenamingCategory(null);
                            }}
                            onBlur={() => void handleRenameCategory(group.category)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 px-1 text-[10px] font-mono text-ink bg-paper-warm/80 border border-bamboo/30 rounded"
                          />
                        ) : (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCategory((prev) => prev === group.category ? "" : group.category);
                              setCategorySearchQuery("");
                            }}
                            className={`text-[11px] font-medium truncate cursor-pointer ${
                              isActiveForFilter ? "text-bamboo" : "text-bamboo/70"
                            }`}
                          >
                            {group.category}
                          </span>
                        )}
                        <span className="text-[9px] text-bamboo/40 font-mono ml-auto shrink-0">
                          {group.notes.length}
                        </span>
                        {!renamingCategory && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`删除分类「${group.category}」？\n其中的笔记将移至"未分类"。`)) {
                                void handleDeleteCategory(group.category);
                              }
                            }}
                            className="opacity-0 group-hover/cat:opacity-100 text-ink-ghost hover:text-red-400 transition-all p-0.5 shrink-0"
                            title="删除分类"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {!isCollapsed && (
                        <div className="bg-bamboo/[0.03] border border-t-0 border-bamboo/10 rounded-b-lg pb-1 pt-1">
                          {group.notes.length === 0 ? (
                            <div className="px-3 py-3 text-center text-[11px] text-ink-ghost/50">
                              空文件夹
                            </div>
                          ) : group.notes.map((note) => {
                            const isSelected = note.id === selectedId;
                            const isHovered = note.id === hoveredId;

                            return (
                              <button
                                key={note.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/note-id", note.id)}
                                onClick={() => void handleSelectNote(note.id)}
                                onContextMenu={(event) => handleOpenNoteMenu(event, note.id)}
                                onMouseEnter={() => setHoveredId(note.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                className={`w-full text-left rounded-lg mx-1 px-2.5 py-2 transition-all duration-[600ms] cursor-pointer group relative ${
                                  isSelected
                                    ? "bg-bamboo-mist/70"
                                    : isHovered
                                      ? "bg-paper-warm/70"
                                      : "bg-transparent"
                                }`}
                                style={{ width: "calc(100% - 8px)" }}
                              >
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-bamboo/60 transition-all duration-[600ms] ${
                                  isSelected ? "h-5 opacity-100" : "h-0 opacity-0"
                                }`} />

                                <div className="flex items-baseline justify-between mb-0.5">
                                  <span
                                    className={`text-[13px] font-display font-medium truncate pr-2 transition-colors ${
                                      isSelected ? "text-bamboo" : "text-ink-soft"
                                    }`}
                                  >
                                    {sidebarSearchQuery
                                      ? highlightText(getDisplayTitle(note), sidebarSearchQuery)
                                      : getDisplayTitle(note)}
                                  </span>
                                  <span className="text-[10px] text-ink-ghost font-mono tabular-nums shrink-0">
                                    {formatShortDate(note.updatedAt)}
                                  </span>
                                </div>

                                <p className="text-[11px] text-ink-ghost leading-relaxed line-clamp-2 group-hover:text-ink-faint transition-colors">
                                  {sidebarSearchQuery
                                    ? highlightText(note.preview || "空白笔记", sidebarSearchQuery)
                                    : (note.preview || "空白笔记")}
                                </p>

                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-ink-ghost/60 font-mono tabular-nums">
                                    {formatTime(note.updatedAt)}
                                  </span>
                                  <span className="text-[10px] text-ink-ghost/40">·</span>
                                  <span className="text-[10px] text-ink-ghost/60 font-mono tabular-nums">
                                    {note.wordCount} 字
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!isLoading && filteredNotes.length === 0 && externalFiles.length === 0 && (
                  <div className="px-3 py-8 text-center text-[12px] text-ink-ghost leading-relaxed">
                    {searchQuery ? "没有匹配的笔记" : "还没有笔记"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {showGraph ? (
              <GraphView onBack={() => setShowGraph(false)} />
            ) : (<>
            <div className="flex items-center justify-between px-4 h-10 border-b border-paper-deep/20 shrink-0 bg-paper/20">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-ink-faint hover:bg-paper-warm transition-all cursor-pointer"
                  title={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
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
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                </button>

                <div className="h-4 w-px bg-paper-deep/30 mx-1" />

                <button
                  onClick={() => void handlePinEntry()}
                  disabled={!selectedId}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-bamboo hover:bg-bamboo-mist/50 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title="钉为磁贴"
                >
                  <svg
                    width="13"
                    height="13"
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
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleUndo}
                  disabled={!selectedId}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-ink-faint hover:bg-paper-warm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title="撤销（Ctrl+Z）"
                  aria-label="撤销"
                >
                  <svg
                    data-testid="main-editor-undo-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 14 4 9l5-5" />
                    <path d="M4 9h10a6 6 0 0 1 0 12h-1" />
                  </svg>
                </button>

                <button
                  onClick={() => void saveCurrentNote()}
                  disabled={!selectedId || saveState === "saving"}
                  className="px-2.5 h-7 flex items-center justify-center rounded-lg text-[11px] text-ink-ghost hover:text-ink-faint hover:bg-paper-warm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title="保存"
                >
                  保存
                </button>

                {deleteConfirm ? (
                  <div className={`flex items-center gap-1 ml-1 ${deleteExiting ? "animate-delete-confirm-exit" : "animate-delete-confirm"}`}>
                    <span className="text-[11px] text-red-400 whitespace-nowrap">确认删除？</span>
                    <button
                      onClick={() => {
                        setDeleteExiting(true);
                        setTimeout(() => {
                          setDeleteExiting(false);
                          setDeleteConfirm(false);
                          void handleDeleteNote();
                        }, 150);
                      }}
                      className="px-2 h-6 rounded-md text-[11px] text-cloud bg-red-400 hover:bg-red-500 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => {
                        setDeleteExiting(true);
                        setTimeout(() => {
                          setDeleteExiting(false);
                          setDeleteConfirm(false);
                        }, 150);
                      }}
                      className="px-2 h-6 rounded-md text-[11px] text-ink-faint hover:text-ink-soft hover:bg-paper-warm transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    disabled={!selectedId}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-ghost hover:text-red-400 hover:bg-danger-bg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="删除笔记"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3,6 5,6 21,6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>

              <SlidingButtonGroup
                options={[
                  { value: "edit" as ViewMode, label: "编辑" },
                  { value: "split" as ViewMode, label: "分栏" },
                  { value: "preview" as ViewMode, label: "预览" },
                ]}
                value={viewMode}
                onChange={setViewMode}
                buttonClassName="px-3 py-1"
              />
            </div>

            <div key={noteTransitionKey} className="animate-note-enter px-6 pt-4 pb-2 shrink-0 border-b border-paper-deep/15">
              <input
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  markDirty();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    contentRef.current?.focus();
                  }
                }}
                placeholder="无标题笔记"
                disabled={!selectedId}
                className="w-full text-[20px] font-display font-bold text-ink placeholder:text-ink-ghost/50 tracking-wide disabled:opacity-60"
              />
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] text-ink-ghost font-mono tabular-nums truncate max-w-[200px]">
                  {selectedExternalFile
                    ? `外部文件 · ${selectedExternalFile.filePath}`
                    : selectedNote
                      ? `${formatShortDate(selectedNote.updatedAt)} ${formatTime(selectedNote.updatedAt)}`
                      : "--"}
                </span>
                <span className="text-[10px] text-ink-ghost/40">·</span>
                <span className="text-[10px] text-ink-ghost font-mono tabular-nums">
                  {charCount} 字
                </span>
                <span className="text-[10px] text-ink-ghost/40">·</span>
                <span
                  key={saveState}
                  className={`text-[10px] font-mono tabular-nums animate-status-fade ${
                    saveState === "error"
                      ? "text-red-400"
                      : saveState === "dirty"
                        ? "text-amber-500/70"
                        : "text-bamboo/60"
                  }`}
                >
                  {saveStateLabel[saveState]}
                </span>
              </div>
            </div>

            <div key={viewMode} className="flex-1 flex min-h-0 animate-view-fade">
              {!selectedId && !isLoading ? (
                <div className="flex-1 flex items-center justify-center text-[13px] text-ink-ghost">
                  选择或新建一篇笔记
                </div>
              ) : (
                <>
                  {(viewMode === "edit" || viewMode === "split") && (
                    <div
                      className={`flex flex-col min-h-0 ${
                        viewMode === "split"
                          ? "w-1/2 border-r border-paper-deep/20"
                          : "w-full"
                      }`}
                    >
                       <div className={`flex items-center px-4 pt-2 pb-1 shrink-0 ${isMobile ? 'gap-1.5 flex-wrap' : 'gap-0.5'}`}>
                        {toolbarButtons.map((button) => (
                          <button
                            key={button.label}
                            title={button.title}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (contentRef.current) {
                                applyFormat(contentRef.current, button.action, setContent, markDirty);
                              }
                            }}
                            className={`${isMobile ? 'min-w-9 min-h-9 text-[13px]' : 'w-6 h-6 text-[11px]'} flex items-center justify-center rounded text-ink-ghost hover:text-ink-faint hover:bg-paper-warm active:bg-paper-warm/60 transition-all cursor-pointer ${button.style}`}
                          >
                            {button.label}
                          </button>
                        ))}
                        {!isMobile && <span className="w-px h-4 bg-paper-deep/40 mx-1" />}
                        <button
                          title="AI 总结"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void handleAiSummarize()}
                          disabled={aiLoading}
                          className={`${isMobile ? 'min-w-9 min-h-9 text-[12px] px-2' : 'text-[10px] px-1.5 h-6'} flex items-center justify-center rounded transition-all cursor-pointer ${
                            aiLoading
                              ? "text-bamboo/50 cursor-wait"
                              : "text-bamboo hover:text-bamboo-light hover:bg-bamboo-mist/60 active:bg-bamboo-mist/40"
                          }`}
                        >
                          {aiLoading ? (
                            <span className="animate-pulse">✦</span>
                          ) : (
                            <span>{isMobile ? '✦ AI' : '✦ AI'}</span>
                          )}
                        </button>
                        <button
                          title="导出 PDF"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void handleExportPdf()}
                          disabled={exportingPdf}
                          className={`${isMobile ? 'min-w-9 min-h-9 text-[12px] px-2' : 'text-[10px] px-1.5 h-6'} flex items-center justify-center rounded transition-all cursor-pointer ${
                            exportingPdf
                              ? "text-ink-ghost/40 cursor-wait"
                              : "text-ink-ghost hover:text-ink-faint hover:bg-paper-warm active:bg-paper-warm/60"
                          }`}
                        >
                          {exportingPdf ? (
                            <span className="animate-pulse">⏳</span>
                          ) : (
                            <span>PDF</span>
                          )}
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto px-5 pb-4">
                        <textarea
                          ref={contentRef}
                          value={content}
                          onChange={(event) => {
                            setContent(event.target.value);
                            markDirty();
                          }}
                          className="w-full h-full leading-[1.9] text-ink-soft font-mono placeholder:text-ink-ghost/40"
                          style={{ fontSize: `${settingsConfig?.fontSize ?? 14}px` }}
                          placeholder="开始写作……"
                          spellCheck={false}
                          disabled={!selectedId}
                        />
                      </div>
                    </div>
                  )}

                  {(viewMode === "preview" || viewMode === "split") && (
                    <div
                      className={`flex flex-col min-h-0 ${
                        viewMode === "split" ? "w-1/2" : "w-full"
                      }`}
                    >
                      {viewMode === "split" && (
                        <div className="px-4 pt-2.5 pb-1 shrink-0">
                          <span className="text-[10px] text-ink-ghost/60 font-mono tracking-widest uppercase">
                            Preview
                          </span>
                        </div>
                      )}
                      {/* 预览子模式切换 */}
                      <div className="px-4 pt-2 pb-1 shrink-0">
                        <SlidingButtonGroup
                          options={[
                            { value: "markdown" as const, label: "Markdown" },
                            { value: "relation" as const, label: "关系" },
                            { value: "galaxy" as const, label: "星环" },
                          ]}
                          value={previewSubMode}
                          onChange={setPreviewSubMode}
                          buttonClassName="px-2.5 py-0.5 text-[10px]"
                        />
                      </div>
                      <div
                        className={`flex-1 overflow-y-auto px-6 pb-6 ${
                          viewMode === "preview" ? "pt-1" : "pt-0"
                        }`}
                      >
                        {previewSubMode === "markdown" && (
                          <MarkdownPreview content={content} fontSize={settingsConfig?.fontSize ?? 14} onWikiLinkClick={handleWikiLinkClick} />
                        )}
                        {previewSubMode === "relation" && selectedId && (
                          <RelationPreview noteId={selectedId} />
                        )}
                        {previewSubMode === "galaxy" && selectedId && (
                          <div className="flex flex-col h-full">
                            <div className="flex-1 min-h-0">
                              <GalaxyPreview noteId={selectedId} notesDir={savedNotesDir || undefined} />
                            </div>
                            <div className="px-4 py-2 border-t border-paper-deep/10 shrink-0">
                              <button
                                onClick={() => setShowMindMapEditor(true)}
                                className="w-full px-3 py-1.5 text-xs bg-bamboo/10 text-bamboo hover:bg-bamboo/20 rounded-md transition-colors"
                              >
                                编辑思维导图
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between px-4 h-7 border-t border-paper-deep/20 bg-paper/30 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-ink-ghost font-mono tabular-nums">
                  Ln {lineCount}
                </span>
                <span className="text-[10px] text-ink-ghost/40">|</span>
                <span className="text-[10px] text-ink-ghost font-mono">
                  Markdown
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-ink-ghost font-mono">
                  UTF-8
                </span>
                <span className="text-[10px] text-ink-ghost/40">|</span>
                <span className="text-[10px] text-ink-ghost font-mono tabular-nums">
                  {byteSize} KB
                </span>
              </div>
            </div>
            </>)}
          </div>
          {settingsConfig && (
            <div className={`relative shrink-0 transition-all duration-[600ms] overflow-hidden h-full ${
              settingsOpen ? "w-[360px]" : "w-0"
            }`}>
              <div className="w-[360px] h-full">
                <SettingsPanel
                  config={settingsConfig}
                  onChange={handleSettingsChange}
                  onChooseNotesDir={() => void handleChooseNotesDir()}
                  onClose={handleCloseSettings}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <AiSummaryModal
        open={aiResult !== null || aiError !== null || aiLoading}
        loading={aiLoading}
        result={aiResult}
        error={aiError}
        onClose={() => { setAiResult(null); setAiError(null); }}
      />

      {/* 思维导图编辑器模态框 */}
      {showMindMapEditor && selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-paper rounded-xl shadow-2xl w-[90vw] h-[85vh] max-w-5xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-paper-deep/20">
              <h2 className="text-sm font-semibold text-ink">思维导图编辑器</h2>
              <button
                onClick={() => setShowMindMapEditor(false)}
                className="p-1 text-ink-ghost hover:text-ink rounded transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <MindMapEditor
                noteId={selectedId}
                notesDir={savedNotesDir || undefined}
                onSave={() => setShowMindMapEditor(false)}
              />
            </div>
          </div>
        </div>
      )}
      {noteMenu && noteMenuTarget && (
        <div
          className={`fixed z-[9999] min-w-[168px] py-1.5 bg-cloud/95 backdrop-blur-sm border border-paper-deep/50 rounded-lg overflow-hidden select-none ${noteMenuClosing ? "animate-menu-exit" : "animate-menu-enter"}`}
          style={{ left: noteMenu.x, top: noteMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {noteMenuMode === "main" ? (
            <div key="main" className="animate-menu-slide-right">
              {noteContextMenuItems.map((item, index) => (
                <button
                  key={item.action}
                  onClick={() => handleNoteMenuAction(item.action)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] font-body transition-colors cursor-pointer ${
                    item.tone === "danger"
                      ? "text-red-400 hover:bg-danger-bg hover:text-red-500"
                      : "text-ink-soft hover:bg-bamboo-mist/60 hover:text-bamboo"
                  } ${index > 0 ? "border-t border-paper-deep/20" : ""}`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div key="move" className="animate-menu-slide-left">
              <button
                onClick={() => setNoteMenuMode("main")}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-body text-ink-ghost hover:bg-paper-warm transition-colors cursor-pointer border-b border-paper-deep/20"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>返回</span>
              </button>
              <button
                onClick={() => void handleMoveNote(noteMenuTarget.id, "")}
                className="w-full text-left px-3 py-1.5 text-[12px] font-body text-ink-soft hover:bg-bamboo-mist/60 hover:text-bamboo transition-colors cursor-pointer"
              >
                未分类
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => void handleMoveNote(noteMenuTarget.id, cat)}
                  className="w-full text-left px-3 py-1.5 text-[12px] font-body text-ink-soft hover:bg-bamboo-mist/60 hover:text-bamboo transition-colors cursor-pointer"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {categoryMenu && (
        <div
          className={`fixed z-[9999] min-w-[136px] py-1.5 bg-cloud/95 backdrop-blur-sm border border-paper-deep/50 rounded-lg overflow-hidden select-none ${categoryMenuClosing ? "animate-menu-exit" : "animate-menu-enter"}`}
          style={{ left: categoryMenu.x, top: categoryMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setCategoryMenuClosing(true);
              setRenamingCategory(categoryMenu.category);
              setRenameCategoryValue(categoryMenu.category);
            }}
            className="w-full flex items-center px-3 py-1.5 text-[12px] font-body text-ink-soft hover:bg-bamboo-mist/60 hover:text-bamboo transition-colors cursor-pointer"
          >
            重命名
          </button>
          <button
            onClick={() => {
              setColorPickerCategory(categoryMenu.category);
              setCategoryMenuClosing(true);
            }}
            className="w-full flex items-center px-3 py-1.5 text-[12px] font-body text-ink-soft hover:bg-bamboo-mist/60 hover:text-bamboo transition-colors cursor-pointer border-t border-paper-deep/20"
          >
            设置颜色…
          </button>
        </div>
      )}
      <CategoryColorPicker
        open={colorPickerCategory !== null}
        category={colorPickerCategory ?? ""}
        currentColor={colorPickerCategory ? getCategoryColor(colorPickerCategory) : undefined}
        onConfirm={(color) => void handleCategoryColorConfirm(color)}
        onCancel={() => setColorPickerCategory(null)}
      />
    </div>
  );
}
