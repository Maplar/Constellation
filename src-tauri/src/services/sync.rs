/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::AppError;
use chrono::Utc;
use keyring::Entry;
use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const SYNC_CONFIG_PATH: &str = ".constellation/sync.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfig {
    pub server_url: String,
    pub username: String,
    #[serde(default, skip_serializing)]
    pub password: String,
    pub remote_path: String,
    pub sync_direction: SyncDirection,
    #[serde(default)]
    pub force_full_sync: bool,
    #[serde(default)]
    pub auto_sync: bool,
    #[serde(default = "default_sync_interval")]
    pub sync_interval: u64,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            server_url: String::new(),
            username: String::new(),
            password: String::new(),
            remote_path: "/notes".into(),
            sync_direction: SyncDirection::Bidirectional,
            force_full_sync: false,
            auto_sync: false,
            sync_interval: default_sync_interval(),
        }
    }
}

fn default_sync_interval() -> u64 {
    300
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SyncDirection {
    Upload,
    Download,
    Bidirectional,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub uploaded: usize,
    pub downloaded: usize,
    pub deleted_local: usize,
    pub deleted_remote: usize,
    pub skipped: usize,
    pub conflicts: usize,
    pub errors: usize,
    pub last_sync_time: String,
    pub conflict_files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    pub last_sync_time: String,
    pub file_hashes: HashMap<String, FileSyncInfo>,
}

#[tauri::command]
pub fn load_sync_config(notes_dir: String) -> Result<SyncConfig, AppError> {
    let root = normalize_notes_dir(&notes_dir)?;
    let path = root.join(SYNC_CONFIG_PATH);
    if !path.is_file() {
        return Ok(SyncConfig::default());
    }
    let mut config: SyncConfig = serde_json::from_slice(&fs::read(path)?)?;
    config.password.clear();
    Ok(config)
}

#[tauri::command]
pub fn save_sync_config(notes_dir: String, mut config: SyncConfig) -> Result<(), AppError> {
    let root = normalize_notes_dir(&notes_dir)?;
    if !config.password.is_empty() {
        save_password(&config)?;
    }
    config.password.clear();
    let path = root.join(SYNC_CONFIG_PATH);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    write_json_atomic(&path, &config)
}

#[tauri::command]
pub async fn sync_notes_dir_with_retry(
    notes_dir: String,
    config: SyncConfig,
    conflict_strategy: Option<String>,
    max_attempts: Option<usize>,
) -> Result<SyncResult, AppError> {
    let attempts = max_attempts.unwrap_or(3).clamp(1, 5);
    let mut delay = std::time::Duration::from_secs(1);
    let mut last_error = None;
    for attempt in 0..attempts {
        match sync_notes_dir(config.clone(), notes_dir.clone(), conflict_strategy.clone()).await {
            Ok(result) => return Ok(result),
            Err(error) => last_error = Some(error),
        }
        if attempt + 1 < attempts {
            tokio::time::sleep(delay).await;
            delay = delay.saturating_mul(2);
        }
    }
    Err(last_error.unwrap_or_else(|| sync_error("sync", "Synchronization failed")))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSyncInfo {
    pub relative_path: String,
    pub content_hash: String,
}

#[derive(Debug, Clone)]
struct LocalFile {
    path: PathBuf,
    hash: String,
}

#[derive(Debug, Clone)]
struct RemoteFile {
    href: String,
    relative_path: String,
    is_directory: bool,
}

struct WebDavClient {
    base_url: String,
    client: reqwest::Client,
    username: String,
    password: String,
}

impl WebDavClient {
    fn new(config: &SyncConfig) -> Result<Self, AppError> {
        let password = if !config.password.is_empty() {
            save_password(config)?;
            config.password.clone()
        } else {
            credential_entry(config)?.get_password().unwrap_or_default()
        };
        if password.is_empty() {
            return Err(sync_error("missingCredential", "请先保存 WebDAV 密码"));
        }
        Ok(Self {
            base_url: config.server_url.trim_end_matches('/').to_string(),
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .map_err(http_error)?,
            username: config.username.clone(),
            password,
        })
    }

    fn url(&self, remote_path: &str) -> String {
        format!("{}/{}", self.base_url, remote_path.trim_start_matches('/'))
    }

    async fn propfind(&self, remote_path: &str) -> Result<Vec<RemoteFile>, AppError> {
        let response = self
            .client
            .request(
                reqwest::Method::from_bytes(b"PROPFIND")
                    .map_err(|error| sync_error("webdav", error.to_string()))?,
                self.url(remote_path),
            )
            .basic_auth(&self.username, Some(&self.password))
            .header("Depth", "1")
            .header("Content-Type", "application/xml")
            .body(
                r#"<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/><d:getlastmodified/></d:prop></d:propfind>"#,
            )
            .send()
            .await
            .map_err(http_error)?;
        if !response.status().is_success() {
            return Err(sync_error(
                "webdav",
                format!("PROPFIND 返回 {}", response.status()),
            ));
        }
        parse_propfind(&response.text().await.map_err(http_error)?, remote_path)
    }

    async fn list_recursive(&self, root: &str) -> Result<Vec<RemoteFile>, AppError> {
        let mut output = Vec::new();
        let mut pending = vec![root.trim_matches('/').to_string()];
        let mut visited = HashSet::new();
        while let Some(directory) = pending.pop() {
            if !visited.insert(directory.clone()) {
                continue;
            }
            for item in self.propfind(&directory).await? {
                if item.relative_path.is_empty() {
                    continue;
                }
                if item.is_directory {
                    pending.push(
                        format!("{}/{}", root.trim_matches('/'), item.relative_path)
                            .trim_matches('/')
                            .to_string(),
                    );
                } else {
                    output.push(item);
                }
            }
        }
        Ok(output)
    }

    async fn download(&self, path: &str) -> Result<Vec<u8>, AppError> {
        let response = self
            .client
            .get(self.url(path))
            .basic_auth(&self.username, Some(&self.password))
            .send()
            .await
            .map_err(http_error)?;
        if !response.status().is_success() {
            return Err(sync_error(
                "webdav",
                format!("GET 返回 {}", response.status()),
            ));
        }
        Ok(response.bytes().await.map_err(http_error)?.to_vec())
    }

    async fn upload(&self, path: &str, content: Vec<u8>) -> Result<(), AppError> {
        self.ensure_parent_directories(path).await?;
        let response = self
            .client
            .put(self.url(path))
            .basic_auth(&self.username, Some(&self.password))
            .body(content)
            .send()
            .await
            .map_err(http_error)?;
        if !response.status().is_success() {
            return Err(sync_error(
                "webdav",
                format!("PUT 返回 {}", response.status()),
            ));
        }
        Ok(())
    }

    async fn delete(&self, path: &str) -> Result<(), AppError> {
        let response = self
            .client
            .delete(self.url(path))
            .basic_auth(&self.username, Some(&self.password))
            .send()
            .await
            .map_err(http_error)?;
        if !response.status().is_success() && response.status() != reqwest::StatusCode::NOT_FOUND {
            return Err(sync_error(
                "webdav",
                format!("DELETE 返回 {}", response.status()),
            ));
        }
        Ok(())
    }

    async fn create_directory(&self, path: &str) -> Result<(), AppError> {
        let response = self
            .client
            .request(
                reqwest::Method::from_bytes(b"MKCOL")
                    .map_err(|error| sync_error("webdav", error.to_string()))?,
                self.url(path),
            )
            .basic_auth(&self.username, Some(&self.password))
            .send()
            .await
            .map_err(http_error)?;
        if !response.status().is_success()
            && response.status() != reqwest::StatusCode::METHOD_NOT_ALLOWED
        {
            return Err(sync_error(
                "webdav",
                format!("MKCOL 返回 {}", response.status()),
            ));
        }
        Ok(())
    }

    async fn ensure_parent_directories(&self, path: &str) -> Result<(), AppError> {
        let mut current = String::new();
        let parts = path.trim_matches('/').split('/').collect::<Vec<_>>();
        for part in parts.iter().take(parts.len().saturating_sub(1)) {
            if !current.is_empty() {
                current.push('/');
            }
            current.push_str(part);
            self.create_directory(&current).await?;
        }
        Ok(())
    }
}

#[tauri::command]
pub async fn test_webdav_connection(
    server_url: String,
    username: String,
    password: String,
) -> Result<String, AppError> {
    let config = SyncConfig {
        server_url,
        username,
        password,
        remote_path: String::new(),
        sync_direction: SyncDirection::Bidirectional,
        force_full_sync: false,
        ..SyncConfig::default()
    };
    let client = WebDavClient::new(&config)?;
    let response = client
        .client
        .request(reqwest::Method::OPTIONS, client.base_url.clone())
        .basic_auth(&client.username, Some(&client.password))
        .send()
        .await
        .map_err(http_error)?;
    if response.status().is_success() {
        Ok("连接成功，密码已存入系统凭据库".into())
    } else {
        Err(sync_error(
            "webdav",
            format!("服务器返回 {}", response.status()),
        ))
    }
}

#[tauri::command]
pub async fn sync_notes_dir(
    config: SyncConfig,
    notes_dir: String,
    _conflict_strategy: Option<String>,
) -> Result<SyncResult, AppError> {
    let local_root = normalize_directory(Path::new(&notes_dir))?;
    let client = WebDavClient::new(&config)?;
    client.create_directory(&config.remote_path).await?;
    let state_path = local_root.join(".constellation").join("sync-state.json");
    let previous = load_state(&state_path)?;
    let local = scan_local(&local_root)?;
    let remote_list = client.list_recursive(&config.remote_path).await?;
    let mut remote = HashMap::<String, (RemoteFile, Vec<u8>, String)>::new();
    for item in remote_list {
        let content = client.download(&item.href).await?;
        let hash = blake3::hash(&content).to_hex().to_string();
        remote.insert(item.relative_path.clone(), (item, content, hash));
    }

    let mut result = SyncResult {
        uploaded: 0,
        downloaded: 0,
        deleted_local: 0,
        deleted_remote: 0,
        skipped: 0,
        conflicts: 0,
        errors: 0,
        last_sync_time: Utc::now().to_rfc3339(),
        conflict_files: Vec::new(),
    };
    let paths = local
        .keys()
        .chain(remote.keys())
        .chain(previous.file_hashes.keys())
        .cloned()
        .collect::<HashSet<_>>();

    for relative in paths {
        let local_file = local.get(&relative);
        let remote_file = remote.get(&relative);
        let previous_hash = previous
            .file_hashes
            .get(&relative)
            .map(|item| item.content_hash.as_str());
        let action = decide_action(
            local_file.map(|file| file.hash.as_str()),
            remote_file.map(|(_, _, hash)| hash.as_str()),
            previous_hash,
            &config.sync_direction,
            config.force_full_sync,
        );
        let remote_path = join_remote(&config.remote_path, &relative);
        let outcome = match action {
            SyncAction::Upload => client
                .upload(&remote_path, fs::read(&local_file.unwrap().path)?)
                .await
                .map(|_| result.uploaded += 1),
            SyncAction::Download => {
                write_local(&local_root.join(&relative), &remote_file.unwrap().1)
                    .map(|_| result.downloaded += 1)
            }
            SyncAction::DeleteLocal => fs::remove_file(&local_file.unwrap().path)
                .map_err(AppError::from)
                .map(|_| result.deleted_local += 1),
            SyncAction::DeleteRemote => client
                .delete(&remote_path)
                .await
                .map(|_| result.deleted_remote += 1),
            SyncAction::Conflict => {
                let conflict = conflict_path(&local_root.join(&relative));
                write_local(&conflict, &remote_file.unwrap().1).map(|_| {
                    result.conflicts += 1;
                    result.conflict_files.push(
                        conflict
                            .strip_prefix(&local_root)
                            .unwrap_or(&conflict)
                            .to_string_lossy()
                            .replace('\\', "/"),
                    );
                })
            }
            SyncAction::Skip => {
                result.skipped += 1;
                Ok(())
            }
        };
        if outcome.is_err() {
            result.errors += 1;
        }
    }

    let refreshed = scan_local(&local_root)?;
    let state = SyncState {
        last_sync_time: result.last_sync_time.clone(),
        file_hashes: refreshed
            .into_iter()
            .map(|(relative_path, file)| {
                (
                    relative_path.clone(),
                    FileSyncInfo {
                        relative_path,
                        content_hash: file.hash,
                    },
                )
            })
            .collect(),
    };
    save_state(&state_path, &state)?;
    Ok(result)
}

#[tauri::command]
pub fn get_sync_state(notes_dir: String) -> Result<SyncState, AppError> {
    load_state(
        &normalize_directory(Path::new(&notes_dir))?
            .join(".constellation")
            .join("sync-state.json"),
    )
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SyncAction {
    Upload,
    Download,
    DeleteLocal,
    DeleteRemote,
    Conflict,
    Skip,
}

fn decide_action(
    local: Option<&str>,
    remote: Option<&str>,
    previous: Option<&str>,
    direction: &SyncDirection,
    force: bool,
) -> SyncAction {
    match direction {
        SyncDirection::Upload => match local {
            Some(_) => SyncAction::Upload,
            None if previous.is_some() && remote.is_some() => SyncAction::DeleteRemote,
            None => SyncAction::Skip,
        },
        SyncDirection::Download => match remote {
            Some(_) => SyncAction::Download,
            None if previous.is_some() && local.is_some() => SyncAction::DeleteLocal,
            None => SyncAction::Skip,
        },
        SyncDirection::Bidirectional => match (local, remote) {
            (Some(left), Some(right)) if left == right => SyncAction::Skip,
            (Some(_), None) if previous.is_none() || force => SyncAction::Upload,
            (None, Some(_)) if previous.is_none() || force => SyncAction::Download,
            (Some(left), None) => {
                if previous == Some(left) {
                    SyncAction::DeleteLocal
                } else {
                    SyncAction::Upload
                }
            }
            (None, Some(right)) => {
                if previous == Some(right) {
                    SyncAction::DeleteRemote
                } else {
                    SyncAction::Download
                }
            }
            (Some(left), Some(right)) => {
                let local_changed = previous != Some(left);
                let remote_changed = previous != Some(right);
                match (local_changed, remote_changed) {
                    (true, true) => SyncAction::Conflict,
                    (true, false) => SyncAction::Upload,
                    (false, true) => SyncAction::Download,
                    (false, false) => SyncAction::Conflict,
                }
            }
            (None, None) => SyncAction::Skip,
        },
    }
}

fn parse_propfind(xml: &str, requested_root: &str) -> Result<Vec<RemoteFile>, AppError> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut output = Vec::new();
    let mut href = String::new();
    let mut is_directory = false;
    let mut capture_href = false;
    let requested = requested_root.trim_matches('/');

    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) => match local_name(event.name().as_ref()) {
                b"response" => {
                    href.clear();
                    is_directory = false;
                }
                b"href" => capture_href = true,
                b"collection" => is_directory = true,
                _ => {}
            },
            Ok(Event::Empty(event)) if local_name(event.name().as_ref()) == b"collection" => {
                is_directory = true;
            }
            Ok(Event::Text(text)) if capture_href => {
                href = reader
                    .decoder()
                    .decode(text.as_ref())
                    .map_err(|error| sync_error("xml", error.to_string()))?
                    .to_string();
            }
            Ok(Event::End(event)) => match local_name(event.name().as_ref()) {
                b"href" => capture_href = false,
                b"response" => {
                    let decoded = percent_decode(&href);
                    let path = reqwest::Url::parse(&decoded)
                        .ok()
                        .map(|url| url.path().to_string())
                        .unwrap_or(decoded);
                    let normalized = path.trim_matches('/');
                    let relative = normalized
                        .strip_prefix(requested)
                        .unwrap_or(normalized)
                        .trim_matches('/')
                        .to_string();
                    output.push(RemoteFile {
                        href: path.trim_start_matches('/').to_string(),
                        relative_path: relative,
                        is_directory,
                    });
                }
                _ => {}
            },
            Ok(Event::Eof) => break,
            Err(error) => return Err(sync_error("xml", error.to_string())),
            _ => {}
        }
    }
    Ok(output)
}

