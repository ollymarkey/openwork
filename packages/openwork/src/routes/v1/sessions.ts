import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getStorage } from "../../storage";
import { createExecutor, type Message } from "../../agent";

const storage = getStorage();

// Input schemas
const CreateSessionSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1),
  attachments: z
    .array(
      z.object({
        type: z.enum(["file", "image"]),
        uri: z.string(),
      })
    )
    .optional(),
});

export const sessionRoutes = new Hono()
  // List sessions
  .get("/", async (c) => {
    const agentId = c.req.query("agentId");
    const sessions = await storage.listSessions(agentId);
    return c.json({ sessions });
  })

  // Create new session
  .post("/", zValidator("json", CreateSessionSchema), async (c) => {
    const { agentId, name } = c.req.valid("json");

    // Verify agent exists
    const agent = await storage.loadAgent(agentId);
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    const session = await storage.createSession(agentId, name);
    return c.json(session, 201);
  })

  // Get session by ID
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const session = await storage.loadSession(id);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const messages = await storage.loadMessages(id);
    return c.json({ ...session, messages });
  })

  // Get session messages
  .get("/:id/messages", async (c) => {
    const id = c.req.param("id");
    const limit = parseInt(c.req.query("limit") ?? "50");

    const session = await storage.loadSession(id);
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const messages = await storage.getRecentMessages(id, limit);
    return c.json({ sessionId: id, messages });
  })

  // Send message and stream response
  .post("/:id/messages", zValidator("json", SendMessageSchema), async (c) => {
    const sessionId = c.req.param("id");
    const { content } = c.req.valid("json");

    // Load session and agent
    const session = await storage.loadSession(sessionId);
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const agent = await storage.loadAgent(session.agentId);
    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    // Save user message
    await storage.appendMessage(sessionId, userMessage);

    // Load conversation history
    const messages = await storage.getRecentMessages(sessionId, 50);

    // Create executor and stream response
    const executor = createExecutor(agent);

    return streamSSE(c, async (stream) => {
      let assistantContent = "";
      let assistantMessageId = "";
      const toolCalls: Message["toolCalls"] = [];
      const toolResults: Message["toolResults"] = [];

      try {
        for await (const chunk of executor.stream(messages)) {
          switch (chunk.type) {
            case "message_start":
              assistantMessageId = chunk.id;
              await stream.writeSSE({
                event: "message_start",
                data: JSON.stringify({
                  id: chunk.id,
                  sessionId,
                  role: "assistant",
                }),
              });
              break;

            case "text_delta":
              assistantContent += chunk.content;
              await stream.writeSSE({
                event: "text_delta",
                data: JSON.stringify({ content: chunk.content }),
              });
              break;

            case "tool_call_start":
              toolCalls.push(chunk.toolCall);
              await stream.writeSSE({
                event: "tool_call_start",
                data: JSON.stringify(chunk.toolCall),
              });
              break;

            case "tool_call_end":
              toolResults.push({
                toolCallId: chunk.toolCallId,
                toolName: toolCalls.find((tc) => tc.id === chunk.toolCallId)?.toolName ?? "",
                result: chunk.result,
              });
              await stream.writeSSE({
                event: "tool_call_end",
                data: JSON.stringify({
                  toolCallId: chunk.toolCallId,
                  result: chunk.result,
                }),
              });
              break;

            case "message_end":
              // Save assistant message
              const assistantMessage: Message = {
                id: assistantMessageId,
                role: "assistant",
                content: assistantContent,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                toolResults: toolResults.length > 0 ? toolResults : undefined,
                timestamp: Date.now(),
              };
              await storage.appendMessage(sessionId, assistantMessage);

              await stream.writeSSE({
                event: "message_end",
                data: JSON.stringify({
                  id: chunk.id,
                  finishReason: chunk.finishReason,
                }),
              });
              break;

            case "error":
              await stream.writeSSE({
                event: "error",
                data: JSON.stringify({ error: chunk.error }),
              });
              break;
          }
        }
      } catch (error) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        });
      }
    });
  })

  // Delete session
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await storage.deleteSession(id);

    if (!deleted) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json({ deleted: true, id });
  });
