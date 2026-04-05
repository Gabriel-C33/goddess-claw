use axum::extract::ws::{Message, WebSocket};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;

use api::{
    AuthSource, ContentBlockDelta, InputContentBlock, InputMessage, MessageRequest,
    OutputContentBlock, ProviderClient, StreamEvent, ToolChoice, ToolDefinition,
};

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ClientMsg {
    #[serde(rename = "chat")]
    Chat {
        content: String,
        /// When true, file tools are executed on the client (PWA) side
        #[serde(default)]
        local_fs: bool,
    },
    #[serde(rename = "set_model")]
    SetModel { model: String },
    #[serde(rename = "clear")]
    Clear,
    /// Client sends back the result of a tool it executed locally
    #[serde(rename = "tool_result")]
    ToolResult {
        id: String,
        output: String,
        is_error: bool,
    },
}

#[derive(Serialize, Clone)]
#[serde(tag = "type")]
enum ServerMsg {
    #[serde(rename = "thinking")]
    Thinking,
    #[serde(rename = "token")]
    Token { text: String },
    #[serde(rename = "tool_start")]
    ToolStart { name: String, input: String },
    #[serde(rename = "tool_end")]
    ToolEnd { name: String, output: String, is_error: bool },
    /// Ask the client to execute a tool locally (PWA mode)
    #[serde(rename = "tool_request")]
    ToolRequest { id: String, name: String, input: Value },
    #[serde(rename = "done")]
    Done,
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "model")]
    Model { name: String },
}

pub struct ConversationHandler {
    model: String,
    cwd: PathBuf,
    /// When true, file tools are delegated to the client (PWA)
    local_fs: bool,
}

impl ConversationHandler {
    pub fn new(model: String, cwd: PathBuf) -> Self {
        Self { model, cwd, local_fs: false }
    }

    pub async fn run(mut self, mut socket: WebSocket) {
        send(&mut socket, &ServerMsg::Model { name: self.model.clone() }).await;

        let mut ping_interval = tokio::time::interval(tokio::time::Duration::from_secs(15));
        ping_interval.tick().await; // consume the immediate first tick

        loop {
            tokio::select! {
                // Send a ping every 15s to keep the connection alive through proxies/tunnels
                _ = ping_interval.tick() => {
                    if socket.send(Message::Ping(vec![b'p', b'i', b'n', b'g'])).await.is_err() {
                        break;
                    }
                }
                msg = socket.recv() => {
                    let msg = match msg {
                        Some(Ok(m)) => m,
                        _ => break,
                    };
                    let text = match msg {
                        Message::Text(t) => t,
                        Message::Close(_) => break,
                        Message::Pong(_) => continue,
                        _ => continue,
                    };
                    match serde_json::from_str::<ClientMsg>(&text) {
                        Ok(ClientMsg::SetModel { model }) => {
                            self.model = model.clone();
                            send(&mut socket, &ServerMsg::Model { name: model }).await;
                        }
                        Ok(ClientMsg::Clear) => {}
                        Ok(ClientMsg::Chat { content, local_fs }) => {
                            self.local_fs = local_fs;
                            send(&mut socket, &ServerMsg::Thinking).await;
                            self.handle_chat(&mut socket, content).await;
                        }
                        Ok(ClientMsg::ToolResult { .. }) => {
                            // Handled inline during tool execution wait loop
                        }
                        Err(e) => {
                            send(&mut socket, &ServerMsg::Error { message: e.to_string() }).await;
                        }
                    }
                }
            }
        }
    }

    async fn handle_chat(&self, socket: &mut WebSocket, prompt: String) {
        let auth = AuthSource::from_env_or_saved().ok();
        let client = match ProviderClient::from_model_with_default_auth(&self.model, auth) {
            Ok(c) => c,
            Err(e) => {
                send(socket, &ServerMsg::Error { message: e.to_string() }).await;
                return;
            }
        };

        // Determine tool calling mode
        let tool_mode = detect_tool_mode(&self.model);

        match tool_mode {
            ToolMode::Native => {
                self.handle_chat_native(socket, prompt, client).await;
            }
            ToolMode::PromptInjection => {
                self.handle_chat_prompt_injection(socket, prompt, client).await;
            }
            ToolMode::NoTools => {
                self.handle_chat_no_tools(socket, prompt, client).await;
            }
        }
    }

