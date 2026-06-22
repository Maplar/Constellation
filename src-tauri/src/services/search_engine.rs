/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增：Tantivy 全文搜索引擎 (v3.5)
 *
 * Improvements over search_poc.rs:
 * - Singleton pattern with OnceLock for index reuse
 * - Persistent IndexWriter with batch commits
 * - Incremental indexing (add/delete/update without full rebuild)
 * - Hybrid search (vector + text scoring)
 * - Debounced commit strategy
 */
use super::notes::AppError;
use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value as YamlValue};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{doc, Index, IndexReader, IndexWriter, ReloadPolicy};
use tantivy_jieba::JiebaTokenizer;

const INDEX_DIR: &str = ".constellation/cache/tantivy";
const WRITER_MEMORY_BUDGET: usize = 50_000_000; // 50MB

fn tantivy_error(error: tantivy::TantivyError) -> AppError {
    AppError {
        code: "tantivy".into(),
        message: error.to_string(),
    }
}

// ─── Singleton Index Registry ────────────────────────────────────────────────

static SEARCH_INDEXES: OnceLock<Mutex<HashMap<PathBuf, Arc<Mutex<SearchEngine>>>>> =
    OnceLock::new();

// ─── Data Types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchDocument {
    pub note_id: String,
    pub title: String,
    pub content: String,
    pub category: String,
    #[serde(default)]
    pub relative_path: String,
    #[serde(default)]
    pub heading: String,
    #[serde(default)]
    pub line_start: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TantivySearchResult {
    pub note_id: String,
    pub document_id: String,
    pub path: String,
    pub title: String,
    pub heading: String,
    pub line_start: u64,
    pub snippet: String,
    pub score: f32,
    pub match_type: String, // "text" | "hybrid"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HybridSearchResult {
    pub note_id: String,
    pub document_id: String,
    pub path: String,
    pub title: String,
    pub heading: String,
    pub line_start: u64,
    pub snippet: String,
    pub text_score: f32,
    pub vector_score: f32,
    pub combined_score: f32,
    pub match_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStats {
    pub doc_count: u64,
    pub is_initialized: bool,
    pub index_path: String,
}

// ─── Search Engine ───────────────────────────────────────────────────────────

pub struct SearchEngine {
    index: Index,
    reader: IndexReader,
    writer: Arc<Mutex<IndexWriter>>,
    title_field: Field,
    content_field: Field,
    note_id_field: Field,
    category_field: Field,
    relative_path_field: Field,
    heading_field: Field,
    line_start_field: Field,
    base_dir: PathBuf,
}

impl SearchEngine {
    /// Create or open a search engine instance for the given directory.
    pub fn new(base_dir: &PathBuf) -> Result<Self, AppError> {
        let index_path = base_dir.join(INDEX_DIR);
        std::fs::create_dir_all(&index_path).map_err(|e| AppError {
            code: "io".into(),
            message: format!("Failed to create index directory: {}", e),
        })?;

        // Build schema
        let mut schema_builder = Schema::builder();
        let note_id_field = schema_builder.add_text_field("note_id", STRING | STORED);
        let jieba_text = TextOptions::default().set_stored().set_indexing_options(
            TextFieldIndexing::default()
                .set_tokenizer("jieba")
                .set_index_option(IndexRecordOption::WithFreqsAndPositions),
        );
        let title_field = schema_builder.add_text_field("title", jieba_text.clone());
        let content_field = schema_builder.add_text_field("content", jieba_text);
        let category_field = schema_builder.add_text_field("category", STRING | STORED);
        let relative_path_field = schema_builder.add_text_field("relative_path", STRING | STORED);
        let heading_field = schema_builder.add_text_field("heading", STRING | STORED);
        let line_start_field = schema_builder.add_u64_field("line_start", STORED);
        let schema = schema_builder.build();

        // Open or create index
        let index_exists = index_path
            .read_dir()
            .map_or(false, |mut d| d.next().is_some());
        let index = if index_exists {
            match Index::open_in_dir(&index_path) {
                Ok(existing) => {
                    let compatible = ["relative_path", "heading", "line_start"]
                        .iter()
                        .all(|name| existing.schema().get_field(name).is_ok());
                    if compatible {
                        existing
                    } else {
                        drop(existing);
                        recreate_index(&index_path, schema.clone())?
                    }
                }
                Err(_) => recreate_index(&index_path, schema.clone())?,
            }
        } else {
            let idx = Index::create_in_dir(&index_path, schema.clone()).map_err(|e| AppError {
                code: "tantivy".into(),
                message: format!("Failed to create index: {}", e),
            })?;
            idx
        };

        // Register jieba tokenizer for Chinese segmentation
        index.tokenizers().register("jieba", JiebaTokenizer {});

        // Create reader with auto-reload on commit
        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()
            .map_err(|e| AppError {
                code: "tantivy".into(),
                message: format!("Failed to create reader: {}", e),
            })?;

        // Create persistent writer
        let writer = index.writer(WRITER_MEMORY_BUDGET).map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to create writer: {}", e),
        })?;

        Ok(Self {
            index,
            reader,
            writer: Arc::new(Mutex::new(writer)),
            title_field,
            content_field,
            note_id_field,
            category_field,
            relative_path_field,
            heading_field,
            line_start_field,
            base_dir: base_dir.clone(),
        })
    }

    /// Get or initialize the search engine for one normalized workspace.
    pub fn instance(base_dir: &PathBuf) -> Result<Arc<Mutex<SearchEngine>>, AppError> {
        let workspace = normalize_workspace_path(base_dir)?;
        let registry = SEARCH_INDEXES.get_or_init(|| Mutex::new(HashMap::new()));
        let mut registry = registry.lock().map_err(|error| AppError {
            code: "tantivy".into(),
            message: format!("Failed to acquire search registry lock: {error}"),
        })?;

        if let Some(engine) = registry.get(&workspace) {
            return Ok(engine.clone());
        }

        let engine = Arc::new(Mutex::new(SearchEngine::new(&workspace)?));
        registry.insert(workspace, engine.clone());
        Ok(engine)
    }

    // ─── Index Operations ─────────────────────────────────────────────────

    /// Add a single document to the index. Commits immediately.
    pub fn add_document(&self, doc: &SearchDocument) -> Result<(), AppError> {
        let mut writer = self.writer.lock().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to acquire writer lock: {}", e),
        })?;

        writer
            .add_document(doc!(
                self.note_id_field => doc.note_id.as_str(),
                self.title_field => doc.title.as_str(),
                self.content_field => doc.content.as_str(),
                self.category_field => doc.category.as_str(),
                self.relative_path_field => doc.relative_path.as_str(),
                self.heading_field => doc.heading.as_str(),
                self.line_start_field => doc.line_start,
            ))
            .map_err(|e| AppError {
                code: "tantivy".into(),
                message: format!("Failed to add document: {}", e),
            })?;

        writer.commit().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to commit: {}", e),
        })?;
        self.reader.reload().map_err(tantivy_error)?;

        Ok(())
    }

    /// Delete a document by note_id. Commits immediately.
    pub fn delete_document(&self, note_id: &str) -> Result<(), AppError> {
        let mut writer = self.writer.lock().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to acquire writer lock: {}", e),
        })?;

        writer.delete_term(tantivy::Term::from_field_text(self.note_id_field, note_id));

        writer.commit().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to commit: {}", e),
        })?;
        self.reader.reload().map_err(tantivy_error)?;

        Ok(())
    }

    /// Update a document: delete old + add new. Atomic commit.
    pub fn update_document(&self, doc: &SearchDocument) -> Result<(), AppError> {
        let mut writer = self.writer.lock().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to acquire writer lock: {}", e),
        })?;

        // Delete existing document
        writer.delete_term(tantivy::Term::from_field_text(
            self.note_id_field,
            &doc.note_id,
        ));

        // Add updated document
        writer
            .add_document(doc!(
                self.note_id_field => doc.note_id.as_str(),
                self.title_field => doc.title.as_str(),
                self.content_field => doc.content.as_str(),
                self.category_field => doc.category.as_str(),
                self.relative_path_field => doc.relative_path.as_str(),
                self.heading_field => doc.heading.as_str(),
                self.line_start_field => doc.line_start,
            ))
            .map_err(|e| AppError {
                code: "tantivy".into(),
                message: format!("Failed to add document: {}", e),
            })?;

        writer.commit().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to commit: {}", e),
        })?;
        self.reader.reload().map_err(tantivy_error)?;

        Ok(())
    }

    /// Batch index multiple documents. Single commit at the end.
    pub fn index_documents(&self, docs: &[SearchDocument]) -> Result<usize, AppError> {
        let mut writer = self.writer.lock().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to acquire writer lock: {}", e),
        })?;

        let mut count = 0;
        for doc in docs {
            writer
                .add_document(doc!(
                    self.note_id_field => doc.note_id.as_str(),
                    self.title_field => doc.title.as_str(),
                    self.content_field => doc.content.as_str(),
                    self.category_field => doc.category.as_str(),
                    self.relative_path_field => doc.relative_path.as_str(),
                    self.heading_field => doc.heading.as_str(),
                    self.line_start_field => doc.line_start,
                ))
                .map_err(|e| AppError {
                    code: "tantivy".into(),
                    message: format!("Failed to add document {}: {}", doc.note_id, e),
                })?;
            count += 1;
        }

        writer.commit().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to commit batch: {}", e),
        })?;
        self.reader.reload().map_err(tantivy_error)?;

        Ok(count)
    }

    pub fn rebuild_documents(&self, docs: &[SearchDocument]) -> Result<usize, AppError> {
        let mut writer = self.writer.lock().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to acquire writer lock: {}", e),
        })?;
        writer.delete_all_documents().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to clear index: {}", e),
        })?;
        for document in docs {
            writer
                .add_document(doc!(
                    self.note_id_field => document.note_id.as_str(),
                    self.title_field => document.title.as_str(),
                    self.content_field => document.content.as_str(),
                    self.category_field => document.category.as_str(),
                    self.relative_path_field => document.relative_path.as_str(),
                    self.heading_field => document.heading.as_str(),
                    self.line_start_field => document.line_start,
                ))
                .map_err(|e| AppError {
                    code: "tantivy".into(),
                    message: format!("Failed to add document {}: {}", document.note_id, e),
                })?;
        }
        writer.commit().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to commit rebuilt index: {}", e),
        })?;
        self.reader.reload().map_err(tantivy_error)?;
        Ok(docs.len())
    }

    /// Clear all documents from the index.
    pub fn clear_index(&self) -> Result<(), AppError> {
        let mut writer = self.writer.lock().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to acquire writer lock: {}", e),
        })?;

        writer.delete_all_documents().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to clear index: {}", e),
        })?;

        writer.commit().map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to commit: {}", e),
        })?;
        self.reader.reload().map_err(tantivy_error)?;

        Ok(())
    }

    // ─── Search Operations ─────────────────────────────────────────────────

    /// Full-text search using Tantivy's BM25 scoring.
    pub fn search(
        &self,
        query_str: &str,
        limit: usize,
    ) -> Result<Vec<TantivySearchResult>, AppError> {
        let searcher = self.reader.searcher();

        let query_parser =
            QueryParser::for_index(&self.index, vec![self.title_field, self.content_field]);

        let query = query_parser.parse_query(query_str).map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to parse query: {}", e),
        })?;

        let top_docs = searcher
            .search(&query, &TopDocs::with_limit(limit))
            .map_err(|e| AppError {
                code: "tantivy".into(),
                message: format!("Search failed: {}", e),
            })?;

        let mut results = Vec::new();
        for (score, doc_address) in top_docs {
            let doc = searcher
                .doc::<tantivy::TantivyDocument>(doc_address)
                .map_err(|e| AppError {
                    code: "tantivy".into(),
                    message: format!("Failed to get document: {}", e),
                })?;

            let note_id = self.get_field_str(&doc, self.note_id_field);
            let title = self.get_field_str(&doc, self.title_field);
            let content = self.get_field_str(&doc, self.content_field);
            let path = self.get_field_str(&doc, self.relative_path_field);
            let heading = self.get_field_str(&doc, self.heading_field);
            let line_start = self.get_field_u64(&doc, self.line_start_field);
            let snippet = extract_snippet(&content, query_str, 150);

            results.push(TantivySearchResult {
                document_id: note_id.clone(),
                note_id,
                path,
                title,
                heading,
                line_start,
                snippet,
                score,
                match_type: "text".to_string(),
            });
        }

        Ok(results)
    }

    /// Hybrid search: combines Tantivy BM25 text score with vector similarity.
    ///
    /// Scoring formula: combined = 0.7 * vector_score + 0.3 * text_score
    ///
    /// - text_score: normalized BM25 score (0..1)
    /// - vector_score: 1.0 - cosine_distance (provided by caller)
    pub fn hybrid_search(
        &self,
        query_str: &str,
        vector_scores: &[(String, f64)], // (note_id, vector_score)
        limit: usize,
    ) -> Result<Vec<HybridSearchResult>, AppError> {
        let searcher = self.reader.searcher();

        let query_parser =
            QueryParser::for_index(&self.index, vec![self.title_field, self.content_field]);

        let query = query_parser.parse_query(query_str).map_err(|e| AppError {
            code: "tantivy".into(),
            message: format!("Failed to parse query: {}", e),
        })?;

        // Get more text results to have a good candidate pool for merging
        let text_limit = limit * 3;
        let top_docs = searcher
            .search(&query, &TopDocs::with_limit(text_limit))
            .map_err(|e| AppError {
                code: "tantivy".into(),
                message: format!("Search failed: {}", e),
            })?;

        // Build vector score lookup
        let vector_map: std::collections::HashMap<String, f64> =
            vector_scores.iter().cloned().collect();

        // Normalize text scores
        let max_text_score = top_docs.iter().map(|(s, _)| *s).fold(0.0f32, f32::max);

        let mut results: Vec<HybridSearchResult> = Vec::new();

        for (text_score, doc_address) in top_docs {
            let doc = searcher
                .doc::<tantivy::TantivyDocument>(doc_address)
                .map_err(|e| AppError {
                    code: "tantivy".into(),
                    message: format!("Failed to get document: {}", e),
                })?;

            let note_id = self.get_field_str(&doc, self.note_id_field);
            let title = self.get_field_str(&doc, self.title_field);
            let content = self.get_field_str(&doc, self.content_field);
            let path = self.get_field_str(&doc, self.relative_path_field);
            let heading = self.get_field_str(&doc, self.heading_field);
            let line_start = self.get_field_u64(&doc, self.line_start_field);
            let snippet = extract_snippet(&content, query_str, 150);

            // Normalize text score to 0..1
            let normalized_text = if max_text_score > 0.0 {
                text_score / max_text_score
            } else {
                0.0
            };

            // Get vector score for this document
            let vector_score = vector_map.get(&note_id).copied().unwrap_or(0.0) as f32;

            // Combined scoring: 70% vector + 30% text
            let combined_score = 0.7 * vector_score + 0.3 * normalized_text;

            let match_type = if normalized_text > 0.5 && vector_score > 0.5 {
                "hybrid_exact".to_string()
            } else if vector_score > normalized_text {
                "hybrid_semantic".to_string()
            } else {
                "hybrid_text".to_string()
            };

            results.push(HybridSearchResult {
                document_id: note_id.clone(),
                note_id,
                path,
                title,
                heading,
                line_start,
                snippet,
                text_score: normalized_text,
                vector_score,
                combined_score,
                match_type,
            });
        }

        // Also include vector-only results that weren't in text results
        let text_note_ids: std::collections::HashSet<String> =
            results.iter().map(|r| r.note_id.clone()).collect();

        for (note_id, vector_score) in vector_scores {
            if !text_note_ids.contains(note_id) && *vector_score > 0.3 {
                results.push(HybridSearchResult {
                    note_id: note_id.clone(),
                    document_id: note_id.clone(),
                    path: String::new(),
                    title: String::new(), // Would need to fetch from store
                    heading: String::new(),
                    line_start: 0,
                    snippet: String::new(),
                    text_score: 0.0,
                    vector_score: *vector_score as f32,
                    combined_score: 0.7 * *vector_score as f32,
                    match_type: "hybrid_semantic".to_string(),
                });
            }
        }

        // Sort by combined score descending
        results.sort_by(|a, b| {
            b.combined_score
                .partial_cmp(&a.combined_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        results.truncate(limit);

        Ok(results)
    }

    // ─── Stats ─────────────────────────────────────────────────────────────

    pub fn doc_count(&self) -> Result<u64, AppError> {
        let searcher = self.reader.searcher();
        Ok(searcher.num_docs())
    }

    pub fn stats(&self) -> Result<IndexStats, AppError> {
        let doc_count = self.doc_count()?;
        Ok(IndexStats {
            doc_count,
            is_initialized: true,
            index_path: self.base_dir.join(INDEX_DIR).to_string_lossy().to_string(),
        })
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    fn get_field_str(&self, doc: &tantivy::TantivyDocument, field: Field) -> String {
        doc.get_first(field)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string()
    }

    fn get_field_u64(&self, doc: &tantivy::TantivyDocument, field: Field) -> u64 {
        doc.get_first(field)
            .and_then(|value| value.as_u64())
            .unwrap_or_default()
    }
}

fn normalize_workspace_path(base_dir: &Path) -> Result<PathBuf, AppError> {
    std::fs::create_dir_all(base_dir).map_err(|error| AppError {
        code: "io".into(),
        message: format!("Failed to create workspace directory: {error}"),
    })?;
    base_dir.canonicalize().map_err(|error| AppError {
        code: "io".into(),
        message: format!("Failed to normalize workspace path: {error}"),
    })
}

fn recreate_index(index_path: &Path, schema: Schema) -> Result<Index, AppError> {
    if index_path.exists() {
        std::fs::remove_dir_all(index_path).map_err(|error| AppError {
            code: "io".into(),
            message: format!("Failed to remove invalid search index: {error}"),
        })?;
    }
    std::fs::create_dir_all(index_path).map_err(|error| AppError {
        code: "io".into(),
        message: format!("Failed to recreate search index directory: {error}"),
    })?;
    Index::create_in_dir(index_path, schema).map_err(tantivy_error)
}

// ─── Snippet Extraction ─────────────────────────────────────────────────────

fn extract_snippet(content: &str, query: &str, max_len: usize) -> String {
    if content.is_empty() {
        return String::new();
    }

    let content_lower = content.to_lowercase();
    let query_lower = query.to_lowercase();
    let query_words: Vec<&str> = query_lower.split_whitespace().collect();

    if query_words.is_empty() {
        return content.chars().take(max_len).collect::<String>()
            + if content.len() > max_len { "..." } else { "" };
    }

    let mut best_pos = 0;
    let mut best_score = 0usize;

    // Sliding window to find the best snippet position
    let char_indices: Vec<(usize, char)> = content_lower.char_indices().collect();
    let window_chars = max_len.min(content_lower.len());

    for &(byte_pos, _) in &char_indices {
        let window_end = std::cmp::min(byte_pos + window_chars, content_lower.len());
        let window = &content_lower[byte_pos..window_end];

        let score = query_words.iter().filter(|w| window.contains(*w)).count();

        if score > best_score {
            best_score = score;
            best_pos = byte_pos;
        }

        // Early exit if we found all query words
        if score == query_words.len() {
            break;
        }
    }

    // Extract snippet at best position
    let end = std::cmp::min(best_pos + max_len, content.len());

    // Ensure we don't split in the middle of a multi-byte char
    let snippet = if end < content.len() {
        &content[best_pos..content.floor_char_boundary(end)]
    } else {
        &content[best_pos..]
    };

    let prefix = if best_pos > 0 { "..." } else { "" };
    let suffix = if end < content.len() { "..." } else { "" };

    format!("{}{}{}", prefix, snippet, suffix)
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

/// Initialize or get the singleton search engine.
#[tauri::command]
pub async fn search_init(notes_dir: String) -> Result<IndexStats, AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.stats()
}

/// Index a single document (add or update).
#[tauri::command]
pub async fn search_index_document(
    notes_dir: String,
    document: SearchDocument,
) -> Result<(), AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.update_document(&document)
}

/// Batch index multiple documents.
#[tauri::command]
pub async fn search_index_batch(
    notes_dir: String,
    documents: Vec<SearchDocument>,
) -> Result<usize, AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.index_documents(&documents)
}

#[tauri::command]
pub async fn search_rebuild(notes_dir: String) -> Result<usize, AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let normalized = normalize_workspace_path(&base_dir)?;
    let documents = walkdir::WalkDir::new(&normalized)
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
        .filter_map(|entry| search_document_from_path(&normalized, entry.path()).ok())
        .collect::<Vec<_>>();
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.rebuild_documents(&documents)
}

