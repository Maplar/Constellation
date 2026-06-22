/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::{default_store, AppError};
use argon2::Argon2;
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use chrono::Utc;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

const MAGIC: &[u8; 5] = b"CSTB1";
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 24;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupMetadata {
    pub id: String,
    pub timestamp: String,
    pub file_count: usize,
    pub total_size: u64,
    pub compressed_size: u64,
    pub encrypted: bool,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    pub restored_files: usize,
    pub skipped_files: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupConfig {
    pub backup_dir: String,
    pub auto_backup: bool,
    pub backup_interval: u64,
    pub max_backups: usize,
    pub encrypt: bool,
    pub compress: bool,
    pub compression_level: i64,
}

impl Default for BackupConfig {
    fn default() -> Self {
        Self {
            backup_dir: String::new(),
            auto_backup: false,
            backup_interval: 86_400,
            max_backups: 10,
            encrypt: true,
            compress: true,
            compression_level: 6,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupManifest {
    metadata: BackupMetadata,
    source_path: String,
}

#[tauri::command]
pub fn load_backup_config() -> Result<BackupConfig, AppError> {
    let path = backup_config_path()?;
    if !path.exists() {
        return Ok(BackupConfig::default());
    }
    Ok(serde_json::from_slice(&fs::read(path)?)?)
}

#[tauri::command]
pub fn save_backup_config(config: BackupConfig) -> Result<(), AppError> {
    let path = backup_config_path()?;
    write_atomic(&path, &serde_json::to_vec_pretty(&config)?)
}

#[tauri::command]
pub fn create_backup(
    notes_dir: String,
    backup_dir: String,
    encrypt: bool,
    compress: bool,
    password: Option<String>,
) -> Result<BackupMetadata, AppError> {
    let source = normalize_dir(Path::new(&notes_dir), false)?;
    let destination = normalize_dir(Path::new(&backup_dir), true)?;
    if encrypt && password.as_deref().is_none_or(str::is_empty) {
        return Err(backup_error(
            "backupPasswordRequired",
            "加密备份必须提供密码",
        ));
    }

    let id = Uuid::now_v7().to_string();
    let timestamp = Utc::now().to_rfc3339();
    let files = collect_files(&source)?;
    let total_size = files.iter().map(|(_, bytes)| bytes.len() as u64).sum();
    let metadata = BackupMetadata {
        id: id.clone(),
        timestamp,
        file_count: files.len(),
        total_size,
        compressed_size: 0,
        encrypted: encrypt,
        version: "1".into(),
    };
    let archive = build_zip(&source, &files, &metadata, compress)?;
    let payload = if encrypt {
        encrypt_payload(&archive, password.as_deref().unwrap_or_default())?
    } else {
        archive
    };
    let extension = if encrypt { "cstbak" } else { "zip" };
    let path = destination.join(format!("constellation-{id}.{extension}"));
    write_atomic(&path, &payload)?;
    let config = load_backup_config().unwrap_or_default();
    prune_backups(&destination, config.max_backups.max(1), &id)?;

    Ok(BackupMetadata {
        compressed_size: payload.len() as u64,
        ..metadata
    })
}

fn prune_backups(directory: &Path, max_backups: usize, keep_id: &str) -> Result<(), AppError> {
    let mut backups = fs::read_dir(directory)?
        .filter_map(Result::ok)
        .filter(|entry| {
            entry.path().is_file()
                && entry
                    .path()
                    .extension()
                    .and_then(|value| value.to_str())
                    .is_some_and(|value| matches!(value, "cstbak" | "zip"))
        })
        .filter_map(|entry| {
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((modified, entry.path()))
        })
        .collect::<Vec<_>>();
    backups.sort_by_key(|(modified, _)| *modified);
    let remove_count = backups.len().saturating_sub(max_backups);
    for (_, path) in backups.into_iter().take(remove_count) {
        if !path.to_string_lossy().contains(keep_id) {
            fs::remove_file(path)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn list_backups(backup_dir: String) -> Result<Vec<BackupMetadata>, AppError> {
    let directory = normalize_dir(Path::new(&backup_dir), false)?;
    let mut backups = Vec::new();
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let path = entry.path();
        if !matches!(
            path.extension().and_then(|value| value.to_str()),
            Some("cstbak" | "zip")
        ) {
            continue;
        }
        let encrypted = path.extension().and_then(|value| value.to_str()) == Some("cstbak");
        let id = path
            .file_stem()
            .and_then(|value| value.to_str())
            .and_then(|value| value.strip_prefix("constellation-"))
            .unwrap_or_default()
            .to_string();
        let modified = entry
            .metadata()?
            .modified()
            .map(chrono::DateTime::<Utc>::from)
            .unwrap_or_else(|_| Utc::now());
        backups.push(BackupMetadata {
            id,
            timestamp: modified.to_rfc3339(),
            file_count: 0,
            total_size: 0,
            compressed_size: entry.metadata()?.len(),
            encrypted,
            version: "1".into(),
        });
    }
    backups.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
    Ok(backups)
}

#[tauri::command]
pub fn restore_backup(
    backup_id: String,
    backup_dir: String,
    notes_dir: String,
    password: Option<String>,
) -> Result<RestoreResult, AppError> {
    let backup_directory = normalize_dir(Path::new(&backup_dir), false)?;
    let target = normalize_dir(Path::new(&notes_dir), true)?;
    let path = find_backup(&backup_directory, &backup_id)?;
    let bytes = fs::read(path)?;
    let archive = if bytes.starts_with(MAGIC) {
        decrypt_payload(&bytes, password.as_deref().unwrap_or_default())?
    } else {
        bytes
    };
    restore_zip(&archive, &target)
}

#[tauri::command]
pub fn delete_backup(backup_id: String, backup_dir: String) -> Result<(), AppError> {
    let directory = normalize_dir(Path::new(&backup_dir), false)?;
    let path = find_backup(&directory, &backup_id)?;
    fs::remove_file(path)?;
    Ok(())
}

#[tauri::command]
pub fn verify_backup_password(
    backup_id: String,
    backup_dir: String,
    password: String,
) -> Result<bool, AppError> {
    let directory = normalize_dir(Path::new(&backup_dir), false)?;
    let bytes = fs::read(find_backup(&directory, &backup_id)?)?;
    if !bytes.starts_with(MAGIC) {
        return Ok(true);
    }
    Ok(decrypt_payload(&bytes, &password).is_ok())
}

#[tauri::command]
pub fn get_backup_size(
    backup_id: String,
    backup_dir: String,
) -> Result<serde_json::Value, AppError> {
    let directory = normalize_dir(Path::new(&backup_dir), false)?;
    let bytes = fs::read(find_backup(&directory, &backup_id)?)?;
    let archive = if bytes.starts_with(MAGIC) {
        Vec::new()
    } else {
        bytes.clone()
    };
    Ok(serde_json::json!({
        "originalSize": archive.len(),
        "compressedSize": bytes.len(),
    }))
}

fn collect_files(root: &Path) -> Result<Vec<(PathBuf, Vec<u8>)>, AppError> {
    let mut files = Vec::new();
    for entry in WalkDir::new(root).follow_links(false) {
        let entry = entry.map_err(|error| backup_error("walk", error.to_string()))?;
        if !entry.file_type().is_file() {
            continue;
        }
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|error| backup_error("invalidBackupPath", error.to_string()))?;
        let normalized = relative.to_string_lossy().replace('\\', "/");
        if normalized.starts_with(".constellation/cache/")
            || normalized.contains(".tmp-")
            || normalized.ends_with(".swap")
        {
            continue;
        }
        files.push((relative.to_path_buf(), fs::read(entry.path())?));
    }
    Ok(files)
}

fn build_zip(
    source: &Path,
    files: &[(PathBuf, Vec<u8>)],
    metadata: &BackupMetadata,
    compress: bool,
) -> Result<Vec<u8>, AppError> {
    let cursor = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(cursor);
    let method = if compress {
        CompressionMethod::Deflated
    } else {
        CompressionMethod::Stored
    };
    let options = SimpleFileOptions::default().compression_method(method);
    for (path, bytes) in files {
        let name = path.to_string_lossy().replace('\\', "/");
        writer.start_file(name, options).map_err(zip_error)?;
        writer.write_all(bytes)?;
    }
    writer
        .start_file(".constellation-backup-manifest.json", options)
        .map_err(zip_error)?;
    writer.write_all(&serde_json::to_vec_pretty(&BackupManifest {
        metadata: metadata.clone(),
        source_path: source.to_string_lossy().to_string(),
    })?)?;
    Ok(writer.finish().map_err(zip_error)?.into_inner())
}

fn restore_zip(bytes: &[u8], target: &Path) -> Result<RestoreResult, AppError> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(zip_error)?;
    let mut result = RestoreResult {
        restored_files: 0,
        skipped_files: 0,
        errors: Vec::new(),
    };
    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(zip_error)?;
        let Some(relative) = file.enclosed_name() else {
            result.errors.push(format!("非法归档路径: {}", file.name()));
            continue;
        };
        if relative == Path::new(".constellation-backup-manifest.json") || file.is_dir() {
            continue;
        }
        let mut content = Vec::new();
        file.read_to_end(&mut content)?;
        let mut destination = target.join(&relative);
        if destination.exists() {
            if fs::read(&destination).ok().as_deref() == Some(content.as_slice()) {
                result.skipped_files += 1;
                continue;
            }
            destination = conflict_path(&destination);
        }
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)?;
        }
        write_atomic(&destination, &content)?;
        result.restored_files += 1;
    }
    Ok(result)
}

fn encrypt_payload(payload: &[u8], password: &str) -> Result<Vec<u8>, AppError> {
    let mut salt = [0u8; SALT_LEN];
    let mut nonce = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut nonce);
    let key = derive_key(password, &salt)?;
    let cipher = XChaCha20Poly1305::new_from_slice(&key)
        .map_err(|error| backup_error("encryption", error.to_string()))?;
    let encrypted = cipher
        .encrypt(XNonce::from_slice(&nonce), payload)
        .map_err(|error| backup_error("encryption", error.to_string()))?;
    let mut output = Vec::with_capacity(MAGIC.len() + SALT_LEN + NONCE_LEN + encrypted.len());
    output.extend_from_slice(MAGIC);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce);
    output.extend_from_slice(&encrypted);
    Ok(output)
}

