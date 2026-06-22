/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::{default_store, AppError};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use uuid::Uuid;

const CONSTELLATION_DIR: &str = ".constellation";
const TRASH_DIR: &str = "trash";
const OPERATIONS_FILE: &str = ".constellation/operations.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSummary {
    pub constellation_id: String,
    pub relative_path: String,
    pub revision: String,
    pub title: String,
    pub folder: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRecord {
    #[serde(flatten)]
    pub summary: DocumentSummary,
    pub content: String,
    pub frontmatter: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentCreateRequest {
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub folder: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentUpdateRequest {
    pub relative_path: String,
    pub expected_revision: String,
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub folder: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentConflict {
    pub current_revision: String,
    pub conflict_copy_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentOperation {
    pub id: String,
    pub operation_type: String,
    pub from_path: String,
    pub to_path: String,
    pub created_at: String,
}

#[derive(Debug)]
struct ParsedDocument {
    frontmatter: Mapping,
    body: String,
}

#[tauri::command]
pub fn documents_list() -> Result<Vec<DocumentSummary>, AppError> {
    let root = workspace_root()?;
    let mut documents = Vec::new();
    scan_documents(&root, &root, &mut documents)?;
    documents.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(documents)
}

#[tauri::command]
pub fn documents_read(relative_path: String) -> Result<DocumentRecord, AppError> {
    let root = workspace_root()?;
    read_document(&root, &relative_path)
}

#[tauri::command]
pub fn documents_create(request: DocumentCreateRequest) -> Result<DocumentRecord, AppError> {
    let root = workspace_root()?;
    let folder = safe_relative_dir(&request.folder)?;
    let id = Uuid::now_v7().to_string();
    let created = Utc::now().to_rfc3339();
    let file_name = unique_file_name(&root.join(&folder), &request.title, &id);
    let relative_path = normalize_relative(&folder.join(file_name));
    let mut frontmatter = Mapping::new();
    frontmatter.insert(Value::String("constellation_id".into()), Value::String(id));
    frontmatter.insert(Value::String("created".into()), Value::String(created));
    let document = ParsedDocument {
        frontmatter,
        body: request.content,
    };
    let path = resolve_workspace_path(&root, &relative_path)?;
    write_document_atomic(&path, &serialize_document(&document)?)?;
    read_document(&root, &relative_path)
}

#[tauri::command]
pub fn documents_create_folder(folder: String) -> Result<(), AppError> {
    let root = workspace_root()?;
    create_workspace_folder(&root, &folder)
}

#[tauri::command]
pub fn documents_rename_folder(from_folder: String, to_folder: String) -> Result<(), AppError> {
    let root = workspace_root()?;
    rename_workspace_folder(&root, &from_folder, &to_folder)
}

#[tauri::command]
pub fn documents_trash_folder(folder: String) -> Result<String, AppError> {
    let root = workspace_root()?;
    let folder = safe_relative_dir(&folder)?;
    if folder.as_os_str().is_empty() {
        return Err(AppError {
            code: "invalidPath".into(),
            message: "文件夹名称不能为空".into(),
        });
    }
    let source = root.join(&folder);
    if !source.is_dir() {
        return Err(AppError {
            code: "notFound".into(),
            message: "文件夹不存在".into(),
        });
    }
    let target_relative = PathBuf::from(CONSTELLATION_DIR)
        .join(TRASH_DIR)
        .join(Utc::now().format("%Y%m%d%H%M%S%3f").to_string())
        .join(&folder);
    let target = root.join(&target_relative);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(source, &target)?;
    Ok(normalize_relative(&target_relative))
}

fn create_workspace_folder(root: &Path, folder: &str) -> Result<(), AppError> {
    let folder = safe_relative_dir(folder)?;
    if folder.as_os_str().is_empty() {
        return Err(AppError {
            code: "invalidPath".into(),
            message: "文件夹名称不能为空".into(),
        });
    }
    fs::create_dir_all(root.join(folder))?;
    Ok(())
}

fn rename_workspace_folder(
    root: &Path,
    from_folder: &str,
    to_folder: &str,
) -> Result<(), AppError> {
    let from = safe_relative_dir(from_folder)?;
    let to = safe_relative_dir(to_folder)?;
    if from.as_os_str().is_empty() || to.as_os_str().is_empty() {
        return Err(AppError {
            code: "invalidPath".into(),
            message: "文件夹名称不能为空".into(),
        });
    }
    let source = root.join(from);
    let target = root.join(to);
    if !source.is_dir() {
        return Err(AppError {
            code: "notFound".into(),
            message: "文件夹不存在".into(),
        });
    }
    if target.exists() {
        return Err(AppError {
            code: "conflict".into(),
            message: "目标文件夹已存在".into(),
        });
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(source, target)?;
    Ok(())
}

#[tauri::command]
pub fn documents_update(request: DocumentUpdateRequest) -> Result<DocumentRecord, AppError> {
    let root = workspace_root()?;
    let source_path = resolve_workspace_path(&root, &request.relative_path)?;
    if !source_path.is_file() {
        return Err(AppError {
            code: "notFound".into(),
            message: format!("文档不存在: {}", request.relative_path),
        });
    }

    let current_bytes = fs::read(&source_path)?;
    let current_revision = revision(&current_bytes);
    if current_revision != request.expected_revision {
        let conflict_copy = conflict_copy_path(&root, &request.relative_path)?;
        if let Some(parent) = conflict_copy.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&conflict_copy, &request.content)?;
        let detail = DocumentConflict {
            current_revision,
            conflict_copy_path: normalize_relative(
                conflict_copy.strip_prefix(&root).unwrap_or(&conflict_copy),
            ),
        };
        return Err(AppError {
            code: "revisionConflict".into(),
            message: serde_json::to_string(&detail).unwrap_or_else(|_| "文档已被外部修改".into()),
        });
    }

    let current_text = String::from_utf8(current_bytes).map_err(|error| AppError {
        code: "encoding".into(),
        message: error.to_string(),
    })?;
    let mut parsed = parse_document(&current_text)?;
    ensure_identity(&mut parsed.frontmatter);
    parsed.body = request.content;

    let folder = safe_relative_dir(&request.folder)?;
    let id = frontmatter_string(&parsed.frontmatter, "constellation_id")
        .unwrap_or_else(|| Uuid::now_v7().to_string());
    let file_name =
        unique_file_name_for_update(&root.join(&folder), &request.title, &id, &source_path);
    let next_relative = normalize_relative(&folder.join(file_name));
    let next_path = resolve_workspace_path(&root, &next_relative)?;
    write_document_atomic(&next_path, &serialize_document(&parsed)?)?;
    if next_path != source_path && source_path.exists() {
        fs::remove_file(source_path)?;
        record_operation(
            &root,
            DocumentOperation {
                id: Uuid::now_v7().to_string(),
                operation_type: "rename".into(),
                from_path: request.relative_path,
                to_path: next_relative.clone(),
                created_at: Utc::now().to_rfc3339(),
            },
        )?;
    }
    read_document(&root, &next_relative)
}

#[tauri::command]
pub fn documents_move(relative_path: String, folder: String) -> Result<DocumentRecord, AppError> {
    let root = workspace_root()?;
    let source = resolve_workspace_path(&root, &relative_path)?;
    let folder = safe_relative_dir(&folder)?;
    let file_name = source.file_name().ok_or_else(|| AppError {
        code: "invalidPath".into(),
        message: "文档路径缺少文件名".into(),
    })?;
    let target_relative = normalize_relative(&folder.join(file_name));
    let target = resolve_workspace_path(&root, &target_relative)?;
    if target.exists() {
        return Err(AppError {
            code: "conflict".into(),
            message: format!("目标文档已存在: {target_relative}"),
        });
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(source, &target)?;
    record_operation(
        &root,
        DocumentOperation {
            id: Uuid::now_v7().to_string(),
            operation_type: "move".into(),
            from_path: relative_path,
            to_path: target_relative.clone(),
            created_at: Utc::now().to_rfc3339(),
        },
    )?;
    read_document(&root, &target_relative)
}

#[tauri::command]
pub fn documents_undo_last() -> Result<Option<DocumentRecord>, AppError> {
    let root = workspace_root()?;
    undo_last_operation(&root)
}

#[tauri::command]
pub fn documents_trash(relative_path: String) -> Result<String, AppError> {
    let root = workspace_root()?;
    let source = resolve_workspace_path(&root, &relative_path)?;
    if !source.is_file() {
        return Err(AppError {
            code: "notFound".into(),
            message: format!("文档不存在: {relative_path}"),
        });
    }
    let timestamp = Utc::now().format("%Y%m%d%H%M%S%3f");
    let target_relative = PathBuf::from(CONSTELLATION_DIR)
        .join(TRASH_DIR)
        .join(timestamp.to_string())
        .join(safe_relative_path(&relative_path)?);
    let target = root.join(&target_relative);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(source, &target)?;
    let manifest = target.with_extension("trash.json");
    fs::write(
        manifest,
        serde_json::to_vec_pretty(&serde_json::json!({
            "originalPath": relative_path,
            "trashedAt": Utc::now().to_rfc3339(),
        }))?,
    )?;
    Ok(normalize_relative(&target_relative))
}

#[tauri::command]
pub fn documents_restore(trash_path: String) -> Result<DocumentRecord, AppError> {
    let root = workspace_root()?;
    let source = resolve_workspace_path(&root, &trash_path)?;
    let manifest_path = source.with_extension("trash.json");
    let manifest: serde_json::Value = serde_json::from_slice(&fs::read(&manifest_path)?)?;
    let original = manifest
        .get("originalPath")
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| AppError {
            code: "invalidTrashManifest".into(),
            message: "回收站记录缺少原始路径".into(),
        })?;
    let target = resolve_workspace_path(&root, original)?;
    if target.exists() {
        return Err(AppError {
            code: "conflict".into(),
            message: format!("恢复目标已存在: {original}"),
        });
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(&source, &target)?;
    let _ = fs::remove_file(manifest_path);
    read_document(&root, original)
}

fn workspace_root() -> Result<PathBuf, AppError> {
    let root = PathBuf::from(default_store()?.load_config()?.notes_dir);
    fs::create_dir_all(&root)?;
    root.canonicalize().map_err(AppError::from)
}

fn record_operation(root: &Path, operation: DocumentOperation) -> Result<(), AppError> {
    let mut operations = load_operations(root)?;
    operations.push(operation);
    if operations.len() > 100 {
        operations.drain(..operations.len() - 100);
    }
    save_operations(root, &operations)
}

fn undo_last_operation(root: &Path) -> Result<Option<DocumentRecord>, AppError> {
    let mut operations = load_operations(root)?;
    let Some(operation) = operations.pop() else {
        return Ok(None);
    };
    let current = resolve_workspace_path(root, &operation.to_path)?;
    let previous = resolve_workspace_path(root, &operation.from_path)?;
    if !current.is_file() {
        return Err(AppError {
            code: "undoSourceMissing".into(),
            message: format!("Cannot undo because {} no longer exists", operation.to_path),
        });
    }
    if previous.exists() {
        return Err(AppError {
            code: "undoConflict".into(),
            message: format!("Cannot undo because {} already exists", operation.from_path),
        });
    }
    if let Some(parent) = previous.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(current, &previous)?;
    save_operations(root, &operations)?;
    read_document(root, &operation.from_path).map(Some)
}

fn load_operations(root: &Path) -> Result<Vec<DocumentOperation>, AppError> {
    let path = root.join(OPERATIONS_FILE);
    if !path.is_file() {
        return Ok(Vec::new());
    }
    serde_json::from_slice(&fs::read(path)?).map_err(AppError::from)
}

fn save_operations(root: &Path, operations: &[DocumentOperation]) -> Result<(), AppError> {
    let path = root.join(OPERATIONS_FILE);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, serde_json::to_vec_pretty(operations)?)?;
    fs::rename(temporary, path)?;
    Ok(())
}

fn scan_documents(
    root: &Path,
    dir: &Path,
    output: &mut Vec<DocumentSummary>,
) -> Result<(), AppError> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let name = entry.file_name();
            if name == CONSTELLATION_DIR || name == "_legacy" || name == ".mindmaps" {
                continue;
            }
            scan_documents(root, &path, output)?;
        } else if path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case("md"))
        {
            let relative = normalize_relative(path.strip_prefix(root).unwrap_or(&path));
            if let Ok(document) = read_document(root, &relative) {
                output.push(document.summary);
            }
        }
    }
    Ok(())
}

