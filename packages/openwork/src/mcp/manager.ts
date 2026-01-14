import type { CoreTool } from "ai";
import { MCPClient } from "./client";
import { convertMCPTools } from "./converter";
import type {
  MCPServerConfig,
  MCPServerState,
  MCPToolInfo,
  MCPConnectionStatus,
} from "./types";

/**
 * Manager for multiple MCP server connections
 */
export class MCPManager {
  private clients: Map<string, MCPClient> = new Map();

  /**
   * Add a server configuration and optionally connect
   */
  async addServer(config: MCPServerConfig, autoConnect = false): Promise<void> {
    if (this.clients.has(config.id)) {
      throw new Error(`Server with ID ${config.id} already exists`);
    }

    const client = new MCPClient(config);
    this.clients.set(config.id, client);

    if (autoConnect && config.enabled) {
      await this.connectServer(config.id);
    }
  }

  /**
   * Remove a server and disconnect if connected
   */
  async removeServer(serverId: string): Promise<boolean> {
    const client = this.clients.get(serverId);
    if (!client) {
      return false;
    }

    await client.disconnect();
    this.clients.delete(serverId);
    return true;
  }

  /**
   * Connect to a specific server
   */
  async connectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not found`);
    }

    await client.connect();
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not found`);
    }

    await client.disconnect();
  }

  /**
   * Connect to all enabled servers
   */
  async connectAll(): Promise<Map<string, Error | null>> {
    const results = new Map<string, Error | null>();

    for (const [serverId, client] of this.clients) {
      if (!client.serverConfig.enabled) {
        continue;
      }

      try {
        await client.connect();
        results.set(serverId, null);
      } catch (error) {
        results.set(serverId, error as Error);
      }
    }

    return results;
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.disconnect();
    }
  }

  /**
   * Get the state of a specific server
   */
  getServerState(serverId: string): MCPServerState | null {
    const client = this.clients.get(serverId);
    if (!client) {
      return null;
    }

    return {
      config: client.serverConfig,
      status: client.status,
      error: client.error,
      tools: client.tools,
      connectedAt: client.connectedAt,
    };
  }

  /**
   * Get states of all servers
   */
  getAllServerStates(): MCPServerState[] {
    return Array.from(this.clients.values()).map((client) => ({
      config: client.serverConfig,
      status: client.status,
      error: client.error,
      tools: client.tools,
      connectedAt: client.connectedAt,
    }));
  }

  /**
   * Get all tools from connected servers as CoreTools
   */
  getAllTools(): Map<string, CoreTool> {
    const allTools = new Map<string, CoreTool>();

    for (const client of this.clients.values()) {
      if (client.status !== "connected") {
        continue;
      }

      const clientTools = convertMCPTools(client);
      for (const [toolId, tool] of clientTools) {
        allTools.set(toolId, tool);
      }
    }

    return allTools;
  }

  /**
   * Get tools from specific servers
   */
  getToolsFromServers(serverIds: string[]): Map<string, CoreTool> {
    const tools = new Map<string, CoreTool>();

    for (const serverId of serverIds) {
      const client = this.clients.get(serverId);
      if (!client || client.status !== "connected") {
        continue;
      }

      const clientTools = convertMCPTools(client);
      for (const [toolId, tool] of clientTools) {
        tools.set(toolId, tool);
      }
    }

    return tools;
  }

  /**
   * Get all tool info from connected servers
   */
  getAllToolInfo(): MCPToolInfo[] {
    const allTools: MCPToolInfo[] = [];

    for (const client of this.clients.values()) {
      if (client.status !== "connected") {
        continue;
      }

      allTools.push(...client.tools);
    }

    return allTools;
  }

  /**
   * Call a tool by its full ID (mcp_serverId_toolName)
   */
  async callTool(
    toolId: string,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    // Parse the tool ID
    const prefix = "mcp_";
    if (!toolId.startsWith(prefix)) {
      return { success: false, error: "Invalid MCP tool ID" };
    }

    const rest = toolId.slice(prefix.length);
    const firstUnderscore = rest.indexOf("_");
    if (firstUnderscore === -1) {
      return { success: false, error: "Invalid MCP tool ID format" };
    }

    const serverId = rest.slice(0, firstUnderscore);
    const toolName = rest.slice(firstUnderscore + 1);

    const client = this.clients.get(serverId);
    if (!client) {
      return { success: false, error: `Server ${serverId} not found` };
    }

    if (client.status !== "connected") {
      return { success: false, error: `Server ${serverId} is not connected` };
    }

    return client.callTool(toolName, args);
  }

  /**
   * Check if a server exists
   */
  hasServer(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  /**
   * Get server connection status
   */
  getServerStatus(serverId: string): MCPConnectionStatus | null {
    const client = this.clients.get(serverId);
    return client ? client.status : null;
  }

  /**
   * Get count of connected servers
   */
  getConnectedCount(): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.status === "connected") {
        count++;
      }
    }
    return count;
  }

  /**
   * Get total server count
   */
  getServerCount(): number {
    return this.clients.size;
  }

  /**
   * Load multiple server configurations
   */
  async loadServers(configs: MCPServerConfig[], autoConnect = false): Promise<void> {
    for (const config of configs) {
      await this.addServer(config, autoConnect);
    }
  }

  /**
   * Update a server configuration (requires reconnect)
   */
  async updateServer(serverId: string, config: MCPServerConfig): Promise<void> {
    const existing = this.clients.get(serverId);
    if (!existing) {
      throw new Error(`Server ${serverId} not found`);
    }

    const wasConnected = existing.status === "connected";
    await existing.disconnect();
    this.clients.delete(serverId);

    await this.addServer(config, wasConnected);
  }
}

// Singleton instance
let managerInstance: MCPManager | null = null;

/**
 * Get the MCP manager singleton instance
 */
export function getMCPManager(): MCPManager {
  if (!managerInstance) {
    managerInstance = new MCPManager();
  }
  return managerInstance;
}

/**
 * Reset the MCP manager (for testing)
 */
export async function resetMCPManager(): Promise<void> {
  if (managerInstance) {
    await managerInstance.disconnectAll();
    managerInstance = null;
  }
}
