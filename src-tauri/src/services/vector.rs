/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */
use super::ai::{allowed_ai_folders, create_embeddings, embedding_model};
use super::notes::AppError;
use blake3::hash;
use hnsw_rs::prelude::{DistCosine, Hnsw};
use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::AppHandle;
use walkdir::WalkDir;

const CHUNK_VERSION: u32 = 1;
const CACHE_FILE: &str = ".constellation/cache/vector/index.json";
const MAX_CHUNK_CHARS: usize = 1_500;
const EMBEDDING_BATCH_SIZE: usize = 32;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VectorChunk {
    pub document_id: String,
    pub path: String,
    pub title: String,
    pub heading: String,
    pub line_start: usize,
    pub text: String,
    pub content_hash: String,
    pub embedding: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VectorCache {
    model: String,
    dimension: usize,
    chunk_version: u32,
    chunks: Vec<VectorChunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VectorIndexStatus {
    pub chunk_count: usize,
    pub document_count: usize,
    pub model: String,
    pub dimension: usize,
    pub chunk_version: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SemanticSearchResult {
    pub document_id: String,
    pub path: String,
    pub title: String,
    pub heading: String,
    pub line_start: usize,
    pub snippet: String,
    pub score: f32,
}

#[derive(Debug)]
struct SourceDocument {
    document_id: String,
    path: String,
    title: String,
    body: String,
}

#[tauri::command]
pub async fn ai_reindex(
    app: AppHandle,
    notes_dir: String,
    allowed_folders: Option<Vec<String>>,
) -> Result<VectorIndexStatus, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    let configured_folders = allowed_ai_folders(&app)?;
    let effective_folders = if configured_folders.is_empty() {
        allowed_folders.unwrap_or_default()
    } else {
        configured_folders
    };
    let source_chunks = collect_chunks(&root, Some(&effective_folders))?;
    let inputs = source_chunks
        .iter()
        .map(|chunk| chunk.text.clone())
        .collect::<Vec<_>>();
    let mut embeddings = Vec::with_capacity(inputs.len());
    for batch in inputs.chunks(EMBEDDING_BATCH_SIZE) {
        embeddings.extend(create_embeddings(&app, batch).await?);
    }
    if embeddings.len() != source_chunks.len() {
        return Err(app_error(
            "embeddingCount",
            "Embedding service returned an unexpected number of vectors",
        ));
    }
    let dimension = embeddings.first().map_or(0, Vec::len);
    if embeddings
        .iter()
        .any(|embedding| embedding.len() != dimension)
    {
        return Err(app_error(
            "embeddingDimension",
            "Embedding service returned inconsistent vector dimensions",
        ));
    }

    let chunks = source_chunks
        .into_iter()
        .zip(embeddings)
        .map(|(mut chunk, embedding)| {
            chunk.embedding = embedding;
            chunk
        })
        .collect::<Vec<_>>();
    let cache = VectorCache {
        model: embedding_model(&app)?,
        dimension,
        chunk_version: CHUNK_VERSION,
        chunks,
    };
    write_cache(&root, &cache)?;
    Ok(cache_status(&cache))
}

#[tauri::command]
pub async fn vector_search(
    app: AppHandle,
    notes_dir: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SemanticSearchResult>, AppError> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }
    let root = normalize_workspace(&notes_dir)?;
    let cache = read_cache(&root)?;
    if cache.chunk_version != CHUNK_VERSION || cache.model != embedding_model(&app)? {
        return Err(app_error(
            "vectorIndexStale",
            "Vector index settings changed; rebuild the index before searching",
        ));
    }
    if cache.chunks.is_empty() {
        return Ok(Vec::new());
    }
    let query_vectors = create_embeddings(&app, &[query]).await?;
    let query_vector = query_vectors.into_iter().next().ok_or_else(|| {
        app_error(
            "emptyEmbedding",
            "Embedding service did not return a query vector",
        )
    })?;
    search_cache(&cache, &query_vector, limit.unwrap_or(12).clamp(1, 100))
}

#[tauri::command]
pub fn vector_status(notes_dir: String) -> Result<VectorIndexStatus, AppError> {
    let root = normalize_workspace(&notes_dir)?;
    Ok(cache_status(&read_cache(&root)?))
}

fn collect_chunks(
    root: &Path,
    allowed_folders: Option<&[String]>,
) -> Result<Vec<VectorChunk>, AppError> {
    let allowed = allowed_folders
        .unwrap_or_default()
        .iter()
        .map(|folder| normalize_filter(folder))
        .filter(|folder| !folder.is_empty())
        .collect::<Vec<_>>();
    let mut chunks = Vec::new();
    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|entry| entry.file_name() != ".constellation")
        .filter_map(Result::ok)
        .filter(|entry| {
            entry.file_type().is_file()
                && entry
                    .path()
                    .extension()
                    .is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
        })
    {
        let relative = entry.path().strip_prefix(root).map_err(io_error)?;
        let relative_path = relative.to_string_lossy().replace('\\', "/");
        if !allowed.is_empty()
            && !allowed.iter().any(|folder| {
                relative_path == *folder || relative_path.starts_with(&format!("{folder}/"))
            })
        {
            continue;
        }
        let source = parse_source_document(entry.path(), &relative_path)?;
        chunks.extend(chunk_document(&source));
    }
    Ok(chunks)
}

