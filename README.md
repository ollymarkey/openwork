# OpenWork

An AI Agent builder desktop application. Create, configure, and run AI agents with custom personas, skills, and tool integrations.

## Attribution

This project is heavily inspired by and based on [OpenCode](https://opencode.ai/) ([GitHub](https://github.com/sst/opencode)), the open-source AI coding agent. OpenCode is a powerful terminal-based AI assistant that has gained significant community adoption with over 50,000 GitHub stars and 650,000+ monthly users.

OpenWork builds upon the concepts and architecture patterns established by OpenCode, adapting them into a desktop application format with a visual interface for agent building and management. We're grateful to the OpenCode team and community for their pioneering work in open-source AI tooling.

## Features

- **Custom Agents**: Build agents with personalized system prompts and behaviors
- **Skills System**: Add capabilities through markdown-based skill files
- **Tool Integrations**: Connect to MCP servers, Google Workspace, Microsoft 365
- **Multi-Provider LLM**: Support for Anthropic, OpenAI, Google, and local models via Ollama
- **Desktop App**: Cross-platform application built with Tauri

## Architecture

OpenWork uses a client-server architecture:

- **Desktop App**: Tauri + React frontend
- **Local Server**: Hono.js HTTP server running on Bun
- **AI Integration**: Vercel AI SDK for multi-provider LLM support

```
┌─────────────────────────────────────────────────────────┐
│                    Desktop Application                   │
│  ┌─────────┐    ┌──────────────┐    ┌───────────────┐   │
│  │  Tools  │    │     Chat     │    │    Agent      │   │
│  │ Sidebar │    │   Interface  │    │   Builder     │   │
│  └─────────┘    └──────────────┘    └───────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                   HTTP / WebSocket
                          │
┌─────────────────────────────────────────────────────────┐
│                     Local Server                         │
│  Agent Executor │ Tool Registry │ MCP Manager │ Storage │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.1+
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/openwork.git
cd openwork

# Install dependencies
bun install

# Start development server
bun dev

# Or run the desktop app
bun run desktop
```

### Building

```bash
# Build all packages
bun run build

# Build desktop app for distribution
bun run desktop:build
```

## Creating Agents

Agents are configured with:

1. **System Prompt**: A markdown file defining the agent's persona
2. **Skills**: Markdown files that add specialized capabilities
3. **Tools**: Built-in tools, MCP servers, or external integrations
4. **LLM Settings**: Provider, model, and generation parameters

### Example Agent

```json
{
  "name": "Code Assistant",
  "systemPrompt": {
    "type": "file",
    "path": "agents/code-assistant/system.md"
  },
  "skills": [
    { "id": "code-review", "path": "skills/code-review.md" }
  ],
  "tools": {
    "builtin": ["code_write", "code_read", "bash_execute"],
    "mcp": [{ "serverId": "filesystem" }]
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.7
  }
}
```

## Skills

Skills are markdown files with YAML frontmatter:

```markdown
---
id: code-review
name: Code Review
triggers:
  - /review
  - "review this code"
---

# Code Review Skill

When reviewing code, follow these guidelines:

1. Check for bugs and logic errors
2. Evaluate code style and readability
3. Identify potential security issues
4. Suggest improvements
```

## Integrations

### MCP Servers

Connect any [Model Context Protocol](https://modelcontextprotocol.io/) compatible server:

```json
{
  "mcp": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  }
}
```

### Google Workspace

- Google Calendar: View and create events
- Gmail: Read and send emails
- Google Docs: Read and edit documents

### Microsoft 365

- Outlook Calendar: View and create events
- Outlook Mail: Read and send emails

## Built-in Tools

| Tool | Description |
|------|-------------|
| `code_write` | Create and modify code files |
| `code_read` | Read file contents |
| `bash_execute` | Execute shell commands |
| `file_search` | Search files by pattern |
| `web_search` | Search the web |

## Configuration

OpenWork stores configuration in `~/.openwork/`:

```
~/.openwork/
├── config.json          # Global settings
├── agents/              # Agent configurations
├── skills/              # Skill library
└── integrations/        # OAuth tokens & MCP configs
```

## Development

### Project Structure

```
openwork/
├── packages/
│   ├── openwork/        # Core server (Hono.js)
│   ├── app/             # Frontend (React)
│   ├── desktop/         # Desktop wrapper (Tauri)
│   └── ui/              # Shared components
├── agents/              # Default agents
├── skills/              # Default skills
└── plan/                # Implementation docs
```

### Tech Stack

- **Runtime**: Bun
- **Frontend**: React 19 + Tailwind CSS
- **State**: Zustand
- **Desktop**: Tauri 2.0
- **Server**: Hono.js
- **AI**: Vercel AI SDK
- **Validation**: Zod

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT
