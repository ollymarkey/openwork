import { SkillDiscoveryService } from "./discovery";
import type { Skill, SkillRef } from "./types";

/**
 * Loader for integrating skills into agent execution
 */
export class SkillLoader {
  private discovery: SkillDiscoveryService;

  constructor(discovery: SkillDiscoveryService) {
    this.discovery = discovery;
  }

  /**
   * Load enabled skills for an agent based on its skill references
   * @param skillRefs - Array of skill references from agent config
   * @returns Array of loaded Skill objects
   */
  async loadForAgent(skillRefs: SkillRef[]): Promise<Skill[]> {
    const enabledRefs = skillRefs.filter((ref) => ref.enabled);
    const skills: Skill[] = [];
    const loadedIds = new Set<string>();

    for (const ref of enabledRefs) {
      // Avoid loading the same skill twice
      if (loadedIds.has(ref.id)) {
        continue;
      }

      // Try loading by path first
      let skill = await this.discovery.loadSkill(ref.path);

      // Fall back to loading by ID
      if (!skill) {
        skill = await this.discovery.getById(ref.id);
      }

      if (skill) {
        skills.push(skill);
        loadedIds.add(skill.id);
      }
    }

    return skills;
  }

  /**
   * Build skill context to append to the agent's system prompt
   * @param skills - Array of skills to include
   * @returns Formatted markdown string for system prompt
   */
  buildSkillContext(skills: Skill[]): string {
    if (skills.length === 0) {
      return "";
    }

    const sections = skills.map((skill) => this.formatSkillSection(skill));

    return [
      "",
      "---",
      "",
      "# Active Skills",
      "",
      "The following skills are available to you. Use them when appropriate based on user requests or trigger patterns.",
      "",
      ...sections,
    ].join("\n");
  }

  /**
   * Format a single skill as a section in the system prompt
   */
  private formatSkillSection(skill: Skill): string {
    const parts: string[] = [];

    // Header
    parts.push(`## ${skill.name}`);

    // Metadata line
    const meta: string[] = [];
    if (skill.triggers.length > 0) {
      meta.push(`Triggers: ${skill.triggers.join(", ")}`);
    }
    if (skill.description) {
      meta.push(skill.description);
    }
    if (meta.length > 0) {
      parts.push(`> ${meta.join(" | ")}`);
    }

    // Content
    parts.push("");
    parts.push(skill.content);
    parts.push("");

    return parts.join("\n");
  }

  /**
   * Check if user input triggers any of the provided skills
   * @param input - User message to check
   * @param skills - Skills to match against
   * @returns Array of triggered skills
   */
  checkTriggers(input: string, skills: Skill[]): Skill[] {
    return this.discovery.matchTriggers(input, skills);
  }

  /**
   * Build a focused skill context for triggered skills only
   * This can be used for dynamic skill activation based on user input
   */
  buildTriggeredContext(input: string, skills: Skill[]): string {
    const triggered = this.checkTriggers(input, skills);
    if (triggered.length === 0) {
      return "";
    }

    const sections = triggered.map((skill) => this.formatSkillSection(skill));

    return [
      "",
      "---",
      "",
      "# Triggered Skills",
      "",
      "The following skills were triggered by the user's message:",
      "",
      ...sections,
    ].join("\n");
  }

  /**
   * Get the underlying discovery service
   */
  getDiscoveryService(): SkillDiscoveryService {
    return this.discovery;
  }
}
