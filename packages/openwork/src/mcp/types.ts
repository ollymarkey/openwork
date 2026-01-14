import { z } from "zod";

/**
 * MCP Transport types
 */
export const MCPTransportType = z.enum(["stdio", "sse"]);
export type MCPTransportType = z.infer<typeof MCPTransportType>;

/**
 * Base server configuration
 */
const MCPServerConfigBase = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
});

/**
 * Stdio transport configuration
 */
export const MCPStdioConfigSchema = MCPServerConfigBase.extend({
  transport: z.literal("stdio"),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
});
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigSchema>;

/**
 * SSE transport configuration
 */
export const MCPSSEConfigSchema = MCPServerConfigBase.extend({
  transport: z.literal("sse"),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});
export type MCPSSEConfig = z.infer<typeof MCPSSEConfigSchema>;

/**
 * Union of all MCP server configurations
 */
export const MCPServerConfigSchema = z.discriminatedUnion("transport", [
  MCPStdioConfigSchema,
  MCPSSEConfigSchema,
]);
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

/**
 * Connection status
 */
export type MCPConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Tool information from MCP server
 */
export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  serverId: string;
  serverName: string;
}

/**
 * Server state including connection status
 */
export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  error?: string;
  tools: MCPToolInfo[];
  connectedAt?: number;
}

/**
 * Tool call request
 */
export interface MCPToolCallRequest {
  serverId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Tool call result
 */
export interface MCPToolCallResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * MCP server configuration for storage
 */
export interface MCPServersFile {
  version: number;
  servers: MCPServerConfig[];
}

/**
 * Helper to create a new server config with ID
 */
export function createMCPServerConfig(
  input: Omit<MCPServerConfig, "id">
): MCPServerConfig {
  return {
    ...input,
    id: crypto.randomUUID(),
  } as MCPServerConfig;
}
