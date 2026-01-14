import { readdir, readFile, stat } from "fs/promises";
import { join, extname } from "path";
import { SkillParser } from "./parser";
import type { Skill, SkillInfo } from "./types";
import { skillToInfo } from "./types";

/**
 * Service for discovering and loading skills from the filesystem
 */
export class SkillDiscoveryService {
  private parser: SkillParser;
  private cache: Map<string, Skill>;
  private skillDirs: string[];

  constructor(skillDirs: string[]) {
    this.parser = new SkillParser();
    this.cache = new Map();
    this.skillDirs = skillDirs;
  }

  /**
   * Add a skill directory to search
   */
  addSkillDirectory(dir: string): void {
    if (!this.skillDirs.includes(dir)) {
      this.skillDirs.push(dir);
    }
  }

  /**
   * Remove a skill directory from search
   */
  removeSkillDirectory(dir: string): void {
    const index = this.skillDirs.indexOf(dir);
    if (index !== -1) {
      this.skillDirs.splice(index, 1);
    }
  }

  /**
   * Discover all skills from all configured directories
   */
  async discoverAll(): Promise<Skill[]> {
    const skills: Skill[] = [];
    const seenIds = new Set<string>();

    for (const dir of this.skillDirs) {
      const dirSkills = await this.discoverFromDirectory(dir);
      for (const skill of dirSkills) {
        // Avoid duplicates by ID (first directory wins)
        if (!seenIds.has(skill.id)) {
          seenIds.add(skill.id);
          skills.push(skill);
        }
      }
    }

    return skills;
  }

  /**
   * Discover skills from a specific directory (non-recursive)
   */
  async discoverFromDirectory(dirPath: string): Promise<Skill[]> {
    const skills: Skill[] = [];

    try {
      const dirStat = await stat(dirPath);
      if (!dirStat.isDirectory()) {
        return skills;
      }

      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && extname(entry.name) === ".md") {
          const filePath = join(dirPath, entry.name);
          const skill = await this.loadSkill(filePath);
          if (skill) {
            skills.push(skill);
          }
        }
      }
    } catch {
      // Directory doesn't exist or not readable - silently skip
    }

    return skills;
  }

  /**
   * Load a single skill from a file path
   */
  async loadSkill(filePath: string): Promise<Skill | null> {
    // Check cache first
    const cached = this.cache.get(filePath);
    if (cached) {
      return cached;
    }

    try {
      const content = await readFile(filePath, "utf-8");
      const skill = this.parser.parse(content, filePath);
      this.cache.set(filePath, skill);
      return skill;
    } catch {
      // Failed to read or parse - return null
      return null;
    }
  }

  /**
   * Get a skill by its ID
   */
  async getById(id: string): Promise<Skill | null> {
    // Check cache first
    for (const skill of this.cache.values()) {
      if (skill.id === id) {
        return skill;
      }
    }

    // Discover all and search
    const skills = await this.discoverAll();
    return skills.find((s) => s.id === id) || null;
  }

  /**
   * Find skills that match a given input based on triggers
   */
  async findByTrigger(input: string): Promise<Skill[]> {
    const skills = await this.discoverAll();
    return this.matchTriggers(input, skills);
  }

  /**
   * Match triggers against a list of skills
   */
  matchTriggers(input: string, skills: Skill[]): Skill[] {
    const lowerInput = input.toLowerCase().trim();

    return skills.filter((skill) =>
      skill.triggers.some((trigger) => {
        const lowerTrigger = trigger.toLowerCase();

        // Slash command: exact prefix match
        if (trigger.startsWith("/")) {
          return lowerInput.startsWith(lowerTrigger);
        }

        // Natural language: substring match
        return lowerInput.includes(lowerTrigger);
      })
    );
  }

  /**
   * Clear the entire skill cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Remove a specific skill from the cache
   */
  invalidateSkill(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * List all skills as SkillInfo (lightweight, without content)
   */
  async listSkills(): Promise<SkillInfo[]> {
    const skills = await this.discoverAll();
    return skills.map(skillToInfo);
  }

  /**
   * Get the configured skill directories
   */
  getSkillDirectories(): string[] {
    return [...this.skillDirs];
  }

  /**
   * Check if a skill file exists
   */
  async skillExists(filePath: string): Promise<boolean> {
    try {
      const fileStat = await stat(filePath);
      return fileStat.isFile() && extname(filePath) === ".md";
    } catch {
      return false;
    }
  }
}
