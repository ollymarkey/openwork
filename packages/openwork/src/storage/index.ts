import { readFile, writeFile, mkdir, readdir, rm, appendFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { z } from "zod";
import type { AgentConfig, CreateAgentInput } from "../agent";
import { AgentConfigSchema, createAgentConfig } from "../agent";
import type { Message } from "../agent/executor";

// Default storage directory
const DEFAULT_STORAGE_DIR = join(homedir(), ".openwork");

// Session metadata schema
const SessionMetadataSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  name: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

// Message schema for storage
const StoredMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        toolName: z.string(),
        args: z.record(z.unknown()),
      })
    )
    .optional(),
  toolResults: z
    .array(
      z.object({
        toolCallId: z.string(),
        toolName: z.string(),
        result: z.unknown(),
      })
    )
    .optional(),
  timestamp: z.number(),
});
type StoredMessage = z.infer<typeof StoredMessageSchema>;

/**
 * Storage service for persisting agents, sessions, and messages
 */
export class StorageService {
  private basePath: string;

  constructor(basePath: string = DEFAULT_STORAGE_DIR) {
    this.basePath = basePath;
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    await mkdir(join(this.basePath, "agents"), { recursive: true });
    await mkdir(join(this.basePath, "sessions"), { recursive: true });
    await mkdir(join(this.basePath, "skills"), { recursive: true });
    await mkdir(join(this.basePath, "integrations"), { recursive: true });
    await mkdir(join(this.basePath, "providers"), { recursive: true });
  }

  // ============ AGENT OPERATIONS ============

  /**
   * Save an agent configuration
   */
  async saveAgent(agent: AgentConfig): Promise<void> {
    const agentDir = join(this.basePath, "agents", agent.id);
    await mkdir(agentDir, { recursive: true });

    // Save agent config
    await writeFile(join(agentDir, "agent.json"), JSON.stringify(agent, null, 2), "utf-8");

    // Save system prompt to separate file if inline
    if (agent.systemPrompt.type === "inline") {
      await writeFile(join(agentDir, "system.md"), agent.systemPrompt.content, "utf-8");
    }
  }

  /**
   * Load an agent by ID
   */
  async loadAgent(agentId: string): Promise<AgentConfig | null> {
    try {
      const configPath = join(this.basePath, "agents", agentId, "agent.json");
      const content = await readFile(configPath, "utf-8");
      return AgentConfigSchema.parse(JSON.parse(content));
    } catch {
      return null;
    }
  }