    /// Full native tool-calling loop (Claude, GPT-4o, Grok, Llama3, Qwen2.5, etc.)
    async fn handle_chat_native(
        &self,
        socket: &mut WebSocket,
        prompt: String,
        client: ProviderClient,
    ) {
        let tools = build_tools();
        let mut messages: Vec<InputMessage> = vec![InputMessage::user_text(prompt)];

        loop {
            let request = MessageRequest {
                model: self.model.clone(),
                max_tokens: 16384,
                messages: messages.clone(),
                system: Some(system_prompt(&self.cwd, true)),
                tools: Some(tools.clone()),
                tool_choice: Some(ToolChoice::Auto),
                stream: true,
            };

            let mut stream = match client.stream_message(&request).await {
                Ok(s) => s,
                Err(e) => {
                    send(socket, &ServerMsg::Error { message: e.to_string() }).await;
                    return;
                }
            };

            let mut text_buf = String::new();
            let mut tool_uses: Vec<(String, String, Value)> = Vec::new();
            let mut current_tool_id = String::new();
            let mut current_tool_name = String::new();
            let mut current_tool_json = String::new();
            let mut stop_reason = String::new();

            loop {
                match stream.next_event().await {
                    Err(e) => {
                        send(socket, &ServerMsg::Error { message: e.to_string() }).await;
                        return;
                    }
                    Ok(None) => break,
                    Ok(Some(event)) => match event {
                        StreamEvent::ContentBlockStart(e) => match &e.content_block {
                            OutputContentBlock::ToolUse { id, name, .. } => {
                                current_tool_id = id.clone();
                                current_tool_name = name.clone();
                                current_tool_json.clear();
                                send(socket, &ServerMsg::ToolStart {
                                    name: name.clone(),
                                    input: String::new(),
                                }).await;
                            }
                            _ => {}
                        },
                        StreamEvent::ContentBlockDelta(e) => match e.delta {
                            ContentBlockDelta::TextDelta { text } => {
                                text_buf.push_str(&text);
                                send(socket, &ServerMsg::Token { text }).await;
                            }
                            ContentBlockDelta::InputJsonDelta { partial_json } => {
                                current_tool_json.push_str(&partial_json);
                            }
                            _ => {}
                        },
                        StreamEvent::ContentBlockStop(_) => {
                            if !current_tool_name.is_empty() {
                                let input: Value = serde_json::from_str(&current_tool_json)
                                    .unwrap_or(Value::Null);
                                tool_uses.push((
                                    current_tool_id.clone(),
                                    current_tool_name.clone(),
                                    input,
                                ));
                                current_tool_name.clear();
                                current_tool_id.clear();
                                current_tool_json.clear();
                            }
                        }
                        StreamEvent::MessageDelta(e) => {
                            stop_reason = e.delta.stop_reason.unwrap_or_default();
                        }
                        StreamEvent::MessageStop(_) => break,
                        _ => {}
                    },
                }
            }

            // Add assistant turn
            let mut assistant_content: Vec<InputContentBlock> = Vec::new();
            if !text_buf.is_empty() {
                assistant_content.push(InputContentBlock::Text { text: text_buf.clone() });
            }
            for (id, name, input) in &tool_uses {
                assistant_content.push(InputContentBlock::ToolUse {
                    id: id.clone(),
                    name: name.clone(),
                    input: input.clone(),
                });
            }
            messages.push(InputMessage {
                role: "assistant".to_string(),
                content: assistant_content,
            });

            if tool_uses.is_empty() || stop_reason != "tool_use" {
                break;
            }

            let mut tool_results: Vec<InputContentBlock> = Vec::new();
            for (id, name, input) in &tool_uses {
                let is_file_tool = matches!(name.as_str(), "read_file" | "write_file" | "delete_file" | "list_dir" | "search_files");

                let (output, is_error) = if self.local_fs && is_file_tool {
                    // Delegate to client — send request and wait for response
                    send(socket, &ServerMsg::ToolRequest {
                        id: id.clone(),
                        name: name.clone(),
                        input: input.clone(),
                    }).await;

                    // Wait for client to send back tool_result
                    wait_for_tool_result(socket, id).await
                } else {
                    execute_tool(name, input, &self.cwd).await
                };

                send(socket, &ServerMsg::ToolEnd {
                    name: name.clone(),
                    output: output.clone(),
                    is_error,
                }).await;
                use api::ToolResultContentBlock;
                tool_results.push(InputContentBlock::ToolResult {
                    tool_use_id: id.clone(),
                    content: vec![ToolResultContentBlock::Text { text: output }],
                    is_error,
                });
            }
            messages.push(InputMessage {
                role: "user".to_string(),
                content: tool_results,
            });

            // Signal thinking before next LLM round
            send(socket, &ServerMsg::Thinking).await;
        }

        send(socket, &ServerMsg::Done).await;
    }

