/**
 * @copyright 原始代码版权归 Achilng 所有 (Copyright (c) 2026 Achilng)
 * 基于 MIT 许可证授权
 *
 * 修改部分版权：Copyright (c) 2026 Maplar
 * 修改说明：将前端全库扫描重构为可重建的 SQLite 引用索引
 */
use super::notes::{default_store, AppError};
use blake3::hash;
use regex::Regex;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value};
use std::collections::{HashMap, HashSet, VecDeque};
use std::fs;
use std::path::{Component, Path, PathBuf};
use walkdir::WalkDir;

const INDEX_PATH: &str = ".constellation/cache/references.sqlite";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceNode {
    pub id: String,
    pub label: String,
    pub note_id: String,
    pub category: String,
    pub file_name: String,
    pub inbound_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceEdge {
    pub source: String,
    pub target: String,
    pub label: Option<String>,
    pub relation_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceGraph {
    pub nodes: Vec<ReferenceNode>,
    pub edges: Vec<ReferenceEdge>,
}

#[derive(Debug, Clone)]
struct IndexedDocument {
    id: String,
    path: String,
    title: String,
    folder: String,
    file_name: String,
    content_hash: String,
    body: String,
}

#[derive(Debug, Clone)]
struct ParsedReference {
    target: String,
    label: Option<String>,
    relation_type: &'static str,
}

#[tauri::command]
pub fn references_rebuild(notes_dir: String) -> Result<usize, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    rebuild_index(&root)
}

#[tauri::command]
pub fn references_index_document(notes_dir: String, relative_path: String) -> Result<(), AppError> {
    let root = normalize_workspace(&notes_dir)?;
    let safe_path = safe_relative_path(&relative_path)?;
    let mut connection = open_index(&root)?;
    let transaction = connection.transaction().map_err(database_error)?;
    if root.join(&safe_path).is_file() {
        let document = read_document(&root, &safe_path)?;
        upsert_document(&transaction, &document)?;
    } else {
        transaction
            .execute(
                "DELETE FROM documents WHERE path = ?1",
                [normalize_path(&safe_path)],
            )
            .map_err(database_error)?;
    }
    resolve_all_references(&transaction)?;
    transaction.commit().map_err(database_error)
}

pub(crate) fn document_id_for_path(
    notes_dir: &Path,
    relative_path: &str,
) -> Result<Option<String>, AppError> {
    let connection = open_index(notes_dir)?;
    connection
        .query_row(
            "SELECT id FROM documents WHERE path = ?1",
            [normalize_path(Path::new(relative_path))],
            |row| row.get(0),
        )
        .optional()
        .map_err(database_error)
}

#[tauri::command]
pub fn references_for_document(
    notes_dir: String,
    document_id: String,
) -> Result<Vec<ReferenceEdge>, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    ensure_index(&root)?;
    query_edges(&open_index(&root)?, Some((&document_id, false)))
}

#[tauri::command]
pub fn backlinks_for_document(
    notes_dir: String,
    document_id: String,
) -> Result<Vec<ReferenceEdge>, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    ensure_index(&root)?;
    query_edges(&open_index(&root)?, Some((&document_id, true)))
}

#[tauri::command]
pub fn graph_local(
    notes_dir: String,
    document_id: String,
    depth: Option<usize>,
) -> Result<ReferenceGraph, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    ensure_index(&root)?;
    graph_from_index(&root, Some(document_id), depth.unwrap_or(1).clamp(1, 2))
}

#[tauri::command]
pub fn graph_global(notes_dir: String) -> Result<ReferenceGraph, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    ensure_index(&root)?;
    graph_from_index(&root, None, 0)
}

#[tauri::command]
pub fn references_graph() -> Result<ReferenceGraph, AppError> {
    let root = configured_workspace()?;
    ensure_index(&root)?;
    graph_from_index(&root, None, 0)
}

