/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use crate::services::notes::AppError;
use crate::services::vector::{vector_search, SemanticSearchResult};
use futures::StreamExt;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::ipc::Channel;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILENAME: &str = "ai-settings.json";
const CREDENTIAL_SERVICE: &str = "Constellation";
const CREDENTIAL_ACCOUNT: &str = "ai-api-key";
const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";
const DEFAULT_MODEL: &str = "gpt-4o-mini";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIConfig {
    #[serde(default, skip_serializing)]
    pub api_key: String,
    #[serde(default)]
    pub has_api_key: bool,
    #[serde(default = "default_base_url")]
    pub base_url: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default)]
    pub allowed_folders: Vec<String>,
    #[serde(default)]
    pub consent_provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AICompletionRequest {
    pub system_prompt: String,
    pub user_prompt: String,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingItem>,
}

#[derive(Debug, Deserialize)]
struct EmbeddingItem {
    index: usize,
    embedding: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatRequest {
    pub request_id: String,
    pub notes_dir: String,
    pub query: String,
    #[serde(default = "default_source_limit")]
    pub source_limit: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type", content = "payload")]
pub enum AiStreamEvent {
    Sources(Vec<SemanticSearchResult>),
    Delta(String),
    Done,
    Cancelled,
    Error(String),
}

#[derive(Debug, Deserialize)]
struct StreamCompletionResponse {
    choices: Vec<StreamChoice>,
}

#[derive(Debug, Deserialize)]
struct StreamChoice {
    delta: StreamDelta,
}

#[derive(Debug, Deserialize)]
struct StreamDelta {
    content: Option<String>,
}

static ACTIVE_REQUESTS: OnceLock<Mutex<HashMap<String, Arc<AtomicBool>>>> = OnceLock::new();

fn default_base_url() -> String {
    DEFAULT_BASE_URL.into()
}

fn default_model() -> String {
    DEFAULT_MODEL.into()
}

fn default_temperature() -> f32 {
    0.3
}

fn default_max_tokens() -> u32 {
    800
}

fn default_source_limit() -> usize {
    8
}

pub fn load_ai_config(app: &AppHandle) -> Result<AIConfig, AppError> {
    let store = app.store(STORE_FILENAME).map_err(store_error)?;
    let base_url = store
        .get("aiBaseUrl")
        .and_then(|value| value.as_str().map(String::from))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(default_base_url);
    let model = store
        .get("aiModel")
        .and_then(|value| value.as_str().map(String::from))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(default_model);

    Ok(AIConfig {
        api_key: String::new(),
        has_api_key: credential_entry()
            .and_then(|entry| entry.get_password().map_err(credential_error))
            .is_ok_and(|value| !value.is_empty()),
        base_url,
        model,
        allowed_folders: store
            .get("aiAllowedFolders")
            .and_then(|value| serde_json::from_value(value.clone()).ok())
            .unwrap_or_default(),
        consent_provider: store
            .get("aiConsentProvider")
            .and_then(|value| value.as_str().map(String::from))
            .unwrap_or_default(),
    })
}

pub fn save_ai_config(app: &AppHandle, config: AIConfig) -> Result<(), AppError> {
    validate_base_url(&config.base_url)?;
    if !config.api_key.trim().is_empty() {
        credential_entry()?
            .set_password(config.api_key.trim())
            .map_err(credential_error)?;
    }

    let store = app.store(STORE_FILENAME).map_err(store_error)?;
    store.set("aiBaseUrl", json!(config.base_url.trim_end_matches('/')));
    store.set("aiModel", json!(config.model.trim()));
    store.set(
        "aiAllowedFolders",
        json!(config
            .allowed_folders
            .iter()
            .map(|folder| folder.replace('\\', "/").trim_matches('/').to_string())
            .filter(|folder| !folder.is_empty())
            .collect::<Vec<_>>()),
    );
    store.set("aiConsentProvider", json!(config.consent_provider));
    store.delete("aiApiKey");
    store.save().map_err(store_error)?;
    Ok(())
}

#[tauri::command]
pub async fn ai_test_connection(app: AppHandle) -> Result<String, AppError> {
    ai_complete_internal(
        app,
        AICompletionRequest {
            system_prompt: "Reply briefly.".into(),
            user_prompt: "Hi".into(),
            temperature: 0.0,
            max_tokens: 16,
        },
        false,
    )
    .await
}

#[tauri::command]
pub async fn ai_complete(app: AppHandle, request: AICompletionRequest) -> Result<String, AppError> {
    ai_complete_internal(app, request, true).await
}

async fn ai_complete_internal(
    app: AppHandle,
    request: AICompletionRequest,
    require_consent: bool,
) -> Result<String, AppError> {
    let config = load_ai_config(&app)?;
    validate_base_url(&config.base_url)?;
    if require_consent {
        ensure_content_consent(&config)?;
    }
    if request.user_prompt.trim().is_empty() {
        return Err(AppError {
            code: "emptyPrompt".into(),
            message: "AI 请求内容不能为空".into(),
        });
    }

    let api_key = credential_entry()?.get_password().unwrap_or_default();
    let mut builder = reqwest::Client::new()
        .post(format!(
            "{}/chat/completions",
            config.base_url.trim_end_matches('/')
        ))
        .header(reqwest::header::CONTENT_TYPE, "application/json");
    if !api_key.is_empty() {
        builder = builder.bearer_auth(api_key);
    } else if !is_local_provider(&config.base_url) {
        return Err(AppError {
            code: "missingCredential".into(),
            message: "请先在设置中保存 AI API Key".into(),
        });
    }

    let response = builder
        .json(&json!({
            "model": config.model,
            "messages": [
                { "role": "system", "content": request.system_prompt },
                { "role": "user", "content": request.user_prompt }
            ],
            "temperature": request.temperature.clamp(0.0, 2.0),
            "max_tokens": request.max_tokens.clamp(1, 32_000)
        }))
        .send()
        .await
        .map_err(ai_http_error)?;

    let status = response.status();
    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        return Err(AppError {
            code: "aiProvider".into(),
            message: format!("AI 服务返回 {status}: {}", truncate_error(&detail)),
        });
    }
    let payload: ChatCompletionResponse = response.json().await.map_err(ai_http_error)?;
    payload
        .choices
        .into_iter()
        .find_map(|choice| choice.message.content)
        .filter(|content| !content.trim().is_empty())
        .ok_or_else(|| AppError {
            code: "emptyAiResponse".into(),
            message: "AI 服务未返回可用内容".into(),
        })
}

#[tauri::command]
pub async fn ai_chat_stream(
    app: AppHandle,
    request: AiChatRequest,
    on_event: Channel<AiStreamEvent>,
) -> Result<(), AppError> {
    if request.request_id.trim().is_empty() || request.query.trim().is_empty() {
        return Err(AppError {
            code: "invalidAiRequest".into(),
            message: "Request id and query are required".into(),
        });
    }
    let cancelled = Arc::new(AtomicBool::new(false));
    active_requests()
        .lock()
        .map_err(ai_lock_error)?
        .insert(request.request_id.clone(), cancelled.clone());

    let result = stream_grounded_answer(&app, &request, &cancelled, &on_event).await;
    active_requests()
        .lock()
        .map_err(ai_lock_error)?
        .remove(&request.request_id);
    if let Err(error) = &result {
        let _ = on_event.send(AiStreamEvent::Error(error.message.clone()));
    }
    result
}

#[tauri::command]
pub fn ai_cancel(request_id: String) -> Result<bool, AppError> {
    let requests = active_requests().lock().map_err(ai_lock_error)?;
    if let Some(cancelled) = requests.get(&request_id) {
        cancelled.store(true, Ordering::Release);
        return Ok(true);
    }
    Ok(false)
}

async fn stream_grounded_answer(
    app: &AppHandle,
    request: &AiChatRequest,
    cancelled: &AtomicBool,
    on_event: &Channel<AiStreamEvent>,
) -> Result<(), AppError> {
    let sources = vector_search(
        app.clone(),
        request.notes_dir.clone(),
        request.query.clone(),
        Some(request.source_limit.clamp(1, 20)),
    )
    .await?;
    on_event
        .send(AiStreamEvent::Sources(sources.clone()))
        .map_err(channel_error)?;
    if sources.is_empty() {
        on_event
            .send(AiStreamEvent::Delta(
                "知识库中没有足够依据回答这个问题。".into(),
            ))
            .map_err(channel_error)?;
        on_event.send(AiStreamEvent::Done).map_err(channel_error)?;
        return Ok(());
    }

    let config = load_ai_config(app)?;
    let api_key = credential_entry()?.get_password().unwrap_or_default();
    if api_key.is_empty() && !is_local_provider(&config.base_url) {
        return Err(AppError {
            code: "missingCredential".into(),
            message: "请先在设置中保存 AI API Key".into(),
        });
    }
    let context = format_sources(&sources);
    let mut builder = reqwest::Client::new()
        .post(format!(
            "{}/chat/completions",
            config.base_url.trim_end_matches('/')
        ))
        .header(reqwest::header::CONTENT_TYPE, "application/json");
    if !api_key.is_empty() {
        builder = builder.bearer_auth(api_key);
    }
    let response = builder
        .json(&json!({
            "model": config.model,
            "stream": true,
            "messages": [
                {
                    "role": "system",
                    "content": "仅根据给定知识库来源回答。每项结论使用 [来源序号] 标注；依据不足时明确拒绝推断。"
                },
                {
                    "role": "user",
                    "content": format!("问题：{}\n\n知识库来源：\n{}", request.query, context)
                }
            ],
            "temperature": 0.2,
            "max_tokens": 1600
        }))
        .send()
        .await
        .map_err(ai_http_error)?;
    let status = response.status();
    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        return Err(AppError {
            code: "aiProvider".into(),
            message: format!("AI service returned {status}: {}", truncate_error(&detail)),
        });
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        if cancelled.load(Ordering::Acquire) {
            on_event
                .send(AiStreamEvent::Cancelled)
                .map_err(channel_error)?;
            return Ok(());
        }
        let chunk = chunk.map_err(ai_http_error)?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        for event in take_sse_events(&mut buffer) {
            if event == "[DONE]" {
                on_event.send(AiStreamEvent::Done).map_err(channel_error)?;
                return Ok(());
            }
            if let Some(delta) = parse_stream_delta(&event) {
                on_event
                    .send(AiStreamEvent::Delta(delta))
                    .map_err(channel_error)?;
            }
        }
    }
    on_event.send(AiStreamEvent::Done).map_err(channel_error)
}