fn read_document(root: &Path, relative_path: &str) -> Result<DocumentRecord, AppError> {
    let path = resolve_workspace_path(root, relative_path)?;
    let bytes = fs::read(&path)?;
    let revision = revision(&bytes);
    let text = String::from_utf8(bytes).map_err(|error| AppError {
        code: "encoding".into(),
        message: error.to_string(),
    })?;
    let parsed = parse_document(&text)?;
    let metadata = fs::metadata(&path)?;
    let updated = metadata
        .modified()
        .map(DateTime::<Utc>::from)
        .unwrap_or_else(|_| Utc::now());
    let created =
        frontmatter_string(&parsed.frontmatter, "created").unwrap_or_else(|| updated.to_rfc3339());
    let id = frontmatter_string(&parsed.frontmatter, "constellation_id")
        .unwrap_or_else(|| format!("legacy:{}", relative_path.replace('\\', "/")));
    let title = first_h1(&parsed.body).unwrap_or_else(|| {
        path.file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("无标题")
            .to_string()
    });
    let folder = path
        .parent()
        .and_then(|parent| parent.strip_prefix(root).ok())
        .map(normalize_relative)
        .unwrap_or_default();
    let frontmatter = serde_json::to_value(&parsed.frontmatter)?;
    Ok(DocumentRecord {
        summary: DocumentSummary {
            constellation_id: id,
            relative_path: relative_path.replace('\\', "/"),
            revision,
            title,
            folder,
            created_at: created,
            updated_at: updated.to_rfc3339(),
        },
        content: parsed.body,
        frontmatter,
    })
}

