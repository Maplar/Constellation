/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::{default_store, AppError};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

const LARGE_FILE_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDiagnostics {
    pub file_count: usize,
    pub total_bytes: u64,
    pub isolated_notes: Vec<String>,
    pub broken_references: Vec<BrokenReference>,
    pub duplicate_ids: Vec<DuplicateId>,
    pub large_files: Vec<LargeFile>,
    pub conflict_files: Vec<String>,
    pub tantivy_index_exists: bool,
    pub vector_index_exists: bool,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrokenReference {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateId {
    pub constellation_id: String,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LargeFile {
    pub path: String,
    pub bytes: u64,
}

#[derive(Debug)]
struct NoteInfo {
    path: String,
    title: String,
    id: Option<String>,
    links: Vec<String>,
}

#[tauri::command]
pub fn workspace_diagnostics() -> Result<WorkspaceDiagnostics, AppError> {
    let root = PathBuf::from(default_store()?.load_config()?.notes_dir);
    diagnose_workspace(&root)
}

fn diagnose_workspace(root: &Path) -> Result<WorkspaceDiagnostics, AppError> {
    let mut notes = Vec::new();
    let mut total_bytes = 0;
    let mut large_files = Vec::new();
    let mut conflict_files = Vec::new();
    for entry in WalkDir::new(root).follow_links(false) {
        let entry = entry.map_err(|error| AppError {
            code: "diagnostics".into(),
            message: error.to_string(),
        })?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = entry
            .path()
            .strip_prefix(root)
            .unwrap_or(entry.path())
            .to_string_lossy()
            .replace('\\', "/");
        if relative.starts_with(".constellation/cache/") || relative.starts_with("_legacy/") {
            continue;
        }
        let metadata = entry.metadata().map_err(|error| AppError {
            code: "diagnostics".into(),
            message: error.to_string(),
        })?;
        total_bytes += metadata.len();
        if metadata.len() >= LARGE_FILE_BYTES {
            large_files.push(LargeFile {
                path: relative.clone(),
                bytes: metadata.len(),
            });
        }
        if relative.contains(".conflict-") || relative.contains(".restore-conflict-") {
            conflict_files.push(relative.clone());
        }
        if entry
            .path()
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case("md"))
        {
            notes.push(parse_note(entry.path(), relative)?);
        }
    }

    let titles = notes
        .iter()
        .map(|note| normalize_title(&note.title))
        .collect::<HashSet<_>>();
    let mut inbound = HashMap::<String, usize>::new();
    let mut broken_references = Vec::new();
    for note in &notes {
        for target in &note.links {
            let normalized = normalize_title(target);
            if titles.contains(&normalized) {
                *inbound.entry(normalized).or_default() += 1;
            } else {
                broken_references.push(BrokenReference {
                    source: note.path.clone(),
                    target: target.clone(),
                });
            }
        }
    }
    let isolated_notes = notes
        .iter()
        .filter(|note| {
            note.links.is_empty() && !inbound.contains_key(&normalize_title(&note.title))
        })
        .map(|note| note.path.clone())
        .collect::<Vec<_>>();

    let mut ids = HashMap::<String, Vec<String>>::new();
    for note in &notes {
        if let Some(id) = &note.id {
            ids.entry(id.clone()).or_default().push(note.path.clone());
        }
    }
    let duplicate_ids = ids
        .into_iter()
        .filter(|(_, paths)| paths.len() > 1)
        .map(|(constellation_id, paths)| DuplicateId {
            constellation_id,
            paths,
        })
        .collect::<Vec<_>>();

    let mut recommendations = Vec::new();
    if !broken_references.is_empty() {
        recommendations.push("检查失效引用，确认目标是否已重命名或移动".into());
    }
    if !duplicate_ids.is_empty() {
        recommendations.push("为重复 constellation_id 生成新身份，操作前先备份".into());
    }
    if !conflict_files.is_empty() {
        recommendations.push("在仪表盘逐项比较并处理冲突副本".into());
    }
    if !large_files.is_empty() {
        recommendations.push("检查超大 Markdown 或附件，避免阻塞编辑和索引".into());
    }

    Ok(WorkspaceDiagnostics {
        file_count: notes.len(),
        total_bytes,
        isolated_notes,
        broken_references,
        duplicate_ids,
        large_files,
        conflict_files,
        tantivy_index_exists: root.join(".constellation/cache/tantivy").is_dir(),
        vector_index_exists: root.join(".constellation/cache/vector").is_dir(),
        recommendations,
    })
}

fn parse_note(path: &Path, relative: String) -> Result<NoteInfo, AppError> {
    let content = fs::read_to_string(path)?;
    let (frontmatter, body) = split_frontmatter(&content);
    let title = body
        .lines()
        .find_map(|line| line.trim().strip_prefix("# ").map(str::trim))
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| {
            path.file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("无标题")
                .to_string()
        });
    let id = frontmatter
        .and_then(|yaml| serde_yaml::from_str::<Value>(yaml).ok())
        .and_then(|value| {
            value
                .get("constellation_id")
                .and_then(Value::as_str)
                .map(str::to_string)
        });
    let wiki =
        Regex::new(r"!?\[\[([^\[\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]").expect("valid wiki regex");
    let links = wiki
        .captures_iter(body)
        .filter_map(|capture| {
            capture
                .get(1)
                .map(|value| value.as_str().trim().to_string())
        })
        .collect();
    Ok(NoteInfo {
        path: relative,
        title,
        id,
        links,
    })
}

fn split_frontmatter(content: &str) -> (Option<&str>, &str) {
    let Some(after_open) = content
        .strip_prefix("---\n")
        .or_else(|| content.strip_prefix("---\r\n"))
    else {
        return (None, content);
    };
    if let Some((yaml, body)) = after_open
        .split_once("\n---\n")
        .or_else(|| after_open.split_once("\r\n---\r\n"))
    {
        (Some(yaml), body)
    } else {
        (None, content)
    }
}

fn normalize_title(value: &str) -> String {
    value.trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_duplicate_ids_broken_links_and_isolated_notes() {
        let root = std::env::temp_dir().join(format!(
            "constellation-diagnostics-{}",
            uuid::Uuid::new_v4()
        ));
        fs::create_dir_all(&root).unwrap();
        fs::write(
            root.join("a.md"),
            "---\nconstellation_id: same\n---\n# A\n[[B]] [[Missing]]",
        )
        .unwrap();
        fs::write(root.join("b.md"), "---\nconstellation_id: same\n---\n# B\n").unwrap();
        fs::write(root.join("c.md"), "# C\n").unwrap();
        let result = diagnose_workspace(&root).unwrap();
        assert_eq!(result.file_count, 3);
        assert_eq!(result.duplicate_ids.len(), 1);
        assert_eq!(result.broken_references.len(), 1);
        assert_eq!(result.isolated_notes, vec!["c.md"]);
        fs::remove_dir_all(root).ok();
    }
}