fn local_name(name: &[u8]) -> &[u8] {
    name.rsplit(|byte| *byte == b':').next().unwrap_or(name)
}

fn percent_decode(value: &str) -> String {
    percent_encoding::percent_decode_str(value)
        .decode_utf8_lossy()
        .to_string()
}

fn scan_local(root: &Path) -> Result<HashMap<String, LocalFile>, AppError> {
    let mut output = HashMap::new();
    for entry in walkdir::WalkDir::new(root).follow_links(false) {
        let entry = entry.map_err(|error| sync_error("walk", error.to_string()))?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|error| sync_error("invalidSyncPath", error.to_string()))?;
        let normalized = relative.to_string_lossy().replace('\\', "/");
        if normalized.starts_with(".constellation/")
            || normalized.starts_with("_legacy/")
            || normalized.contains(".tmp-")
        {
            continue;
        }
        let bytes = fs::read(entry.path())?;
        output.insert(
            normalized,
            LocalFile {
                path: entry.path().to_path_buf(),
                hash: blake3::hash(&bytes).to_hex().to_string(),
            },
        );
    }
    Ok(output)
}

fn load_state(path: &Path) -> Result<SyncState, AppError> {
    if !path.exists() {
        return Ok(SyncState::default());
    }
    Ok(serde_json::from_slice(&fs::read(path)?)?)
}

