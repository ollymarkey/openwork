# Phase 3: Skills System - Implementation Plan

## Overview

The Skills System enables agents to have specialized capabilities through markdown-based skill definitions. Skills are injected into the agent's context based on configuration and trigger patterns.

## Current State

- Agent config schema already supports skills: `Array<{ id: string; path: string; enabled: boolean }>`
- Skill API routes exist in `packages/openwork/src/routes/v1/skills.ts` but return placeholder responses
- Storage directory `~/.openwork/skills/` is defined but not utilized
- No skill parsing or loading logic exists

## Skill Format Specification

```markdown
---
id: code-review
name: Code Review
description: Expert code review with focus on best practices
triggers:
  - "/review"
  - "review this code"
  - "check this code"
author: OpenWork
version: 1.0.0
tags:
  - code
  - quality
---

# Code Review Skill

When reviewing code, follow these structured approach:

## Analysis Steps
1. Check for syntax errors and typos
2. Identify potential bugs and edge cases
3. Evaluate code structure and organization
4. Review naming conventions
5. Assess performance implications

## Output Format
Provide feedback in this format:
- **Issues**: Critical problems that must be fixed
- **Suggestions**: Improvements that would enhance code quality
- **Positive**: What was done well
```

## Implementation Tasks

### Task 1: Skill Types & Schema

**File:** `packages/openwork/src/skills/types.ts`

```typescript
import { z } from "zod";

// Skill frontmatter schema
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

// Full skill definition
export interface Skill {
  id: string;
  name: string;
  description?: string;
  triggers: string[];
  content: string;          // Markdown content (without frontmatter)
  path: string;             // File path for reference
  author?: string;
  version?: string;
  tags: string[];
}

// Skill reference in agent config
export interface SkillReference {
  id: string;
  path: string;
  enabled: boolean;
}

// Skill listing for API responses
export interface SkillInfo {
  id: string;
  name: string;
  description?: string;
  triggers: string[];
  tags: string[];
  path: string;
}
```

### Task 2: Markdown Skill Parser

**File:** `packages/openwork/src/skills/parser.ts`

Responsibilities:
- Parse YAML frontmatter from markdown files
- Extract and validate skill metadata
- Return structured Skill object

Dependencies:
- `gray-matter` - YAML frontmatter parsing
- `zod` - Schema validation

```typescript
import matter from "gray-matter";
import { SkillFrontmatterSchema, type Skill } from "./types";

export class SkillParser {
  /**
   * Parse a skill markdown file into a Skill object
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
   * Validate skill content without full parsing
   */
  validate(content: string): { valid: boolean; errors?: string[] } {
    try {
      const { data } = matter(content);
      SkillFrontmatterSchema.parse(data);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : "Invalid skill format"]
      };
    }
  }
}
```

### Task 3: Skill Discovery Service

**File:** `packages/openwork/src/skills/discovery.ts`

Responsibilities:
- Scan skill directories for .md files
- Parse and index discovered skills
- Support multiple skill sources (global, agent-specific)
- Cache parsed skills for performance

```typescript
import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import { SkillParser } from "./parser";
import type { Skill, SkillInfo } from "./types";

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
   * Discover all skills from configured directories
   */
  async discoverAll(): Promise<Skill[]> {
    const skills: Skill[] = [];

    for (const dir of this.skillDirs) {
      const dirSkills = await this.discoverFromDirectory(dir);
      skills.push(...dirSkills);
    }

    return skills;
  }

  /**
   * Discover skills from a specific directory
   */
  async discoverFromDirectory(dirPath: string): Promise<Skill[]> {
    const skills: Skill[] = [];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && extname(entry.name) === ".md") {
          const filePath = join(dirPath, entry.name);
          const skill = await this.loadSkill(filePath);
          if (skill) skills.push(skill);
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }

    return skills;
  }

  /**
   * Load a single skill from file path
   */
  async loadSkill(filePath: string): Promise<Skill | null> {
    // Check cache first
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!;
    }

    try {
      const content = await readFile(filePath, "utf-8");
      const skill = this.parser.parse(content, filePath);
      this.cache.set(filePath, skill);
      return skill;
    } catch {
      return null;
    }
  }

  /**
   * Get skill by ID
   */
  async getById(id: string): Promise<Skill | null> {
    const skills = await this.discoverAll();
    return skills.find(s => s.id === id) || null;
  }

  /**
   * Find skills matching a trigger pattern
   */
  async findByTrigger(input: string): Promise<Skill[]> {
    const skills = await this.discoverAll();
    const lowerInput = input.toLowerCase();

    return skills.filter(skill =>
      skill.triggers.some(trigger => {
        const lowerTrigger = trigger.toLowerCase();
        // Exact match for slash commands
        if (trigger.startsWith("/")) {
          return lowerInput.startsWith(lowerTrigger);
        }
        // Substring match for natural language triggers
        return lowerInput.includes(lowerTrigger);
      })
    );
  }

  /**
   * Clear the skill cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * List skills as SkillInfo (lightweight)
   */
  async listSkills(): Promise<SkillInfo[]> {
    const skills = await this.discoverAll();
    return skills.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      triggers: s.triggers,
      tags: s.tags,
      path: s.path,
    }));
  }
}
```

