/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::{default_store, AppError};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use uuid::Uuid;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionRecord {
    pub id: String,
    pub document_id: String,
    pub suggestion_type: String,
    pub payload: serde_json::Value,
    pub fingerprint: String,
    pub status: SuggestionStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SuggestionStatus {
    Pending,
    Accepted,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionCreateRequest {
    pub document_id: String,
    pub suggestion_type: String,
    pub payload: serde_json::Value,
    pub fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SuggestionFile {
    version: u32,
    suggestions: Vec<SuggestionRecord>,
    rejected_fingerprints: Vec<String>,
}

#[tauri::command]
pub fn suggestions_list(
    status: Option<SuggestionStatus>,
) -> Result<Vec<SuggestionRecord>, AppError> {
    let file = load_file(&suggestion_path()?)?;
    Ok(file
        .suggestions
        .into_iter()
        .filter(|item| status.as_ref().is_none_or(|value| item.status == *value))
        .collect())
}

#[tauri::command]
pub fn suggestions_create(
    request: SuggestionCreateRequest,
) -> Result<Option<SuggestionRecord>, AppError> {
    if request.document_id.trim().is_empty()
        || request.suggestion_type.trim().is_empty()
        || request.fingerprint.trim().is_empty()
    {
        return Err(AppError {
            code: "invalidSuggestion".into(),
            message: "建议必须包含文档、类型和指纹".into(),
        });
    }
    let path = suggestion_path()?;
    let mut file = load_file(&path)?;
    if file
        .rejected_fingerprints
        .iter()
        .any(|fingerprint| fingerprint == &request.fingerprint)
        || file.suggestions.iter().any(|item| {
            item.fingerprint == request.fingerprint && item.status == SuggestionStatus::Pending
        })
    {
        return Ok(None);
    }

    let now = Utc::now().to_rfc3339();
    let suggestion = SuggestionRecord {
        id: Uuid::now_v7().to_string(),
        document_id: request.document_id,
        suggestion_type: request.suggestion_type,
        payload: request.payload,
        fingerprint: request.fingerprint,
        status: SuggestionStatus::Pending,
        created_at: now.clone(),
        updated_at: now,
    };
    file.suggestions.push(suggestion.clone());
    save_file(&path, &file)?;
    Ok(Some(suggestion))
}

#[tauri::command]
pub fn suggestions_set_status(
    id: String,
    status: SuggestionStatus,
) -> Result<SuggestionRecord, AppError> {
    let path = suggestion_path()?;
    let mut file = load_file(&path)?;
    let index = file
        .suggestions
        .iter()
        .position(|item| item.id == id)
        .ok_or_else(|| AppError {
            code: "suggestionNotFound".into(),
            message: format!("建议不存在: {id}"),
        })?;
    if status == SuggestionStatus::Rejected {
        let fingerprint = file.suggestions[index].fingerprint.clone();
        if !file.rejected_fingerprints.contains(&fingerprint) {
            file.rejected_fingerprints.push(fingerprint);
        }
    }
    file.suggestions[index].status = status;
    file.suggestions[index].updated_at = Utc::now().to_rfc3339();
    let updated = file.suggestions[index].clone();
    save_file(&path, &file)?;
    Ok(updated)
}

#[tauri::command]
pub fn suggestions_delete(id: String) -> Result<(), AppError> {
    let path = suggestion_path()?;
    let mut file = load_file(&path)?;
    file.suggestions.retain(|item| item.id != id);
    save_file(&path, &file)
}

#[tauri::command]
pub fn suggestions_apply(id: String) -> Result<SuggestionRecord, AppError> {
    let root = workspace_root()?;
    let path = suggestion_path()?;
    let mut file = load_file(&path)?;
    let suggestion = file
        .suggestions
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| app_error("suggestionNotFound", "Suggestion does not exist"))?;
    if suggestion.status != SuggestionStatus::Pending {
        return Err(app_error(
            "suggestionState",
            "Only pending suggestions can be applied",
        ));
    }
    apply_suggestion(&root, &suggestion)?;
    let item = file
        .suggestions
        .iter_mut()
        .find(|item| item.id == id)
        .expect("suggestion was found before applying");
    item.status = SuggestionStatus::Accepted;
    item.updated_at = Utc::now().to_rfc3339();
    let applied = item.clone();
    save_file(&path, &file)?;
    Ok(applied)
}

fn apply_suggestion(root: &Path, suggestion: &SuggestionRecord) -> Result<(), AppError> {
    let document_path = find_document_by_id(root, &suggestion.document_id)?
        .ok_or_else(|| app_error("documentNotFound", "Suggestion document does not exist"))?;
    let content = fs::read_to_string(&document_path)?;
    let (mut frontmatter, mut body) = split_document(&content)?;
    match suggestion.suggestion_type.as_str() {
        "tags" => {
            let tags = suggestion
                .payload
                .get("tags")
                .and_then(serde_json::Value::as_array)
                .ok_or_else(|| app_error("suggestionPayload", "Tag suggestion requires tags"))?;
            let mut merged = frontmatter
                .get(Value::String("tags".into()))
                .and_then(Value::as_sequence)
                .cloned()
                .unwrap_or_default();
            for tag in tags.iter().filter_map(serde_json::Value::as_str) {
                let value = Value::String(tag.trim().to_string());
                if !tag.trim().is_empty() && !merged.contains(&value) {
                    merged.push(value);
                }
            }
            frontmatter.insert(Value::String("tags".into()), Value::Sequence(merged));
        }
        "summary" => {
            let summary = suggestion
                .payload
                .get("summary")
                .and_then(serde_json::Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| {
                    app_error("suggestionPayload", "Summary suggestion requires summary")
                })?;
            frontmatter.insert(
                Value::String("constellation_summary".into()),
                Value::String(summary.trim().to_string()),
            );
        }
        "link" => {
            let target = suggestion
                .payload
                .get("target")
                .and_then(serde_json::Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| app_error("suggestionPayload", "Link suggestion requires target"))?;
            let wiki_link = format!("[[{}]]", target.trim());
            if !body.contains(&wiki_link) {
                body.push_str(&format!("\n\n{wiki_link}"));
            }
        }
        "folder" => {
            let folder = suggestion
                .payload
                .get("folder")
                .and_then(serde_json::Value::as_str)
                .ok_or_else(|| {
                    app_error("suggestionPayload", "Folder suggestion requires folder")
                })?;
            let folder = safe_relative_folder(folder)?;
            let file_name = document_path
                .file_name()
                .ok_or_else(|| app_error("invalidPath", "Document has no file name"))?;
            let target = root.join(folder).join(file_name);
            if target.exists() {
                return Err(app_error(
                    "suggestionConflict",
                    format!("Target already exists: {}", target.display()),
                ));
            }
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            write_document_atomic(&document_path, &frontmatter, &body)?;
            fs::rename(document_path, target)?;
            return Ok(());
        }
        "related" => return Ok(()),
        value => {
            return Err(app_error(
                "unsupportedSuggestion",
                format!("Unsupported suggestion type: {value}"),
            ))
        }
    }
    write_document_atomic(&document_path, &frontmatter, &body)
}

fn find_document_by_id(root: &Path, document_id: &str) -> Result<Option<PathBuf>, AppError> {
    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|entry| entry.file_name() != ".constellation")
        .filter_map(Result::ok)
        .filter(|entry| {
            entry.file_type().is_file()
                && entry
                    .path()
                    .extension()
                    .is_some_and(|value| value.eq_ignore_ascii_case("md"))
        })
    {
        let content = fs::read_to_string(entry.path())?;
        let (frontmatter, _) = split_document(&content)?;
        if frontmatter
            .get(Value::String("constellation_id".into()))
            .and_then(Value::as_str)
            == Some(document_id)
        {
            return Ok(Some(entry.path().to_path_buf()));
        }
    }
    Ok(None)
}

fn split_document(content: &str) -> Result<(Mapping, String), AppError> {
    if let Some(rest) = content.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---\n") {
            let mapping = serde_yaml::from_str::<Mapping>(&rest[..end])
                .map_err(|error| app_error("frontmatter", error.to_string()))?;
            return Ok((mapping, rest[end + 5..].to_string()));
        }
    }
    Ok((Mapping::new(), content.to_string()))
}

