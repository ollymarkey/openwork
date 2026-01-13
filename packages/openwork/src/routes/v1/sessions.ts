import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

export const sessionRoutes = new Hono()
  // List sessions
  .get("/", async (c) => {
    // TODO: Implement session listing
    return c.json({ sessions: [] });
  })

  // Create new session
  .post("/", async (c) => {
    const body = await c.req.json();
    const session = {
      id: crypto.randomUUID(),
      agentId: body.agentId,
      createdAt: Date.now(),
      messages: [],
    };
    // TODO: Persist session
    return c.json(session, 201);
  })

  // Get session by ID
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    // TODO: Implement session retrieval
    return c.json({
      id,
      messages: [],
      createdAt: Date.now(),
    });
  })

  // Send message and stream response
  .post("/:id/messages", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();

    // For now, return a simple echo response
    // TODO: Implement actual LLM streaming
    return streamSSE(c, async (stream) => {
      const messageId = crypto.randomUUID();

      // Send message received event
      await stream.writeSSE({
        event: "message_start",
        data: JSON.stringify({
          id: messageId,
          sessionId: id,
          role: "assistant",
        }),
      });

      // TODO: Stream actual LLM response
      const response = `Received your message: "${body.content}"`;
      for (const char of response) {
        await stream.writeSSE({
          event: "text_delta",
          data: JSON.stringify({ content: char }),
        });
        await new Promise((r) => setTimeout(r, 10));
      }

      // Send completion event
      await stream.writeSSE({
        event: "message_end",
        data: JSON.stringify({
          id: messageId,
          finishReason: "stop",
        }),
      });
    });
  })

  // Get session messages
  .get("/:id/messages", async (c) => {
    const id = c.req.param("id");
    // TODO: Implement message retrieval
    return c.json({ sessionId: id, messages: [] });
  })

  // Delete session
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    // TODO: Implement session deletion
    return c.json({ deleted: true, id });
  });
