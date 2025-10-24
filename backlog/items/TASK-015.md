---
id: TASK-015
type: task
title: Implement Always-Load Core Context Modules System
parent:
  - STORY-XXX or FEATURE-XXX or null
status: todo
priority: critical
created: '2025-10-23T23:43:09.067Z'
updated: '2025-10-23T23:43:09.069Z'
effort:
  - Hours or points
tags: []
sprint:
  - optional
size: M
author: xtophr@gmail.com
---

# Implement Always-Load Core Context Modules System

## Problem Statement

Context bloat analysis revealed that AI lacks critical pattern knowledge for immediate productivity:
- No project structure overview (where files live, naming conventions)
- No testing patterns (how to write/run tests)
- No code conventions (TypeScript patterns, imports, error handling)
- No common commands reference
- 29 context modules (50k tokens) mostly stale/irrelevant

Current strategic loader reduced context from 64k → 2k tokens, but still missing foundational knowledge needed for flow state.

## Solution

Implement always-load core module system that loads 3-7 small, critical modules on every session based on work mode:

**hack-ship**: 3 modules (~3-5k tokens)
- project-structure
- common-commands
- context-pressure

**think-build**: 5 modules (~8-12k tokens)
- project-structure
- testing-patterns
- code-conventions
- common-commands
- context-pressure

**full-planning**: 7 modules (~12-15k tokens)
- All think-build modules plus:
- architecture-overview
- git-workflow

## Acceptance Criteria

- [ ] All 7 core modules created with proper frontmatter
- [ ] Stale modules archived (business content, outdated TODOs)
- [ ] ginko.json includes alwaysLoad config by work mode
- [ ] context-loader.ts loads always-load modules before strategic loading
- [ ] `ginko start` shows 3-7 core modules loaded based on mode
- [ ] Token usage: 3-5k (hack-ship), 8-12k (think-build), 12-15k (full-planning)
- [ ] Total context including backlog: <20k tokens
- [ ] Working space remains >60k tokens after loading

## Implementation Tasks

1. Create `.ginko/context/core/` directory structure
2. Generate 7 core modules (each 400-1000 words, concise)
3. Archive stale modules to `.ginko/context/archive/`
4. Update `ginko.json` with `alwaysLoad` configuration
5. Modify `context-loader.ts` to load always-load modules
6. Test with `ginko start` to verify token usage

## References

- Gap analysis from ginko start workflow review
- ADR-037: Two-Tier Configuration Architecture
- PRD-009: Configuration and Reference System
