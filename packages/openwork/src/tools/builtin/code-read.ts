import { z } from "zod";
import { tool } from "ai";
import { readFile, stat } from "fs/promises";
import type { ToolDefinition } from "../types";

const parameters = z.object({
  path: z.string().describe("The absolute file path to read"),
  startLine: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Starting line number (1-based). If not provided, reads from beginning."),
  endLine: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Ending line number (1-based, inclusive). If not provided, reads to end."),
});

export const codeReadTool: ToolDefinition = {
  id: "code_read",
  name: "Code Read",
  description: "Read the contents of a file",
  category: "code",
  dangerous: false,
  tool: tool({
    description:
      "Read the contents of a file. Optionally specify line range to read a portion of the file. Use this to examine code files.",
    parameters,
    execute: async ({ path, startLine, endLine }) => {
      try {
        // Check if file exists and get stats
        const stats = await stat(path);
        if (!stats.isFile()) {
          return {
            success: false,
            error: `Path is not a file: ${path}`,
          };
        }

        // Read file content
        const content = await readFile(path, "utf-8");
        const lines = content.split("\n");
        const totalLines = lines.length;

        // Apply line filtering if specified
        let resultContent = content;
        let resultStartLine = 1;
        let resultEndLine = totalLines;

        if (startLine !== undefined || endLine !== undefined) {
          const start = Math.max(1, startLine ?? 1);
          const end = Math.min(totalLines, endLine ?? totalLines);

          if (start > totalLines) {
            return {
              success: false,
              error: `Start line ${start} exceeds total lines ${totalLines}`,
            };
          }

          resultContent = lines.slice(start - 1, end).join("\n");
          resultStartLine = start;
          resultEndLine = Math.min(end, totalLines);
        }

        // Add line numbers to output for better context
        const numberedLines = resultContent.split("\n").map((line, idx) => {
          const lineNum = resultStartLine + idx;
          return `${lineNum.toString().padStart(4, " ")} | ${line}`;
        });

        return {
          success: true,
          path,
          content: numberedLines.join("\n"),
          totalLines,
          startLine: resultStartLine,
          endLine: resultEndLine,
          sizeBytes: stats.size,
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return {
            success: false,
            error: `File not found: ${path}`,
          };
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),
};
