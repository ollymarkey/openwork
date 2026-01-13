import { Hono } from "hono";

export const skillRoutes = new Hono()
  // List all skills
  .get("/", async (c) => {
    // TODO: Implement skill discovery
    return c.json({ skills: [] });
  })

  // Get skill by ID
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    // TODO: Implement skill retrieval
    return c.json({
      id,
      name: "Skill",
      status: "not_implemented",
    });
  })

  // Create/upload skill
  .post("/", async (c) => {
    const body = await c.req.json();
    // TODO: Implement skill creation
    return c.json(
      {
        id: crypto.randomUUID(),
        ...body,
      },
      201
    );
  })

  // Delete skill
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    // TODO: Implement skill deletion
    return c.json({ deleted: true, id });
  });
