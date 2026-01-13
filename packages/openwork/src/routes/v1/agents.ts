import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getStorage } from "../../storage";
import { CreateAgentInputSchema, UpdateAgentInputSchema } from "../../agent";

const storage = getStorage();

export const agentRoutes = new Hono()
  // List all agents
  .get("/", async (c) => {
    const agents = await storage.listAgents();
    return c.json({
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        provider: agent.llm.provider,
        model: agent.llm.model,
        createdAt: agent.metadata.createdAt,
        updatedAt: agent.metadata.updatedAt,
      })),
    });
  })

  // Create new agent
  .post(
    "/",
    zValidator("json", CreateAgentInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const agent = await storage.createAgent(input);
      return c.json(agent, 201);
    }
  )

  // Get agent by ID
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const agent = await storage.loadAgent(id);

    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json(agent);
  })

  // Update agent
  .put(
    "/:id",
    zValidator("json", UpdateAgentInputSchema),
    async (c) => {
      const id = c.req.param("id");
      const updates = c.req.valid("json");
      const agent = await storage.updateAgent(id, updates);

      if (!agent) {
        return c.json({ error: "Agent not found" }, 404);
      }

      return c.json(agent);
    }
  )

  // Delete agent
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await storage.deleteAgent(id);

    if (!deleted) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json({ deleted: true, id });
  });
