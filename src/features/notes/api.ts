/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：已迁移到 modules/notes/api/index.ts
 */

export {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  moveNoteCategory,
  listCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  readExternalFile,
  saveExternalFile,
  getErrorMessage,
} from "../../modules/notes/api";