    /// Prompt-injection tool mode: inject tool schemas into system prompt and parse
    /// `<tool_call>` tags from model output. Used for Ollama models without native support.
    async fn handle_chat_prompt_injection(
        &self,
        socket: &mut WebSocket,
        prompt: String,
        client: ProviderClient,
    ) {
        let mut messages: Vec<InputMessage> = vec![InputMessage::user_text(prompt)];

        // Up to 10 tool rounds
        for _round in 0..10 {
            let request = MessageRequest {
                model: self.model.clone(),
                max_tokens: 8192,
                messages: messages.clone(),
                system: Some(system_prompt_with_injected_tools(&self.cwd)),
                tools: None,
                tool_choice: None,
                stream: true,
            };

            let mut stream = match client.stream_message(&request).await {
                Ok(s) => s,
                Err(e) => {
                    send(socket, &ServerMsg::Error { message: e.to_string() }).await;
                    return;
                }
            };

            let mut full_text = String::new();

            loop {
                match stream.next_event().await {
                    Err(e) => {
                        send(socket, &ServerMsg::Error { message: e.to_string() }).await;
                        return;
                    }
                    Ok(None) => break,
                    Ok(Some(event)) => {
                        if let StreamEvent::ContentBlockDelta(ref e) = event {
                            if let ContentBlockDelta::TextDelta { text } = &e.delta {
                                full_text.push_str(text);
                            }
                        }
                        if let StreamEvent::MessageStop(_) = event {
                            break;
                        }
                    }
                }
            }

            // Parse tool calls from <tool_call>...</tool_call> tags
            let (text_part, tool_calls) = parse_tool_calls(&full_text);

            // Stream visible text tokens
            if !text_part.is_empty() {
                send(socket, &ServerMsg::Token { text: text_part.clone() }).await;
            }

            if tool_calls.is_empty() {
                // No tools — we're done
                messages.push(InputMessage::user_text(format!(
                    "Assistant: {full_text}"
                )));
                break;
            }

            // Execute tools
            let mut tool_results_text = String::new();
            for (name, args) in &tool_calls {
                send(socket, &ServerMsg::ToolStart {
                    name: name.clone(),
                    input: serde_json::to_string(args).unwrap_or_default(),
                }).await;

                let is_file_tool = matches!(name.as_str(), "read_file" | "write_file" | "delete_file" | "list_dir" | "search_files");

                let (output, is_error) = if self.local_fs && is_file_tool {
                    // Delegate to client (PWA) — send request and wait for response
                    let tool_id = format!("pi_{}_{}", name, _round);
                    send(socket, &ServerMsg::ToolRequest {
                        id: tool_id.clone(),
                        name: name.clone(),
                        input: args.clone(),
                    }).await;
                    wait_for_tool_result(socket, &tool_id).await
                } else {
                    execute_tool(name, args, &self.cwd).await
                };

                send(socket, &ServerMsg::ToolEnd {
                    name: name.clone(),
                    output: output.clone(),
                    is_error,
                }).await;

                tool_results_text.push_str(&format!(
                    "<tool_result name=\"{name}\">\n{output}\n</tool_result>\n"
                ));
            }

            // Add assistant + tool results to history
            messages.push(InputMessage::user_text(format!(
                "Assistant: {full_text}\n\nTool results:\n{tool_results_text}"
            )));
            messages.push(InputMessage::user_text(
                "Continue based on the tool results above.".to_string(),
            ));
        }

        send(socket, &ServerMsg::Done).await;
    }

