import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { listBuiltinTools } from "../../tools";
import { getProviderInfo, PROVIDER_MODELS, DEFAULT_MODELS, type ProviderId } from "../../llm";
import { getStorage } from "../../storage";
import {
  getMCPManager,
  MCPServerConfigSchema,
  createMCPServerConfig,
} from "../../mcp";

const storage = getStorage();
const mcpManager = getMCPManager();

// Schema for creating an MCP server
const CreateMCPServerSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(["stdio", "sse"]),
  // Stdio options
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  // SSE options
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  // Common options
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});

// Schema for updating an MCP server
const UpdateMCPServerSchema = CreateMCPServerSchema.partial();

export const toolRoutes = new Hono()
  // List all available tools
  .get("/", async (c) => {
    const builtinTools = listBuiltinTools();
    const mcpServers = mcpManager.getAllServerStates();

    // Get MCP tools from connected servers
    const mcpTools = mcpManager.getAllToolInfo().map((tool) => ({
      id: `mcp_${tool.serverId}_${tool.name}`,
      name: tool.name,
      description: tool.description,
      serverId: tool.serverId,
      serverName: tool.serverName,
    }));

    return c.json({
      builtin: builtinTools,
      integrations: [
        { id: "google_calendar", name: "Google Calendar", connected: false },
        { id: "gmail", name: "Gmail", connected: false },
        { id: "google_docs", name: "Google Docs", connected: false },
        { id: "outlook_calendar", name: "Outlook Calendar", connected: false },
        { id: "outlook_mail", name: "Outlook Mail", connected: false },
      ],
      mcp: mcpTools,
      mcpServers: mcpServers.map((s) => ({
        id: s.config.id,
        name: s.config.name,
        status: s.status,
        toolCount: s.tools.length,
      })),
    });
  })

  // List MCP servers
  .get("/mcp", async (c) => {
    const servers = mcpManager.getAllServerStates();

    return c.json({
      servers: servers.map((s) => ({
        id: s.config.id,
        name: s.config.name,
        transport: s.config.transport,
        enabled: s.config.enabled,
        description: s.config.description,
        status: s.status,
        error: s.error,
        tools: s.tools,
        connectedAt: s.connectedAt,
      })),
    });
  })

  // Add MCP server
  .post("/mcp", zValidator("json", CreateMCPServerSchema), async (c) => {
    const input = c.req.valid("json");

    // Validate transport-specific fields
    if (input.transport === "stdio" && !input.command) {
      return c.json({ error: "Command is required for stdio transport" }, 400);
    }
    if (input.transport === "sse" && !input.url) {
      return c.json({ error: "URL is required for SSE transport" }, 400);
    }

    // Create config with ID
    const config = createMCPServerConfig(input as Omit<typeof MCPServerConfigSchema._type, "id">);

    try {
      // Save to storage
      await storage.addMCPServer(config);

      // Add to manager
      await mcpManager.addServer(config, false);

      return c.json({ server: config }, 201);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "Failed to add server" },
        500
      );
    }
  })

  // Get MCP server by ID
  .get("/mcp/:id", async (c) => {
    const id = c.req.param("id");
    const state = mcpManager.getServerState(id);

    if (!state) {
      return c.json({ error: "Server not found" }, 404);
    }

    return c.json({ server: state });
  })

  // Update MCP server
  .put("/mcp/:id", zValidator("json", UpdateMCPServerSchema), async (c) => {
    const id = c.req.param("id");
    const updates = c.req.valid("json");

    const existing = await storage.getMCPServer(id);
    if (!existing) {
      return c.json({ error: "Server not found" }, 404);
    }

    // Merge updates - keep the transport type from existing
    const updated = { ...existing, ...updates } as typeof existing;

    try {
      await storage.updateMCPServer(id, updated);
      await mcpManager.updateServer(id, updated);

      return c.json({ server: updated });
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "Failed to update server" },
        500
      );
    }
  })

  // Delete MCP server
  .delete("/mcp/:id", async (c) => {
    const id = c.req.param("id");

    const removed = await storage.removeMCPServer(id);
    if (!removed) {
      return c.json({ error: "Server not found" }, 404);
    }

    await mcpManager.removeServer(id);

    return c.json({ deleted: true, id });
  })

  // Connect to MCP server
  .post("/mcp/:id/connect", async (c) => {
    const id = c.req.param("id");

    if (!mcpManager.hasServer(id)) {
      // Try loading from storage
      const config = await storage.getMCPServer(id);
      if (!config) {
        return c.json({ error: "Server not found" }, 404);
      }
      await mcpManager.addServer(config, false);
    }

    try {
      await mcpManager.connectServer(id);
      const state = mcpManager.getServerState(id);

      return c.json({
        status: state?.status,
        tools: state?.tools || [],
      });
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to connect",
          status: "error",
        },
        500
      );
    }
  })

  // Disconnect from MCP server
  .post("/mcp/:id/disconnect", async (c) => {
    const id = c.req.param("id");

    if (!mcpManager.hasServer(id)) {
      return c.json({ error: "Server not found" }, 404);
    }

    try {
      await mcpManager.disconnectServer(id);
      return c.json({ status: "disconnected" });
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "Failed to disconnect" },
        500
      );
    }
  })

  // Get tools from MCP server
  .get("/mcp/:id/tools", async (c) => {
    const id = c.req.param("id");
    const state = mcpManager.getServerState(id);

    if (!state) {
      return c.json({ error: "Server not found" }, 404);
    }

    if (state.status !== "connected") {
      return c.json({ error: "Server not connected", status: state.status }, 400);
    }

    return c.json({ tools: state.tools });
  })

  // Integration management
  .get("/integrations", async (c) => {
    return c.json({
      available: [
        {
          id: "google_calendar",
          name: "Google Calendar",
          provider: "google",
          description: "View and create calendar events",
        },
        {
          id: "gmail",
          name: "Gmail",
          provider: "google",
          description: "Read and send emails",
        },
        {
          id: "google_docs",
          name: "Google Docs",
          provider: "google",
          description: "Read and edit documents",
        },
        {
          id: "outlook_calendar",
          name: "Outlook Calendar",
          provider: "microsoft",
          description: "View and create calendar events",
        },
        {
          id: "outlook_mail",
          name: "Outlook Mail",
          provider: "microsoft",
          description: "Read and send emails",
        },
      ],
      connected: [],
    });
  })

  .post("/integrations/:provider/auth", async (c) => {
    const provider = c.req.param("provider");
    // TODO: Implement OAuth flow
    return c.json({
      provider,
      authUrl: `https://example.com/oauth/${provider}`,
      status: "not_implemented",
    });
  })

  // LLM providers info
  .get("/providers", async (c) => {
    const providers = (["anthropic", "openai", "google", "ollama"] as ProviderId[]).map(
      (providerId) => ({
        id: providerId,
        ...getProviderInfo(providerId),
        models: PROVIDER_MODELS[providerId],
        defaultModel: DEFAULT_MODELS[providerId],
      })
    );

    return c.json({ providers });
  });