### Task 4: Skill Loader for Agent Executor

**File:** `packages/openwork/src/skills/loader.ts`

Responsibilities:
- Load skills for a specific agent based on config
- Merge skill content into system prompt
- Handle skill activation based on triggers

```typescript
import { SkillDiscoveryService } from "./discovery";
import type { Skill, SkillReference } from "./types";

export class SkillLoader {
  private discovery: SkillDiscoveryService;

  constructor(discovery: SkillDiscoveryService) {
    this.discovery = discovery;
  }

  /**
   * Load enabled skills for an agent
   */
  async loadForAgent(skillRefs: SkillReference[]): Promise<Skill[]> {
    const enabledRefs = skillRefs.filter(ref => ref.enabled);
    const skills: Skill[] = [];

    for (const ref of enabledRefs) {
      // Try loading by path first, then by ID
      let skill = await this.discovery.loadSkill(ref.path);
      if (!skill) {
        skill = await this.discovery.getById(ref.id);
      }
      if (skill) {
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * Build skill context to append to system prompt
   */
  buildSkillContext(skills: Skill[]): string {
    if (skills.length === 0) return "";

    const sections = skills.map(skill => {
      const header = `## Skill: ${skill.name}`;
      const triggers = skill.triggers.length > 0
        ? `Triggers: ${skill.triggers.join(", ")}`
        : "";
      return [header, triggers, "", skill.content].filter(Boolean).join("\n");
    });

    return [
      "",
      "---",
      "# Active Skills",
      "",
      ...sections
    ].join("\n");
  }

  /**
   * Check if input triggers any skill
   */
  async checkTriggers(input: string, enabledSkills: Skill[]): Promise<Skill[]> {
    const lowerInput = input.toLowerCase();

    return enabledSkills.filter(skill =>
      skill.triggers.some(trigger => {
        const lowerTrigger = trigger.toLowerCase();
        if (trigger.startsWith("/")) {
          return lowerInput.startsWith(lowerTrigger);
        }
        return lowerInput.includes(lowerTrigger);
      })
    );
  }
}
```

### Task 5: Update Agent Executor

**File:** `packages/openwork/src/agent/executor.ts`

Modifications:
- Inject SkillLoader
- Load skills on initialization
- Append skill context to system prompt
- (Optional) Dynamic skill activation based on triggers

```typescript
// Add to constructor
private skillLoader: SkillLoader;
private loadedSkills: Skill[] = [];