fn parse_document(content: &str) -> Result<ParsedDocument, AppError> {
    let normalized = content.strip_prefix('\u{feff}').unwrap_or(content);
    if let Some(rest) = normalized.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---") {
            let yaml = &rest[..end];
            let body = rest[end + 4..].trim_start_matches(['\r', '\n']).to_string();
            let frontmatter = serde_yaml::from_str::<Mapping>(yaml).map_err(|error| AppError {
                code: "frontmatter".into(),
                message: error.to_string(),
            })?;
            return Ok(ParsedDocument { frontmatter, body });
        }
    }
    Ok(ParsedDocument {
        frontmatter: Mapping::new(),
        body: normalized.to_string(),
    })
}

fn serialize_document(document: &ParsedDocument) -> Result<Vec<u8>, AppError> {
    let yaml = serde_yaml::to_string(&document.frontmatter).map_err(|error| AppError {
        code: "frontmatter".into(),
        message: error.to_string(),
    })?;
    Ok(format!("---\n{}---\n\n{}", yaml, document.body).into_bytes())
}

fn ensure_identity(frontmatter: &mut Mapping) {
    if frontmatter_string(frontmatter, "constellation_id").is_none() {
        frontmatter.insert(
            Value::String("constellation_id".into()),
            Value::String(Uuid::now_v7().to_string()),
        );
    }
    if frontmatter_string(frontmatter, "created").is_none() {
        frontmatter.insert(
            Value::String("created".into()),
            Value::String(Utc::now().to_rfc3339()),
        );
    }
}

