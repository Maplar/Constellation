// @copyright Copyright (c) 2026 Maplar
// 基于 floral-notepaper 二次开发新增：思维导图文件操作服务

use std::fs;
use std::path::PathBuf;
use super::notes::AppError;

/// 确保 .mindmaps 目录存在
#[tauri::command]
pub async fn mindmap_ensure_dir(notes_dir: String) -> Result<(), AppError> {
    let dir = PathBuf::from(&notes_dir).join(".mindmaps");
    fs::create_dir_all(&dir).map_err(|e| AppError {
        code: "io".into(),
        message: format!("Failed to create mindmap directory: {}", e),
    })
}

/// 读取思维导图 JSON 文件
#[tauri::command]
pub async fn mindmap_read(path: String) -> Result<String, AppError> {
    fs::read_to_string(&path).map_err(|e| AppError {
        code: "io".into(),
        message: format!("Failed to read mindmap file: {}", e),
    })
}

/// 写入思维导图 JSON 文件
#[tauri::command]
pub async fn mindmap_write(path: String, data: String) -> Result<(), AppError> {
    // 确保父目录存在
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| AppError {
            code: "io".into(),
            message: format!("Failed to create parent directory: {}", e),
        })?;
    }
    fs::write(&path, data).map_err(|e| AppError {
        code: "io".into(),
        message: format!("Failed to write mindmap file: {}", e),
    })
}

/// 读取思维导图索引文件
#[tauri::command]
pub async fn mindmap_read_index(notes_dir: String) -> Result<String, AppError> {
    let path = PathBuf::from(&notes_dir)
        .join(".mindmaps")
        .join("mindmap-index.json");
    fs::read_to_string(&path).map_err(|e| AppError {
        code: "io".into(),
        message: format!("Failed to read mindmap index: {}", e),
    })
}

/// 写入思维导图索引文件
#[tauri::command]
pub async fn mindmap_write_index(notes_dir: String, index: String) -> Result<(), AppError> {
    let dir = PathBuf::from(&notes_dir).join(".mindmaps");
    fs::create_dir_all(&dir).map_err(|e| AppError {
        code: "io".into(),
        message: format!("Failed to create mindmap directory: {}", e),
    })?;

    let path = dir.join("mindmap-index.json");
    fs::write(&path, index).map_err(|e| AppError {
        code: "io".into(),
        message: format!("Failed to write mindmap index: {}", e),
    })
}