    /// Plain text streaming, no tools (models that can't do either)
    async fn handle_chat_no_tools(
        &self,
        socket: &mut WebSocket,
        prompt: String,
        client: ProviderClient,
    ) {
        let request = MessageRequest {
            model: self.model.clone(),
            max_tokens: 8192,
            messages: vec![InputMessage::user_text(prompt)],
            system: Some(system_prompt(&self.cwd, false)),
            tools: None,
            tool_choice: None,
            stream: true,
        };

        let mut stream = match client.stream_message(&request).await {
            Ok(s) => s,
            Err(e) => {
                send(socket, &ServerMsg::Error { message: e.to_string() }).await;
                return;
            }
        };

        loop {
            match stream.next_event().await {
                Err(e) => {
                    send(socket, &ServerMsg::Error { message: e.to_string() }).await;
                    return;
                }
                Ok(None) => break,
                Ok(Some(event)) => {
                    if let StreamEvent::ContentBlockDelta(ref e) = event {
                        if let ContentBlockDelta::TextDelta { text } = &e.delta {
                            send(socket, &ServerMsg::Token { text: text.clone() }).await;
                        }
                    }
                    if let StreamEvent::MessageStop(_) = event {
                        break;
                    }
                }
            }
        }

        send(socket, &ServerMsg::Done).await;
    }
}

// ── Tool mode detection ───────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq)]
enum ToolMode {
    /// Model supports native function/tool calling (Claude, GPT-4o, Grok, Llama3, Qwen2.5, etc.)
    Native,
    /// Model doesn't express native tools but can follow prompt instructions to emit <tool_call>
    PromptInjection,
    /// Older/tiny models that are unreliable even with prompt injection
    NoTools,
}

fn detect_tool_mode(model: &str) -> ToolMode {
    let lower = model.to_lowercase();

    // All cloud models (Anthropic/OpenAI/xAI/Moonshot) support native tools
    if lower.starts_with("claude")
        || lower.starts_with("gpt")
        || lower.starts_with("grok")
        || lower.contains("kimi")
        || lower.starts_with("o1")
        || lower.starts_with("o3")
        || lower.starts_with("o4")
    {
        return ToolMode::Native;
    }

    // Ollama: native tool-calling support confirmed (matching main.rs)
    if lower.starts_with("llama3")
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
    {
        return ToolMode::Native;
    }

    // All other local models use Prompt Injection fallback
    ToolMode::PromptInjection
}

// ── Tool call parser (for prompt-injection mode) ──────────────────────────

/// Parses `<tool_call name="X">{ ... }</tool_call>` from model output.
/// Returns (text_without_tool_calls, Vec<(name, args_value)>)
fn parse_tool_calls(text: &str) -> (String, Vec<(String, Value)>) {
    let mut calls = Vec::new();
    let mut clean_text = String::new();
    let mut rest = text;

    while let Some(start) = rest.find("<tool_call") {
        clean_text.push_str(&rest[..start]);
        let after_open = &rest[start..];
        if let Some(end) = after_open.find("</tool_call>") {
            let tag_content = &after_open[..end + 12]; // include </tool_call>
            // Extract name attribute
            let name = if let Some(name_start) = tag_content.find("name=\"") {
                let ns = name_start + 6;
                if let Some(name_end) = tag_content[ns..].find('"') {
                    tag_content[ns..ns + name_end].to_string()
                } else {
                    "unknown".to_string()
                }
            } else {
                "unknown".to_string()
            };
            // Extract JSON body between > and </tool_call>
            let body = if let Some(gt) = tag_content.find('>') {
                let body_raw = &tag_content[gt + 1..tag_content.len() - 12];
                serde_json::from_str(body_raw.trim()).unwrap_or(Value::Null)
            } else {
                Value::Null
            };
            calls.push((name, body));
            rest = &after_open[end + 12..];
        } else {
            // Malformed — treat rest as text
            clean_text.push_str(after_open);
            rest = "";
        }
    }
    clean_text.push_str(rest);

    (clean_text.trim().to_string(), calls)
}

// ── Tool definitions ──────────────────────────────────────────────────────

