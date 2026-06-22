/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::{default_store, AppError};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

const FOLDER_COLORS_PATH: &str = ".constellation/folders.json";

#[tauri::command]
pub fn folder_colors_load() -> Result<BTreeMap<String, String>, AppError> {
    load_colors(&workspace_root()?)
}

#[tauri::command]
pub fn folder_colors_save(colors: BTreeMap<String, String>) -> Result<(), AppError> {
    save_colors(&workspace_root()?, colors)
}

fn load_colors(root: &Path) -> Result<BTreeMap<String, String>, AppError> {
    let path = root.join(FOLDER_COLORS_PATH);
    if !path.is_file() {
        return Ok(BTreeMap::new());
    }
    let value: Value = serde_json::from_slice(&fs::read(path)?)?;
    let object = value
        .get("colors")
        .and_then(Value::as_object)
        .ok_or_else(|| app_error("folderColors", "folders.json is missing the colors object"))?;
    let mut colors = BTreeMap::new();
    for (folder, color) in object {
        let color = color
            .as_str()
            .filter(|value| valid_color(value))
            .ok_or_else(|| app_error("folderColor", format!("Invalid color for {folder}")))?;
        colors.insert(normalize_folder(folder), color.to_ascii_lowercase());
    }
    Ok(colors)
}

fn save_colors(root: &Path, colors: BTreeMap<String, String>) -> Result<(), AppError> {
    let colors = colors
        .into_iter()
        .map(|(folder, color)| {
            if !valid_color(&color) {
                return Err(app_error(
                    "folderColor",
                    format!("Invalid color for {folder}: {color}"),
                ));
            }
            Ok((normalize_folder(&folder), color.to_ascii_lowercase()))
        })
        .collect::<Result<BTreeMap<_, _>, _>>()?;
    let path = root.join(FOLDER_COLORS_PATH);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temporary = path.with_extension("json.tmp");
    fs::write(
        &temporary,
        serde_json::to_vec_pretty(&serde_json::json!({
            "version": 1,
            "colors": colors,
        }))?,
    )?;
    fs::rename(temporary, path)?;
    Ok(())
}

fn workspace_root() -> Result<PathBuf, AppError> {
    let root = PathBuf::from(default_store()?.load_config()?.notes_dir);
    fs::create_dir_all(&root)?;
    root.canonicalize().map_err(AppError::from)
}

fn normalize_folder(folder: &str) -> String {
    folder
        .replace('\\', "/")
        .trim_matches('/')
        .split('/')
        .filter(|part| !part.is_empty() && *part != "." && *part != "..")
        .collect::<Vec<_>>()
        .join("/")
}

fn valid_color(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..].chars().all(|value| value.is_ascii_hexdigit())
}

fn app_error(code: &str, message: impl Into<String>) -> AppError {
    AppError {
        code: code.into(),
        message: message.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn folder_colors_round_trip_in_workspace_config() {
        let root =
            std::env::temp_dir().join(format!("constellation-folder-colors-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        save_colors(
            &root,
            BTreeMap::from([("ideas\\rust".into(), "#4FAa70".into())]),
        )
        .unwrap();
        assert_eq!(
            load_colors(&root).unwrap().get("ideas/rust"),
            Some(&"#4faa70".to_string())
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_non_hex_folder_colors() {
        let root =
            std::env::temp_dir().join(format!("constellation-folder-colors-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let error =
            save_colors(&root, BTreeMap::from([("ideas".into(), "red".into())])).unwrap_err();
        assert_eq!(error.code, "folderColor");
        fs::remove_dir_all(root).unwrap();
    }
}