// In initialize()
async initialize(): Promise<void> {
  // ... existing system prompt loading ...

  // Load skills
  if (this.config.skills && this.config.skills.length > 0) {
    this.loadedSkills = await this.skillLoader.loadForAgent(this.config.skills);
    const skillContext = this.skillLoader.buildSkillContext(this.loadedSkills);
    this.systemPrompt += skillContext;
  }
}
```

### Task 6: Implement Skills API Routes

**File:** `packages/openwork/src/routes/v1/skills.ts`

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { SkillDiscoveryService } from "../../skills/discovery";
import { SkillParser } from "../../skills/parser";
import { StorageService } from "../../storage";

const skills = new Hono();
const storage = StorageService.getInstance();
const discovery = new SkillDiscoveryService([storage.getSkillsDir()]);
const parser = new SkillParser();

// List all skills
skills.get("/", async (c) => {
  const skillList = await discovery.listSkills();
  return c.json({ skills: skillList });
});

// Get skill by ID
skills.get("/:id", async (c) => {
  const { id } = c.req.param();
  const skill = await discovery.getById(id);

  if (!skill) {
    return c.json({ error: "Skill not found" }, 404);
  }

  return c.json({ skill });
});

// Create new skill
const CreateSkillSchema = z.object({
  content: z.string().min(1),
  filename: z.string().optional(),
});

skills.post("/", zValidator("json", CreateSkillSchema), async (c) => {
  const { content, filename } = c.req.valid("json");

  // Validate skill content
  const validation = parser.validate(content);
  if (!validation.valid) {
    return c.json({ error: "Invalid skill format", details: validation.errors }, 400);
  }

  // Parse to get ID for filename
  const skill = parser.parse(content, "");
  const finalFilename = filename || `${skill.id}.md`;

  // Save skill file
  const skillPath = await storage.saveSkill(finalFilename, content);

  // Clear cache and reload
  discovery.clearCache();
  const savedSkill = await discovery.loadSkill(skillPath);

  return c.json({ skill: savedSkill }, 201);
});

// Delete skill
skills.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const skill = await discovery.getById(id);

  if (!skill) {
    return c.json({ error: "Skill not found" }, 404);
  }

  await storage.deleteSkill(skill.path);
  discovery.clearCache();

  return c.json({ success: true });
});

export default skills;
```

### Task 7: Update Storage Service

**File:** `packages/openwork/src/storage/index.ts`

Add methods:
```typescript
getSkillsDir(): string {
  return join(this.baseDir, "skills");
}

async saveSkill(filename: string, content: string): Promise<string> {
  const skillsDir = this.getSkillsDir();
  await mkdir(skillsDir, { recursive: true });
  const filePath = join(skillsDir, filename);
  await writeFile(filePath, content, "utf-8");
  return filePath;
}

async deleteSkill(filePath: string): Promise<void> {
  await unlink(filePath);
}
```

### Task 8: Default Skills Library

**Directory:** `packages/openwork/skills/`

Create default skills:

1. **code-review.md** - Code review skill
2. **explain-code.md** - Code explanation skill
3. **refactor.md** - Code refactoring skill
4. **debug.md** - Debugging assistance skill
5. **write-tests.md** - Test writing skill
6. **commit.md** - Git commit message skill

### Task 9: Add gray-matter Dependency

```bash
cd packages/openwork
bun add gray-matter
bun add -D @types/gray-matter  # if needed
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/openwork/src/skills/types.ts` | Create | Skill type definitions |
| `packages/openwork/src/skills/parser.ts` | Create | Markdown skill parser |
| `packages/openwork/src/skills/discovery.ts` | Create | Skill discovery service |
| `packages/openwork/src/skills/loader.ts` | Create | Skill loader for agents |
| `packages/openwork/src/skills/index.ts` | Create | Public exports |
| `packages/openwork/src/routes/v1/skills.ts` | Update | Implement API routes |
| `packages/openwork/src/storage/index.ts` | Update | Add skill storage methods |
| `packages/openwork/src/agent/executor.ts` | Update | Integrate skill loading |
| `packages/openwork/skills/*.md` | Create | Default skill library |

## Implementation Order

1. Add `gray-matter` dependency
2. Create `skills/types.ts` - Type definitions
3. Create `skills/parser.ts` - Markdown parser
4. Create `skills/discovery.ts` - Discovery service
5. Create `skills/loader.ts` - Agent skill loader
6. Create `skills/index.ts` - Public exports
7. Update `storage/index.ts` - Skill storage methods
8. Update `routes/v1/skills.ts` - Implement API endpoints
9. Update `agent/executor.ts` - Integrate skill loading
10. Create default skills in `skills/` directory

## Testing Checklist

- [ ] Parse skill with valid frontmatter
- [ ] Parse skill with minimal frontmatter (id, name only)
- [ ] Reject skill with missing required fields
- [ ] Discover skills from directory
- [ ] Load skill by ID
- [ ] Load skill by path
- [ ] Find skills by trigger (slash command)
- [ ] Find skills by trigger (natural language)
- [ ] Build skill context for system prompt
- [ ] API: List skills
- [ ] API: Get skill by ID
- [ ] API: Create skill
- [ ] API: Delete skill
- [ ] Agent executor loads skills on init
- [ ] Skills appear in system prompt

## Notes

- Skills are additive - they extend the system prompt, not replace it
- Trigger matching is case-insensitive
- Slash command triggers require exact prefix match
- Natural language triggers use substring matching
- Skills are cached after first load for performance
- Cache is cleared on skill create/delete operations
