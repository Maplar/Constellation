/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::{default_store, AppError};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

const REGISTRY_FILE: &str = "workspaces.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub id: String,
    pub name: String,
    pub path: String,
    pub registered_at: String,
    pub last_opened_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct WorkspaceRegistry {
    active_workspace_id: Option<String>,
    workspaces: Vec<WorkspaceRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStatus {
    pub active: Option<WorkspaceRecord>,
    pub document_count: usize,
    pub cache_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BrowseEntry {
    pub name: String,
    pub path: String,
    pub is_workspace: bool,
    pub is_directory: bool,
}

#[tauri::command]
pub fn workspace_list(app: AppHandle) -> Result<Vec<WorkspaceRecord>, AppError> {
    Ok(load_registry(&app)?.workspaces)
}

#[tauri::command]
pub fn workspace_register(
    app: AppHandle,
    path: String,
    name: Option<String>,
) -> Result<WorkspaceRecord, AppError> {
    let normalized = normalize_directory(Path::new(&path), true)?;
    initialize_workspace(&normalized)?;
    let normalized_string = normalized.to_string_lossy().to_string();
    let mut registry = load_registry(&app)?;
    if let Some(existing) = registry
        .workspaces
        .iter()
        .find(|workspace| same_path(Path::new(&workspace.path), &normalized))
    {
        return Ok(existing.clone());
    }

    let now = Utc::now().to_rfc3339();
    let workspace = WorkspaceRecord {
        id: Uuid::now_v7().to_string(),
        name: name
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| workspace_name(&normalized)),
        path: normalized_string,
        registered_at: now.clone(),
        last_opened_at: now,
    };
    registry.workspaces.push(workspace.clone());
    save_registry(&app, &registry)?;
    Ok(workspace)
}

#[tauri::command]
pub fn workspace_open(app: AppHandle, id: String) -> Result<WorkspaceRecord, AppError> {
    switch_workspace(&app, &id)
}

#[tauri::command]
pub fn workspace_switch(app: AppHandle, id: String) -> Result<WorkspaceRecord, AppError> {
    switch_workspace(&app, &id)
}

#[tauri::command]
pub fn workspace_status(app: AppHandle) -> Result<WorkspaceStatus, AppError> {
    let registry = load_registry(&app)?;
    let active = registry
        .active_workspace_id
        .as_deref()
        .and_then(|id| {
            registry
                .workspaces
                .iter()
                .find(|workspace| workspace.id == id)
        })
        .cloned();
    let document_count = active
        .as_ref()
        .map(|workspace| count_markdown(Path::new(&workspace.path)))
        .transpose()?
        .unwrap_or_default();
    let cache_path = active.as_ref().map(|workspace| {
        Path::new(&workspace.path)
            .join(".constellation")
            .join("cache")
            .to_string_lossy()
            .to_string()
    });
    Ok(WorkspaceStatus {
        active,
        document_count,
        cache_path,
    })
}

#[tauri::command]
pub fn workspace_browse(
    root: Option<String>,
    include_files: Option<bool>,
    extensions: Option<Vec<String>>,
) -> Result<Vec<BrowseEntry>, AppError> {
    let directory = match root {
        Some(root) if !root.trim().is_empty() => normalize_directory(Path::new(&root), false)?,
        _ => default_browse_root()?,
    };
    let mut entries = fs::read_dir(directory)?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            let is_directory = path.is_dir();
            if !is_directory && !include_files.unwrap_or(false) {
                return None;
            }
            if !is_directory {
                let extension = path
                    .extension()
                    .and_then(|value| value.to_str())
                    .unwrap_or_default();
                if extensions.as_ref().is_some_and(|allowed| {
                    !allowed.iter().any(|value| {
                        value
                            .trim_start_matches('.')
                            .eq_ignore_ascii_case(extension)
                    })
                }) {
                    return None;
                }
            }
            Some(BrowseEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: path.to_string_lossy().to_string(),
                is_workspace: is_directory && path.join(".constellation").is_dir(),
                is_directory,
            })
        })
        .collect::<Vec<_>>();
    entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(entries)
}

