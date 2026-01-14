import { tool, type CoreTool } from "ai";
import { z } from "zod";
import type { MCPToolInfo } from "./types";
import type { MCPClient } from "./client";

/**
 * Convert a JSON Schema to a Zod schema
 * This is a simplified converter that handles common cases
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
  const type = schema.type as string;

  switch (type) {
    case "string":
      let stringSchema = z.string();
      if (schema.description) {
        stringSchema = stringSchema.describe(schema.description as string);
      }
      return stringSchema;

    case "number":
    case "integer":
      let numberSchema = z.number();
      if (schema.description) {
        numberSchema = numberSchema.describe(schema.description as string);
      }
      return numberSchema;

    case "boolean":
      let boolSchema = z.boolean();
      if (schema.description) {
        boolSchema = boolSchema.describe(schema.description as string);
      }
      return boolSchema;

    case "array":
      const items = schema.items as Record<string, unknown> | undefined;
      const itemSchema = items ? jsonSchemaToZod(items) : z.unknown();
      let arraySchema = z.array(itemSchema);
      if (schema.description) {
        arraySchema = arraySchema.describe(schema.description as string);
      }
      return arraySchema;

    case "object":
      const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
      const required = (schema.required as string[]) || [];

      if (!properties) {
        return z.record(z.unknown());
      }

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, propSchema] of Object.entries(properties)) {
        let propZod = jsonSchemaToZod(propSchema);
        if (!required.includes(key)) {
          propZod = propZod.optional();
        }
        shape[key] = propZod;
      }

      return z.object(shape);

    default:
      return z.unknown();
  }
}

/**
 * Convert MCP tool input schema to Zod schema
 */
export function mcpSchemaToZod(inputSchema: Record<string, unknown>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const zodSchema = jsonSchemaToZod(inputSchema);

  // Ensure we return an object schema
  if (zodSchema instanceof z.ZodObject) {
    return zodSchema;
  }

  // Wrap in object if not already
  return z.object({});
}

/**
 * Convert an MCP tool to a Vercel AI SDK CoreTool
 */
export function mcpToolToCoreTool(
  toolInfo: MCPToolInfo,
  client: MCPClient
): CoreTool {
  const parameters = mcpSchemaToZod(toolInfo.inputSchema);

  return tool({
    description: toolInfo.description || `Tool from ${toolInfo.serverName}`,
    parameters,
    execute: async (args) => {
      const result = await client.callTool(toolInfo.name, args);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Tool execution failed",
        };
      }

      return {
        success: true,
        result: result.result,
      };
    },
  });
}

/**
 * Generate a unique tool ID that includes server context
 */
export function getMCPToolId(serverId: string, toolName: string): string {
  // Use a prefix to avoid collisions with builtin tools
  return `mcp_${serverId}_${toolName}`;
}

/**
 * Parse an MCP tool ID back to server ID and tool name
 */
export function parseMCPToolId(toolId: string): { serverId: string; toolName: string } | null {
  if (!toolId.startsWith("mcp_")) {
    return null;
  }

  const parts = toolId.slice(4).split("_");
  if (parts.length < 2) {
    return null;
  }

  const serverId = parts[0];
  const toolName = parts.slice(1).join("_");

  return { serverId, toolName };
}

/**
 * Convert all tools from an MCP client to CoreTool format
 */
export function convertMCPTools(
  client: MCPClient
): Map<string, CoreTool> {
  const tools = new Map<string, CoreTool>();

  for (const toolInfo of client.tools) {
    const toolId = getMCPToolId(client.serverConfig.id, toolInfo.name);
    const coreTool = mcpToolToCoreTool(toolInfo, client);
    tools.set(toolId, coreTool);
  }

  return tools;
}