#[tauri::command]
pub fn references_local_graph(
    note_id: String,
    depth: Option<usize>,
) -> Result<ReferenceGraph, AppError> {
    let root = configured_workspace()?;
    ensure_index(&root)?;
    graph_from_index(&root, Some(note_id), depth.unwrap_or(1).clamp(1, 2))
}

fn rebuild_index(root: &Path) -> Result<usize, AppError> {
    let mut documents = Vec::new();
    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|entry| entry.file_name() != ".constellation")
        .filter_map(Result::ok)
        .filter(|entry| {
            entry.file_type().is_file()
                && entry
                    .path()
                    .extension()
                    .is_some_and(|value| value.eq_ignore_ascii_case("md"))
        })
    {
        let relative = entry.path().strip_prefix(root).map_err(io_error)?;
        documents.push(read_document(root, relative)?);
    }

    let mut connection = open_index(root)?;
    let transaction = connection.transaction().map_err(database_error)?;
    transaction
        .execute("DELETE FROM reference_edges", [])
        .map_err(database_error)?;
    transaction
        .execute("DELETE FROM documents", [])
        .map_err(database_error)?;
    for document in &documents {
        upsert_document(&transaction, document)?;
    }
    resolve_all_references(&transaction)?;
    transaction.commit().map_err(database_error)?;
    Ok(documents.len())
}

fn upsert_document(
    transaction: &Transaction<'_>,
    document: &IndexedDocument,
) -> Result<(), AppError> {
    transaction
        .execute(
            "INSERT INTO documents (id, path, title, folder, file_name, content_hash)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET path=excluded.path, title=excluded.title,
             folder=excluded.folder, file_name=excluded.file_name,
             content_hash=excluded.content_hash",
            params![
                document.id,
                document.path,
                document.title,
                document.folder,
                document.file_name,
                document.content_hash
            ],
        )
        .map_err(database_error)?;
    transaction
        .execute(
            "DELETE FROM unresolved_references WHERE source_id = ?1",
            [&document.id],
        )
        .map_err(database_error)?;
    for reference in parse_references(&document.body) {
        transaction
            .execute(
                "INSERT INTO unresolved_references
                 (source_id, source_path, target_text, label, relation_type)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    document.id,
                    document.path,
                    reference.target,
                    reference.label,
                    reference.relation_type
                ],
            )
            .map_err(database_error)?;
    }
    Ok(())
}

fn resolve_all_references(transaction: &Transaction<'_>) -> Result<(), AppError> {
    transaction
        .execute("DELETE FROM reference_edges", [])
        .map_err(database_error)?;
    let documents = query_documents(transaction)?;
    let title_index = documents
        .iter()
        .map(|document| (normalize_title(&document.title), document.id.clone()))
        .collect::<HashMap<_, _>>();
    let path_index = documents
        .iter()
        .map(|document| (document.path.to_lowercase(), document.id.clone()))
        .collect::<HashMap<_, _>>();
    let unresolved = {
        let mut statement = transaction
            .prepare(
                "SELECT source_id, source_path, target_text, label, relation_type
                 FROM unresolved_references",
            )
            .map_err(database_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })
            .map_err(database_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(database_error)?;
        rows
    };
    for (source_id, source_path, target, label, relation_type) in unresolved {
        let Some(target_id) = resolve_target(&source_path, &target, &title_index, &path_index)
        else {
            continue;
        };
        if source_id != target_id {
            transaction
                .execute(
                    "INSERT OR IGNORE INTO reference_edges
                     (source_id, target_id, label, relation_type)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![source_id, target_id, label, relation_type],
                )
                .map_err(database_error)?;
        }
    }
    Ok(())
}

