import { Hono } from "hono";
import { listBuiltinTools } from "../../tools";
import { getProviderInfo, PROVIDER_MODELS, DEFAULT_MODELS, type ProviderId } from "../../llm";

export const toolRoutes = new Hono()
  // List all available tools
  .get("/", async (c) => {
    const builtinTools = listBuiltinTools();

    return c.json({
      builtin: builtinTools,
      integrations: [
        { id: "google_calendar", name: "Google Calendar", connected: false },
        { id: "gmail", name: "Gmail", connected: false },
        { id: "google_docs", name: "Google Docs", connected: false },
        { id: "outlook_calendar", name: "Outlook Calendar", connected: false },
        { id: "outlook_mail", name: "Outlook Mail", connected: false },
      ],
      mcp: [],
    });
  })

  // MCP server management
  .get("/mcp", async (c) => {
    // TODO: List configured MCP servers from storage
    return c.json({ servers: [] });
  })

  .post("/mcp", async (c) => {
    const body = await c.req.json();
    // TODO: Add MCP server configuration to storage
    return c.json(
      {
        id: crypto.randomUUID(),
        ...body,
        status: "configured",
      },
      201
    );
  })

  .delete("/mcp/:id", async (c) => {
    const id = c.req.param("id");
    // TODO: Remove MCP server from storage
    return c.json({ deleted: true, id });
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
