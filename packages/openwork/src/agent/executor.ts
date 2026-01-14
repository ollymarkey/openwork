import { streamText, generateText, type CoreMessage, type CoreTool } from "ai";
import { getLanguageModel, type ProviderId, type ProviderConfig } from "../llm";
import { getBuiltinTools } from "../tools";
import { SkillDiscoveryService, SkillLoader, type Skill } from "../skills";
import { getMCPManager } from "../mcp";
import { getStorage } from "../storage";
import type { AgentConfig, BuiltinToolId } from "./types";
import { readFile } from "fs/promises";

// Message types for the executor
export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: number;
}

export interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
}

// Stream chunk types
export type StreamChunk =
  | { type: "text_delta"; content: string }
  | { type: "tool_call_start"; toolCall: ToolCall }
  | { type: "tool_call_end"; toolCallId: string; result: unknown }
  | { type: "message_start"; id: string }
  | { type: "message_end"; id: string; finishReason: string }
  | { type: "error"; error: string };

/**
 * Agent Executor - handles LLM interactions and tool execution
 */
export class AgentExecutor {
  private config: AgentConfig;
  private providerConfig?: ProviderConfig;
  private systemPrompt: string = "";
  private tools: Record<string, CoreTool> = {};
  private initialized: boolean = false;
  private skillLoader: SkillLoader;
  private loadedSkills: Skill[] = [];

  constructor(config: AgentConfig, providerConfig?: ProviderConfig) {
    this.config = config;
    this.providerConfig = providerConfig;

    // Initialize skill loader with storage directory
    const storage = getStorage();
    const discovery = new SkillDiscoveryService([storage.getSkillsDir()]);
    this.skillLoader = new SkillLoader(discovery);
  }

  /**
   * Initialize the executor - load system prompt, skills, and tools
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load system prompt
    this.systemPrompt = await this.loadSystemPrompt();

    // Load skills and append to system prompt
    await this.loadSkills();

    // Load tools
    await this.loadTools();

    this.initialized = true;
  }

  /**
   * Load skills for this agent and append to system prompt
   */
  private async loadSkills(): Promise<void> {
    if (!this.config.skills || this.config.skills.length === 0) {
      return;
    }

    this.loadedSkills = await this.skillLoader.loadForAgent(this.config.skills);

    if (this.loadedSkills.length > 0) {
      const skillContext = this.skillLoader.buildSkillContext(this.loadedSkills);
      this.systemPrompt += skillContext;
    }
  }

  /**
   * Load the system prompt from config
   */
  private async loadSystemPrompt(): Promise<string> {
    const { systemPrompt } = this.config;

    if (systemPrompt.type === "inline") {
      return systemPrompt.content;
    }

    // Load from file
    try {
      return await readFile(systemPrompt.path, "utf-8");
    } catch (error) {
      console.error(`Failed to load system prompt from ${systemPrompt.path}:`, error);
      return "";
    }
  }

  /**
   * Load and configure tools
   */
  private async loadTools(): Promise<void> {
    // Load built-in tools
    const builtinToolIds = this.config.tools.builtin as BuiltinToolId[];
    const builtinTools = getBuiltinTools(builtinToolIds);

    // Convert to CoreTool record
    for (const [id, toolDef] of builtinTools) {
      this.tools[id] = toolDef.tool;
    }

    // Load MCP tools
    await this.loadMCPTools();

    // TODO: Load integration tools
  }

  /**
   * Load tools from configured MCP servers
   */
  private async loadMCPTools(): Promise<void> {
    const mcpRefs = this.config.tools.mcp;
    if (!mcpRefs || mcpRefs.length === 0) {
      return;
    }

    const mcpManager = getMCPManager();
    const storage = getStorage();

    // Get server IDs that should be loaded
    const serverIds = mcpRefs.map((ref) => ref.serverId);

    // Ensure servers are loaded and connected
    for (const serverId of serverIds) {
      if (!mcpManager.hasServer(serverId)) {
        // Try to load from storage
        const config = await storage.getMCPServer(serverId);
        if (config && config.enabled) {
          try {
            await mcpManager.addServer(config, true);
          } catch (error) {
            console.error(`Failed to connect to MCP server ${serverId}:`, error);
          }
        }
      } else {
        // Connect if not already connected
        const status = mcpManager.getServerStatus(serverId);
        if (status !== "connected") {
          try {
            await mcpManager.connectServer(serverId);
          } catch (error) {
            console.error(`Failed to connect to MCP server ${serverId}:`, error);
          }
        }
      }
    }

    // Get tools from specified servers
    const mcpTools = mcpManager.getToolsFromServers(serverIds);

    // Filter tools if enabledTools is specified in config
    for (const ref of mcpRefs) {
      if (ref.enabledTools && ref.enabledTools.length > 0) {
        // Only include specified tools from this server
        const prefix = `mcp_${ref.serverId}_`;
        for (const [toolId, tool] of mcpTools) {
          if (toolId.startsWith(prefix)) {
            const toolName = toolId.slice(prefix.length);
            if (ref.enabledTools.includes(toolName)) {
              this.tools[toolId] = tool;
            }
          }
        }
      } else {
        // Include all tools from this server
        const prefix = `mcp_${ref.serverId}_`;
        for (const [toolId, tool] of mcpTools) {
          if (toolId.startsWith(prefix)) {
            this.tools[toolId] = tool;
          }
        }
      }
    }
  }