fn graph_from_index(
    root: &Path,
    center_id: Option<String>,
    depth: usize,
) -> Result<ReferenceGraph, AppError> {
    let connection = open_index(root)?;
    let mut edges = query_edges(&connection, None)?;
    let allowed_ids = center_id
        .as_deref()
        .map(|id| local_node_ids(id, depth, &edges));
    if let Some(ids) = &allowed_ids {
        edges.retain(|edge| ids.contains(&edge.source) && ids.contains(&edge.target));
    }
    let inbound = edges.iter().fold(HashMap::new(), |mut counts, edge| {
        *counts.entry(edge.target.clone()).or_insert(0usize) += 1;
        counts
    });
    let nodes = query_documents(&connection)?
        .into_iter()
        .filter(|document| {
            allowed_ids
                .as_ref()
                .map_or(true, |ids| ids.contains(&document.id))
        })
        .map(|document| ReferenceNode {
            inbound_count: inbound.get(&document.id).copied().unwrap_or_default(),
            id: document.id.clone(),
            note_id: document.id,
            label: document.title,
            category: document.folder,
            file_name: document.file_name,
        })
        .collect();
    Ok(ReferenceGraph { nodes, edges })
}

fn query_edges(
    connection: &Connection,
    document_filter: Option<(&str, bool)>,
) -> Result<Vec<ReferenceEdge>, AppError> {
    let (sql, parameter) = match document_filter {
        Some((id, true)) => (
            "SELECT source_id, target_id, label, relation_type FROM reference_edges WHERE target_id=?1",
            Some(id),
        ),
        Some((id, false)) => (
            "SELECT source_id, target_id, label, relation_type FROM reference_edges WHERE source_id=?1",
            Some(id),
        ),
        None => (
            "SELECT source_id, target_id, label, relation_type FROM reference_edges",
            None,
        ),
    };
    let mut statement = connection.prepare(sql).map_err(database_error)?;
    let mapper = |row: &rusqlite::Row<'_>| {
        Ok(ReferenceEdge {
            source: row.get(0)?,
            target: row.get(1)?,
            label: row.get(2)?,
            relation_type: row.get(3)?,
        })
    };
    let rows = if let Some(id) = parameter {
        statement
            .query_map([id], mapper)
            .map_err(database_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(database_error)?
    } else {
        statement
            .query_map([], mapper)
            .map_err(database_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(database_error)?
    };
    Ok(rows)
}

fn query_documents(connection: &Connection) -> Result<Vec<IndexedDocument>, AppError> {
    let mut statement = connection
        .prepare("SELECT id, path, title, folder, file_name, content_hash FROM documents")
        .map_err(database_error)?;
    let documents = statement
        .query_map([], |row| {
            Ok(IndexedDocument {
                id: row.get(0)?,
                path: row.get(1)?,
                title: row.get(2)?,
                folder: row.get(3)?,
                file_name: row.get(4)?,
                content_hash: row.get(5)?,
                body: String::new(),
            })
        })
        .map_err(database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(database_error)?;
    Ok(documents)
}

fn open_index(root: &Path) -> Result<Connection, AppError> {
    let path = root.join(INDEX_PATH);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(io_error)?;
    }
    let connection = Connection::open(path).map_err(database_error)?;
    connection
        .execute_batch(
            "PRAGMA foreign_keys=ON;
             CREATE TABLE IF NOT EXISTS documents (
               id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
               folder TEXT NOT NULL, file_name TEXT NOT NULL, content_hash TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS unresolved_references (
               source_id TEXT NOT NULL, source_path TEXT NOT NULL, target_text TEXT NOT NULL,
               label TEXT, relation_type TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS reference_edges (
               source_id TEXT NOT NULL, target_id TEXT NOT NULL, label TEXT,
               relation_type TEXT NOT NULL,
               UNIQUE(source_id, target_id, relation_type)
             );
             CREATE INDEX IF NOT EXISTS idx_references_source ON reference_edges(source_id);
             CREATE INDEX IF NOT EXISTS idx_references_target ON reference_edges(target_id);",
        )
        .map_err(database_error)?;
    Ok(connection)
}

fn ensure_index(root: &Path) -> Result<(), AppError> {
    let connection = open_index(root)?;
    let count: usize = connection
        .query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))
        .map_err(database_error)?;
    drop(connection);
    if count == 0 {
        rebuild_index(root)?;
    }
    Ok(())
}

fn read_document(root: &Path, relative: &Path) -> Result<IndexedDocument, AppError> {
    let path = root.join(relative);
    let content = fs::read_to_string(&path).map_err(io_error)?;
    let (frontmatter, body) = split_frontmatter(&content)?;
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_string();
    let title = body.lines().find_map(markdown_heading).unwrap_or_else(|| {
        path.file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("Untitled")
            .to_string()
    });
    let path_text = normalize_path(relative);
    let id = frontmatter_string(&frontmatter, "constellation_id")
        .unwrap_or_else(|| format!("path:{}", hash(path_text.as_bytes()).to_hex()));
    let folder = relative.parent().map(normalize_path).unwrap_or_default();
    Ok(IndexedDocument {
        id,
        path: path_text,
        title,
        folder,
        file_name,
        content_hash: hash(content.as_bytes()).to_hex().to_string(),
        body: body.to_string(),
    })
}

fn parse_references(content: &str) -> Vec<ParsedReference> {
    let embed_re = Regex::new(r"!\[\[([^\[\]]+)\]\]").expect("valid embed regex");
    let wiki_re = Regex::new(r"(?P<prefix>!?)\[\[([^\[\]]+)\]\]").expect("valid wiki regex");
    let markdown_re =
        Regex::new(r"!?\[([^\]]*)\]\(([^)]+\.md(?:#[^)]+)?)\)").expect("valid markdown regex");
    let mut references = Vec::new();
    for captures in embed_re.captures_iter(content) {
        let (target, label) = split_wiki_target(&captures[1]);
        references.push(ParsedReference {
            target,
            label,
            relation_type: "embed",
        });
    }
    for captures in wiki_re.captures_iter(content) {
        if captures.name("prefix").map(|value| value.as_str()) == Some("!") {
            continue;
        }
        let (target, label) = split_wiki_target(&captures[2]);
        references.push(ParsedReference {
            target,
            label,
            relation_type: "wiki",
        });
    }
    for captures in markdown_re.captures_iter(content) {
        references.push(ParsedReference {
            target: strip_anchor(&captures[2]).to_string(),
            label: captures
                .get(1)
                .map(|value| value.as_str().trim().to_string())
                .filter(|value| !value.is_empty()),
            relation_type: if captures[0].starts_with('!') {
                "embed"
            } else {
                "markdown"
            },
        });
    }
    references
}

fn resolve_target(
    source_path: &str,
    target: &str,
    title_index: &HashMap<String, String>,
    path_index: &HashMap<String, String>,
) -> Option<String> {
    let target = target.trim();
    if target.is_empty() {
        return None;
    }
    let target_path = Path::new(target);
    if target_path
        .extension()
        .is_some_and(|value| value.eq_ignore_ascii_case("md"))
    {
        let source_dir = Path::new(source_path).parent().unwrap_or(Path::new(""));
        return path_index
            .get(&normalize_path(&normalize_components(
                &source_dir.join(target_path),
            )))
            .cloned();
    }
    title_index.get(&normalize_title(target)).cloned()
}

fn split_wiki_target(raw: &str) -> (String, Option<String>) {
    let mut parts = raw.splitn(2, '|');
    let target = strip_anchor(parts.next().unwrap_or_default())
        .trim()
        .to_string();
    let label = parts
        .next()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from);
    (target, label)
}

