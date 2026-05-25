/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 *
 * @remarks
 * 提取自 MainWindow.tsx 的笔记列表侧边栏。
 * 该组件接收所有需要的 props，以便在 EditorLayout 中独立使用。
 */

import type { MouseEvent, KeyboardEvent } from "react";
import type { CategoryGroup } from "../modules/shared/utils/noteUtils";
import type { ExternalFile, NoteMetadata } from "../modules/shared/types/notes";
import { SearchBar } from "../modules/notes/components/SearchBar";
import { highlightText } from "../modules/shared/utils/highlightUtils";
import {
  formatShortDate,
  formatTime,
  getDisplayTitle,
} from "../modules/shared/utils/noteUtils";

export interface NoteListPanelProps {
  filteredNotes: NoteMetadata[];
  categoryGroups: CategoryGroup[];
  externalFiles: ExternalFile[];
  searchQuery: string;
  selectedId: string | null;
  hoveredId: string | null;
  isMobile: boolean;
  sidebarCollapsed: boolean;
  collapsedCategories: Set<string>;
  dragOverCategory: string | null;
  renamingCategory: string | null;
  renameCategoryValue: string;
  showCategoryInput: boolean;
  categoryInputValue: string;
  isLoading: boolean;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onImportNote: () => void;
  onSelectExternalFile: (id: string) => void;
  onRemoveExternalFile: (id: string) => void;
  onToggleCategoryCollapse: (category: string) => void;
  onCategoryInputChange: (value: string) => void;
  onCategoryInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onCategoryInputBlur: () => void;
  onToggleShowCategoryInput: () => void;
  onSetRenamingCategory: (category: string | null) => void;
  onSetRenameCategoryValue: (value: string) => void;
  onRenameCategory: (oldName: string) => void;
  onDeleteCategory: (category: string) => void;
  onMoveNote: (noteId: string, category: string) => void;
  onOpenNoteMenu: (event: MouseEvent, noteId: string) => void;
  onSetDragOverCategory: (category: string | null) => void;
  onToggleSidebar: () => void;
  onSetHoveredId: (id: string | null) => void;
}

