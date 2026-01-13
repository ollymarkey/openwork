import { z } from "zod";

// Built-in tool IDs
export const BuiltinToolId = z.enum([
  "code_write",
  "code_read",
  "bash_execute",
  "file_search",
  "web_search",
  "browser",
]);
export type BuiltinToolId = z.infer<typeof BuiltinToolId>;

// Integration IDs
export const IntegrationId = z.enum([
  "google_calendar",
  "google_docs",
  "gmail",
  "outlook_calendar",
  "outlook_mail",
]);
export type IntegrationId = z.infer<typeof IntegrationId>;

// LLM Provider IDs
export const LLMProviderId = z.enum(["anthropic", "openai", "google", "ollama"]);
export type LLMProviderId = z.infer<typeof LLMProviderId>;

// System prompt configuration
export const SystemPromptSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("inline"),
    content: z.string(),
  }),
  z.object({
    type: z.literal("file"),
    path: z.string(),
  }),
]);
export type SystemPrompt = z.infer<typeof SystemPromptSchema>;

// Skill reference
export const SkillRefSchema = z.object({
  id: z.string(),
  path: z.string(),
  enabled: z.boolean().default(true),
});
export type SkillRef = z.infer<typeof SkillRefSchema>;

// MCP server reference
export const MCPServerRefSchema = z.object({
  serverId: z.string(),
  enabledTools: z.array(z.string()).optional(),
});
export type MCPServerRef = z.infer<typeof MCPServerRefSchema>;

// Tools configuration
export const ToolsConfigSchema = z.object({
  builtin: z.array(BuiltinToolId).default(["code_write", "code_read", "bash_execute"]),
  integrations: z.array(IntegrationId).default([]),
  mcp: z.array(MCPServerRefSchema).default([]),
});
export type ToolsConfig = z.infer<typeof ToolsConfigSchema>;

// LLM configuration
export const LLMConfigSchema = z.object({
  provider: LLMProviderId.default("anthropic"),
  model: z.string().default("claude-sonnet-4-20250514"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().positive().optional(),
});
export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// Agent settings
export const AgentSettingsSchema = z.object({
  maxToolCalls: z.number().positive().default(25),
  streamResponses: z.boolean().default(true),
  confirmDestructiveActions: z.boolean().default(true),
  workingDirectory: z.string().optional(),
});
export type AgentSettings = z.infer<typeof AgentSettingsSchema>;

// Agent metadata
export const AgentMetadataSchema = z.object({
  createdAt: z.number(),
  updatedAt: z.number(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().default("1.0.0"),
});
export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;

// Full Agent configuration
export const AgentConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: SystemPromptSchema,
  skills: z.array(SkillRefSchema).default([]),
  tools: ToolsConfigSchema.default({}),
  llm: LLMConfigSchema.default({}),
  settings: AgentSettingsSchema.default({}),
  metadata: AgentMetadataSchema,
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Agent creation input (without id and metadata)
export const CreateAgentInputSchema = AgentConfigSchema.omit({
  id: true,
  metadata: true,
}).partial({
  skills: true,
  tools: true,
  llm: true,
  settings: true,
});
export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;

// Agent update input
export const UpdateAgentInputSchema = CreateAgentInputSchema.partial();
export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

// Helper to create a new agent with defaults
export function createAgentConfig(input: CreateAgentInput): AgentConfig {
  const now = Date.now();
  return AgentConfigSchema.parse({
    id: crypto.randomUUID(),
    ...input,
    metadata: {
      createdAt: now,
      updatedAt: now,
    },
  });
}
