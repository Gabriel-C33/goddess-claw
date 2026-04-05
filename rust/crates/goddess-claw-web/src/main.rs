use axum::{
    body::Body,
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::{Path, State},
    http::{header, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::io::Write as _;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

mod conversation;
mod sqlite;
use conversation::ConversationHandler;
use sqlite::{ConversationDb, StoredConversation};

// ── App State ─────────────────────────────────────────────────────────────

#[derive(Clone)]
struct AppState {
    model: String,
    cwd: std::path::PathBuf,
    db: Arc<Mutex<ConversationDb>>,
}

// ── Entry point ───────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let model = std::env::var("GODDESS_MODEL")
        .unwrap_or_else(|_| "kimi-k2.5:cloud".to_string());
    let cwd = std::env::current_dir().expect("cwd");

    // Open SQLite conversation DB next to the binary (or in cwd during dev)
    let db_path = cwd.join("conversations.db");
    let db = ConversationDb::open(&db_path)
        .await
        .expect("failed to open conversations.db");

    let state = AppState {
        model,
        cwd: cwd.clone(),
        db: Arc::new(Mutex::new(db)),
    };

    // Get the directory where the binary is located (for static assets)
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let app = Router::new()
        // Static / PWA
        .route("/", get(serve_index))
        .route("/manifest.json", get(serve_manifest))
        .route("/sw.js", get(serve_sw))
        .nest_service("/assets", ServeDir::new(exe_dir.join("assets")))
        // WebSocket chat
        .route("/ws", get(ws_handler))
        .route("/icon.png", get(serve_icon))
        // REST API
        .route("/api/models", get(api_models))
        .route("/api/conversations", get(api_list_convos).post(api_save_convo))
        .route("/api/conversations/:id", get(api_get_convo).delete(api_delete_convo))
        .route("/api/conversations/:id/export", get(api_export_convo))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = "0.0.0.0:8989";
    println!("GoddessClaw running on http://{addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// ── WebSocket ─────────────────────────────────────────────────────────────

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let handler = ConversationHandler::new(state.model.clone(), state.cwd.clone());
    handler.run(socket).await;
}

// ── /api/models ───────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct ModelInfo {
    id: String,
    name: String,
    provider: String,
    #[serde(rename = "supportsTools")]
    supports_tools: bool,
    description: String,
}

async fn api_models() -> Json<Vec<ModelInfo>> {
    // Only show cloud models that have API keys configured
    let mut models: Vec<ModelInfo> = Vec::new();

    if std::env::var("ANTHROPIC_API_KEY").is_ok() {
        models.extend(vec![
            ModelInfo {
                id: "claude-sonnet-4-6".into(),
                name: "Claude Sonnet 4.6".into(),
                provider: "anthropic".into(),
                supports_tools: true,
                description: "Best balance of speed & intelligence".into(),
            },
            ModelInfo {
                id: "claude-opus-4-6".into(),
                name: "Claude Opus 4.6".into(),
                provider: "anthropic".into(),
                supports_tools: true,
                description: "Most capable, slower".into(),
            },
            ModelInfo {
                id: "claude-haiku-4-5-20251213".into(),
                name: "Claude Haiku 4.5".into(),
                provider: "anthropic".into(),
                supports_tools: true,
                description: "Fastest, lightweight tasks".into(),
            },
        ]);
    }

    if std::env::var("MOONSHOT_API_KEY").is_ok() || std::env::var("KIMI_API_KEY").is_ok() {
        models.push(ModelInfo {
            id: "kimi-k2.5:cloud".into(),
            name: "Kimi K2.5".into(),
            provider: "moonshot".into(),
            supports_tools: true,
            description: "Moonshot AI flagship — fast & smart".into(),
        });
    }

    if std::env::var("XAI_API_KEY").is_ok() {
        models.extend(vec![
            ModelInfo {
                id: "grok-3".into(),
                name: "Grok 3".into(),
                provider: "xai".into(),
                supports_tools: true,
                description: "xAI Grok flagship".into(),
            },
            ModelInfo {
                id: "grok-3-mini".into(),
                name: "Grok 3 Mini".into(),
                provider: "xai".into(),
                supports_tools: true,
                description: "Fast xAI model".into(),
            },
        ]);
    }

    if std::env::var("OPENAI_API_KEY").is_ok() {
        models.extend(vec![
            ModelInfo {
                id: "gpt-4o".into(),
                name: "GPT-4o".into(),
                provider: "openai".into(),
                supports_tools: true,
                description: "OpenAI multimodal flagship".into(),
            },
            ModelInfo {
                id: "gpt-4o-mini".into(),
                name: "GPT-4o Mini".into(),
                provider: "openai".into(),
                supports_tools: true,
                description: "Fast, cheap OpenAI model".into(),
            },
        ]);
    }

    // Fetch Ollama models — filter to only those that fit in VRAM
    if let Ok(ollama_models) = fetch_ollama_models().await {
        models.extend(ollama_models);
    }

    // Also include cloud-proxied Ollama models (size = 0, name contains "cloud")
    // These are always available regardless of VRAM
    if let Ok(all_ollama) = fetch_ollama_models_raw().await {
        for m in all_ollama {
            if m.name.contains("cloud") && !models.iter().any(|existing| existing.id == m.name) {
                let display_name = m.name.replace(":cloud", " (Cloud)").replace(":", " ");
                models.push(ModelInfo {
                    id: m.name.clone(),
                    name: display_name,
                    provider: "ollama".into(),
                    supports_tools: true,
                    description: "Cloud-proxied model — no VRAM needed".into(),
                });
            }
        }
    }

    Json(models)
}

#[derive(Deserialize, Clone)]
struct OllamaTagsResponse {
    models: Vec<OllamaModelEntry>,
}

#[derive(Deserialize, Clone)]
struct OllamaModelEntry {
    name: String,
    #[serde(default)]
    size: u64, // bytes
}

/// Ollama model families that support native function/tool calling
fn ollama_supports_native_tools(model_name: &str) -> bool {
    let lower = model_name.to_lowercase();
    // These families have confirmed tool-call support in Ollama
    lower.starts_with("llama3")
        || lower.starts_with("llama-3")
        || lower.starts_with("qwen2.5")
        || lower.starts_with("qwen3")
        || lower.starts_with("mistral-nemo")
        || lower.starts_with("mistral-small")
        || lower.starts_with("mixtral")
        || lower.starts_with("phi4")
        || lower.starts_with("phi3.5")
        || lower.starts_with("command-r")
        || lower.starts_with("aya-expanse")
        || lower.starts_with("firefunction")
        || lower.starts_with("hermes")
        || lower.starts_with("openhermes")
        || lower.starts_with("nous-hermes")
        || lower.starts_with("deepseek-v3")
        || lower.starts_with("deepseek-r1")
        || lower.starts_with("smollm2")
        || lower.starts_with("granite3")
        || lower.starts_with("granite-3")
        || lower.contains("function")
        || lower.contains("tool")
        || lower.contains("instruct") // most instruct-tuned models handle tools via prompts
}

/// Max model file size that fits comfortably in 8GB VRAM (roughly 5.5GB to leave room for KV cache)
const MAX_LOCAL_MODEL_BYTES: u64 = 5_500_000_000;

/// Models known to be bad for coding tasks (too old, embedding-only, tiny/useless)
fn is_bad_model(name: &str) -> bool {
    let lower = name.to_lowercase();
    // Embedding models — not chat models
    if lower.contains("embed") || lower.contains("nomic") || lower.contains("bge") {
        return true;
    }
    // Very old/outdated models
    if lower.starts_with("llama2") || lower == "llama2:latest" {
        return true;
    }
    // Tiny models that produce garbage for coding
    if lower.starts_with("gemma2:2b") || lower.starts_with("tinyllama") || lower.starts_with("phi-2") {
        return true;
    }
    // deepseek-coder 1.3b — too small for real tasks
    if lower == "deepseek-coder:latest" || lower.starts_with("deepseek-coder:1") {
        return true;
    }
    false
}

async fn fetch_ollama_models_raw() -> Result<Vec<OllamaModelEntry>, reqwest::Error> {
    let ollama_base = std::env::var("OLLAMA_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:11434".to_string());
    let url = format!("{ollama_base}/api/tags");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()?;
    let resp = client.get(&url).send().await?;
    let tags: OllamaTagsResponse = resp.json().await?;
    Ok(tags.models)
}

async fn fetch_ollama_models() -> Result<Vec<ModelInfo>, reqwest::Error> {
    let raw = fetch_ollama_models_raw().await?;

    let models = raw
        .into_iter()
        .filter(|m| {
            // Skip cloud-proxied models (handled separately)
            if m.name.contains("cloud") {
                return false;
            }
            // Skip models that are too large for 8GB VRAM
            if m.size > 0 && m.size > MAX_LOCAL_MODEL_BYTES {
                return false;
            }
            // Skip known-bad models
            if is_bad_model(&m.name) {
                return false;
            }
            true
        })
        .map(|m| {
            let is_native = ollama_supports_native_tools(&m.name);
            let size_gb = if m.size > 0 {
                format!(" ({:.1}GB)", m.size as f64 / 1_000_000_000.0)
            } else {
                String::new()
            };
            let display_name = m.name.replace(':', " (").to_string()
                + if m.name.contains(':') { ")" } else { "" };
            ModelInfo {
                id: m.name.clone(),
                name: display_name,
                provider: "ollama".to_string(),
                supports_tools: true,
                description: if is_native {
                    format!("Local model — native tools{size_gb}")
                } else {
                    format!("Local model — prompt tools{size_gb}")
                },
            }
        })
        .collect();

    Ok(models)
}

// ── /api/conversations ────────────────────────────────────────────────────

async fn api_list_convos(State(state): State<AppState>) -> impl IntoResponse {
    let db = state.db.lock().await;
    match db.list().await {
        Ok(convs) => Json(convs).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn api_save_convo(
    State(state): State<AppState>,
    Json(conv): Json<StoredConversation>,
) -> impl IntoResponse {
    let db = state.db.lock().await;
    match db.save(conv).await {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn api_get_convo(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = state.db.lock().await;
    match db.get(id).await {
        Ok(Some(conv)) => Json(conv).into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn api_delete_convo(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = state.db.lock().await;
    match db.delete(id).await {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ── /api/conversations/:id/export ─────────────────────────────────────────

#[derive(Deserialize)]
struct ExportMessageMessage {
    #[serde(default)]
    toolCalls: Vec<ExportToolCall>,
}

#[derive(Deserialize)]
struct ExportToolCall {
    name: String,
    input: Option<String>,
}

async fn api_export_convo(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = state.db.lock().await;
    let conv = match db.get(id.clone()).await {
        Ok(Some(c)) => c,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, "Conversation not found").into_response();
        }
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
        }
    };
    drop(db);

    // Build ZIP in memory
    let mut zip_buf = Vec::new();
    {
        let cursor = std::io::Cursor::new(&mut zip_buf);
        let mut zip = zip::ZipWriter::new(cursor);
        let options =
            zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        let mut touched_files = Vec::new();

        // Parse messages to find write_file calls
        if let Ok(messages) = serde_json::from_str::<Vec<ExportMessageMessage>>(&conv.messages_json) {
            for msg in messages {
                for tool in msg.toolCalls {
                    if tool.name == "write_file" || tool.name == "write_to_file" || tool.name == "multi_replace_file_content" || tool.name == "replace_file_content" {
                        if let Some(input_str) = tool.input {
                            if let Ok(input_json) = serde_json::from_str::<serde_json::Value>(&input_str) {
                                if let Some(path_str) = input_json.get("Path").and_then(|v| v.as_str())
                                    .or_else(|| input_json.get("TargetFile").and_then(|v| v.as_str()))
                                {
                                    touched_files.push(path_str.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }

        // Keep a unique list of paths
        touched_files.sort();
        touched_files.dedup();

        let mut included_files = 0;

        for path in &touched_files {
            if let Ok(content) = std::fs::read(path) {
                // Try to get just the filename or relative path
                let path_obj = std::path::Path::new(path);
                let zip_path = path_obj.file_name().unwrap_or_default().to_string_lossy().to_string();
                
                if !zip_path.is_empty() {
                    zip.start_file(&zip_path, options).ok();
                    zip.write_all(&content).ok();
                    included_files += 1;
                }
            }
        }

        // README.md
        zip.start_file("README.md", options).ok();
        let mut readme = format!(
            "# {}\n\nExported from GoddessClaw\n\nModel: {}\n\n",
            conv.title,
            conv.model
        );
        readme.push_str("## Project Files\n\n");
        if included_files > 0 {
            for path in &touched_files {
                let path_obj = std::path::Path::new(path);
                let zip_path = path_obj.file_name().unwrap_or_default().to_string_lossy().to_string();
                readme.push_str(&format!("- `{}`\n", zip_path));
            }
        } else {
            readme.push_str("No files were modified during this session.\n");
        }
        zip.write_all(readme.as_bytes()).ok();

        zip.finish().ok();
    }

    let filename = format!("{}.zip", conv.title.replace(' ', "_").replace('/', "_"));
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/zip"),
            (
                header::CONTENT_DISPOSITION,
                &format!("attachment; filename=\"{filename}\""),
            ),
        ],
        Body::from(zip_buf),
    )
        .into_response()
}

// ── Static files ──────────────────────────────────────────────────────────

async fn serve_index() -> Html<&'static str> {
    Html(INDEX_HTML)
}

async fn serve_manifest() -> impl IntoResponse {
    (
        axum::http::StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "application/json")],
        MANIFEST_JSON,
    )
}

async fn serve_sw() -> impl IntoResponse {
    (
        axum::http::StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "application/javascript")],
        SW_JS,
    )
}

async fn serve_icon() -> impl IntoResponse {
    (
        axum::http::StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "image/png")],
        include_bytes!("icon.png").to_vec(),
    )
}

const MANIFEST_JSON: &str = r##"{
  "name": "GoddessClaw",
  "short_name": "GoddessClaw",
  "description": "High-performance AI coding assistant",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d1117",
  "theme_color": "#7c3aed",
  "icons": [
    {
      "src": "/icon.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}"##;

const SW_JS: &str = r#"
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));
"#;

const INDEX_HTML: &str = include_str!("index.html");
