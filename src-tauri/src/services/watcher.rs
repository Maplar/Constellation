/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::AppError;
use super::{references, search_engine};
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

pub struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    root: Mutex<Option<PathBuf>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            watcher: Mutex::new(None),
            root: Mutex::new(None),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceFileEvent {
    kind: String,
    paths: Vec<String>,
}

#[tauri::command]
pub fn watcher_start(
    app: AppHandle,
    state: State<'_, WatcherState>,
    notes_dir: String,
) -> Result<(), AppError> {
    let root = normalize_root(&notes_dir)?;
    let event_root = root.clone();
    let event_app = app.clone();
    let mut watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        let Ok(event) = event else {
            let _ = event_app.emit("workspace-watcher-error", "文件监听失败");
            return;
        };
        let paths = event
            .paths
            .iter()
            .filter_map(|path| path.strip_prefix(&event_root).ok())
            .map(|path| path.to_string_lossy().replace('\\', "/"))
            .filter(|path| !path.starts_with(".constellation/cache/"))
            .collect::<Vec<_>>();
        if paths.is_empty() {
            return;
        }
        let index_root = event_root.clone();
        let index_paths = paths.clone();
        let index_app = event_app.clone();
        tauri::async_runtime::spawn(async move {
            for relative_path in index_paths
                .iter()
                .filter(|path| path.to_ascii_lowercase().ends_with(".md"))
            {
                let previous_id = references::document_id_for_path(&index_root, relative_path)
                    .ok()
                    .flatten();
                if let Err(error) = references::references_index_document(
                    index_root.to_string_lossy().to_string(),
                    relative_path.clone(),
                ) {
                    let _ = index_app.emit("workspace-index-error", error.message);
                    continue;
                }
                if let Err(error) =
                    search_engine::search_refresh_path(&index_root, relative_path, previous_id)
                        .await
                {
                    let _ = index_app.emit("workspace-index-error", error.message);
                }
            }
            let _ = index_app.emit("workspace-index-updated", index_paths);
        });
        let _ = event_app.emit(
            "workspace-files-changed",
            WorkspaceFileEvent {
                kind: event_kind(&event.kind).into(),
                paths,
            },
        );
    })
    .map_err(watcher_error)?;
    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(watcher_error)?;

    *state.watcher.lock().map_err(lock_error)? = Some(watcher);
    *state.root.lock().map_err(lock_error)? = Some(root);
    let _ = app.emit("workspace-watcher-ready", ());
    Ok(())
}

#[tauri::command]
pub fn watcher_stop(state: State<'_, WatcherState>) -> Result<(), AppError> {
    *state.watcher.lock().map_err(lock_error)? = None;
    *state.root.lock().map_err(lock_error)? = None;
    Ok(())
}

#[tauri::command]
pub fn watcher_status(state: State<'_, WatcherState>) -> Result<Option<String>, AppError> {
    Ok(state
        .root
        .lock()
        .map_err(lock_error)?
        .as_ref()
        .map(|path| path.to_string_lossy().to_string()))
}

fn normalize_root(value: &str) -> Result<PathBuf, AppError> {
    let root = Path::new(value);
    if !root.is_dir() {
        return Err(AppError {
            code: "invalidWorkspace".into(),
            message: format!("监听目录不存在: {}", root.display()),
        });
    }
    root.canonicalize().map_err(AppError::from)
}

fn event_kind(kind: &EventKind) -> &'static str {
    match kind {
        EventKind::Create(_) => "create",
        EventKind::Modify(_) => "modify",
        EventKind::Remove(_) => "remove",
        EventKind::Access(_) => "access",
        EventKind::Other => "other",
        EventKind::Any => "any",
    }
}

fn watcher_error(error: notify::Error) -> AppError {
    AppError {
        code: "watcher".into(),
        message: error.to_string(),
    }
}

fn lock_error<T>(error: std::sync::PoisonError<T>) -> AppError {
    AppError {
        code: "watcherLock".into(),
        message: error.to_string(),
    }
}
