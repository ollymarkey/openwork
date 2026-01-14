---
id: write-tests
name: Write Tests
description: Generate comprehensive test cases for code
triggers:
  - "/test"
  - "/tests"
  - "write tests"
  - "add tests"
  - "test this code"
author: OpenWork
version: 1.0.0
tags:
  - testing
  - quality
  - tdd
---

# Test Writing Skill

When writing tests, create comprehensive coverage that validates behavior and catches regressions.

## Test Categories

1. **Unit Tests**: Test individual functions/methods in isolation
2. **Integration Tests**: Test component interactions
3. **Edge Cases**: Boundary conditions and unusual inputs
4. **Error Handling**: Verify proper handling of failures

## Test Structure (AAA Pattern)

```
Arrange: Set up the test conditions and inputs
Act: Execute the code being tested
Assert: Verify the expected outcome
```

## What to Test

- **Happy Path**: Normal, expected use cases
- **Edge Cases**: Empty inputs, boundary values, large inputs
- **Error Cases**: Invalid inputs, failure conditions
- **State Changes**: Verify side effects and mutations

## Best Practices

- **Descriptive Names**: Test names should explain what is being tested
- **One Assert Focus**: Each test should verify one behavior
- **Independent Tests**: Tests should not depend on each other
- **Fast Execution**: Tests should run quickly
- **Deterministic**: Same input should always produce same result

## Output Format

Provide complete, runnable test code with:
1. Appropriate test framework syntax (Jest, Vitest, pytest, etc.)
2. Clear test descriptions
3. Proper setup and teardown if needed
4. Coverage of main scenarios and edge cases