fn write_document_atomic(path: &Path, frontmatter: &Mapping, body: &str) -> Result<(), AppError> {
    let yaml = serde_yaml::to_string(frontmatter)
        .map_err(|error| app_error("frontmatter", error.to_string()))?;
    let bytes = format!("---\n{}---\n{}", yaml, body).into_bytes();
    let temporary = path.with_extension(format!("{}.tmp", Uuid::now_v7()));
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)?;
    file.write_all(&bytes)?;
    file.sync_all()?;
    fs::rename(temporary, path)?;
    Ok(())
}

fn safe_relative_folder(value: &str) -> Result<PathBuf, AppError> {
    let path = Path::new(value);
    if path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(app_error(
            "invalidPath",
            "Suggested folder is outside the workspace",
        ));
    }
    Ok(path.to_path_buf())
}

fn workspace_root() -> Result<PathBuf, AppError> {
    let root = PathBuf::from(default_store()?.load_config()?.notes_dir);
    fs::create_dir_all(&root)?;
    root.canonicalize().map_err(AppError::from)
}

fn app_error(code: &str, message: impl Into<String>) -> AppError {
    AppError {
        code: code.into(),
        message: message.into(),
    }
}

fn suggestion_path() -> Result<PathBuf, AppError> {
    let root = PathBuf::from(default_store()?.load_config()?.notes_dir);
    let directory = root.join(".constellation");
    fs::create_dir_all(&directory)?;
    Ok(directory.join("suggestions.json"))
}

