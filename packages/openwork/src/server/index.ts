import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { v1Routes } from "../routes/v1";

export interface ServerConfig {
  port?: number;
  hostname?: string;
}

export function createServer() {
  const app = new Hono();

  // Middleware
  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: ["http://localhost:3000", "http://localhost:5173", "tauri://localhost"],
      credentials: true,
    })
  );

  // Health check
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    });
  });

  // API routes
  app.route("/v1", v1Routes);

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: "Not found" }, 404);
  });

  // Error handler
  app.onError((err, c) => {
    console.error("Server error:", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}

export async function startServer(config: ServerConfig = {}) {
  const { port = 4096, hostname = "localhost" } = config;
  const app = createServer();

  console.log(`Starting OpenWork server on http://${hostname}:${port}`);

  const server = Bun.serve({
    port,
    hostname,
    fetch: app.fetch,
  });

  console.log(`Server running at http://${server.hostname}:${server.port}`);

  return server;
}

// Start server if run directly
if (import.meta.main) {
  startServer();
}