fn parse_source_document(path: &Path, relative_path: &str) -> Result<SourceDocument, AppError> {
    let content = fs::read_to_string(path).map_err(io_error)?;
    let (frontmatter, body) = split_frontmatter(&content)?;
    let file_stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Untitled");
    let title = first_heading(body).unwrap_or_else(|| file_stem.to_string());
    let document_id = frontmatter_string(&frontmatter, "constellation_id")
        .unwrap_or_else(|| format!("path:{}", hash(relative_path.as_bytes()).to_hex()));
    Ok(SourceDocument {
        document_id,
        path: relative_path.to_string(),
        title,
        body: body.to_string(),
    })
}

fn chunk_document(document: &SourceDocument) -> Vec<VectorChunk> {
    let mut chunks = Vec::new();
    let mut heading = document.title.clone();
    let mut paragraph = Vec::<String>::new();
    let mut paragraph_line = 1usize;

    let flush = |chunks: &mut Vec<VectorChunk>,
                 paragraph: &mut Vec<String>,
                 heading: &str,
                 line_start: usize| {
        let text = paragraph.join("\n").trim().to_string();
        paragraph.clear();
        if text.is_empty() {
            return;
        }
        for piece in split_long_text(&text, MAX_CHUNK_CHARS) {
            chunks.push(VectorChunk {
                document_id: document.document_id.clone(),
                path: document.path.clone(),
                title: document.title.clone(),
                heading: heading.to_string(),
                line_start,
                content_hash: hash(piece.as_bytes()).to_hex().to_string(),
                text: piece,
                embedding: Vec::new(),
            });
        }
    };

    for (index, line) in document.body.lines().enumerate() {
        let line_number = index + 1;
        if let Some(next_heading) = markdown_heading(line) {
            flush(&mut chunks, &mut paragraph, &heading, paragraph_line);
            heading = next_heading;
            paragraph_line = line_number + 1;
        } else if line.trim().is_empty() {
            flush(&mut chunks, &mut paragraph, &heading, paragraph_line);
            paragraph_line = line_number + 1;
        } else {
            if paragraph.is_empty() {
                paragraph_line = line_number;
            }
            paragraph.push(line.to_string());
        }
    }
    flush(&mut chunks, &mut paragraph, &heading, paragraph_line);
    chunks
}

fn search_cache(
    cache: &VectorCache,
    query: &[f32],
    limit: usize,
) -> Result<Vec<SemanticSearchResult>, AppError> {
    if query.len() != cache.dimension {
        return Err(app_error(
            "vectorIndexStale",
            "Query vector dimension differs from the stored vector index",
        ));
    }
    let max_elements = cache.chunks.len().max(1);
    let hnsw = Hnsw::<f32, DistCosine>::new(16, max_elements, 16, 200, DistCosine {});
    for (index, chunk) in cache.chunks.iter().enumerate() {
        hnsw.insert((&chunk.embedding, index));
    }
    Ok(hnsw
        .search(query, limit.min(cache.chunks.len()), 64)
        .into_iter()
        .filter_map(|neighbor| {
            cache
                .chunks
                .get(neighbor.d_id)
                .map(|chunk| SemanticSearchResult {
                    document_id: chunk.document_id.clone(),
                    path: chunk.path.clone(),
                    title: chunk.title.clone(),
                    heading: chunk.heading.clone(),
                    line_start: chunk.line_start,
                    snippet: chunk.text.clone(),
                    score: (1.0 - neighbor.distance).clamp(-1.0, 1.0),
                })
        })
        .collect())
}

fn read_cache(root: &Path) -> Result<VectorCache, AppError> {
    let path = root.join(CACHE_FILE);
    if !path.is_file() {
        return Err(app_error(
            "vectorIndexMissing",
            "Vector index does not exist; build it before searching",
        ));
    }
    serde_json::from_slice(&fs::read(path).map_err(io_error)?).map_err(json_error)
}