fn load_file(path: &Path) -> Result<SuggestionFile, AppError> {
    if !path.exists() {
        return Ok(SuggestionFile {
            version: 1,
            ..SuggestionFile::default()
        });
    }
    Ok(serde_json::from_slice(&fs::read(path)?)?)
}

fn save_file(path: &Path, file: &SuggestionFile) -> Result<(), AppError> {
    let temp = path.with_extension(format!("json.tmp-{}", Uuid::now_v7()));
    fs::write(&temp, serde_json::to_vec_pretty(file)?)?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    fs::rename(temp, path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejected_fingerprint_suppresses_repeated_suggestions() {
        let root =
            std::env::temp_dir().join(format!("constellation-suggestions-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let path = root.join("suggestions.json");
        let mut file = SuggestionFile {
            version: 1,
            ..SuggestionFile::default()
        };
        let request = SuggestionCreateRequest {
            document_id: "doc".into(),
            suggestion_type: "tag".into(),
            payload: serde_json::json!({ "tag": "Rust" }),
            fingerprint: "same-result".into(),
        };
        let now = Utc::now().to_rfc3339();
        file.suggestions.push(SuggestionRecord {
            id: "id".into(),
            document_id: request.document_id.clone(),
            suggestion_type: request.suggestion_type.clone(),
            payload: request.payload.clone(),
            fingerprint: request.fingerprint.clone(),
            status: SuggestionStatus::Rejected,
            created_at: now.clone(),
            updated_at: now,
        });
        file.rejected_fingerprints.push(request.fingerprint);
        save_file(&path, &file).unwrap();
        let loaded = load_file(&path).unwrap();

        assert_eq!(loaded.rejected_fingerprints, vec!["same-result"]);
        assert_eq!(loaded.suggestions[0].status, SuggestionStatus::Rejected);
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn accepted_tag_suggestion_preserves_unknown_frontmatter() {
        let root =
            std::env::temp_dir().join(format!("constellation-suggestions-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let path = root.join("note.md");
        fs::write(
            &path,
            "---\nconstellation_id: doc\nauthor_field: keep\ntags:\n  - old\n---\n# Note\nBody",
        )
        .unwrap();
        let now = Utc::now().to_rfc3339();
        apply_suggestion(
            &root,
            &SuggestionRecord {
                id: "suggestion".into(),
                document_id: "doc".into(),
                suggestion_type: "tags".into(),
                payload: serde_json::json!({ "tags": ["new", "old"] }),
                fingerprint: "fingerprint".into(),
                status: SuggestionStatus::Pending,
                created_at: now.clone(),
                updated_at: now,
            },
        )
        .unwrap();
        let content = fs::read_to_string(path).unwrap();
        assert!(content.contains("author_field: keep"));
        assert!(content.contains("- new"));
        assert_eq!(content.matches("- old").count(), 1);
        fs::remove_dir_all(root).unwrap();
    }
}
