/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::AppError;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationAnalysis {
    pub markdown_files: usize,
    pub attachment_files: usize,
    pub legacy_visual_files: usize,
    pub source_path: String,
    pub target_path: String,
    pub target_exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationReport {
    pub copied_markdown: usize,
    pub copied_attachments: usize,
    pub archived_legacy_files: usize,
    pub skipped_files: Vec<String>,
    pub errors: Vec<String>,
    pub id_mappings: HashMap<String, String>,
    pub target_path: String,
}

#[tauri::command]
pub fn migration_analyze(
    source_dir: String,
    target_dir: String,
) -> Result<MigrationAnalysis, AppError> {
    let source = PathBuf::from(&source_dir);
    let target = PathBuf::from(&target_dir);
    ensure_source(&source)?;
    let mut analysis = MigrationAnalysis {
        markdown_files: 0,
        attachment_files: 0,
        legacy_visual_files: 0,
        source_path: source.to_string_lossy().to_string(),
        target_path: target.to_string_lossy().to_string(),
        target_exists: target.exists(),
    };
    inspect_dir(&source, &mut analysis)?;
    Ok(analysis)
}

#[tauri::command]
pub fn migration_execute(
    source_dir: String,
    target_dir: String,
) -> Result<MigrationReport, AppError> {
    let source = PathBuf::from(&source_dir);
    let target = PathBuf::from(&target_dir);
    ensure_source(&source)?;
    if source == target || target.starts_with(&source) {
        return Err(AppError {
            code: "invalidMigrationTarget".into(),
            message: "迁移目标不能与源工作区相同".into(),
        });
    }
    fs::create_dir_all(&target)?;

    let mut report = MigrationReport {
        copied_markdown: 0,
        copied_attachments: 0,
        archived_legacy_files: 0,
        skipped_files: Vec::new(),
        errors: Vec::new(),
        id_mappings: HashMap::new(),
        target_path: target.to_string_lossy().to_string(),
    };
    copy_dir(&source, &source, &target, &mut report)?;
    let report_dir = target.join(".constellation").join("migration");
    fs::create_dir_all(&report_dir)?;
    let report_path = report_dir.join(format!(
        "v3-to-v4-{}.json",
        Utc::now().format("%Y%m%d%H%M%S")
    ));
    fs::write(report_path, serde_json::to_string_pretty(&report)?)?;
    Ok(report)
}

fn ensure_source(source: &Path) -> Result<(), AppError> {
    if !source.is_dir() {
        return Err(AppError {
            code: "invalidMigrationSource".into(),
            message: format!("源工作区不存在或不是文件夹: {}", source.display()),
        });
    }
    Ok(())
}

fn inspect_dir(dir: &Path, analysis: &mut MigrationAnalysis) -> Result<(), AppError> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            if should_skip_dir(&path) {
                continue;
            }
            if path.file_name().and_then(|name| name.to_str()) == Some(".mindmaps") {
                analysis.legacy_visual_files += count_files(&path)?;
                continue;
            }
            inspect_dir(&path, analysis)?;
        } else if is_markdown(&path) {
            analysis.markdown_files += 1;
        } else if is_legacy_visual(&path) {
            analysis.legacy_visual_files += 1;
        } else if !is_v3_metadata(&path) {
            analysis.attachment_files += 1;
        }
    }
    Ok(())
}