fn build_tools() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "read_file".to_string(),
            description: Some("Read the full contents of any file by path. Use this to view source code, configs, or any text file.".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": { "path": { "type": "string", "description": "Absolute or relative file path" } },
                "required": ["path"]
            }),
        },
        ToolDefinition {
            name: "write_file".to_string(),
            description: Some("Write or overwrite a file with new content. Creates parent directories automatically. Use for creating or editing any file.".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Absolute or relative file path" },
                    "content": { "type": "string", "description": "Full file content to write" }
                },
                "required": ["path", "content"]
            }),
        },
        ToolDefinition {
            name: "delete_file".to_string(),
            description: Some("Delete a file or directory (recursively). Use with caution.".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": { "path": { "type": "string" } },
                "required": ["path"]
            }),
        },
        ToolDefinition {
            name: "list_dir".to_string(),
            description: Some("List files and subdirectories at a given path. Set recursive=true to list all nested files. Use max_files to limit output and avoid context overflow (suggested: 50-100).".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Directory path, defaults to current directory" },
                    "recursive": { "type": "boolean", "default": false },
                    "max_files": { "type": "integer", "description": "Maximum number of files to return (prevents context overflow)" }
                },
                "required": []
            }),
        },
        ToolDefinition {
            name: "run_command".to_string(),
            description: Some("Execute any shell command (cmd on Windows). Use this to run scripts, build tools, git commands, etc.".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "The shell command to execute" },
                    "cwd": { "type": "string", "description": "Working directory for the command (optional)" }
                },
                "required": ["command"]
            }),
        },
        ToolDefinition {
            name: "search_files".to_string(),
            description: Some("Search for a text pattern across files in a directory. Returns matching lines with file paths and line numbers.".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "pattern": { "type": "string", "description": "Text pattern to search for" },
                    "path": { "type": "string", "description": "Directory to search in, defaults to current directory" },
                    "extension": { "type": "string", "description": "Only search files with this extension, e.g. 'rs', 'html'" }
                },
                "required": ["pattern"]
            }),
        },
    ]
}

// ── Tool execution (auto-approved) ────────────────────────────────────────

async fn execute_tool(name: &str, input: &Value, cwd: &PathBuf) -> (String, bool) {
    match name {
        "read_file" => {
            let path = resolve_path(input["path"].as_str().unwrap_or(""), cwd);
            match std::fs::read_to_string(&path) {
                Ok(c) => (c, false),
                Err(e) => (e.to_string(), true),
            }
        }
        "write_file" => {
            let path = resolve_path(input["path"].as_str().unwrap_or(""), cwd);
            let content = input["content"].as_str().unwrap_or("");
            if let Some(parent) = path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            match std::fs::write(&path, content) {
                Ok(_) => (format!("Written {} bytes to {}", content.len(), path.display()), false),
                Err(e) => (e.to_string(), true),
            }
        }
        "delete_file" => {
            let path = resolve_path(input["path"].as_str().unwrap_or(""), cwd);
            let result = if path.is_dir() {
                std::fs::remove_dir_all(&path)
            } else {
                std::fs::remove_file(&path)
            };
            match result {
                Ok(_) => (format!("Deleted {}", path.display()), false),
                Err(e) => (e.to_string(), true),
            }
        }
        "list_dir" => {
            let dir = input["path"].as_str().unwrap_or(".");
            let path = resolve_path(dir, cwd);
            let recursive = input["recursive"].as_bool().unwrap_or(false);
            let max_files = input["max_files"].as_u64().map(|m| m as usize);
            match list_directory_limited(&path, recursive, max_files) {
                Ok(s) => (s, false),
                Err(e) => (e.to_string(), true),
            }
        }
        "run_command" => {
            let cmd = input["command"].as_str().unwrap_or("");
            let work_dir = input["cwd"].as_str()
                .map(|p| resolve_path(p, cwd))
                .unwrap_or_else(|| cwd.clone());
            run_shell(cmd, &work_dir).await
        }
        "search_files" => {
            let pattern = input["pattern"].as_str().unwrap_or("");
            let dir = input["path"].as_str().unwrap_or(".");
            let ext = input["extension"].as_str();
            let path = resolve_path(dir, cwd);
            match search_in_files(&path, pattern, ext) {
                Ok(s) => (s, false),
                Err(e) => (e.to_string(), true),
            }
        }
        _ => (format!("Unknown tool: {name}"), true),
    }
}