fn save_state(path: &Path, state: &SyncState) -> Result<(), AppError> {
    write_local(path, &serde_json::to_vec_pretty(state)?)
}

fn write_json_atomic(path: &Path, value: &impl Serialize) -> Result<(), AppError> {
    write_local(path, &serde_json::to_vec_pretty(value)?)
}

fn write_local(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temp = path.with_extension(format!("tmp-{}", Uuid::now_v7()));
    fs::write(&temp, bytes)?;
    fs::rename(temp, path)?;
    Ok(())
}

fn conflict_path(path: &Path) -> PathBuf {
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("file");
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("");
    let suffix = if extension.is_empty() {
        String::new()
    } else {
        format!(".{extension}")
    };
    path.with_file_name(format!(
        "{stem}.conflict-{}{}",
        Utc::now().format("%Y%m%d-%H%M%S"),
        suffix
    ))
}

fn join_remote(root: &str, relative: &str) -> String {
    format!("{}/{}", root.trim_matches('/'), relative.trim_matches('/'))
        .trim_matches('/')
        .to_string()
}

fn normalize_directory(path: &Path) -> Result<PathBuf, AppError> {
    if !path.is_dir() {
        return Err(sync_error(
            "invalidDirectory",
            format!("目录不存在: {}", path.display()),
        ));
    }
    path.canonicalize().map_err(AppError::from)
}

