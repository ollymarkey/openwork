---
id: commit
name: Git Commit
description: Generate well-structured git commit messages
triggers:
  - "/commit"
  - "write commit message"
  - "commit this"
author: OpenWork
version: 1.0.0
tags:
  - git
  - workflow
---

# Git Commit Message Skill

When creating commit messages, follow conventional commit standards for clear, informative history.

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Formatting, no code change
- **refactor**: Code restructuring without behavior change
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build, tooling, or dependency updates

## Guidelines

### Subject Line
- Use imperative mood ("Add feature" not "Added feature")
- Keep under 50 characters
- Don't end with a period
- Capitalize first letter

### Body (when needed)
- Explain *what* and *why*, not *how*
- Wrap at 72 characters
- Separate from subject with blank line

### Footer (when needed)
- Reference issues: `Fixes #123`
- Note breaking changes: `BREAKING CHANGE: description`

## Process

1. Review the staged changes
2. Identify the primary purpose of the changes
3. Determine the appropriate type and scope
4. Write a clear, concise subject line
5. Add body if the change needs explanation
