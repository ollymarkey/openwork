import { z } from "zod";
import { tool } from "ai";
import { spawn } from "child_process";
import type { ToolDefinition } from "../types";

const parameters = z.object({
  command: z.string().describe("The bash command to execute"),
  cwd: z
    .string()
    .optional()
    .describe("Working directory for the command. Defaults to current directory."),
  timeout: z
    .number()
    .int()
    .positive()
    .default(30000)
    .describe("Timeout in milliseconds (default: 30000)"),
  env: z
    .record(z.string())
    .optional()
    .describe("Additional environment variables to set"),
});

// Determine the shell based on platform
const getShell = (): { shell: string; shellArg: string } => {
  if (process.platform === "win32") {
    return { shell: "cmd.exe", shellArg: "/c" };
  }
  return { shell: "/bin/bash", shellArg: "-c" };
};

export const bashExecuteTool: ToolDefinition = {
  id: "bash_execute",
  name: "Bash Execute",
  description: "Execute shell commands",
  category: "system",
  dangerous: true,
  tool: tool({
    description:
      "Execute a shell command and return the output. Use this for running builds, tests, git commands, and other system operations.",
    parameters,
    execute: async ({ command, cwd, timeout, env }) => {
      const { shell, shellArg } = getShell();

      return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let killed = false;

        const proc = spawn(shell, [shellArg, command], {
          cwd: cwd ?? process.cwd(),
          env: { ...process.env, ...env },
          shell: false,
        });

        // Set timeout
        const timeoutId = setTimeout(() => {
          killed = true;
          proc.kill("SIGTERM");
          // Force kill after 5 seconds if still running
          setTimeout(() => proc.kill("SIGKILL"), 5000);
        }, timeout);

        proc.stdout.on("data", (data) => {
          stdout += data.toString();
          // Limit output size to prevent memory issues
          if (stdout.length > 100000) {
            stdout = stdout.slice(-100000);
          }
        });

        proc.stderr.on("data", (data) => {
          stderr += data.toString();
          if (stderr.length > 100000) {
            stderr = stderr.slice(-100000);
          }
        });

        proc.on("close", (code, signal) => {
          clearTimeout(timeoutId);

          resolve({
            success: code === 0,
            exitCode: code,
            signal,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            killed,
            timedOut: killed,
            message:
              code === 0
                ? "Command executed successfully"
                : killed
                  ? `Command timed out after ${timeout}ms`
                  : `Command failed with exit code ${code}`,
          });
        });

        proc.on("error", (error) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            exitCode: -1,
            stdout: "",
            stderr: error.message,
            error: error.message,
          });
        });
      });
    },
  }),
};
