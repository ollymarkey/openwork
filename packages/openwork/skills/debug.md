---
id: debug
name: Debug Assistant
description: Systematic debugging and troubleshooting for code issues
triggers:
  - "/debug"
  - "debug this"
  - "why isn't this working"
  - "fix this bug"
  - "help me debug"
author: OpenWork
version: 1.0.0
tags:
  - debugging
  - troubleshooting
  - bugs
---

# Debugging Skill

When debugging issues, follow a systematic approach to identify and resolve problems.

## Debugging Process

1. **Understand the Problem**
   - What is the expected behavior?
   - What is the actual behavior?
   - When did it start happening?
   - Can it be reproduced consistently?

2. **Gather Information**
   - Error messages and stack traces
   - Relevant logs
   - Recent changes to the codebase
   - Environment details

3. **Form Hypotheses**
   - Based on symptoms, what could be causing this?
   - List potential root causes in order of likelihood

4. **Test Hypotheses**
   - Add strategic logging or breakpoints
   - Isolate the problem by removing or simplifying code
   - Check assumptions about data and state

5. **Fix and Verify**
   - Apply the fix
   - Verify the original issue is resolved
   - Check for side effects or regressions

## Common Bug Categories

- **Logic Errors**: Incorrect conditions, wrong operators, off-by-one
- **State Issues**: Race conditions, stale data, missing initialization
- **Type Errors**: Null/undefined access, type mismatches
- **Integration Issues**: API changes, configuration problems
- **Resource Issues**: Memory leaks, connection exhaustion

## Output Format

1. **Diagnosis**: What is likely causing the issue
2. **Evidence**: How you determined this
3. **Solution**: The recommended fix
4. **Prevention**: How to avoid similar issues