fn normalize_notes_dir(value: &str) -> Result<PathBuf, AppError> {
    normalize_directory(Path::new(value))
}

fn credential_entry(config: &SyncConfig) -> Result<Entry, AppError> {
    let account = format!(
        "webdav-{}",
        blake3::hash(format!("{}\n{}", config.server_url, config.username).as_bytes()).to_hex()
    );
    Entry::new("Constellation", &account).map_err(credential_error)
}

fn save_password(config: &SyncConfig) -> Result<(), AppError> {
    credential_entry(config)?
        .set_password(&config.password)
        .map_err(credential_error)
}

fn credential_error(error: keyring::Error) -> AppError {
    sync_error("credential", error.to_string())
}

fn http_error(error: reqwest::Error) -> AppError {
    sync_error("webdav", error.to_string())
}

fn sync_error(code: impl Into<String>, message: impl Into<String>) -> AppError {
    AppError {
        code: code.into(),
        message: message.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_namespaced_propfind_xml() {
        let xml = r#"<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response><d:href>/notes/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
  <d:response><d:href>/notes/folder/a%20b.md</d:href><d:propstat><d:prop><d:resourcetype/></d:prop></d:propstat></d:response>
</d:multistatus>"#;
        let files = parse_propfind(xml, "notes").unwrap();
        assert!(files.iter().any(|file| file.is_directory));
        assert!(files
            .iter()
            .any(|file| file.relative_path == "folder/a b.md"));
    }

    #[test]
    fn detects_bidirectional_conflicts_from_common_hash() {
        assert_eq!(
            decide_action(
                Some("local-new"),
                Some("remote-new"),
                Some("old"),
                &SyncDirection::Bidirectional,
                false,
            ),
            SyncAction::Conflict
        );
        assert_eq!(
            decide_action(
                Some("local-new"),
                Some("old"),
                Some("old"),
                &SyncDirection::Bidirectional,
                false,
            ),
            SyncAction::Upload
        );
        assert_eq!(
            decide_action(
                Some("old"),
                Some("remote-new"),
                Some("old"),
                &SyncDirection::Bidirectional,
                false,
            ),
            SyncAction::Download
        );
    }

    #[test]
    fn persists_auto_sync_settings_without_plaintext_password() {
        let root =
            std::env::temp_dir().join(format!("constellation-sync-config-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let config = SyncConfig {
            server_url: "https://example.test/dav".into(),
            username: "maplar".into(),
            password: String::new(),
            remote_path: "/notes".into(),
            sync_direction: SyncDirection::Bidirectional,
            force_full_sync: false,
            auto_sync: true,
            sync_interval: 120,
        };

        save_sync_config(root.to_string_lossy().to_string(), config).unwrap();
        let loaded = load_sync_config(root.to_string_lossy().to_string()).unwrap();
        assert!(loaded.auto_sync);
        assert_eq!(loaded.sync_interval, 120);
        let raw = fs::read_to_string(root.join(SYNC_CONFIG_PATH)).unwrap();
        assert!(!raw.contains("\"password\""));

        fs::remove_dir_all(root).unwrap();
    }
}