fn format_sources(sources: &[SemanticSearchResult]) -> String {
    sources
        .iter()
        .enumerate()
        .map(|(index, source)| {
            format!(
                "[{}] {} — {}:{}\n{}",
                index + 1,
                source.title,
                source.path,
                source.line_start,
                source.snippet
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn take_sse_events(buffer: &mut String) -> Vec<String> {
    let normalized = buffer.replace("\r\n", "\n");
    *buffer = normalized;
    let mut events = Vec::new();
    while let Some(boundary) = buffer.find("\n\n") {
        let raw = buffer[..boundary].to_string();
        buffer.drain(..boundary + 2);
        let data = raw
            .lines()
            .filter_map(|line| line.strip_prefix("data:"))
            .map(str::trim)
            .collect::<Vec<_>>()
            .join("\n");
        if !data.is_empty() {
            events.push(data);
        }
    }
    events
}

fn parse_stream_delta(data: &str) -> Option<String> {
    serde_json::from_str::<StreamCompletionResponse>(data)
        .ok()?
        .choices
        .into_iter()
        .find_map(|choice| choice.delta.content)
        .filter(|content| !content.is_empty())
}

fn active_requests() -> &'static Mutex<HashMap<String, Arc<AtomicBool>>> {
    ACTIVE_REQUESTS.get_or_init(|| Mutex::new(HashMap::new()))
}

pub async fn create_embeddings(
    app: &AppHandle,
    inputs: &[String],
) -> Result<Vec<Vec<f32>>, AppError> {
    if inputs.is_empty() {
        return Ok(Vec::new());
    }
    let config = load_ai_config(app)?;
    validate_base_url(&config.base_url)?;
    ensure_content_consent(&config)?;
    let api_key = credential_entry()?.get_password().unwrap_or_default();
    if api_key.is_empty() && !is_local_provider(&config.base_url) {
        return Err(AppError {
            code: "missingCredential".into(),
            message: "请先在设置中保存 AI API Key".into(),
        });
    }
    let mut builder = reqwest::Client::new()
        .post(format!(
            "{}/embeddings",
            config.base_url.trim_end_matches('/')
        ))
        .header(reqwest::header::CONTENT_TYPE, "application/json");
    if !api_key.is_empty() {
        builder = builder.bearer_auth(api_key);
    }
    let response = builder
        .json(&json!({
            "model": config.model,
            "input": inputs,
        }))
        .send()
        .await
        .map_err(ai_http_error)?;
    let status = response.status();
    if !status.is_success() {
        let detail = response.text().await.unwrap_or_default();
        return Err(AppError {
            code: "embeddingProvider".into(),
            message: format!("Embedding 服务返回 {status}: {}", truncate_error(&detail)),
        });
    }
    let mut payload: EmbeddingResponse = response.json().await.map_err(ai_http_error)?;
    payload.data.sort_by_key(|item| item.index);
    Ok(payload
        .data
        .into_iter()
        .map(|item| item.embedding)
        .collect())
}

pub fn embedding_model(app: &AppHandle) -> Result<String, AppError> {
    Ok(load_ai_config(app)?.model)
}

pub fn allowed_ai_folders(app: &AppHandle) -> Result<Vec<String>, AppError> {
    Ok(load_ai_config(app)?.allowed_folders)
}

fn ensure_content_consent(config: &AIConfig) -> Result<(), AppError> {
    if is_local_provider(&config.base_url)
        || config.consent_provider == provider_fingerprint(&config.base_url)
    {
        return Ok(());
    }
    Err(AppError {
        code: "aiConsentRequired".into(),
        message: format!(
            "Content sharing consent is required for {}",
            config.base_url
        ),
    })
}

pub fn provider_fingerprint(base_url: &str) -> String {
    base_url.trim().trim_end_matches('/').to_ascii_lowercase()
}

fn credential_entry() -> Result<Entry, AppError> {
    Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_ACCOUNT).map_err(credential_error)
}

fn validate_base_url(base_url: &str) -> Result<(), AppError> {
    let parsed = reqwest::Url::parse(base_url).map_err(|error| AppError {
        code: "invalidAiBaseUrl".into(),
        message: error.to_string(),
    })?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(AppError {
            code: "invalidAiBaseUrl".into(),
            message: "AI Base URL 仅支持 HTTP 或 HTTPS".into(),
        });
    }
    Ok(())
}

fn is_local_provider(base_url: &str) -> bool {
    reqwest::Url::parse(base_url)
        .ok()
        .and_then(|url| url.host_str().map(str::to_ascii_lowercase))
        .is_some_and(|host| matches!(host.as_str(), "localhost" | "127.0.0.1" | "::1"))
}

fn truncate_error(value: &str) -> String {
    value.chars().take(500).collect()
}

fn store_error(error: impl std::fmt::Display) -> AppError {
    AppError {
        code: "store".into(),
        message: error.to_string(),
    }
}

fn credential_error(error: keyring::Error) -> AppError {
    AppError {
        code: "credential".into(),
        message: error.to_string(),
    }
}

fn ai_http_error(error: reqwest::Error) -> AppError {
    AppError {
        code: "aiHttp".into(),
        message: error.to_string(),
    }
}

fn ai_lock_error<T>(error: std::sync::PoisonError<T>) -> AppError {
    AppError {
        code: "aiLock".into(),
        message: error.to_string(),
    }
}

fn channel_error(error: tauri::Error) -> AppError {
    AppError {
        code: "aiChannel".into(),
        message: error.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_http_provider_urls() {
        let error = validate_base_url("file:///tmp/model").unwrap_err();
        assert_eq!(error.code, "invalidAiBaseUrl");
    }

    #[test]
    fn recognizes_local_openai_compatible_providers() {
        assert!(is_local_provider("http://localhost:11434/v1"));
        assert!(is_local_provider("http://127.0.0.1:1234/v1"));
        assert!(!is_local_provider("https://api.openai.com/v1"));
    }

    #[test]
    fn parses_split_sse_events_and_deltas() {
        let mut buffer =
            "data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\npartial".to_string();
        let events = take_sse_events(&mut buffer);
        assert_eq!(events.len(), 1);
        assert_eq!(parse_stream_delta(&events[0]), Some("hello".into()));
        assert_eq!(buffer, "partial");
    }

    #[test]
    fn source_prompt_contains_jump_locations() {
        let text = format_sources(&[SemanticSearchResult {
            document_id: "id".into(),
            path: "ideas/a.md".into(),
            title: "A".into(),
            heading: "Finding".into(),
            line_start: 12,
            snippet: "Evidence".into(),
            score: 0.9,
        }]);
        assert!(text.contains("[1] A"));
        assert!(text.contains("ideas/a.md:12"));
    }

    #[test]
    fn cloud_consent_is_bound_to_provider_url() {
        let mut config = AIConfig {
            api_key: String::new(),
            has_api_key: true,
            base_url: "https://example.com/v1/".into(),
            model: "model".into(),
            allowed_folders: vec![],
            consent_provider: "https://example.com/v1".into(),
        };
        assert!(ensure_content_consent(&config).is_ok());
        config.base_url = "https://other.example/v1".into();
        assert_eq!(
            ensure_content_consent(&config).unwrap_err().code,
            "aiConsentRequired"
        );
    }
}