fn resolve_path(p: &str, cwd: &PathBuf) -> PathBuf {
    let p = p.trim();
    let path = std::path::Path::new(p);
    if path.is_absolute() {
        return path.to_path_buf();
    }
    if p.starts_with('\\') || p.starts_with('/') {
        return path.to_path_buf();
    }
    cwd.join(path)
}

fn list_directory_limited(path: &PathBuf, recursive: bool, max_files: Option<usize>) -> std::io::Result<String> {
    let mut out = String::new();
    let mut count = 0usize;
    let mut truncated = false;

    fn list_recursive(
        path: &std::path::PathBuf,
        depth: usize,
        max_depth: usize,
        is_recursive: bool,
        count: &mut usize,
        max_files: Option<usize>,
        out: &mut String,
        truncated: &mut bool,
    ) -> std::io::Result<()> {
        if depth > max_depth { return Ok(()); }
        let indent = "  ".repeat(depth);

        for entry in std::fs::read_dir(path)? {
            if *truncated { break; }

            let entry = entry?;
            let name = entry.file_name().to_string_lossy().to_string();

            if name.starts_with('.') || name == "node_modules" || name == "target" || name == "__pycache__" || name == ".git" {
                continue;
            }

            let ft = entry.file_type()?;
            if ft.is_dir() {
                out.push_str(&format!("{indent}{name}/\n"));
                if is_recursive {
                    list_recursive(&entry.path(), depth + 1, max_depth, is_recursive, count, max_files, out, truncated)?;
                }
            } else {
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                out.push_str(&format!("{indent}{name} ({size}B)\n"));
                *count += 1;

                if let Some(max) = max_files {
                    if *count >= max {
                        *truncated = true;
                        break;
                    }
                }
            }
        }
        Ok(())
    }

    list_recursive(path, 0, if recursive { 4 } else { 0 }, recursive, &mut count, max_files, &mut out, &mut truncated)?;

    if truncated {
        out.push_str("\n... (truncated: use pagination or narrower path to see more)\n");
    }

    Ok(out)
}

async fn run_shell(cmd: &str, cwd: &PathBuf) -> (String, bool) {
    #[cfg(target_os = "windows")]
    let result = tokio::process::Command::new("cmd")
        .args(["/C", cmd])
        .current_dir(cwd)
        .output()
        .await;
    #[cfg(not(target_os = "windows"))]
    let result = tokio::process::Command::new("sh")
        .args(["-c", cmd])
        .current_dir(cwd)
        .output()
        .await;

    match result {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            let combined = if stderr.is_empty() {
                stdout
            } else if stdout.is_empty() {
                stderr.clone()
            } else {
                format!("{stdout}\nSTDERR:\n{stderr}")
            };
            let is_error = !out.status.success();
            (combined, is_error)
        }
        Err(e) => (e.to_string(), true),
    }
}

fn search_in_files(dir: &PathBuf, pattern: &str, ext: Option<&str>) -> std::io::Result<String> {
    let mut results = String::new();
    let mut count = 0;
    search_recursive(dir, pattern, ext, &mut results, &mut count, 0)?;
    if results.is_empty() {
        results = format!("No matches found for '{pattern}'");
    }
    Ok(results)
}

fn search_recursive(
    dir: &PathBuf, pattern: &str, ext: Option<&str>,
    out: &mut String, count: &mut usize, depth: usize,
) -> std::io::Result<()> {
    if depth > 8 || *count > 200 { return Ok(()); }
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || name == "target" || name == "node_modules" { continue; }
        if path.is_dir() {
            search_recursive(&path, pattern, ext, out, count, depth + 1)?;
        } else {
            if let Some(e) = ext {
                if !name.ends_with(&format!(".{e}")) { continue; }
            }
            if let Ok(content) = std::fs::read_to_string(&path) {
                for (i, line) in content.lines().enumerate() {
                    if line.to_lowercase().contains(&pattern.to_lowercase()) {
                        out.push_str(&format!("{}:{}: {}\n", path.display(), i + 1, line.trim()));
                        *count += 1;
                        if *count > 200 { return Ok(()); }
                    }
                }
            }
        }
    }
    Ok(())
}

