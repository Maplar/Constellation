// @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
// 基于 MIT 许可证授权
//
// 修改部分版权：Copyright (c) 2026 Maplar
// 修改说明：二次开发修改

pub mod desktop;
pub mod services;

use services::ai::AIConfig;
use services::backup;
use services::diagnostics;
use services::documents;
use services::folders;
use services::git_snapshot;
use services::migration;
use services::notes::{default_store, AppConfig, AppError};
use services::references;
use services::search_engine;
use services::suggestions;
use services::sync;
use services::vector;
use services::watcher;
use services::workspace;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

#[tauri::command]
fn app_name() -> &'static str {
    "星座"
}

#[tauri::command]
fn read_external_file(path: String) -> Result<String, AppError> {
    std::fs::read_to_string(&path).map_err(|e| AppError {
        code: "io".into(),
        message: e.to_string(),
    })
}

#[tauri::command]
fn save_external_file(path: String, content: String) -> Result<(), AppError> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| AppError {
            code: "io".into(),
            message: e.to_string(),
        })?;
    }
    std::fs::write(&path, content).map_err(|e| AppError {
        code: "io".into(),
        message: e.to_string(),
    })
}

#[tauri::command]
fn config_get() -> Result<AppConfig, AppError> {
    default_store()?.load_config()
}

#[tauri::command]
fn config_save(app: AppHandle, config: AppConfig) -> Result<AppConfig, AppError> {
    let store = default_store()?;
    let previous = store.load_config()?;
    desktop::apply_runtime_config(&app, &previous, &config).map_err(|error| AppError {
        code: "desktopConfig".into(),
        message: error.to_string(),
    })?;
    store.save_config(config.clone())?;
    let _ = app.emit("config-changed", &config);
    Ok(config)
}

#[tauri::command]
async fn open_notepad_window(
    app: AppHandle,
    note_id: Option<String>,
    bounds: Option<desktop::WindowBounds>,
) -> Result<String, AppError> {
    desktop::open_notepad_window(app, note_id, bounds).await
}

#[tauri::command]
async fn recycle_notepad_window(app: AppHandle, label: String) -> Result<(), AppError> {
    desktop::recycle_notepad_window(&app, &label)
}

#[tauri::command]
async fn open_tile_window(
    app: AppHandle,
    note_id: String,
    bounds: Option<desktop::WindowBounds>,
) -> Result<String, AppError> {
    desktop::open_tile_window(app, note_id, bounds).await
}

#[tauri::command]
fn save_ai_config(app: AppHandle, config: AIConfig) -> Result<(), AppError> {
    services::ai::save_ai_config(&app, config)
}

#[tauri::command]
fn load_ai_config(app: AppHandle) -> Result<AIConfig, AppError> {
    services::ai::load_ai_config(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(watcher::WatcherState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(file_path) = desktop::extract_file_arg(&args) {
                let _ = app.emit("open-external-file", file_path);
            }
            let _ = desktop::show_main_window(app);
        }))
        .setup(|app| {
            desktop::setup_desktop(app)?;
            Ok(())
        })
        .on_window_event(desktop::handle_window_event)
        .invoke_handler(tauri::generate_handler![
            app_name,
            read_external_file,
            save_external_file,
            config_get,
            config_save,
            open_notepad_window,
            recycle_notepad_window,
            open_tile_window,
            save_ai_config,
            load_ai_config,
            services::ai::ai_test_connection,
            services::ai::ai_complete,
            services::ai::ai_chat_stream,
            services::ai::ai_cancel,
            vector::ai_reindex,
            vector::vector_search,
            vector::vector_status,
            suggestions::suggestions_list,
            suggestions::suggestions_create,
            suggestions::suggestions_set_status,
            suggestions::suggestions_delete,
            suggestions::suggestions_apply,
            backup::create_backup,
            backup::load_backup_config,
            backup::save_backup_config,
            backup::list_backups,
            backup::restore_backup,
            backup::delete_backup,
            backup::verify_backup_password,
            backup::get_backup_size,
            git_snapshot::git_snapshot_enable,
            git_snapshot::git_snapshot_create,
            git_snapshot::git_snapshot_compare,
            git_snapshot::git_snapshot_history,
            git_snapshot::git_snapshot_restore,
            diagnostics::workspace_diagnostics,
            watcher::watcher_start,
            watcher::watcher_stop,
            watcher::watcher_status,
            documents::documents_list,
            documents::documents_read,
            documents::documents_create,
            documents::documents_create_folder,
            documents::documents_rename_folder,
            documents::documents_trash_folder,
            documents::documents_update,
            documents::documents_move,
            documents::documents_trash,
            documents::documents_restore,
            documents::documents_undo_last,
            folders::folder_colors_load,
            folders::folder_colors_save,
            workspace::workspace_list,
            workspace::workspace_open,
            workspace::workspace_browse,
            workspace::workspace_register,
            workspace::workspace_switch,
            workspace::workspace_status,
            migration::migration_analyze,
            migration::migration_execute,
            references::references_graph,
            references::references_local_graph,
            references::references_rebuild,
            references::references_index_document,
            references::references_for_document,
            references::backlinks_for_document,
            references::graph_local,
            references::graph_global,
            sync::test_webdav_connection,
            sync::sync_notes_dir,
            sync::get_sync_state,
            sync::load_sync_config,
            sync::save_sync_config,
            sync::sync_notes_dir_with_retry,
            search_engine::search_init,
            search_engine::search_index_document,
            search_engine::search_index_batch,
            search_engine::search_rebuild,
            search_engine::search_delete_document,
            search_engine::search_query,
            search_engine::search_hybrid,
            search_engine::search_clear,
            search_engine::search_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
