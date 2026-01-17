---
type: pattern
tags: [feature, high, api]
relevance: critical
created: 2026-01-17T22:54:22.275Z
updated: 2026-01-17T22:54:22.275Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768690462225
insightId: e915fe6a-8a5e-43f6-82d1-8a740bde936c
---

# Completed task 1: Created graph access verification helpe...

**Type**: pattern  
**Tags**: feature, high, api  
**Created**: 2026-01-17  

## Pattern Description

Completed task 1: Created graph access verification helper at dashboard/src/lib/graph/access

## Implementation

graph access verification helper at dashboard/src/lib/graph/access

## Code Example

*No code example available*

## When to Use

Completed task 1: Created graph access verification helper at dashboard/src/lib/graph/access.ts. Implements verifyGraphAccess() that checks: 1) direct ownership (graph.userId === userId), 2) team membership (teams.graph_id lookup), 3) public visibility for read access. Exports verifyGraphAccessFromRequest() convenience wrapper for API routes.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `dashboard/src/lib/graph/access.ts`