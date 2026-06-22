/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::notes::AppError;
use chrono::{TimeZone, Utc};
use git2::{Commit, Delta, IndexAddOption, Oid, Repository, Signature};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitSnapshot {
    pub id: String,
    pub message: String,
    pub author: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitSnapshotChange {
    pub path: String,
    pub status: String,
}

#[tauri::command]
pub fn git_snapshot_enable(notes_dir: String) -> Result<bool, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    if root.join(".git").is_dir() {
        Repository::open(root).map_err(git_error)?;
        return Ok(false);
    }
    Repository::init(root).map_err(git_error)?;
    Ok(true)
}

#[tauri::command]
pub fn git_snapshot_create(
    notes_dir: String,
    message: Option<String>,
) -> Result<GitSnapshot, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    let repository = Repository::open(&root).map_err(|_| {
        snapshot_error(
            "gitNotEnabled",
            "工作区尚未启用 Git 快照，请先在应用内明确启用",
        )
    })?;
    let mut index = repository.index().map_err(git_error)?;
    index
        .add_all(
            ["*"],
            IndexAddOption::DEFAULT,
            Some(&mut |path, _| {
                if should_include(path) {
                    0
                } else {
                    1
                }
            }),
        )
        .map_err(git_error)?;
    index.write().map_err(git_error)?;
    let tree_id = index.write_tree().map_err(git_error)?;
    let tree = repository.find_tree(tree_id).map_err(git_error)?;
    let signature = repository
        .signature()
        .or_else(|_| Signature::now("Constellation", "constellation@local"))
        .map_err(git_error)?;
    let parent = repository
        .head()
        .ok()
        .and_then(|head| head.target())
        .and_then(|oid| repository.find_commit(oid).ok());
    let parents = parent.iter().collect::<Vec<&Commit<'_>>>();
    let commit_id = repository
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            message
                .as_deref()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or("Constellation snapshot"),
            &tree,
            &parents,
        )
        .map_err(git_error)?;
    let commit = repository.find_commit(commit_id).map_err(git_error)?;
    snapshot_from_commit(&commit)
}

#[tauri::command]
pub fn git_snapshot_history(
    notes_dir: String,
    limit: Option<usize>,
) -> Result<Vec<GitSnapshot>, AppError> {
    let repository = Repository::open(normalize_workspace(&notes_dir)?).map_err(git_error)?;
    let mut walk = repository.revwalk().map_err(git_error)?;
    if repository.head().is_err() {
        return Ok(Vec::new());
    }
    walk.push_head().map_err(git_error)?;
    walk.take(limit.unwrap_or(50).clamp(1, 500))
        .map(|oid| {
            let commit = repository
                .find_commit(oid.map_err(git_error)?)
                .map_err(git_error)?;
            snapshot_from_commit(&commit)
        })
        .collect()
}

#[tauri::command]
pub fn git_snapshot_compare(
    notes_dir: String,
    snapshot_id: String,
) -> Result<Vec<GitSnapshotChange>, AppError> {
    let repository = Repository::open(normalize_workspace(&notes_dir)?).map_err(git_error)?;
    let oid = Oid::from_str(&snapshot_id).map_err(git_error)?;
    let tree = repository
        .find_commit(oid)
        .and_then(|commit| commit.tree())
        .map_err(git_error)?;
    let diff = repository
        .diff_tree_to_workdir_with_index(Some(&tree), None)
        .map_err(git_error)?;
    Ok(diff
        .deltas()
        .filter_map(|delta| {
            let path = delta
                .new_file()
                .path()
                .or_else(|| delta.old_file().path())?
                .to_string_lossy()
                .replace('\\', "/");
            should_include(Path::new(&path)).then(|| GitSnapshotChange {
                path,
                status: delta_status(delta.status()).to_string(),
            })
        })
        .collect())
}

#[tauri::command]
pub fn git_snapshot_restore(
    notes_dir: String,
    snapshot_id: String,
    target_dir: String,
) -> Result<usize, AppError> {
    let repository = Repository::open(normalize_workspace(&notes_dir)?).map_err(git_error)?;
    let oid = Oid::from_str(&snapshot_id).map_err(git_error)?;
    let commit = repository.find_commit(oid).map_err(git_error)?;
    let tree = commit.tree().map_err(git_error)?;
    let target = PathBuf::from(target_dir);
    if target.exists() && fs::read_dir(&target)?.next().is_some() {
        return Err(snapshot_error(
            "restoreTargetNotEmpty",
            "Git 快照只能恢复到新的空目录",
        ));
    }
    fs::create_dir_all(&target)?;
    let mut restored = 0;
    restore_tree(&repository, &tree, &target, Path::new(""), &mut restored)?;
    Ok(restored)
}