  /**
   * List all agents
   */
  async listAgents(): Promise<AgentConfig[]> {
    const agentsDir = join(this.basePath, "agents");
    try {
      const entries = await readdir(agentsDir, { withFileTypes: true });
      const agents: AgentConfig[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const agent = await this.loadAgent(entry.name);
          if (agent) agents.push(agent);
        }
      }

      return agents.sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
    } catch {
      return [];
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(input: CreateAgentInput): Promise<AgentConfig> {
    const agent = createAgentConfig(input);
    await this.saveAgent(agent);
    return agent;
  }

  /**
   * Update an agent
   */
  async updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<AgentConfig | null> {
    const agent = await this.loadAgent(agentId);
    if (!agent) return null;

    const updatedAgent: AgentConfig = {
      ...agent,
      ...updates,
      id: agent.id, // Preserve ID
      metadata: {
        ...agent.metadata,
        updatedAt: Date.now(),
      },
    };

    await this.saveAgent(updatedAgent);
    return updatedAgent;
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    try {
      const agentDir = join(this.basePath, "agents", agentId);
      await rm(agentDir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  // ============ SESSION OPERATIONS ============

  /**
   * Create a new session
   */
  async createSession(agentId: string, name?: string): Promise<SessionMetadata> {
    const session: SessionMetadata = {
      id: crypto.randomUUID(),
      agentId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const sessionDir = join(this.basePath, "sessions", session.id);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, "meta.json"), JSON.stringify(session, null, 2), "utf-8");
    // Create empty messages file
    await writeFile(join(sessionDir, "messages.jsonl"), "", "utf-8");

    return session;
  }

  /**
   * Load session metadata
   */
  async loadSession(sessionId: string): Promise<SessionMetadata | null> {
    try {
      const metaPath = join(this.basePath, "sessions", sessionId, "meta.json");
      const content = await readFile(metaPath, "utf-8");
      return SessionMetadataSchema.parse(JSON.parse(content));
    } catch {
      return null;
    }
  }

  /**
   * List all sessions, optionally filtered by agent
   */
  async listSessions(agentId?: string): Promise<SessionMetadata[]> {
    const sessionsDir = join(this.basePath, "sessions");
    try {
      const entries = await readdir(sessionsDir, { withFileTypes: true });
      const sessions: SessionMetadata[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const session = await this.loadSession(entry.name);
          if (session && (!agentId || session.agentId === agentId)) {
            sessions.push(session);
          }
        }
      }

      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionDir = join(this.basePath, "sessions", sessionId);
      await rm(sessionDir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  // ============ MESSAGE OPERATIONS ============

  /**
   * Append a message to a session
   */
  async appendMessage(sessionId: string, message: Message): Promise<void> {
    const messagesPath = join(this.basePath, "sessions", sessionId, "messages.jsonl");
    const storedMessage: StoredMessage = {
      id: message.id,
      role: message.role,
      content: message.content,
      toolCalls: message.toolCalls,
      toolResults: message.toolResults,
      timestamp: message.timestamp,
    };
    await appendFile(messagesPath, JSON.stringify(storedMessage) + "\n", "utf-8");

    // Update session timestamp
    const session = await this.loadSession(sessionId);
    if (session) {
      session.updatedAt = Date.now();
      const metaPath = join(this.basePath, "sessions", sessionId, "meta.json");
      await writeFile(metaPath, JSON.stringify(session, null, 2), "utf-8");
    }
  }

  /**
   * Load all messages for a session
   */
  async loadMessages(sessionId: string): Promise<Message[]> {
    try {
      const messagesPath = join(this.basePath, "sessions", sessionId, "messages.jsonl");
      const content = await readFile(messagesPath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      return lines.map((line) => {
        const stored = StoredMessageSchema.parse(JSON.parse(line));
        return {
          id: stored.id,
          role: stored.role,
          content: stored.content,
          toolCalls: stored.toolCalls,
          toolResults: stored.toolResults,
          timestamp: stored.timestamp,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get recent messages (for context window management)
   */
  async getRecentMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
    const messages = await this.loadMessages(sessionId);
    return messages.slice(-limit);
  }

  // ============ SKILL OPERATIONS ============

  /**
   * Get the skills directory path
   */
  getSkillsDir(): string {
    return join(this.basePath, "skills");
  }

  /**
   * Get the base storage path
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Save a skill file
   */
  async saveSkill(filename: string, content: string): Promise<string> {
    const skillsDir = this.getSkillsDir();
    await mkdir(skillsDir, { recursive: true });
    const filePath = join(skillsDir, filename);
    await writeFile(filePath, content, "utf-8");
    return filePath;
  }

  /**
   * Delete a skill file by path
   */
  async deleteSkill(filePath: string): Promise<boolean> {
    try {
      await rm(filePath, { force: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read a skill file by path
   */
  async readSkill(filePath: string): Promise<string | null> {
    try {
      return await readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }
}

// Singleton instance
let storageInstance: StorageService | null = null;

/**
 * Get the storage service instance
 */
export function getStorage(basePath?: string): StorageService {
  if (!storageInstance || basePath) {
    storageInstance = new StorageService(basePath);
  }
  return storageInstance;
}

/**
 * Initialize the storage service
 */
export async function initializeStorage(basePath?: string): Promise<StorageService> {
  const storage = getStorage(basePath);
  await storage.initialize();
  return storage;
}
