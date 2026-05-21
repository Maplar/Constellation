// @copyright Copyright (c) 2026 Maplar
// 基于 floral-notepaper 二次开发新增

use crate::services::notes::AppError;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "ai-settings.json";
const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";
const DEFAULT_MODEL: &str = "gpt-3.5-turbo";

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

fn get_ai_settings(app: &AppHandle) -> Result<(String, String, String), AppError> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| AppError {
            code: "store".into(),
            message: format!("无法打开存储: {}", e),
        })?;

    let api_key = store
        .get("aiApiKey")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default();

    if api_key.is_empty() {
        return Err(AppError {
            code: "aiConfig".into(),
            message: "请先在设置中配置 AI API Key".into(),
        });
    }

    let base_url = store
        .get("aiBaseUrl")
        .and_then(|v| v.as_str().map(String::from))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_BASE_URL.to_string());

    let model = store
        .get("aiModel")
        .and_then(|v| v.as_str().map(String::from))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_MODEL.to_string());

    Ok((api_key, base_url, model))
}

pub async fn summarize_note(app: &AppHandle, content: &str) -> Result<String, AppError> {
    let (api_key, base_url, model) = get_ai_settings(app)?;

    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let request_body = ChatRequest {
        model,
        messages: vec![
            ChatMessage {
                role: "system".into(),
                content: "你是一个专业的笔记总结助手。请对用户提供的笔记内容进行简洁准确的总结，突出关键信息。使用中文回复。".into(),
            },
            ChatMessage {
                role: "user".into(),
                content: content.to_string(),
            },
        ],
        temperature: 0.5,
        max_tokens: 800,
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError {
            code: "aiNetwork".into(),
            message: format!("请求 AI 服务失败: {}", e),
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError {
            code: "aiApi".into(),
            message: format!("AI 服务返回错误 ({}): {}", status.as_u16(), body),
        });
    }

    let chat_response: ChatResponse = response.json().await.map_err(|e| AppError {
        code: "aiParse".into(),
        message: format!("解析 AI 响应失败: {}", e),
    })?;

    chat_response
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| AppError {
            code: "aiEmpty".into(),
            message: "AI 未返回总结内容".into(),
        })
}
