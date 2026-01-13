import { codeWriteTool } from "./code-write";
import { codeReadTool } from "./code-read";
import { bashExecuteTool } from "./bash-execute";
import { fileSearchTool } from "./file-search";
import type { ToolDefinition, ToolRegistry } from "../types";
import type { BuiltinToolId } from "../../agent/types";

// All built-in tools
export const BUILTIN_TOOLS: Record<string, ToolDefinition> = {
  code_write: codeWriteTool,
  code_read: codeReadTool,
  bash_execute: bashExecuteTool,
  file_search: fileSearchTool,
};

/**
 * Get a specific built-in tool by ID
 */
export function getBuiltinTool(toolId: BuiltinToolId): ToolDefinition | undefined {
  return BUILTIN_TOOLS[toolId];
}

/**
 * Get multiple built-in tools by IDs
 */
export function getBuiltinTools(toolIds: BuiltinToolId[]): ToolRegistry {
  const registry: ToolRegistry = new Map();
  for (const toolId of toolIds) {
    const tool = BUILTIN_TOOLS[toolId];
    if (tool) {
      registry.set(toolId, tool);
    }
  }
  return registry;
}

/**
 * Get all built-in tools
 */
export function getAllBuiltinTools(): ToolRegistry {
  const registry: ToolRegistry = new Map();
  for (const [id, tool] of Object.entries(BUILTIN_TOOLS)) {
    registry.set(id, tool);
  }
  return registry;
}

/**
 * List all available built-in tools with their metadata
 */
export function listBuiltinTools(): Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  dangerous: boolean;
}> {
  return Object.entries(BUILTIN_TOOLS).map(([id, tool]) => ({
    id,
    name: tool.name,
    description: tool.description,
    category: tool.category,
    dangerous: tool.dangerous ?? false,
  }));
}

export { codeWriteTool, codeReadTool, bashExecuteTool, fileSearchTool };
