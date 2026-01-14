import matter from "gray-matter";
import { SkillFrontmatterSchema, type Skill } from "./types";

export interface ParseResult {
  success: true;
  skill: Skill;
}

export interface ParseError {
  success: false;
  errors: string[];
}

export type SkillParseResult = ParseResult | ParseError;

/**
 * Parser for markdown skill files with YAML frontmatter
 */
export class SkillParser {
  /**
   * Parse a skill markdown file into a Skill object
   * @param content - Raw markdown content with YAML frontmatter
   * @param filePath - Path to the skill file (for reference)
   * @returns Parsed Skill object
   * @throws Error if parsing fails
   */
  parse(content: string, filePath: string): Skill {
    const { data, content: body } = matter(content);
    const frontmatter = SkillFrontmatterSchema.parse(data);

    return {
      id: frontmatter.id,
      name: frontmatter.name,
      description: frontmatter.description,
      triggers: frontmatter.triggers,
      content: body.trim(),
      path: filePath,
      author: frontmatter.author,
      version: frontmatter.version,
      tags: frontmatter.tags,
    };
  }

  /**
   * Safely parse a skill, returning a result object instead of throwing
   * @param content - Raw markdown content with YAML frontmatter
   * @param filePath - Path to the skill file (for reference)
   * @returns ParseResult on success, ParseError on failure
   */
  safeParse(content: string, filePath: string): SkillParseResult {
    try {
      const skill = this.parse(content, filePath);
      return { success: true, skill };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown parsing error";
      return { success: false, errors: [message] };
    }
  }

  /**
   * Validate skill content without full parsing
   * @param content - Raw markdown content to validate
   * @returns Validation result with valid flag and optional errors
   */
  validate(content: string): { valid: boolean; errors?: string[] } {
    try {
      const { data } = matter(content);
      SkillFrontmatterSchema.parse(data);
      return { valid: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid skill format";
      return { valid: false, errors: [message] };
    }
  }

  /**
   * Extract just the frontmatter without parsing the full skill
   * @param content - Raw markdown content
   * @returns Parsed frontmatter or null if invalid
   */
  extractFrontmatter(content: string): ReturnType<typeof SkillFrontmatterSchema.safeParse> {
    const { data } = matter(content);
    return SkillFrontmatterSchema.safeParse(data);
  }
}

// Singleton instance for convenience
export const skillParser = new SkillParser();