fn copy_dir(
    source_root: &Path,
    dir: &Path,
    target_root: &Path,
    report: &mut MigrationReport,
) -> Result<(), AppError> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let relative = path.strip_prefix(source_root).unwrap_or(&path);
        if path.is_dir() {
            if should_skip_dir(&path) {
                report
                    .skipped_files
                    .push(relative.to_string_lossy().to_string());
                continue;
            }
            if path.file_name().and_then(|name| name.to_str()) == Some(".mindmaps") {
                archive_legacy_dir(&path, &target_root.join("_legacy").join("mindmaps"), report)?;
                continue;
            }
            copy_dir(source_root, &path, target_root, report)?;
            continue;
        }

        if is_v3_metadata(&path) {
            report
                .skipped_files
                .push(relative.to_string_lossy().to_string());
            continue;
        }
        if is_legacy_visual(&path) {
            let destination = target_root
                .join("_legacy")
                .join("mindmaps")
                .join(relative.file_name().unwrap_or_default());
            copy_file(&path, &destination, report)?;
            report.archived_legacy_files += 1;
            continue;
        }

        let destination = target_root.join(relative);
        if destination.exists() {
            report
                .skipped_files
                .push(relative.to_string_lossy().to_string());
            continue;
        }
        if is_markdown(&path) {
            if let Some((legacy_id, constellation_id)) = migrate_markdown(&path, &destination)? {
                report.id_mappings.insert(legacy_id, constellation_id);
            }
            report.copied_markdown += 1;
        } else {
            copy_file(&path, &destination, report)?;
            report.copied_attachments += 1;
        }
    }
    Ok(())
}

fn migrate_markdown(
    source: &Path,
    destination: &Path,
) -> Result<Option<(String, String)>, AppError> {
    let content = fs::read_to_string(source)?;
    let (mut frontmatter, body) = parse_frontmatter(&content)?;
    let existing_id = mapping_string(&frontmatter, "constellation_id");
    let legacy_id = id_from_legacy_name(source);
    let constellation_id = existing_id.unwrap_or_else(|| Uuid::now_v7().to_string());
    frontmatter.insert(
        Value::String("constellation_id".into()),
        Value::String(constellation_id.clone()),
    );
    if !frontmatter.contains_key(Value::String("created".into())) {
        frontmatter.insert(
            Value::String("created".into()),
            Value::String(Utc::now().to_rfc3339()),
        );
    }
    let yaml = serde_yaml::to_string(&frontmatter).map_err(frontmatter_error)?;
    let migrated = format!(
        "---\n{}---\n\n{}",
        yaml,
        body.trim_start_matches(['\r', '\n'])
    );
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(destination, migrated)?;
    Ok(legacy_id
        .filter(|legacy| legacy != &constellation_id)
        .map(|legacy| (legacy, constellation_id)))
}

fn id_from_legacy_name(path: &Path) -> Option<String> {
    let stem = path.file_stem()?.to_str()?;
    let candidate = stem.split_once('_').map(|(id, _)| id).unwrap_or(stem);
    if candidate.trim().is_empty() {
        None
    } else {
        Some(candidate.to_string())
    }
}

fn parse_frontmatter(content: &str) -> Result<(Mapping, String), AppError> {
    let normalized = content.strip_prefix('\u{feff}').unwrap_or(content);
    if !normalized.starts_with("---") {
        return Ok((Mapping::new(), normalized.to_string()));
    }

    let after_open = normalized
        .strip_prefix("---\r\n")
        .or_else(|| normalized.strip_prefix("---\n"));
    let Some(after_open) = after_open else {
        return Ok((Mapping::new(), normalized.to_string()));
    };
    let Some((yaml, body)) = after_open
        .split_once("\r\n---\r\n")
        .or_else(|| after_open.split_once("\n---\n"))
    else {
        return Ok((Mapping::new(), normalized.to_string()));
    };
    let value: Value = serde_yaml::from_str(yaml).map_err(frontmatter_error)?;
    let mapping = value.as_mapping().cloned().ok_or_else(|| AppError {
        code: "invalidFrontmatter".into(),
        message: "Markdown frontmatter 必须是 YAML 对象".into(),
    })?;
    Ok((mapping, body.trim_start_matches(['\r', '\n']).to_string()))
}

fn mapping_string(mapping: &Mapping, key: &str) -> Option<String> {
    mapping
        .get(Value::String(key.into()))
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn frontmatter_error(error: serde_yaml::Error) -> AppError {
    AppError {
        code: "invalidFrontmatter".into(),
        message: error.to_string(),
    }
}

fn archive_legacy_dir(
    source: &Path,
    destination: &Path,
    report: &mut MigrationReport,
) -> Result<(), AppError> {
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let path = entry.path();
        let target = destination.join(entry.file_name());
        if path.is_dir() {
            archive_legacy_dir(&path, &target, report)?;
        } else {
            copy_file(&path, &target, report)?;
            report.archived_legacy_files += 1;
        }
    }
    Ok(())
}