fn switch_workspace(app: &AppHandle, id: &str) -> Result<WorkspaceRecord, AppError> {
    let mut registry = load_registry(app)?;
    let workspace = registry
        .workspaces
        .iter_mut()
        .find(|workspace| workspace.id == id)
        .ok_or_else(|| AppError {
            code: "workspaceNotFound".into(),
            message: format!("工作区不存在: {id}"),
        })?;
    let normalized = normalize_directory(Path::new(&workspace.path), true)?;
    initialize_workspace(&normalized)?;
    workspace.path = normalized.to_string_lossy().to_string();
    workspace.last_opened_at = Utc::now().to_rfc3339();
    let selected = workspace.clone();
    registry.active_workspace_id = Some(selected.id.clone());
    save_registry(app, &registry)?;

    let store = default_store()?;
    let mut config = store.load_config()?;
    config.notes_dir = selected.path.clone();
    store.save_config(config)?;
    let _ = app.emit("workspace-changed", &selected);
    Ok(selected)
}

pub fn initialize_workspace(root: &Path) -> Result<(), AppError> {
    fs::create_dir_all(root.join("快捷便签"))?;
    fs::create_dir_all(root.join(".constellation").join("cache"))?;
    Ok(())
}

fn registry_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let directory = app.path().app_data_dir().map_err(AppError::from)?;
    fs::create_dir_all(&directory)?;
    Ok(directory.join(REGISTRY_FILE))
}

fn load_registry(app: &AppHandle) -> Result<WorkspaceRegistry, AppError> {
    let path = registry_path(app)?;
    if !path.exists() {
        return Ok(WorkspaceRegistry::default());
    }
    Ok(serde_json::from_slice(&fs::read(path)?)?)
}

fn save_registry(app: &AppHandle, registry: &WorkspaceRegistry) -> Result<(), AppError> {
    let path = registry_path(app)?;
    let temp = path.with_extension(format!("json.tmp-{}", Uuid::now_v7()));
    fs::write(&temp, serde_json::to_vec_pretty(registry)?)?;
    if path.exists() {
        fs::remove_file(&path)?;
    }
    fs::rename(temp, path)?;
    Ok(())
}

fn normalize_directory(path: &Path, create: bool) -> Result<PathBuf, AppError> {
    if create {
        fs::create_dir_all(path)?;
    }
    if !path.is_dir() {
        return Err(AppError {
            code: "invalidWorkspace".into(),
            message: format!("工作区目录不存在: {}", path.display()),
        });
    }
    path.canonicalize().map_err(AppError::from)
}

fn same_path(left: &Path, right: &Path) -> bool {
    left.to_string_lossy()
        .eq_ignore_ascii_case(&right.to_string_lossy())
}

fn workspace_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("Constellation Workspace")
        .to_string()
}

fn default_browse_root() -> Result<PathBuf, AppError> {
    if let Ok(profile) = std::env::var("USERPROFILE") {
        return normalize_directory(Path::new(&profile), false);
    }
    std::env::current_dir().map_err(AppError::from)
}

fn count_markdown(directory: &Path) -> Result<usize, AppError> {
    let mut count = 0;
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let name = entry.file_name();
            if name == ".constellation" || name == "_legacy" {
                continue;
            }
            count += count_markdown(&path)?;
        } else if path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case("md"))
        {
            count += 1;
        }
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_markdown_without_cache_or_legacy_files() {
        let root = std::env::temp_dir().join(format!("constellation-workspace-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("folder")).unwrap();
        fs::create_dir_all(root.join(".constellation/cache")).unwrap();
        fs::create_dir_all(root.join("_legacy")).unwrap();
        fs::write(root.join("one.md"), "").unwrap();
        fs::write(root.join("folder/two.MD"), "").unwrap();
        fs::write(root.join(".constellation/cache/ignored.md"), "").unwrap();
        fs::write(root.join("_legacy/ignored.md"), "").unwrap();

        assert_eq!(count_markdown(&root).unwrap(), 2);
        fs::remove_dir_all(root).ok();
    }

    #[test]
    fn initializes_capture_and_cache_directories_for_a_workspace() {
        let root = std::env::temp_dir().join(format!("constellation-init-{}", Uuid::new_v4()));

        initialize_workspace(&root).expect("initialize workspace");

        assert!(root.join("快捷便签").is_dir());
        assert!(root.join(".constellation/cache").is_dir());
        fs::remove_dir_all(root).ok();
    }
}