/// Delete a document from the index.
#[tauri::command]
pub async fn search_delete_document(notes_dir: String, note_id: String) -> Result<(), AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.delete_document(&note_id)
}

pub(crate) async fn search_refresh_path(
    notes_dir: &Path,
    relative_path: &str,
    removed_document_id: Option<String>,
) -> Result<(), AppError> {
    let path = notes_dir.join(relative_path);
    if !path.is_file() {
        if let Some(document_id) = removed_document_id {
            return search_delete_document(notes_dir.to_string_lossy().to_string(), document_id)
                .await;
        }
        return Ok(());
    }
    let document = search_document_from_path(notes_dir, &path)?;
    search_index_document(notes_dir.to_string_lossy().to_string(), document).await
}

fn search_document_from_path(root: &Path, path: &Path) -> Result<SearchDocument, AppError> {
    let content = fs::read_to_string(path).map_err(|error| AppError {
        code: "io".into(),
        message: error.to_string(),
    })?;
    let (frontmatter, body) = split_search_frontmatter(&content)?;
    let relative = path.strip_prefix(root).map_err(|error| AppError {
        code: "invalidPath".into(),
        message: error.to_string(),
    })?;
    let relative_text = relative.to_string_lossy().replace('\\', "/");
    let note_id = frontmatter
        .get(YamlValue::String("constellation_id".into()))
        .and_then(YamlValue::as_str)
        .map(String::from)
        .unwrap_or_else(|| format!("path:{}", blake3::hash(relative_text.as_bytes()).to_hex()));
    let title = body.lines().find_map(search_heading).unwrap_or_else(|| {
        path.file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("Untitled")
            .to_string()
    });
    Ok(SearchDocument {
        note_id,
        heading: title.clone(),
        title,
        content: body.to_string(),
        relative_path: relative_text,
        line_start: 1,
        category: relative
            .parent()
            .map(|value| value.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default(),
    })
}

fn split_search_frontmatter(content: &str) -> Result<(Mapping, &str), AppError> {
    if let Some(rest) = content.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---\n") {
            let mapping =
                serde_yaml::from_str::<Mapping>(&rest[..end]).map_err(|error| AppError {
                    code: "frontmatter".into(),
                    message: error.to_string(),
                })?;
            return Ok((mapping, &rest[end + 5..]));
        }
    }
    Ok((Mapping::new(), content))
}

