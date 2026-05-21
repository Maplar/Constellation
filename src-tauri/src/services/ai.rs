// @copyright Copyright (c) 2026 Maplar
// 基于 floral-notepaper 二次开发新增

use crate::services::notes::AppError;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "ai-settings.json";

const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";
const DEFAULT_MODEL: &str = "gpt-3.5-turbo";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIConfig {
    #[serde(default)]
    pub api_key: String,
    #[serde(default = "default_base_url")]
    pub base_url: String,
    #[serde(default = "default_model")]
    pub model: String,
}

fn default_base_url() -> String {
    DEFAULT_BASE_URL.into()
}

fn default_model() -> String {
    DEFAULT_MODEL.into()
}

pub fn load_ai_config(app: &AppHandle) -> Result<AIConfig, AppError> {
    let store = app.store(STORE_FILENAME).map_err(|e| AppError {
        code: "store".into(),
        message: format!("无法打开存储: {}", e),
    })?;

    let api_key = store
        .get("aiApiKey")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default();

    let base_url = store
        .get("aiBaseUrl")
        .and_then(|v| v.as_str().map(String::from))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(default_base_url);

    let model = store
        .get("aiModel")
        .and_then(|v| v.as_str().map(String::from))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(default_model);

    Ok(AIConfig {
        api_key,
        base_url,
        model,
    })
}

pub fn save_ai_config(app: &AppHandle, config: AIConfig) -> Result<(), AppError> {
    let store = app.store(STORE_FILENAME).map_err(|e| AppError {
        code: "store".into(),
        message: format!("无法打开存储: {}", e),
    })?;

    store.set("aiApiKey", serde_json::Value::String(config.api_key));
    store.set("aiBaseUrl", serde_json::Value::String(config.base_url));
    store.set("aiModel", serde_json::Value::String(config.model));
    store.save().map_err(|e| AppError {
        code: "store".into(),
        message: format!("持久化失败: {}", e),
    })?;

    Ok(())
}
