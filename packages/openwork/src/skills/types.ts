import { z } from "zod";

/**
 * Skill frontmatter schema - parsed from YAML at the top of skill markdown files
 */
export const SkillFrontmatterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  triggers: z.array(z.string()).default([]),
  author: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

/**
 * Full skill definition - includes parsed content
 */
export interface Skill {
  id: string;
  name: string;
  description?: string;
  triggers: string[];
  content: string; // Markdown content (without frontmatter)
  path: string; // File path for reference
  author?: string;
  version?: string;
  tags: string[];
}

/**
 * Skill reference in agent config - re-exported for convenience
 */
export { SkillRefSchema, type SkillRef } from "../agent/types";

/**
 * Skill listing for API responses (lightweight, without content)
 */
export interface SkillInfo {
  id: string;
  name: string;
  description?: string;
  triggers: string[];
  tags: string[];
  path: string;
  author?: string;
  version?: string;
}

/**
 * Convert a full Skill to SkillInfo
 */
export function skillToInfo(skill: Skill): SkillInfo {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    triggers: skill.triggers,
    tags: skill.tags,
    path: skill.path,
    author: skill.author,
    version: skill.version,
  };
}
