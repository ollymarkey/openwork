import { Hono } from "hono";

export const agentRoutes = new Hono()
  // List all agents
  .get("/", async (c) => {
    // TODO: Implement agent listing
    return c.json({ agents: [] });
  })

  // Create new agent
  .post("/", async (c) => {
    const body = await c.req.json();
    // TODO: Implement agent creation
    return c.json({ id: crypto.randomUUID(), ...body }, 201);
  })

  // Get agent by ID
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    // TODO: Implement agent retrieval
    return c.json({ id, name: "Agent", status: "not_implemented" });
  })

  // Update agent
  .put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    // TODO: Implement agent update
    return c.json({ id, ...body });
  })

  // Delete agent
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    // TODO: Implement agent deletion
    return c.json({ deleted: true, id });
  });
