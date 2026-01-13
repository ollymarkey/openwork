import { z } from "zod";
import { tool } from "ai";
import { readdir, stat } from "fs/promises";
import { join, relative } from "path";
import type { ToolDefinition } from "../types";

const parameters = z.object({
  directory: z.string().describe("The directory to search in"),
  pattern: z
    .string()
    .optional()
    .describe("Glob-like pattern to match files (e.g., '*.ts', 'test*.js')"),
  recursive: z.boolean().default(true).describe("Search subdirectories recursively"),
  maxResults: z.number().int().positive().default(100).describe("Maximum number of results"),
  includeHidden: z.boolean().default(false).describe("Include hidden files (starting with .)"),
});

// Simple glob pattern matching
function matchPattern(filename: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regexPattern}$`, "i").test(filename);
}

async function searchDirectory(
  dir: string,
  options: {
    pattern?: string;
    recursive: boolean;
    maxResults: number;
    includeHidden: boolean;
  },
  results: string[] = [],
  baseDir: string = dir
): Promise<string[]> {
  if (results.length >= options.maxResults) {
    return results;
  }

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= options.maxResults) break;

      // Skip hidden files unless requested
      if (!options.includeHidden && entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = join(dir, entry.name);
      const relativePath = relative(baseDir, fullPath);

      if (entry.isDirectory() && options.recursive) {
        await searchDirectory(fullPath, options, results, baseDir);
      } else if (entry.isFile()) {
        if (!options.pattern || matchPattern(entry.name, options.pattern)) {
          results.push(relativePath);
        }
      }
    }
  } catch {
    // Ignore permission errors and continue
  }

  return results;
}

export const fileSearchTool: ToolDefinition = {
  id: "file_search",
  name: "File Search",
  description: "Search for files in a directory",
  category: "file",
  dangerous: false,
  tool: tool({
    description:
      "Search for files in a directory matching a pattern. Use this to find code files, configuration files, or any other files.",
    parameters,
    execute: async ({ directory, pattern, recursive, maxResults, includeHidden }) => {
      try {
        // Verify directory exists
        const stats = await stat(directory);
        if (!stats.isDirectory()) {
          return {
            success: false,
            error: `Path is not a directory: ${directory}`,
          };
        }

        const results = await searchDirectory(directory, {
          pattern,
          recursive,
          maxResults,
          includeHidden,
        });

        return {
          success: true,
          directory,
          pattern: pattern ?? "*",
          files: results,
          count: results.length,
          truncated: results.length >= maxResults,
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return {
            success: false,
            error: `Directory not found: ${directory}`,
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
