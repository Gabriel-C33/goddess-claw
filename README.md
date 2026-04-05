<div align="center">

<br>

<img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust">
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">

<br><br>

# GoddessClaw

### AI coding assistant with full filesystem access.
### Your own self-hosted Cursor / Claude Code alternative.

<br>

**One binary. Any model. Local or cloud. PWA-ready.**

<br>

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [Configuration](#-configuration) · [PWA & Remote Access](#-pwa--remote-access) · [Contributing](#-contributing)

<br>

---

</div>

<br>

## What is this?

GoddessClaw is a **self-hosted AI coding assistant** that gives any LLM full access to your filesystem — read, write, delete, search, and execute shell commands — all through a clean web UI.

Think of it as your own private **Cursor** or **Claude Code**, but:
- Runs on **your machine** with **your models**
- Works with **any provider** — Ollama, Anthropic, OpenAI, xAI, Moonshot
- Ships as a **single binary** with the UI embedded
- Installs as a **PWA** — use it from your phone, tablet, or any device

<br>

## Screenshots

```
┌─────────────────────────────────────────────────────────┐
│  GoddessClaw                          qwen2.5-coder:7b  │
│─────────────────────────────────────────────────────────│
│                                                         │
│  > Analyze the project structure and find any bugs      │
│                                                         │
│  ┌─ assistant ────────────────────────────────────────┐ │
│  │  I'll start by listing the project files...        │ │
│  │                                                    │ │
│  │  ⚡ list_dir  ✓                                    │ │
│  │  ⚡ read_file ✓                                    │ │
│  │  ⚡ write_file ✓                                   │ │
│  │                                                    │ │
│  │  Found and fixed 3 issues:                         │ │
│  │  1. Missing null check in parser.rs:47             │ │
│  │  2. Unused import in main.rs:3                     │ │
│  │  3. Race condition in async handler                │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────── Send ─┐  │
│  │ Ask anything about your codebase...               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

<br>

## Features

### Core
| Feature | Description |
|---------|-------------|
| **Multi-provider** | Ollama, Anthropic (Claude), OpenAI, xAI (Grok), Moonshot (Kimi) |
| **Native tool calling** | Models with native function calling use it directly |
| **Prompt injection fallback** | Models without native tools get `<tool_call>` prompt injection |
| **Smart model filtering** | Auto-hides models too large for your VRAM (configurable) |
| **Conversation persistence** | SQLite with WAL mode, auto-save, cross-device sync |
| **Session management** | Multiple chat sessions with search, rename, delete |

### Tools (auto-approved, no confirmation needed)
| Tool | What it does |
|------|-------------|
| `read_file` | Read any file by path |
| `write_file` | Create or overwrite files (auto-creates directories) |
| `delete_file` | Delete files or directories recursively |
| `list_dir` | List directory contents (recursive, with pagination) |
| `search_files` | Grep-like search across files |
| `run_command` | Execute any shell command |

### UI
- Dark theme with accent gradients
- Syntax-highlighted code blocks with one-click copy
- Streaming responses with thinking indicator
- Tool execution visualization (running/completed/error states)
- Stop generation button
- Voice input (Web Speech API)
- Mobile-responsive with bottom navigation
- Sidebar with session history
- File explorer panel
- Skills explorer (300+ prompt templates)

### PWA & Remote Access
- Installable as a Progressive Web App
- Works over Cloudflare Tunnel, ngrok, or any reverse proxy
- WebSocket keepalive (15s ping) for stable connections through proxies

<br>

## Quick Start

### Prerequisites

- **Rust** (1.75+) — [install](https://rustup.rs)
- **Node.js** (18+) — [install](https://nodejs.org)
- **Ollama** (recommended) — [install](https://ollama.ai) — or any cloud API key

### 1. Clone & build

```bash
git clone https://github.com/YOUR_USERNAME/goddess-claw.git
cd goddess-claw

# Install frontend deps & build everything
# Windows:
build.bat

# Linux/macOS:
cd web-ui && npm install && npm run build && cd ..
cd rust && cargo build --release && cd ..

# Copy frontend assets next to binary
cp -r web-ui/dist/assets rust/target/release/assets
```

### 2. Pull a model (if using Ollama)

```bash
ollama pull qwen2.5-coder:7b    # Great coding model, fits 8GB VRAM
# or
ollama pull llama3.1:8b          # Good general purpose
# or
ollama pull deepseek-coder       # Lightweight option
```

### 3. Run

```bash
# Windows:
start.bat

# Linux/macOS:
./rust/target/release/goddess-claw
```

Open **http://localhost:8989** — that's it.

### 4. (Optional) Cloud models

Set environment variables for any cloud providers you want:

```bash
# Pick any/all:
export ANTHROPIC_API_KEY=sk-ant-...     # Claude
export OPENAI_API_KEY=sk-...            # GPT-4o
export XAI_API_KEY=xai-...              # Grok
export MOONSHOT_API_KEY=sk-...          # Kimi
```

Cloud models appear in the model selector automatically when their API key is set.

<br>

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    Browser / PWA                  │
│                                                   │
│  React + Tailwind + Zustand + Framer Motion      │
│  WebSocket ←→ REST API                           │
│                                                   │
└───────────────────┬──────────────────────────────┘
                    │ WebSocket (ws/wss)
                    │
┌───────────────────┴──────────────────────────────┐
│              Rust / Axum Backend                  │
│                                                   │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ WS Chat │  │ REST API │  │ Static Serving  │ │
│  │ Handler │  │ /api/*   │  │ (embedded HTML) │ │
│  └────┬────┘  └──────────┘  └─────────────────┘ │
│       │                                          │
│  ┌────┴─────────────────────────────────────┐    │
│  │         ConversationHandler              │    │
│  │                                          │    │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ Native  │ │ Prompt   │ │ No Tools │  │    │
│  │  │ Tools   │ │ Inject   │ │ (plain)  │  │    │
│  │  └────┬────┘ └────┬─────┘ └──────────┘  │    │
│  │       │           │                      │    │
│  │       ▼           ▼                      │    │
│  │  ┌─────────────────────┐                 │    │
│  │  │   Tool Execution    │                 │    │
│  │  │   (server-side)     │                 │    │
│  │  └─────────────────────┘                 │    │
│  └────────────────────────┘                 │    │
│                                              │    │
│  ┌──────────┐  ┌──────────────────────────┐  │    │
│  │ SQLite   │  │ Provider Client          │  │    │
│  │ (WAL)    │  │ Ollama / Anthropic /     │  │    │
│  │          │  │ OpenAI / xAI / Moonshot  │  │    │
│  └──────────┘  └──────────────────────────┘  │    │
└──────────────────────────────────────────────────┘
```

### Tool Calling Modes

GoddessClaw automatically detects how each model handles tools:

| Mode | Models | How it works |
|------|--------|-------------|
| **Native** | Claude, GPT-4o, Grok, Llama3, Qwen2.5, Phi4, Mistral | Uses the model's built-in function calling API |
| **Prompt Injection** | Older Ollama models, CodeQwen, etc. | Injects tool schemas into the system prompt, parses `<tool_call>` tags from output |
| **No Tools** | Tiny/old models | Plain conversation, no filesystem access |

<br>

## Configuration

### Environment Variables

| Variable | Provider | Required |
|----------|----------|----------|
| `ANTHROPIC_API_KEY` | Anthropic (Claude) | For Claude models |
| `OPENAI_API_KEY` | OpenAI (GPT) | For GPT models |
| `XAI_API_KEY` | xAI (Grok) | For Grok models |
| `MOONSHOT_API_KEY` | Moonshot (Kimi) | For Kimi models |
| `OLLAMA_BASE_URL` | Ollama | Only if not `localhost:11434` |
| `GODDESS_CLAW_MODEL` | — | Override default model |

### VRAM Filtering

By default, GoddessClaw hides Ollama models larger than **5.5GB** (suitable for 8GB VRAM GPUs). To change this, edit `MAX_LOCAL_MODEL_BYTES` in `rust/crates/goddess-claw-web/src/main.rs`:

```rust
const MAX_LOCAL_MODEL_BYTES: u64 = 5_500_000_000; // 5.5GB — adjust for your GPU
```

### Model Quality Filter

Known low-quality models (embedding models, tiny models, llama2) are automatically hidden from the selector. Edit `is_bad_model()` in `main.rs` to customize.

<br>

## PWA & Remote Access

### Installing as PWA

1. Open `http://your-server:8989` in Chrome/Edge
2. Click "Install App" in the welcome screen (or use browser's install button)
3. The app works offline for the UI, connects to your server for AI
4. All file operations execute on the server machine

### Exposing to the Internet

Works with any reverse proxy or tunnel:

```bash
# Cloudflare Tunnel
cloudflared tunnel --url http://localhost:8989

# ngrok
ngrok http 8989

# Or configure nginx, Caddy, etc.
```

The WebSocket keepalive (15s ping) ensures stable connections through any proxy.

<br>

## Project Structure

```
goddess-claw/
├── rust/                           # Rust workspace
│   ├── crates/
│   │   ├── goddess-claw-web/       # Web server (main binary)
│   │   │   ├── src/
│   │   │   │   ├── main.rs         # HTTP routes, model fetching, VRAM filtering
│   │   │   │   ├── conversation.rs # WebSocket chat, tool execution, streaming
│   │   │   │   ├── sqlite.rs       # Conversation persistence
│   │   │   │   ├── index.html      # Embedded HTML (include_str!)
│   │   │   │   └── assets/         # Embedded JS/CSS (ServeDir)
│   │   ├── api/                    # Provider client (HTTP, SSE streaming)
│   │   ├── claw-cli/               # Terminal CLI (alternative to web UI)
│   │   ├── runtime/                # Core runtime (tools, sessions, sandbox)
│   │   ├── commands/               # Slash command registry
│   │   ├── plugins/                # Plugin system
│   │   └── tools/                  # Tool implementations
│   └── Cargo.toml
├── web-ui/                         # React frontend
│   ├── src/
│   │   ├── App.tsx                 # Main app with sidebar, panels
│   │   ├── components/             # UI components
│   │   │   ├── ChatArea.tsx        # Chat input, messages, stop button
│   │   │   ├── MessageList.tsx     # Message rendering
│   │   │   ├── MessageItem.tsx     # Individual messages, thinking indicator
│   │   │   ├── Sidebar.tsx         # Session list, navigation
│   │   │   ├── ModelModal.tsx      # Model selector
│   │   │   ├── FileExplorer.tsx    # File tree panel
│   │   │   ├── SkillsExplorer.tsx  # 300+ prompt templates
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts     # WebSocket client
│   │   │   └── useVoice.ts         # Speech recognition
│   │   ├── stores/
│   │   │   └── chatStore.ts        # Zustand state management
│   │   └── utils/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── build.bat                       # Windows build script
├── start.bat                       # Windows start script
├── .env.example                    # Environment template
└── README.md
```

<br>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Rust, Axum, Tokio, reqwest |
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| **State** | Zustand |
| **Animations** | Framer Motion |
| **Database** | SQLite (rusqlite, WAL mode) |
| **Streaming** | Server-Sent Events, WebSocket |
| **PWA** | Service Worker, Web App Manifest |
| **Syntax** | highlight.js |

<br>

## Development

### Frontend dev (hot reload)

```bash
cd web-ui
npm install
npm run dev    # → http://localhost:3000 (proxies WS to :8989)
```

### Backend dev

```bash
cd rust
cargo run -p goddess-claw-web    # → http://localhost:8989
```

### Full rebuild

```bash
# Windows
build.bat

# Linux/macOS
cd web-ui && npm run build && cd ..
cp web-ui/dist/index.html rust/crates/goddess-claw-web/src/index.html
cp -r web-ui/dist/assets/* rust/crates/goddess-claw-web/src/assets/
cd rust && cargo build --release
cp -r ../web-ui/dist/assets target/release/assets
```

<br>

## Contributing

PRs welcome. Some ideas:

- [ ] Linux/macOS build script (`build.sh`)
- [ ] Docker image
- [ ] More providers (Google Gemini, Groq, Together AI)
- [ ] File diff viewer for `write_file` operations
- [ ] Git integration (commit, diff, blame tools)
- [ ] Image/PDF understanding (multimodal)
- [ ] Plugin system for custom tools
- [ ] Collaborative editing (multiple users)

<br>

## License

MIT

<br>

---

<div align="center">

**Built with Rust and stubbornness.**

If this saved you time, star the repo.

</div>
