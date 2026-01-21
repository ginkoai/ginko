---
type: pattern
tags: [feature, high, api, cli]
relevance: critical
created: 2026-01-21T15:48:23.035Z
updated: 2026-01-21T15:48:23.035Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1769010502992
insightId: 7b1cb0a1-b54b-4940-9526-48c049530123
---

# Enhanced ginko start with roadmap-aware sprint selection ...

**Type**: pattern  
**Tags**: feature, high, api, cli  
**Created**: 2026-01-21  

## Pattern Description

Enhanced ginko start with roadmap-aware sprint selection and graph-only state loading

## Implementation

Epic roadmap_lane (Now > Next > Later), excludes done/dropped epics

## Code Example

*No code example available*

## When to Use

Enhanced ginko start with roadmap-aware sprint selection and graph-only state loading. Changes: 1) API now prioritizes sprints by Epic roadmap_lane (Now > Next > Later), excludes done/dropped epics. 2) CLI simplified to fetch state directly from graph API without local file loading/merging - faster startup. 3) Fixed Cypher query syntax for Neo4j compatibility.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/sprint/active/route.ts`