fn decrypt_payload(payload: &[u8], password: &str) -> Result<Vec<u8>, AppError> {
    if payload.len() <= MAGIC.len() + SALT_LEN + NONCE_LEN || !payload.starts_with(MAGIC) {
        return Err(backup_error("invalidBackup", "备份包格式无效"));
    }
    let salt_start = MAGIC.len();
    let nonce_start = salt_start + SALT_LEN;
    let content_start = nonce_start + NONCE_LEN;
    let key = derive_key(password, &payload[salt_start..nonce_start])?;
    let cipher = XChaCha20Poly1305::new_from_slice(&key)
        .map_err(|error| backup_error("decryption", error.to_string()))?;
    cipher
        .decrypt(
            XNonce::from_slice(&payload[nonce_start..content_start]),
            &payload[content_start..],
        )
        .map_err(|_| backup_error("invalidBackupPassword", "密码错误或备份包已损坏"))
}

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], AppError> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|error| backup_error("keyDerivation", error.to_string()))?;
    Ok(key)
}

fn find_backup(directory: &Path, id: &str) -> Result<PathBuf, AppError> {
    ["cstbak", "zip"]
        .into_iter()
        .map(|extension| directory.join(format!("constellation-{id}.{extension}")))
        .find(|path| path.is_file())
        .ok_or_else(|| backup_error("backupNotFound", format!("备份不存在: {id}")))
}