  /**
   * Convert internal messages to AI SDK format
   */
  private toAIMessages(messages: Message[]): CoreMessage[] {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool" as const,
          content: msg.toolResults?.map((r) => ({
            type: "tool-result" as const,
            toolCallId: r.toolCallId,
            toolName: r.toolName,
            result: r.result,
          })) ?? [],
        };
      }

      return {
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      };
    });
  }

  /**
   * Get the language model based on config
   */
  private getModel() {
    return getLanguageModel(
      this.config.llm.provider as ProviderId,
      this.config.llm.model,
      this.providerConfig
    );
  }

  /**
   * Stream a response for the given messages
   */
  async *stream(messages: Message[]): AsyncGenerator<StreamChunk> {
    await this.initialize();

    const messageId = crypto.randomUUID();
    yield { type: "message_start", id: messageId };

    try {
      const result = streamText({
        model: this.getModel(),
        system: this.systemPrompt,
        messages: this.toAIMessages(messages),
        tools: this.tools,
        maxSteps: this.config.settings.maxToolCalls,
        temperature: this.config.llm.temperature,
        maxTokens: this.config.llm.maxTokens,
        onStepFinish: async ({ toolCalls, toolResults }) => {
          // This callback is called after each step (tool execution)
          // We handle streaming separately below
        },
      });

      // Stream text content
      for await (const chunk of result.textStream) {
        yield { type: "text_delta", content: chunk };
      }

      // Get final result for tool calls
      const finalResult = await result;

      // Yield tool calls if any
      if (finalResult.toolCalls && finalResult.toolCalls.length > 0) {
        for (const toolCall of finalResult.toolCalls) {
          yield {
            type: "tool_call_start",
            toolCall: {
              id: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args: toolCall.args as Record<string, unknown>,
            },
          };
        }
      }

      // Yield tool results if any
      if (finalResult.toolResults && finalResult.toolResults.length > 0) {
        for (const toolResult of finalResult.toolResults) {
          yield {
            type: "tool_call_end",
            toolCallId: toolResult.toolCallId,
            result: toolResult.result,
          };
        }
      }

      yield {
        type: "message_end",
        id: messageId,
        finishReason: finalResult.finishReason ?? "stop",
      };
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate a single response (non-streaming)
   */
  async generate(messages: Message[]): Promise<{
    content: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    finishReason: string;
  }> {
    await this.initialize();

    const result = await generateText({
      model: this.getModel(),
      system: this.systemPrompt,
      messages: this.toAIMessages(messages),
      tools: this.tools,
      maxSteps: this.config.settings.maxToolCalls,
      temperature: this.config.llm.temperature,
      maxTokens: this.config.llm.maxTokens,
    });

    return {
      content: result.text,
      toolCalls: result.toolCalls?.map((tc) => ({
        id: tc.toolCallId,
        toolName: tc.toolName,
        args: tc.args as Record<string, unknown>,
      })),
      toolResults: result.toolResults?.map((tr) => ({
        toolCallId: tr.toolCallId,
        toolName: tr.toolName,
        result: tr.result,
      })),
      finishReason: result.finishReason ?? "stop",
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Get loaded skills
   */
  getLoadedSkills(): Skill[] {
    return this.loadedSkills;
  }

  /**
   * Get the skill loader instance
   */
  getSkillLoader(): SkillLoader {
    return this.skillLoader;
  }

  /**
   * Update the configuration (requires re-initialization)
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
    this.initialized = false;
    this.loadedSkills = [];
  }
}

/**
 * Create an executor for an agent configuration
 */
export function createExecutor(
  config: AgentConfig,
  providerConfig?: ProviderConfig
): AgentExecutor {
  return new AgentExecutor(config, providerConfig);
}
