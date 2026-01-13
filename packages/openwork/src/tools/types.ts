import { z } from "zod";
import type { CoreTool } from "ai";

// Tool result type
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Tool definition with metadata
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: "code" | "file" | "system" | "web" | "integration";
  dangerous?: boolean;
  tool: CoreTool;
}

// Tool registry type
export type ToolRegistry = Map<string, ToolDefinition>;