fn frontmatter_string(frontmatter: &Mapping, key: &str) -> Option<String> {
    frontmatter
        .get(Value::String(key.into()))
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn first_h1(body: &str) -> Option<String> {
    body.lines()
        .find_map(|line| line.trim().strip_prefix("# ").map(str::trim))
        .filter(|title| !title.is_empty())
        .map(str::to_string)
}

fn revision(content: &[u8]) -> String {
    blake3::hash(content).to_hex().to_string()
}

fn write_document_atomic(path: &Path, content: &[u8]) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temp_path = path.with_extension(format!("md.tmp-{}", Uuid::now_v7()));
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp_path)?;
    file.write_all(content)?;
    file.flush()?;
    file.sync_all()?;
    if path.exists() {
        let backup = path.with_extension("md.swap");
        if backup.exists() {
            fs::remove_file(&backup)?;
        }
        fs::rename(path, &backup)?;
        if let Err(error) = fs::rename(&temp_path, path) {
            let _ = fs::rename(&backup, path);
            return Err(AppError::from(error));
        }
        fs::remove_file(backup)?;
    } else {
        fs::rename(temp_path, path)?;
    }
    sync_parent(path)?;
    Ok(())
}

fn sync_parent(path: &Path) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        if let Ok(directory) = File::open(parent) {
            let _ = directory.sync_all();
        }
    }
    Ok(())
}

fn resolve_workspace_path(root: &Path, relative: &str) -> Result<PathBuf, AppError> {
    let relative = safe_relative_path(relative)?;
    Ok(root.join(relative))
}

