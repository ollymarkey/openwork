# OpenWork: AI Agent Builder - Implementation Plan

## Overview

OpenWork is a desktop application for building and running AI agents with configurable personas, skills, and tools. Built on Tauri + React + Hono.js, following the opencode architecture patterns.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Tauri Desktop App                          │
├──────────────┬────────────────────────────────┬────────────────────┤
│ Left Sidebar │         Main Chat Area         │   Right Sidebar    │
│              │                                │                    │
│ - Agent      │  ┌──────────────────────────┐  │ - MCP Servers      │
│   Selector   │  │     Message History      │  │ - Google           │
│ - System     │  │  (User/Agent/Tool calls) │  │ - Microsoft        │
│   Prompt     │  └──────────────────────────┘  │ - Built-in         │
│ - Skills     │  ┌──────────────────────────┐  │   Tools            │
│ - LLM Config │  │     Input + Attachments  │  │                    │
└──────────────┴──┴──────────────────────────┴──┴────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Hono.js Local Server                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   Agent     │  │   Session   │  │    Tool     │  │    MCP    │  │
│  │  Executor   │  │   Manager   │  │   Registry  │  │  Manager  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                              │                                      │
│                      Vercel AI SDK                                 │
│           (Anthropic / OpenAI / Google / Ollama)                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
openwork/
├── packages/
│   ├── openwork/              # Core server package
│   │   ├── src/
│   │   │   ├── server/        # Hono.js HTTP server
│   │   │   ├── agent/         # Agent execution engine
│   │   │   ├── skills/        # Skill loading & parsing
│   │   │   ├── tools/         # Built-in tools
│   │   │   ├── integrations/  # Google/Microsoft OAuth
│   │   │   ├── mcp/           # MCP client management
│   │   │   ├── llm/           # LLM provider abstraction
│   │   │   └── storage/       # File-based storage
│   │   └── package.json
│   ├── app/                   # React frontend
│   │   ├── src/
│   │   │   ├── components/    # UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── stores/        # Zustand stores
│   │   │   └── hooks/         # Custom hooks
│   │   └── package.json
│   ├── desktop/               # Tauri wrapper
│   │   ├── src/               # Frontend entry
│   │   ├── src-tauri/         # Rust backend
│   │   └── package.json
│   ├── ui/                    # Shared UI components
│   └── sdk/                   # TypeScript SDK
├── agents/                    # Default agent definitions
├── skills/                    # Default skill library
├── package.json               # Workspace root
└── turbo.json                 # Build configuration
```

## Core Components

### 1. Agent System

Agents are defined with:
- **System Prompt**: Markdown file defining persona and behavior
- **Skills**: Markdown files with specialized capabilities
- **Tools**: Built-in tools, MCP servers, and integrations
- **LLM Config**: Provider, model, temperature settings

```typescript
// Agent configuration schema
interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: { type: 'inline' | 'file'; content?: string; path?: string };
  skills: Array<{ id: string; path: string; enabled: boolean }>;
  tools: {
    builtin: ('code_write' | 'code_read' | 'bash_execute' | ...)[];
    integrations: ('google_calendar' | 'gmail' | 'outlook_mail' | ...)[];
    mcp: Array<{ serverId: string; enabledTools?: string[] }>;
  };
  llm: { provider: string; model: string; temperature: number };
}
```

### 2. Skills Format

Skills use markdown with YAML frontmatter:

```markdown
---
id: code-review
name: Code Review
triggers: ["/review", "review this code"]
---

# Code Review Skill

You are an expert code reviewer...
```

### 3. Built-in Tools

| Tool | Description |
|------|-------------|
| `code_write` | Write/create code files |
| `code_read` | Read file contents |
| `bash_execute` | Execute shell commands |
| `file_search` | Search for files by pattern |
| `web_search` | Search the web |
| `browser` | Browse web pages |

### 4. Integrations

**Google (OAuth 2.0)**
- Google Calendar: List/create events
- Gmail: Read/send emails
- Google Docs: Read/edit documents

**Microsoft (Graph API)**
- Outlook Calendar: List/create events
- Outlook Mail: Read/send emails

### 5. MCP Support

Connect to any MCP-compatible server:
- HTTP transport
- SSE transport
- Stdio transport (local processes)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/agents` | GET/POST | List/create agents |
| `/v1/agents/:id` | GET/PUT/DELETE | Agent CRUD |
| `/v1/sessions` | GET/POST | List/create sessions |
| `/v1/sessions/:id/messages` | POST | Send message (streaming) |
| `/v1/sessions/:id/stream` | WS | WebSocket for streaming |
| `/v1/skills` | GET/POST | List/create skills |
| `/v1/tools/mcp` | GET/POST | MCP server management |
| `/v1/integrations/:provider/auth` | GET | OAuth flow |

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun 1.1+ |
| Build | Turbo |
| Frontend | React 19+ |
| State | Zustand |
| Styling | Tailwind CSS |
| Desktop | Tauri 2.0 |
| Server | Hono.js |
| AI | Vercel AI SDK 5.0+ |
| MCP | @modelcontextprotocol/sdk |
| Validation | Zod |

## Implementation Phases

### Phase 1: Foundation ✓
- [x] Monorepo setup (Bun + Turbo)
- [x] Core package scaffold
- [x] Basic Tauri desktop shell
- [x] Hono server with health check

### Phase 2: Agent Core ✓
- [x] LLM provider abstraction (AI SDK)
- [x] Agent configuration schema
- [x] Agent executor with tool loop
- [x] Basic built-in tools (code_write, bash_execute)

### Phase 3: Skills System
- [ ] Markdown skill parser
- [ ] Skill discovery service
- [ ] Skill selector UI
- [ ] Default skills library

### Phase 4: MCP Integration
- [ ] MCP client implementation
- [ ] Server management UI
- [ ] Tool discovery from MCP

### Phase 5: OAuth Integrations
- [ ] Google OAuth flow
- [ ] Google Calendar/Gmail/Docs tools
- [ ] Microsoft OAuth flow
- [ ] Outlook Calendar/Mail tools

### Phase 6: UI Polish
- [ ] Chat interface enhancement
- [ ] Agent builder wizard
- [ ] Theme support
- [ ] Keyboard shortcuts

### Phase 7: Testing & Documentation
- [ ] Unit/integration tests
- [ ] API documentation
- [ ] User guides

### Phase 8: Release
- [ ] Multi-platform packaging
- [ ] Auto-update mechanism
- [ ] v1.0.0 release

## Critical Files

1. `packages/openwork/src/agent/executor.ts` - Agent execution engine
2. `packages/openwork/src/server/routes/v1/sessions.ts` - Session API with streaming
3. `packages/app/src/stores/session.store.ts` - Chat session state
4. `packages/openwork/src/skills/loader.ts` - Skill parsing system
5. `packages/openwork/src/mcp/manager.ts` - MCP server management

## Storage Structure

```
~/.openwork/
├── config.json              # Global configuration
├── agents/<uuid>/
│   ├── agent.json          # Agent config
│   ├── system.md           # System prompt
│   └── skills/             # Agent-specific skills
├── sessions/<uuid>/
│   ├── meta.json           # Session metadata
│   └── messages.jsonl      # Message history
├── skills/                 # Global skill library
├── integrations/
│   ├── tokens.json         # OAuth tokens (encrypted)
│   └── mcp-servers.json    # MCP configurations
└── providers/
    └── providers.json      # LLM API keys
```

## Getting Started (Post-Implementation)

```bash
# Install dependencies
bun install

# Start development
bun dev

# Build desktop app
bun run desktop:build
```
