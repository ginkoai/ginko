---
type: pattern
tags: [feature, high, api]
relevance: critical
created: 2026-01-19T17:57:45.640Z
updated: 2026-01-19T17:57:45.640Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768845465583
insightId: 8035af96-f0d5-4bb4-812e-6034ca339c55
---

# Updated sprint sync API to support ADR-052 task ID format...

**Type**: pattern  
**Tags**: feature, high, api  
**Created**: 2026-01-19  

## Pattern Description

Updated sprint sync API to support ADR-052 task ID format (e{NNN}_s{NN}_t{NN})

## Implementation

Updated sprint sync API to support ADR-052 task ID format (e{NNN}_s{NN}_t{NN}). Previously only supported old TASK-N format. Now parses: (1) new hierarchical task IDs directly from markdown, (2) checkbox status format [x]/[ ]/[@]/[Z], (3) effort in title parentheses, (4) simple bullet file references. Deployed to prod and pushed all 4 EPIC-011 sprints with ~75 nodes and ~90 relationships.

## Code Example

*No code example available*

## When to Use

Updated sprint sync API to support ADR-052 task ID format (e{NNN}_s{NN}_t{NN}). Previously only supported old TASK-N format. Now parses: (1) new hierarchical task IDs directly from markdown, (2) checkbox status format [x]/[ ]/[@]/[Z], (3) effort in title parentheses, (4) simple bullet file references. Deployed to prod and pushed all 4 EPIC-011 sprints with ~75 nodes and ~90 relationships.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/graph/config.json`
- `dashboard/src/app/api/v1/sprint/sync/route.ts`