fn strip_anchor(value: &str) -> &str {
    value.split('#').next().unwrap_or(value)
}

fn split_frontmatter(content: &str) -> Result<(Mapping, &str), AppError> {
    if let Some(rest) = content.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---\n") {
            let mapping = serde_yaml::from_str::<Mapping>(&rest[..end])
                .map_err(|error| app_error("frontmatter", error.to_string()))?;
            return Ok((mapping, &rest[end + 5..]));
        }
    }
    Ok((Mapping::new(), content))
}

fn frontmatter_string(mapping: &Mapping, key: &str) -> Option<String> {
    mapping
        .get(Value::String(key.to_string()))
        .and_then(Value::as_str)
        .map(String::from)
}

fn markdown_heading(line: &str) -> Option<String> {
    let line = line.trim_start();
    let markers = line.chars().take_while(|value| *value == '#').count();
    if !(1..=6).contains(&markers) {
        return None;
    }
    line[markers..]
        .strip_prefix(' ')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from)
}

fn local_node_ids(center_id: &str, depth: usize, edges: &[ReferenceEdge]) -> HashSet<String> {
    let mut visited = HashSet::from([center_id.to_string()]);
    let mut queue = VecDeque::from([(center_id.to_string(), 0usize)]);
    while let Some((current, current_depth)) = queue.pop_front() {
        if current_depth >= depth {
            continue;
        }
        for edge in edges {
            let neighbor = if edge.source == current {
                Some(&edge.target)
            } else if edge.target == current {
                Some(&edge.source)
            } else {
                None
            };
            if let Some(neighbor) = neighbor {
                if visited.insert(neighbor.clone()) {
                    queue.push_back((neighbor.clone(), current_depth + 1));
                }
            }
        }
    }
    visited
}