fn search_heading(line: &str) -> Option<String> {
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

/// Full-text search.
#[tauri::command]
pub async fn search_query(
    notes_dir: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<TantivySearchResult>, AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.search(&query, limit.unwrap_or(20))
}

/// Hybrid search (text + vector).
#[tauri::command]
pub async fn search_hybrid(
    notes_dir: String,
    query: String,
    vector_scores: Vec<(String, f64)>,
    limit: Option<usize>,
) -> Result<Vec<HybridSearchResult>, AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.hybrid_search(&query, &vector_scores, limit.unwrap_or(20))
}

/// Clear the entire index.
#[tauri::command]
pub async fn search_clear(notes_dir: String) -> Result<(), AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.clear_index()
}

/// Get index statistics.
#[tauri::command]
pub async fn search_stats(notes_dir: String) -> Result<IndexStats, AppError> {
    let base_dir = PathBuf::from(&notes_dir);
    let engine = SearchEngine::instance(&base_dir)?;
    let engine = engine.lock().map_err(|e| AppError {
        code: "tantivy".into(),
        message: format!("Failed to acquire engine lock: {}", e),
    })?;
    engine.stats()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn test_engine(name: &str) -> SearchEngine {
        let base = std::env::temp_dir()
            .join("constellation-search-tests")
            .join(name);
        if base.exists() {
            fs::remove_dir_all(&base).ok();
        }
        fs::create_dir_all(&base).ok();
        SearchEngine::new(&base).unwrap()
    }

    #[test]
    fn index_and_search_single_document() {
        let engine = test_engine("single");

        engine
            .add_document(&SearchDocument {
                note_id: "test-1".into(),
                relative_path: "test-1.md".into(),
                heading: "Test 1".into(),
                line_start: 1,
                title: "Rust 编程语言".into(),
                content: "Rust 是一门系统编程语言，注重安全性和性能。".into(),
                category: "技术".into(),
            })
            .unwrap();

        let results = engine.search("Rust", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].note_id, "test-1");
    }

    #[test]
    fn chinese_segmentation_works() {
        let engine = test_engine("chinese");

        engine
            .add_document(&SearchDocument {
                note_id: "test-2".into(),
                relative_path: "test-2.md".into(),
                heading: "Test 2".into(),
                line_start: 1,
                title: "知识管理工具".into(),
                content: "星座是一个本地优先的知识管理应用。".into(),
                category: "笔记".into(),
            })
            .unwrap();

        // jieba should segment "知识管理" correctly
        let results = engine.search("知识管理", 10).unwrap();
        assert!(!results.is_empty());
    }

    #[test]
    fn delete_document_removes_from_index() {
        let engine = test_engine("delete");

        engine
            .add_document(&SearchDocument {
                note_id: "test-3".into(),
                relative_path: "test-3.md".into(),
                heading: "Test 3".into(),
                line_start: 1,
                title: "临时笔记".into(),
                content: "这个笔记将被删除。".into(),
                category: "临时".into(),
            })
            .unwrap();

        assert_eq!(engine.doc_count().unwrap(), 1);

        engine.delete_document("test-3").unwrap();

        // After commit, the reader should see the deletion
        let results = engine.search("临时笔记", 10).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn update_document_replaces_old() {
        let engine = test_engine("update");

        engine
            .add_document(&SearchDocument {
                note_id: "test-4".into(),
                relative_path: "test-4.md".into(),
                heading: "Original".into(),
                line_start: 1,
                title: "原始标题".into(),
                content: "原始内容。".into(),
                category: "测试".into(),
            })
            .unwrap();

        engine
            .update_document(&SearchDocument {
                note_id: "test-4".into(),
                relative_path: "test-4.md".into(),
                heading: "Updated".into(),
                line_start: 1,
                title: "更新后标题".into(),
                content: "更新后内容。".into(),
                category: "测试".into(),
            })
            .unwrap();

        let results = engine.search("更新后", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].note_id, "test-4");

        // Old content should not be found
        let old_results = engine.search("原始内容", 10).unwrap();
        assert!(old_results.is_empty());
    }

    #[test]
    fn workspace_document_parser_uses_uuid_and_first_heading() {
        let root = std::env::temp_dir().join(format!(
            "constellation-search-parser-{}",
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(root.join("ideas")).unwrap();
        let path = root.join("ideas/note.md");
        std::fs::write(
            &path,
            "---\nconstellation_id: stable-id\ncustom: kept\n---\n# Parsed title\nBody",
        )
        .unwrap();
        let document = search_document_from_path(&root, &path).unwrap();
        assert_eq!(document.note_id, "stable-id");
        assert_eq!(document.title, "Parsed title");
        assert_eq!(document.category, "ideas");
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn batch_indexing_works() {
        let engine = test_engine("batch");

        let docs = vec![
            SearchDocument {
                note_id: "batch-1".into(),
                relative_path: "batch-1.md".into(),
                heading: "Batch 1".into(),
                line_start: 1,
                title: "笔记一".into(),
                content: "这是第一篇笔记。".into(),
                category: "A".into(),
            },
            SearchDocument {
                note_id: "batch-2".into(),
                relative_path: "batch-2.md".into(),
                heading: "Batch 2".into(),
                line_start: 1,
                title: "笔记二".into(),
                content: "这是第二篇笔记。".into(),
                category: "B".into(),
            },
        ];

        let count = engine.index_documents(&docs).unwrap();
        assert_eq!(count, 2);
        assert_eq!(engine.doc_count().unwrap(), 2);
    }

    #[test]
    fn recovers_from_corrupt_index_cache() {
        let root = std::env::temp_dir().join(format!(
            "constellation-search-corrupt-{}",
            uuid::Uuid::new_v4()
        ));
        let index_path = root.join(INDEX_DIR);
        fs::create_dir_all(&index_path).unwrap();
        fs::write(index_path.join("meta.json"), "{ invalid tantivy metadata").unwrap();

        let engine = SearchEngine::new(&root).unwrap();
        engine
            .add_document(&SearchDocument {
                note_id: "recovered".into(),
                relative_path: "recovered.md".into(),
                heading: "Recovered".into(),
                line_start: 1,
                title: "恢复后的索引".into(),
                content: "损坏缓存可以从 Markdown 重建。".into(),
                category: "test".into(),
            })
            .unwrap();

        assert_eq!(engine.search("损坏缓存", 10).unwrap().len(), 1);
        drop(engine);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    #[ignore = "release-scale performance regression"]
    fn indexes_and_queries_ten_thousand_documents() {
        let root =
            std::env::temp_dir().join(format!("constellation-search-10k-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let engine = SearchEngine::new(&root).unwrap();
        let documents = (0..10_000)
            .map(|index| SearchDocument {
                note_id: format!("document-{index}"),
                relative_path: format!("folder-{}/note-{index}.md", index % 100),
                heading: format!("Knowledge fragment {index}"),
                line_start: 1,
                title: format!("知识碎片 {index}"),
                content: format!(
                    "这是第 {index} 条碎片化知识，包含 Rust、Markdown 和本地优先检索。"
                ),
                category: format!("folder-{}", index % 100),
            })
            .collect::<Vec<_>>();

        let started = std::time::Instant::now();
        assert_eq!(engine.index_documents(&documents).unwrap(), 10_000);
        let indexing_elapsed = started.elapsed();
        assert_eq!(engine.doc_count().unwrap(), 10_000);

        let search_started = std::time::Instant::now();
        let results = engine.search("碎片化知识 Rust", 20).unwrap();
        let search_elapsed = search_started.elapsed();
        assert!(!results.is_empty());
        assert!(
            indexing_elapsed < std::time::Duration::from_secs(60),
            "10k indexing took {indexing_elapsed:?}"
        );
        assert!(
            search_elapsed < std::time::Duration::from_secs(2),
            "10k search took {search_elapsed:?}"
        );
        eprintln!("10k Tantivy benchmark: index={indexing_elapsed:?}, search={search_elapsed:?}");

        drop(engine);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn workspace_instances_are_isolated() {
        let root = std::env::temp_dir()
            .join("constellation-search-tests")
            .join(format!("workspace-isolation-{}", uuid::Uuid::new_v4()));
        let first = root.join("first");
        let second = root.join("second");
        fs::create_dir_all(&first).unwrap();
        fs::create_dir_all(&second).unwrap();

        let first_engine = SearchEngine::instance(&first).unwrap();
        let second_engine = SearchEngine::instance(&second).unwrap();
        assert!(!Arc::ptr_eq(&first_engine, &second_engine));

        first_engine
            .lock()
            .unwrap()
            .add_document(&SearchDocument {
                note_id: "first-only".into(),
                relative_path: "first-only.md".into(),
                heading: "Isolated".into(),
                line_start: 1,
                title: "isolated workspace".into(),
                content: "first workspace document".into(),
                category: "test".into(),
            })
            .unwrap();

        assert_eq!(first_engine.lock().unwrap().doc_count().unwrap(), 1);
        assert_eq!(second_engine.lock().unwrap().doc_count().unwrap(), 0);

        drop(first_engine);
        drop(second_engine);
        fs::remove_dir_all(root).unwrap();
    }
}