fn restore_tree(
    repository: &Repository,
    tree: &git2::Tree<'_>,
    target: &Path,
    prefix: &Path,
    restored: &mut usize,
) -> Result<(), AppError> {
    for entry in tree {
        let Some(name) = entry.name() else {
            continue;
        };
        let relative = prefix.join(name);
        if !safe_relative(&relative) || !should_include(&relative) {
            continue;
        }
        match entry.kind() {
            Some(git2::ObjectType::Tree) => {
                let child = repository.find_tree(entry.id()).map_err(git_error)?;
                restore_tree(repository, &child, target, &relative, restored)?;
            }
            Some(git2::ObjectType::Blob) => {
                let blob = repository.find_blob(entry.id()).map_err(git_error)?;
                let destination = target.join(&relative);
                if let Some(parent) = destination.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::write(destination, blob.content())?;
                *restored += 1;
            }
            _ => {}
        }
    }
    Ok(())
}

fn snapshot_from_commit(commit: &Commit<'_>) -> Result<GitSnapshot, AppError> {
    let timestamp = Utc
        .timestamp_opt(commit.time().seconds(), 0)
        .single()
        .ok_or_else(|| snapshot_error("invalidGitTime", "Git 提交时间无效"))?;
    Ok(GitSnapshot {
        id: commit.id().to_string(),
        message: commit.summary().unwrap_or("Snapshot").to_string(),
        author: commit
            .author()
            .name()
            .unwrap_or("Constellation")
            .to_string(),
        created_at: timestamp.to_rfc3339(),
    })
}

fn normalize_workspace(value: &str) -> Result<PathBuf, AppError> {
    let path = PathBuf::from(value);
    if !path.is_dir() {
        return Err(snapshot_error(
            "invalidWorkspace",
            format!("工作区不存在: {}", path.display()),
        ));
    }
    let canonical = path.canonicalize().map_err(AppError::from)?;
    #[cfg(windows)]
    {
        let value = canonical.to_string_lossy();
        if let Some(stripped) = value.strip_prefix(r"\\?\") {
            return Ok(PathBuf::from(stripped));
        }
    }
    Ok(canonical)
}

fn should_include(path: &Path) -> bool {
    let normalized = path.to_string_lossy().replace('\\', "/");
    !normalized.starts_with(".git/")
        && normalized != ".git"
        && !normalized.starts_with(".constellation/cache/")
        && !normalized.contains(".tmp-")
        && !normalized.ends_with(".swap")
        && !normalized.ends_with("ai-settings.json")
}

fn delta_status(status: Delta) -> &'static str {
    match status {
        Delta::Added | Delta::Untracked => "added",
        Delta::Deleted => "deleted",
        Delta::Renamed => "renamed",
        Delta::Copied => "copied",
        Delta::Modified | Delta::Typechange => "modified",
        Delta::Ignored => "ignored",
        Delta::Unreadable => "unreadable",
        Delta::Conflicted => "conflicted",
        Delta::Unmodified => "unmodified",
    }
}

fn safe_relative(path: &Path) -> bool {
    !path.is_absolute()
        && path
            .components()
            .all(|component| matches!(component, Component::Normal(_)))
}

fn git_error(error: git2::Error) -> AppError {
    snapshot_error("git", error.to_string())
}

fn snapshot_error(code: impl Into<String>, message: impl Into<String>) -> AppError {
    AppError {
        code: code.into(),
        message: message.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn excludes_cache_temporary_and_credential_files() {
        assert!(!should_include(Path::new(".constellation/cache/index")));
        assert!(!should_include(Path::new("note.md.tmp-123")));
        assert!(!should_include(Path::new("ai-settings.json")));
        assert!(should_include(Path::new("notes/idea.md")));
    }

    #[test]
    fn creates_history_and_restores_to_new_directory() {
        let root = std::env::temp_dir().join(format!("constellation-git-{}", uuid::Uuid::new_v4()));
        let restore = root.with_extension("restore");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("note.md"), "# Snapshot").unwrap();
        git_snapshot_enable(root.to_string_lossy().to_string()).unwrap();
        let snapshot =
            git_snapshot_create(root.to_string_lossy().to_string(), Some("first".into())).unwrap();
        let history = git_snapshot_history(root.to_string_lossy().to_string(), None).unwrap();
        assert_eq!(history[0].id, snapshot.id);
        fs::write(root.join("note.md"), "# Changed").unwrap();
        let changes =
            git_snapshot_compare(root.to_string_lossy().to_string(), snapshot.id.clone()).unwrap();
        assert_eq!(
            changes,
            vec![GitSnapshotChange {
                path: "note.md".into(),
                status: "modified".into(),
            }]
        );
        assert_eq!(
            git_snapshot_restore(
                root.to_string_lossy().to_string(),
                snapshot.id,
                restore.to_string_lossy().to_string(),
            )
            .unwrap(),
            1
        );
        assert_eq!(
            fs::read_to_string(restore.join("note.md")).unwrap(),
            "# Snapshot"
        );
        fs::remove_dir_all(root).ok();
        fs::remove_dir_all(restore).ok();
    }
}
