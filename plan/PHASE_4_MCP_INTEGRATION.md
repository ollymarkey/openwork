# Phase 4: MCP Integration - Implementation Plan

## Overview

MCP (Model Context Protocol) enables agents to connect to external tool servers. This phase implements the client-side MCP integration, allowing agents to discover and use tools from configured MCP servers.

## Current State

- `@modelcontextprotocol/sdk` v1.0.4 is already installed
- `MCPServerRefSchema` type exists in agent types
- Agent config supports `tools.mcp` array
- Tool routes have placeholder MCP endpoints
- Storage has `integrations/` directory ready

## MCP Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Executor                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Built-in    │  │ Integration │  │   MCP Tools     │  │
│  │ Tools       │  │ Tools       │  │ (from servers)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                    MCPManager │
                              ▼
         ┌────────────────────────────────────┐
         │         MCP Server Pool            │
         │  ┌──────┐  ┌──────┐  ┌──────┐     │
         │  │ SSE  │  │ HTTP │  │Stdio │     │
         │  └──────┘  └──────┘  └──────┘     │
         └────────────────────────────────────┘
```

## Implementation Tasks

### Task 1: MCP Types

**File:** `packages/openwork/src/mcp/types.ts`

```typescript
import { z } from "zod";

// Transport type
export const MCPTransportType = z.enum(["stdio", "sse", "http"]);
export type MCPTransportType = z.infer<typeof MCPTransportType>;

// Server configuration schema
export const MCPServerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  transport: MCPTransportType,
  // For stdio transport
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  // For HTTP/SSE transport
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  // Metadata
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

// Connection status
export type MCPConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

// Server state
export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  error?: string;
  tools: MCPToolInfo[];
  lastConnected?: number;
}

// Tool info from MCP server
export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  serverId: string;
}
```

### Task 2: MCP Client Wrapper

**File:** `packages/openwork/src/mcp/client.ts`

Wraps the @modelcontextprotocol/sdk Client with connection management.

### Task 3: MCP Manager

**File:** `packages/openwork/src/mcp/manager.ts`

Manages multiple MCP server connections:
- Connect/disconnect servers
- Discover tools from servers
- Execute tool calls
- Handle reconnection

### Task 4: MCP Tool Converter

**File:** `packages/openwork/src/mcp/converter.ts`

Converts MCP tool definitions to Vercel AI SDK CoreTool format.

### Task 5: Storage Updates

**File:** `packages/openwork/src/storage/index.ts`

Add methods:
- `saveMCPServers(configs: MCPServerConfig[])`
- `loadMCPServers(): MCPServerConfig[]`
- `addMCPServer(config: MCPServerConfig)`
- `removeMCPServer(id: string)`

### Task 6: API Routes

**File:** `packages/openwork/src/routes/v1/tools.ts`

Implement:
- `GET /mcp` - List MCP servers with status
- `POST /mcp` - Add MCP server
- `PUT /mcp/:id` - Update MCP server
- `DELETE /mcp/:id` - Remove MCP server
- `POST /mcp/:id/connect` - Connect to server
- `POST /mcp/:id/disconnect` - Disconnect from server
- `GET /mcp/:id/tools` - List tools from server

### Task 7: Agent Executor Integration

**File:** `packages/openwork/src/agent/executor.ts`

Update `loadTools()` to:
1. Get enabled MCP servers from agent config
2. Connect to each server via MCPManager
3. Get tools from each server
4. Convert to CoreTool format
5. Add to tool registry

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/mcp/types.ts` | Create | MCP type definitions |
| `src/mcp/client.ts` | Create | MCP client wrapper |
| `src/mcp/manager.ts` | Create | Multi-server manager |
| `src/mcp/converter.ts` | Create | Tool format converter |
| `src/mcp/index.ts` | Create | Public exports |
| `src/storage/index.ts` | Update | MCP storage methods |
| `src/routes/v1/tools.ts` | Update | Implement MCP endpoints |
| `src/agent/executor.ts` | Update | Load MCP tools |

## Implementation Order

1. Create `mcp/types.ts` - Type definitions
2. Create `mcp/client.ts` - Client wrapper
3. Create `mcp/converter.ts` - Tool converter
4. Create `mcp/manager.ts` - Server manager
5. Create `mcp/index.ts` - Public exports
6. Update `storage/index.ts` - MCP persistence
7. Update `routes/v1/tools.ts` - API endpoints
8. Update `agent/executor.ts` - Integration

## Testing Checklist

- [ ] Create MCP server config
- [ ] Connect to stdio MCP server
- [ ] Connect to SSE MCP server
- [ ] Discover tools from server
- [ ] Convert MCP tool to CoreTool
- [ ] Execute MCP tool call
- [ ] Handle server disconnection
- [ ] Persist server configurations
- [ ] API: List servers
- [ ] API: Add server
- [ ] API: Remove server
- [ ] Agent loads MCP tools

## Notes

- MCP tool names are prefixed with server ID to avoid collisions
- Stdio transport spawns a child process
- SSE transport maintains a persistent connection
- Tool execution proxies to the MCP server
- Errors are captured and returned in tool results