fn copy_file(
    source: &Path,
    destination: &Path,
    report: &mut MigrationReport,
) -> Result<(), AppError> {
    if destination.exists() {
        report
            .skipped_files
            .push(destination.to_string_lossy().to_string());
        return Ok(());
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }
    if let Err(error) = fs::copy(source, destination) {
        report
            .errors
            .push(format!("{}: {}", source.display(), error));
    }
    Ok(())
}

fn should_skip_dir(path: &Path) -> bool {
    matches!(
        path.file_name().and_then(|name| name.to_str()),
        Some(".constellation" | ".tantivy_index" | ".vector_db")
    )
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

fn is_legacy_visual(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|value| value.to_str())
            .map(str::to_ascii_lowercase)
            .as_deref(),
        Some("canvas" | "xmind" | "mm")
    )
}

fn is_v3_metadata(path: &Path) -> bool {
    matches!(
        path.file_name().and_then(|value| value.to_str()),
        Some("metadata.json" | "config.json" | "mindmap-index.json")
    )
}

fn count_files(dir: &Path) -> Result<usize, AppError> {
    let mut count = 0;
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        count += if path.is_dir() {
            count_files(&path)?
        } else {
            1
        };
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrates_markdown_without_touching_source() {
        let root = std::env::temp_dir().join(format!("constellation-migration-{}", Uuid::new_v4()));
        let source = root.join("source");
        let target = root.join("target");
        fs::create_dir_all(&source).unwrap();
        fs::write(source.join("想法.md"), "# 想法\n正文").unwrap();

        let report = migration_execute(
            source.to_string_lossy().to_string(),
            target.to_string_lossy().to_string(),
        )
        .unwrap();
        let migrated = fs::read_to_string(target.join("想法.md")).unwrap();
        let original = fs::read_to_string(source.join("想法.md")).unwrap();

        assert_eq!(report.copied_markdown, 1);
        assert!(migrated.contains("constellation_id:"));
        assert_eq!(original, "# 想法\n正文");
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn preserves_unknown_frontmatter_and_generates_uuid_v7() {
        let root = std::env::temp_dir().join(format!("constellation-migration-{}", Uuid::new_v4()));
        let source = root.join("source");
        let target = root.join("target");
        fs::create_dir_all(&source).unwrap();
        fs::write(
            source.join("legacy-note_想法.md"),
            "---\ncustom: keep-me\ntags:\n  - 灵感\n---\n# 想法\n正文",
        )
        .unwrap();

        let source_hash = blake3::hash(&fs::read(source.join("legacy-note_想法.md")).unwrap());
        let report = migration_execute(
            source.to_string_lossy().to_string(),
            target.to_string_lossy().to_string(),
        )
        .unwrap();
        let migrated = fs::read_to_string(target.join("legacy-note_想法.md")).unwrap();
        let (frontmatter, body) = parse_frontmatter(&migrated).unwrap();
        let id = mapping_string(&frontmatter, "constellation_id").unwrap();

        assert_eq!(
            frontmatter.get(Value::String("custom".into())),
            Some(&Value::String("keep-me".into()))
        );
        assert_eq!(Uuid::parse_str(&id).unwrap().get_version_num(), 7);
        assert_eq!(body, "# 想法\n正文");
        assert_eq!(report.id_mappings.get("legacy-note"), Some(&id),);
        assert_eq!(
            source_hash,
            blake3::hash(&fs::read(source.join("legacy-note_想法.md")).unwrap())
        );

        let second = migration_execute(
            source.to_string_lossy().to_string(),
            target.to_string_lossy().to_string(),
        )
        .unwrap();
        assert_eq!(second.copied_markdown, 0);
        assert!(!second.skipped_files.is_empty());
        fs::remove_dir_all(root).ok();
    }
}