fn write_cache(root: &Path, cache: &VectorCache) -> Result<(), AppError> {
    let path = root.join(CACHE_FILE);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(io_error)?;
    }
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, serde_json::to_vec(cache).map_err(json_error)?).map_err(io_error)?;
    fs::rename(temporary, path).map_err(io_error)
}

fn cache_status(cache: &VectorCache) -> VectorIndexStatus {
    let document_count = cache
        .chunks
        .iter()
        .map(|chunk| &chunk.document_id)
        .collect::<std::collections::HashSet<_>>()
        .len();
    VectorIndexStatus {
        chunk_count: cache.chunks.len(),
        document_count,
        model: cache.model.clone(),
        dimension: cache.dimension,
        chunk_version: cache.chunk_version,
    }
}

fn split_frontmatter(content: &str) -> Result<(Mapping, &str), AppError> {
    if let Some(rest) = content.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---\n") {
            let mapping = serde_yaml::from_str::<Mapping>(&rest[..end]).map_err(yaml_error)?;
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

fn first_heading(body: &str) -> Option<String> {
    body.lines().find_map(markdown_heading)
}

fn markdown_heading(line: &str) -> Option<String> {
    let trimmed = line.trim_start();
    let marker_len = trimmed.chars().take_while(|value| *value == '#').count();
    if !(1..=6).contains(&marker_len) {
        return None;
    }
    trimmed[marker_len..]
        .strip_prefix(' ')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from)
}

fn split_long_text(text: &str, max_chars: usize) -> Vec<String> {
    if text.chars().count() <= max_chars {
        return vec![text.to_string()];
    }
    let mut pieces = Vec::new();
    let mut current = String::new();
    for value in text.chars() {
        current.push(value);
        if current.chars().count() >= max_chars {
            pieces.push(std::mem::take(&mut current));
        }
    }
    if !current.is_empty() {
        pieces.push(current);
    }
    pieces
}

fn normalize_workspace(value: &str) -> Result<PathBuf, AppError> {
    let path = PathBuf::from(value);
    if !path.is_absolute()
        || path
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::CurDir))
    {
        return Err(app_error("invalidWorkspace", "Workspace path is invalid"));
    }
    fs::canonicalize(path).map_err(io_error)
}

fn normalize_filter(value: &str) -> String {
    value
        .replace('\\', "/")
        .trim_matches('/')
        .split('/')
        .filter(|part| !part.is_empty() && *part != "." && *part != "..")
        .collect::<Vec<_>>()
        .join("/")
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

fn json_error(error: serde_json::Error) -> AppError {
    app_error("json", error.to_string())
}

fn yaml_error(error: serde_yaml::Error) -> AppError {
    app_error("frontmatter", error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn source(body: &str) -> SourceDocument {
        SourceDocument {
            document_id: "doc-1".into(),
            path: "ideas/note.md".into(),
            title: "Note".into(),
            body: body.into(),
        }
    }

    #[test]
    fn chunks_markdown_by_heading_and_preserves_line_numbers() {
        let chunks = chunk_document(&source("# First\nAlpha\n\nBeta\n## Second\nGamma\nDelta"));
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].heading, "First");
        assert_eq!(chunks[0].line_start, 2);
        assert_eq!(chunks[1].line_start, 4);
        assert_eq!(chunks[2].heading, "Second");
        assert_eq!(chunks[2].line_start, 6);
    }

    #[test]
    fn hnsw_results_map_back_to_source_chunks() {
        let cache = VectorCache {
            model: "test".into(),
            dimension: 2,
            chunk_version: CHUNK_VERSION,
            chunks: vec![
                VectorChunk {
                    document_id: "near".into(),
                    path: "near.md".into(),
                    title: "Near".into(),
                    heading: "Near".into(),
                    line_start: 1,
                    text: "near".into(),
                    content_hash: "a".into(),
                    embedding: vec![1.0, 0.0],
                },
                VectorChunk {
                    document_id: "far".into(),
                    path: "far.md".into(),
                    title: "Far".into(),
                    heading: "Far".into(),
                    line_start: 1,
                    text: "far".into(),
                    content_hash: "b".into(),
                    embedding: vec![0.0, 1.0],
                },
            ],
        };
        let results = search_cache(&cache, &[0.9, 0.1], 1).unwrap();
        assert_eq!(results[0].document_id, "near");
    }

    #[test]
    fn normalizes_folder_filters_without_parent_segments() {
        assert_eq!(normalize_filter(r"\ideas\..\private"), "ideas/private");
    }
}
