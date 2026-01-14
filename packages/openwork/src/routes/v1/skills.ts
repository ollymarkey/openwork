import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { SkillDiscoveryService, SkillParser, skillToInfo } from "../../skills";
import { getStorage } from "../../storage";

// Get storage and set up discovery service
const storage = getStorage();
const discovery = new SkillDiscoveryService([storage.getSkillsDir()]);
const parser = new SkillParser();

// Schema for creating a skill
const CreateSkillSchema = z.object({
  content: z.string().min(1, "Skill content is required"),
  filename: z.string().optional(),
});

// Schema for updating a skill
const UpdateSkillSchema = z.object({
  content: z.string().min(1, "Skill content is required"),
});

export const skillRoutes = new Hono()
  // List all skills
  .get("/", async (c) => {
    const skills = await discovery.listSkills();
    return c.json({ skills });
  })

  // Get skill by ID
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const skill = await discovery.getById(id);

    if (!skill) {
      return c.json({ error: "Skill not found" }, 404);
    }

    return c.json({ skill });
  })

  // Create/upload skill
  .post("/", zValidator("json", CreateSkillSchema), async (c) => {
    const { content, filename } = c.req.valid("json");

    // Validate skill content
    const validation = parser.validate(content);
    if (!validation.valid) {
      return c.json(
        {
          error: "Invalid skill format",
          details: validation.errors,
        },
        400
      );
    }

    // Parse to get ID for filename
    const parseResult = parser.safeParse(content, "");
    if (!parseResult.success) {
      return c.json(
        {
          error: "Failed to parse skill",
          details: parseResult.errors,
        },
        400
      );
    }

    const { skill } = parseResult;

    // Check for duplicate ID
    const existing = await discovery.getById(skill.id);
    if (existing) {
      return c.json(
        {
          error: "Skill with this ID already exists",
          existingPath: existing.path,
        },
        409
      );
    }

    // Generate filename from ID if not provided
    const finalFilename = filename || `${skill.id}.md`;

    // Save skill file
    const skillPath = await storage.saveSkill(finalFilename, content);

    // Clear cache and reload the saved skill
    discovery.clearCache();
    const savedSkill = await discovery.loadSkill(skillPath);

    if (!savedSkill) {
      return c.json({ error: "Failed to load saved skill" }, 500);
    }

    return c.json({ skill: skillToInfo(savedSkill) }, 201);
  })

  // Update skill by ID
  .put("/:id", zValidator("json", UpdateSkillSchema), async (c) => {
    const id = c.req.param("id");
    const { content } = c.req.valid("json");

    // Find existing skill
    const existing = await discovery.getById(id);
    if (!existing) {
      return c.json({ error: "Skill not found" }, 404);
    }

    // Validate new content
    const validation = parser.validate(content);
    if (!validation.valid) {
      return c.json(
        {
          error: "Invalid skill format",
          details: validation.errors,
        },
        400
      );
    }

    // Parse new content to verify ID matches
    const parseResult = parser.safeParse(content, existing.path);
    if (!parseResult.success) {
      return c.json(
        {
          error: "Failed to parse skill",
          details: parseResult.errors,
        },
        400
      );
    }

    if (parseResult.skill.id !== id) {
      return c.json(
        {
          error: "Skill ID in content does not match URL parameter",
          expected: id,
          found: parseResult.skill.id,
        },
        400
      );
    }

    // Get filename from existing path
    const filename = existing.path.split(/[/\\]/).pop() || `${id}.md`;

    // Save updated content
    await storage.saveSkill(filename, content);

    // Clear cache and reload
    discovery.clearCache();
    const updatedSkill = await discovery.getById(id);

    if (!updatedSkill) {
      return c.json({ error: "Failed to load updated skill" }, 500);
    }

    return c.json({ skill: skillToInfo(updatedSkill) });
  })

  // Delete skill by ID
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const skill = await discovery.getById(id);

    if (!skill) {
      return c.json({ error: "Skill not found" }, 404);
    }

    const deleted = await storage.deleteSkill(skill.path);

    if (!deleted) {
      return c.json({ error: "Failed to delete skill" }, 500);
    }

    discovery.clearCache();

    return c.json({ deleted: true, id });
  })

  // Search skills by trigger
  .get("/search/trigger", async (c) => {
    const query = c.req.query("q");

    if (!query) {
      return c.json({ error: "Query parameter 'q' is required" }, 400);
    }

    const skills = await discovery.findByTrigger(query);
    return c.json({ skills: skills.map(skillToInfo) });
  });
