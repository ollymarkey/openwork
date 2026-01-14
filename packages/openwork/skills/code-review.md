---
id: code-review
name: Code Review
description: Expert code review with focus on best practices, bugs, and improvements
triggers:
  - "/review"
  - "review this code"
  - "code review"
author: OpenWork
version: 1.0.0
tags:
  - code
  - quality
  - review
---

# Code Review Skill

When reviewing code, follow this structured approach:

## Analysis Process

1. **Correctness**: Check for logical errors, edge cases, and potential bugs
2. **Security**: Look for vulnerabilities (injection, XSS, auth issues, secrets exposure)
3. **Performance**: Identify inefficiencies, unnecessary operations, or scalability issues
4. **Readability**: Evaluate naming, structure, and code organization
5. **Best Practices**: Check adherence to language/framework conventions

## Output Format

Provide feedback in this structure:

### Critical Issues
Problems that must be fixed before merging (bugs, security issues, breaking changes)

### Suggestions
Improvements that would enhance code quality but aren't blocking

### Positive Observations
What was done well - reinforce good patterns

## Guidelines

- Be specific: Reference line numbers and provide concrete examples
- Be constructive: Explain *why* something is an issue and *how* to fix it
- Be respectful: Focus on the code, not the author
- Prioritize: Address the most impactful issues first