fn backup_config_path() -> Result<PathBuf, AppError> {
    let root = PathBuf::from(default_store()?.load_config()?.notes_dir);
    let directory = root.join(".constellation");
    fs::create_dir_all(&directory)?;
    Ok(directory.join("backup.json"))
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
        "{stem}.restore-conflict-{}{}",
        Utc::now().format("%Y%m%d-%H%M%S"),
        suffix
    ))
}

fn normalize_dir(path: &Path, create: bool) -> Result<PathBuf, AppError> {
    if create {
        fs::create_dir_all(path)?;
    }
    if !path.is_dir() {
        return Err(backup_error(
            "invalidDirectory",
            format!("目录不存在: {}", path.display()),
        ));
    }
    path.canonicalize().map_err(AppError::from)
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temp = path.with_extension(format!("tmp-{}", Uuid::now_v7()));
    let mut file = fs::File::create(&temp)?;
    file.write_all(bytes)?;
    file.flush()?;
    file.sync_all()?;
    fs::rename(temp, path)?;
    Ok(())
}

fn zip_error(error: zip::result::ZipError) -> AppError {
    backup_error("zip", error.to_string())
}

fn backup_error(code: impl Into<String>, message: impl Into<String>) -> AppError {
    AppError {
        code: code.into(),
        message: message.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypted_backup_rejects_wrong_password_and_restores_content() {
        let payload = b"zip payload";
        let encrypted = encrypt_payload(payload, "correct horse").unwrap();
        assert!(decrypt_payload(&encrypted, "wrong").is_err());
        assert_eq!(
            decrypt_payload(&encrypted, "correct horse").unwrap(),
            payload
        );
    }

    #[test]
    fn zip_restore_preserves_conflicting_files() {
        let root = std::env::temp_dir().join(format!("constellation-backup-{}", Uuid::new_v4()));
        let source = root.join("source");
        let target = root.join("target");
        fs::create_dir_all(&source).unwrap();
        fs::create_dir_all(&target).unwrap();
        fs::write(source.join("note.md"), "backup").unwrap();
        fs::write(target.join("note.md"), "current").unwrap();
        let files = collect_files(&source).unwrap();
        let metadata = BackupMetadata {
            id: Uuid::now_v7().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            file_count: 1,
            total_size: 6,
            compressed_size: 0,
            encrypted: false,
            version: "1".into(),
        };
        let archive = build_zip(&source, &files, &metadata, true).unwrap();
        let result = restore_zip(&archive, &target).unwrap();

        assert_eq!(result.restored_files, 1);
        assert_eq!(
            fs::read_to_string(target.join("note.md")).unwrap(),
            "current"
        );
        assert!(fs::read_dir(&target)
            .unwrap()
            .filter_map(Result::ok)
            .any(|entry| entry
                .file_name()
                .to_string_lossy()
                .contains("restore-conflict")));
        fs::remove_dir_all(root).ok();
    }
}
