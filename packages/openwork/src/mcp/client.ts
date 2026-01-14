import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  MCPServerConfig,
  MCPStdioConfig,
  MCPSSEConfig,
  MCPConnectionStatus,
  MCPToolInfo,
} from "./types";

/**
 * Wrapper around the MCP SDK Client with connection management
 */
export class MCPClient {
  private client: Client;
  private transport: Transport | null = null;
  private config: MCPServerConfig;
  private _status: MCPConnectionStatus = "disconnected";
  private _error?: string;
  private _tools: MCPToolInfo[] = [];
  private _connectedAt?: number;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.client = new Client(
      {
        name: "openwork",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Get current connection status
   */
  get status(): MCPConnectionStatus {
    return this._status;
  }

  /**
   * Get last error message
   */
  get error(): string | undefined {
    return this._error;
  }

  /**
   * Get discovered tools
   */
  get tools(): MCPToolInfo[] {
    return this._tools;
  }

  /**
   * Get connection timestamp
   */
  get connectedAt(): number | undefined {
    return this._connectedAt;
  }

  /**
   * Get the server configuration
   */
  get serverConfig(): MCPServerConfig {
    return this.config;
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this._status === "connected" || this._status === "connecting") {
      return;
    }

    this._status = "connecting";
    this._error = undefined;

    try {
      // Create appropriate transport based on config
      this.transport = this.createTransport();

      // Set up transport event handlers
      this.transport.onerror = (error) => {
        this._error = error.message;
        this._status = "error";
      };

      this.transport.onclose = () => {
        this._status = "disconnected";
        this._tools = [];
      };

      // Connect client to transport
      await this.client.connect(this.transport);

      // Discover available tools
      await this.discoverTools();

      this._status = "connected";
      this._connectedAt = Date.now();
    } catch (error) {
      this._status = "error";
      this._error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this._status === "disconnected") {
      return;
    }

    try {
      await this.client.close();
    } catch {
      // Ignore close errors
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // Ignore close errors
      }
      this.transport = null;
    }

    this._status = "disconnected";
    this._tools = [];
    this._connectedAt = undefined;
  }

  /**
   * Discover tools from the connected server
   */
  async discoverTools(): Promise<MCPToolInfo[]> {
    if (this._status !== "connected" && this._status !== "connecting") {
      throw new Error("Not connected to MCP server");
    }

    try {
      const result = await this.client.listTools();

      this._tools = result.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
        serverId: this.config.id,
        serverName: this.config.name,
      }));

      return this._tools;
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Call a tool on the server
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    if (this._status !== "connected") {
      return { success: false, error: "Not connected to MCP server" };
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      // Handle different result formats
      if ("toolResult" in result) {
        return { success: true, result: result.toolResult };
      }

      // Extract text content from result
      const content = result.content;
      if (Array.isArray(content)) {
        const textContent = content
          .filter((c) => c.type === "text")
          .map((c) => (c as { text: string }).text)
          .join("\n");

        if (result.isError) {
          return { success: false, error: textContent || "Tool execution failed" };
        }

        return { success: true, result: textContent };
      }

      return { success: true, result: content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create transport based on configuration
   */
  private createTransport(): Transport {
    switch (this.config.transport) {
      case "stdio":
        return this.createStdioTransport(this.config as MCPStdioConfig);
      case "sse":
        return this.createSSETransport(this.config as MCPSSEConfig);
      default:
        throw new Error(`Unsupported transport: ${(this.config as MCPServerConfig).transport}`);
    }
  }

  /**
   * Create stdio transport
   */
  private createStdioTransport(config: MCPStdioConfig): StdioClientTransport {
    return new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
      cwd: config.cwd,
    });
  }

  /**
   * Create SSE transport
   */
  private createSSETransport(config: MCPSSEConfig): SSEClientTransport {
    const url = new URL(config.url);
    return new SSEClientTransport(url, {
      requestInit: config.headers
        ? { headers: config.headers }
        : undefined,
    });
  }
}