fn system_prompt(cwd: &PathBuf, has_tools: bool) -> String {
    if has_tools {
        format!(
            "You are GoddessClaw, an expert AI coding assistant with full filesystem access.\n\
             Current working directory: {cwd}\n\n\
             AVAILABLE TOOLS (use ONLY these exact names):\n\
             - read_file(path) — read any file\n\
             - write_file(path, content) — create or overwrite any file\n\
             - delete_file(path) — delete a file or directory\n\
             - list_dir(path, recursive, max_files?) — list directory contents. ALWAYS set max_files=50 to avoid context overflow\n\
             - run_command(command, cwd?) — execute shell commands\n\
             - search_files(pattern, path?, extension?) — search in files\n\n\
             IMPORTANT:\n\
             - All permissions are pre-approved. Never ask for confirmation.\n\
             - Use absolute paths when the user specifies a location (e.g. C:\\Users\\Admin\\Desktop\\file.html)\n\
             - You can edit your own source code if asked.\n\
             - Be direct and efficient. Execute tasks immediately with tools.",
            cwd = cwd.display()
        )
    } else {
        format!(
            "You are GoddessClaw, an expert AI coding assistant.\n\
             Current working directory: {cwd}\n\n\
             You don't have direct file access with this model, but you can provide code,\n\
             instructions, and analysis. Be helpful and direct.",
            cwd = cwd.display()
        )
    }
}

fn system_prompt_with_injected_tools(cwd: &PathBuf) -> String {
    format!(
        "You are GoddessClaw, an expert AI coding assistant with full filesystem access.\n\
         Current working directory: {cwd}\n\n\
         You have access to the following tools. To use a tool, output a <tool_call> tag:\n\n\
         <tool_call name=\"read_file\">{{\"path\": \"path/to/file\"}}</tool_call>\n\
         <tool_call name=\"write_file\">{{\"path\": \"path/to/file\", \"content\": \"file content here\"}}</tool_call>\n\
         <tool_call name=\"delete_file\">{{\"path\": \"path/to/file\"}}</tool_call>\n\
         <tool_call name=\"list_dir\">{{\"path\": \".\", \"recursive\": false, \"max_files\": 50}}</tool_call>\n\
         <tool_call name=\"run_command\">{{\"command\": \"your command here\"}}</tool_call>\n\
         <tool_call name=\"search_files\">{{\"pattern\": \"search term\", \"path\": \".\"}}</tool_call>\n\n\
         RULES:\n\
         - Use tool_call tags ONLY when you need to actually execute something on the filesystem.\n\
         - ALL permissions are pre-approved. Never ask for permission.\n\
         - After each tool_call block, a tool_result will be provided with the output.\n\
         - Be direct and efficient. Execute tasks immediately.\n\
         - NEVER output raw JSON without the tool_call wrapper.\n\
         - Respond naturally in the non-tool parts of your message.",
        cwd = cwd.display()
    )
}

/// Wait for the client to respond with a tool_result for the given tool ID.
/// Times out after 30 seconds.
async fn wait_for_tool_result(socket: &mut WebSocket, tool_id: &str) -> (String, bool) {
    let timeout = tokio::time::Duration::from_secs(30);
    match tokio::time::timeout(timeout, async {
        while let Some(Ok(msg)) = socket.recv().await {
            if let Message::Text(text) = msg {
                if let Ok(client_msg) = serde_json::from_str::<ClientMsg>(&text) {
                    if let ClientMsg::ToolResult { id, output, is_error } = client_msg {
                        if id == tool_id {
                            return (output, is_error);
                        }
                    }
                }
            }
        }
        ("WebSocket closed while waiting for tool result".to_string(), true)
    }).await {
        Ok(result) => result,
        Err(_) => ("Tool execution timed out (30s)".to_string(), true),
    }
}

async fn send(socket: &mut WebSocket, msg: &ServerMsg) {
    if let Ok(json) = serde_json::to_string(msg) {
        let _ = socket.send(Message::Text(json)).await;
    }
}