export function NoteListPanel(props: NoteListPanelProps) {
  const {
    filteredNotes = [],
    categoryGroups = [],
    externalFiles = [],
    searchQuery = "",
    selectedId,
    hoveredId,
    isMobile,
    sidebarCollapsed,
    collapsedCategories,
    dragOverCategory,
    renamingCategory,
    renameCategoryValue,
    showCategoryInput,
    categoryInputValue,
    isLoading,
    onSelectNote,
    onNewNote,
    onImportNote,
    onSelectExternalFile,
    onRemoveExternalFile,
    onToggleCategoryCollapse,
    onCategoryInputChange,
    onCategoryInputKeyDown,
    onCategoryInputBlur,
    onToggleShowCategoryInput,
    onSetRenamingCategory,
    onSetRenameCategoryValue,
    onRenameCategory,
    onDeleteCategory,
    onMoveNote,
    onOpenNoteMenu,
    onSetDragOverCategory,
    onToggleSidebar,
    onSetHoveredId,
  } = props;

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/30 z-30 animate-fade-in"
          onClick={() => onToggleSidebar()}
          aria-hidden="true"
        />
      )}
      <div
        className={`border-r shrink-0 flex flex-col transition-all duration-[600ms] ${
          isMobile
            ? sidebarCollapsed
              ? "w-0 overflow-hidden"
              : "fixed inset-y-0 left-0 w-4/5 max-w-[320px] z-40 shadow-xl animate-slide-in-left border-r"
            : sidebarCollapsed
              ? "w-0 overflow-hidden"
              : "w-[280px]"
        }`}
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-sidebar)",
        }}
      >
        <SearchBar resultCount={filteredNotes.length} />

        <div className="px-3 pb-2 shrink-0 space-y-1">
          <button
            onClick={onNewNote}
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
            onClick={() => void onImportNote()}
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
          <span className="text-[10px] text-ink-ghost font-mono tracking-wider uppercase">
            {filteredNotes.length} 篇笔记{externalFiles.length > 0 ? ` \u00b7 ${externalFiles.length} 个外部文件` : ""}
          </span>
          <button
            onClick={onToggleShowCategoryInput}
            className="text-[10px] text-ink-ghost hover:text-bamboo transition-colors cursor-pointer"
            title="新建分类"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {showCategoryInput && (
          <div className="px-3 pb-2 shrink-0">
            <input
              type="text"
              autoFocus
              value={categoryInputValue}
              onChange={(e) => onCategoryInputChange(e.target.value)}
              onKeyDown={onCategoryInputKeyDown}
              onBlur={onCategoryInputBlur}
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
                      onClick={() => void onSelectExternalFile(file.id)}
                      onMouseEnter={() => onSetHoveredId(file.id)}
                      onMouseLeave={() => onSetHoveredId(null)}
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
                            onRemoveExternalFile(file.id);
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
                      onClick={() => void onSelectNote(note.id)}
                      onContextMenu={(event) => onOpenNoteMenu(event, note.id)}
                      onMouseEnter={() => onSetHoveredId(note.id)}
                      onMouseLeave={() => onSetHoveredId(null)}
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
                            ? highlightText(getDisplayTitle(note), searchQuery)
                            : getDisplayTitle(note)}
                        </span>
                        <span className="text-[10px] text-ink-ghost font-mono tabular-nums shrink-0">
                          {formatShortDate(note.updatedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-ghost leading-relaxed line-clamp-2 group-hover:text-ink-faint transition-colors">
                        {searchQuery
                          ? highlightText(note.preview || "空白笔记", searchQuery)
                          : (note.preview || "空白笔记")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-ink-ghost/60 font-mono tabular-nums">
                          {formatTime(note.updatedAt)}
                        </span>
                        <span className="text-[10px] text-ink-ghost/40">\u00b7</span>
                        <span className="text-[10px] text-ink-ghost/60 font-mono tabular-nums">
                          {note.wordCount} 字
                        </span>
                      </div>
                    </button>
                  );
                });
              }

              const isCollapsed = collapsedCategories.has(group.category);

              return (
                <div key={group.category} className="px-2 mb-1.5">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg group/cat cursor-pointer select-none transition-all duration-200 ${
                      dragOverCategory === group.category
                        ? "bg-bamboo/15 border border-bamboo/40 ring-1 ring-bamboo/20"
                        : isCollapsed
                          ? "bg-bamboo/8 border border-bamboo/15"
                          : "bg-bamboo/5 border border-bamboo/10 rounded-b-none"
                    }`}
                    onClick={() => onToggleCategoryCollapse(group.category)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onSetRenamingCategory(group.category);
                      onSetRenameCategoryValue(group.category);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      onSetDragOverCategory(group.category);
                    }}
                    onDragLeave={() => onSetDragOverCategory(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      onSetDragOverCategory(null);
                      const noteId = e.dataTransfer.getData("text/note-id");
                      if (noteId) void onMoveNote(noteId, group.category);
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
                      className={`text-bamboo/50 shrink-0 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
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
                      className="text-bamboo/50 shrink-0"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {renamingCategory === group.category ? (
                      <input
                        type="text"
                        autoFocus
                        value={renameCategoryValue}
                        onChange={(e) => onSetRenameCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") void onRenameCategory(group.category);
                          if (e.key === "Escape") onSetRenamingCategory(null);
                        }}
                        onBlur={() => void onRenameCategory(group.category)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 px-1 text-[10px] font-mono text-ink bg-paper-warm/80 border border-bamboo/30 rounded"
                      />
                    ) : (
                      <span className="text-[11px] text-bamboo/70 font-medium truncate">
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
                          if (window.confirm(`\u5220\u9664\u5206\u7c7b\u300c${group.category}\u300d\uff1f\n\u5176\u4e2d\u7684\u7b14\u8bb0\u5c06\u79fb\u81f3\u201c\u672a\u5206\u7c7b\u201d\u3002`)) {
                            void onDeleteCategory(group.category);
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
                            onClick={() => void onSelectNote(note.id)}
                            onContextMenu={(event) => onOpenNoteMenu(event, note.id)}
                            onMouseEnter={() => onSetHoveredId(note.id)}
                            onMouseLeave={() => onSetHoveredId(null)}
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
                                {searchQuery
                                  ? highlightText(getDisplayTitle(note), searchQuery)
                                  : getDisplayTitle(note)}
                              </span>
                              <span className="text-[10px] text-ink-ghost font-mono tabular-nums shrink-0">
                                {formatShortDate(note.updatedAt)}
                              </span>
                            </div>

                            <p className="text-[11px] text-ink-ghost leading-relaxed line-clamp-2 group-hover:text-ink-faint transition-colors">
                              {searchQuery
                                ? highlightText(note.preview || "空白笔记", searchQuery)
                                : (note.preview || "空白笔记")}
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-ink-ghost/60 font-mono tabular-nums">
                                {formatTime(note.updatedAt)}
                              </span>
                              <span className="text-[10px] text-ink-ghost/40">\u00b7</span>
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
    </>
  );
}