fn safe_relative_dir(value: &str) -> Result<PathBuf, AppError> {
    if value.trim().is_empty() {
        return Ok(PathBuf::new());
    }
    safe_relative_path(value)
}

fn safe_relative_path(value: &str) -> Result<PathBuf, AppError> {
    let path = Path::new(value);
    if path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(AppError {
            code: "invalidPath".into(),
            message: format!("路径必须位于工作区内: {value}"),
        });
    }
    Ok(path.to_path_buf())
}

fn normalize_relative(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn unique_file_name(directory: &Path, title: &str, id: &str) -> String {
    unique_file_name_for_update(directory, title, id, Path::new(""))
}

fn unique_file_name_for_update(directory: &Path, title: &str, id: &str, current: &Path) -> String {
    let stem = safe_file_stem(title);
    let stem = if stem.is_empty() {
        "无标题".into()
    } else {
        stem
    };
    let preferred = format!("{stem}.md");
    let preferred_path = directory.join(&preferred);
    if !preferred_path.exists() || preferred_path == current {
        return preferred;
    }
    format!("{stem}-{}.md", &id[..8.min(id.len())])
}

fn safe_file_stem(title: &str) -> String {
    title
        .trim()
        .chars()
        .map(|character| {
            if character.is_control()
                || matches!(
                    character,
                    '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'
                )
            {
                '_'
            } else {
                character
            }
        })
        .collect::<String>()
        .trim_matches([' ', '_', '.'])
        .chars()
        .take(80)
        .collect()
}

fn conflict_copy_path(root: &Path, relative_path: &str) -> Result<PathBuf, AppError> {
    let relative = safe_relative_path(relative_path)?;
    let parent = relative.parent().unwrap_or_else(|| Path::new(""));
    let stem = relative
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("文档");
    let timestamp = Utc::now().format("%Y%m%d-%H%M%S");
    Ok(root
        .join(parent)
        .join(format!("{stem}.conflict-{timestamp}.md")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_a_real_workspace_folder_without_allowing_path_escape() {
        let root = std::env::temp_dir().join(format!("constellation-folder-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();

        create_workspace_folder(&root, "研究/哲学").unwrap();
        assert!(root.join("研究/哲学").is_dir());
        assert!(create_workspace_folder(&root, "../escape").is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn renames_a_workspace_folder_without_leaving_the_workspace() {
        let root =
            std::env::temp_dir().join(format!("constellation-rename-folder-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("研究/哲学")).unwrap();

        rename_workspace_folder(&root, "研究/哲学", "研究/认识论").unwrap();

        assert!(root.join("研究/认识论").is_dir());
        assert!(!root.join("研究/哲学").exists());
        assert!(rename_workspace_folder(&root, "研究/认识论", "../escape").is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn frontmatter_round_trip_preserves_unknown_fields() {
        let parsed = parse_document("---\ncustom: yes\ntags:\n  - a\n---\n\n# 标题\n正文").unwrap();
        let bytes = serialize_document(&parsed).unwrap();
        let reparsed = parse_document(std::str::from_utf8(&bytes).unwrap()).unwrap();
        assert_eq!(
            reparsed.frontmatter.get(Value::String("custom".into())),
            Some(&Value::String("yes".into()))
        );
        assert_eq!(reparsed.body, "# 标题\n正文");
    }

    #[test]
    fn rejects_parent_directory_paths() {
        assert!(safe_relative_path("../outside.md").is_err());
        assert!(safe_relative_path("folder/note.md").is_ok());
    }

    #[test]
    fn undo_restores_last_move_without_overwriting() {
        let root = std::env::temp_dir().join(format!("constellation-doc-undo-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("archive")).unwrap();
        fs::write(
            root.join("archive/note.md"),
            "---\nconstellation_id: note-id\ncreated: 2026-06-08T00:00:00Z\n---\n# Note\nBody",
        )
        .unwrap();
        record_operation(
            &root,
            DocumentOperation {
                id: Uuid::now_v7().to_string(),
                operation_type: "move".into(),
                from_path: "note.md".into(),
                to_path: "archive/note.md".into(),
                created_at: Utc::now().to_rfc3339(),
            },
        )
        .unwrap();
        let restored = undo_last_operation(&root).unwrap().unwrap();
        assert_eq!(restored.summary.relative_path, "note.md");
        assert!(root.join("note.md").is_file());
        assert!(!root.join("archive/note.md").exists());
        fs::remove_dir_all(root).unwrap();
    }
}
