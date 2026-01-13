import { z } from "zod";
import { tool } from "ai";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { ToolDefinition } from "../types";

const parameters = z.object({
  path: z.string().describe("The absolute file path to write to"),
  content: z.string().describe("The content to write to the file"),
  createDirectories: z
    .boolean()
    .default(true)
    .describe("Create parent directories if they don't exist"),
});

export const codeWriteTool: ToolDefinition = {
  id: "code_write",
  name: "Code Write",
  description: "Write or create a file with the specified content",
  category: "code",
  dangerous: true,
  tool: tool({
    description:
      "Write content to a file. Creates the file if it doesn't exist, or overwrites if it does. Use this to create or modify code files.",
    parameters,
    execute: async ({ path, content, createDirectories }) => {
      try {
        // Create parent directories if needed
        if (createDirectories) {
          await mkdir(dirname(path), { recursive: true });
        }

        // Write the file
        await writeFile(path, content, "utf-8");

        return {
          success: true,
          path,
          bytesWritten: Buffer.byteLength(content, "utf-8"),
          message: `Successfully wrote ${Buffer.byteLength(content, "utf-8")} bytes to ${path}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),
};