fn configured_workspace() -> Result<PathBuf, AppError> {
    normalize_workspace(&default_store()?.load_config()?.notes_dir)
}

fn normalize_workspace(value: &str) -> Result<PathBuf, AppError> {
    let path = PathBuf::from(value);
    if !path.is_absolute() {
        return Err(app_error("invalidWorkspace", "Workspace path is invalid"));
    }
    fs::canonicalize(path).map_err(io_error)
}

fn safe_relative_path(value: &str) -> Result<PathBuf, AppError> {
    let path = Path::new(value);
    if path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(app_error("invalidPath", "Document path is invalid"));
    }
    Ok(path.to_path_buf())
}

fn normalize_title(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy()
        .replace('\\', "/")
        .trim_start_matches("./")
        .to_lowercase()
}

fn normalize_components(path: &Path) -> PathBuf {
    let mut result = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                result.pop();
            }
            Component::CurDir => {}
            Component::Normal(value) => result.push(value),
            _ => {}
        }
    }
    result
}

fn app_error(code: &str, message: impl Into<String>) -> AppError {
    AppError {
        code: code.into(),
        message: message.into(),
    }
}

fn io_error(error: impl std::fmt::Display) -> AppError {
    app_error("io", error.to_string())
}

fn database_error(error: rusqlite::Error) -> AppError {
    app_error("referenceIndex", error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn parses_supported_reference_types() {
        let parsed =
            parse_references("[[Knowledge|Alias]] [Link](../docs/article.md) ![[Excerpt#Result]]");
        assert!(parsed
            .iter()
            .any(|item| item.relation_type == "wiki" && item.target == "Knowledge"));
        assert!(parsed
            .iter()
            .any(|item| item.relation_type == "markdown" && item.target == "../docs/article.md"));
        assert!(parsed
            .iter()
            .any(|item| item.relation_type == "embed" && item.target == "Excerpt"));
    }

    #[test]
    fn sqlite_index_resolves_forward_and_backward_links() {
        let root = std::env::temp_dir().join(format!("constellation-refs-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("ideas")).unwrap();
        fs::write(
            root.join("ideas/source.md"),
            "---\nconstellation_id: source\n---\n# Source\n[[Target]]",
        )
        .unwrap();
        fs::write(
            root.join("target.md"),
            "---\nconstellation_id: target\n---\n# Target\nBody",
        )
        .unwrap();
        assert_eq!(rebuild_index(&root).unwrap(), 2);
        let connection = open_index(&root).unwrap();
        assert_eq!(
            query_edges(&connection, Some(("source", false)))
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            query_edges(&connection, Some(("target", true)))
                .unwrap()
                .len(),
            1
        );
        drop(connection);
        fs::remove_dir_all(root).unwrap();
    }
}
