---
id: refactor
name: Refactor Code
description: Improve code structure, readability, and maintainability
triggers:
  - "/refactor"
  - "refactor this"
  - "clean up this code"
  - "improve this code"
author: OpenWork
version: 1.0.0
tags:
  - code
  - quality
  - refactoring
---

# Code Refactoring Skill

When refactoring code, improve its internal structure without changing external behavior.

## Refactoring Principles

1. **Preserve Behavior**: Refactoring should not change what the code does
2. **Small Steps**: Make incremental changes that can be verified
3. **Test Coverage**: Ensure tests exist before refactoring
4. **Clear Intent**: Each change should make code more readable

## Common Refactoring Patterns

- **Extract Method**: Break long functions into smaller, named pieces
- **Rename**: Use clear, descriptive names for variables, functions, and classes
- **Remove Duplication**: Consolidate repeated code (DRY principle)
- **Simplify Conditionals**: Flatten nested if/else, use early returns
- **Reduce Dependencies**: Minimize coupling between components

## Process

1. **Identify the smell**: What makes this code hard to work with?
2. **Plan the refactoring**: What specific changes will improve it?
3. **Apply changes**: Make the refactoring step by step
4. **Verify**: Confirm behavior is preserved (tests still pass)

## Output Format

Provide:
1. **Analysis**: What code smells or issues were identified
2. **Refactored Code**: The improved version
3. **Explanation**: What changes were made and why
