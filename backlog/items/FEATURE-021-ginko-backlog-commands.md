---
id: FEATURE-021
type: feature
title: Ginko Backlog Commands with Magic Interface
parent: null
status: PROPOSED
priority: CRITICAL
created: 2025-09-10
updated: 2025-09-10
effort: 8
children: [STORY-001, STORY-002, STORY-003]
tags: [cli, backlog, ai, natural-language, magic-commands]
prd: PRD-008
adr: ADR-012
---

# Ginko Backlog Commands with Magic Interface

## Problem Statement
Managing backlog items requires remembering command syntax and breaks developer flow. Need natural language interface that progressively reveals power features while maintaining simplicity for beginners.

## Solution
Implement three-layer command architecture (Human Intent → Ginko Structure → AI Execution) with progressive mastery from verbose commands to pure intent. Zero-command interface through `ginko "any request"`.

## Success Criteria
- [ ] Create backlog item in <5 seconds
- [ ] Zero learning curve (natural language from day 1)
- [ ] 100% consistency through templates
- [ ] Progressive shortcuts working (ginko feature → gf)
- [ ] AI understands context and intent

## Stories
- [x] STORY-001: Basic Command Structure
- [ ] STORY-002: AI Integration Layer
- [ ] STORY-003: Progressive Shortcuts

## Architecture
```
Human: "add oauth" → 
Ginko: Applies template + context → 
AI: Fills details → 
Result: Perfect FEATURE-022-oauth.md
```

## Technical Notes
- TypeScript implementation in packages/cli
- Template system in templates/
- AI integration via OpenAI/Anthropic APIs
- Context gathering from git, filesystem
- Smart type inference from description

## Dependencies
- Existing CLI infrastructure
- Template system (to be created)
- AI API integration
- Git state reading