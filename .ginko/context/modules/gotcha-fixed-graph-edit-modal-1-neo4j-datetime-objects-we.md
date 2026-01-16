---
type: gotcha
tags: [fix, high, react]
relevance: critical
created: 2026-01-16T16:58:05.213Z
updated: 2026-01-16T16:58:05.213Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768582685136
insightId: fec0c4a8-4ba4-46eb-8718-85d395b0a761
---

# Fixed Graph edit modal: (1) Neo4j DateTime objects were b...

**Type**: gotcha  
**Tags**: fix, high, react  
**Created**: 2026-01-16  
**Session**: session-chris-at-watchhill-ai-1768582685136  

## The Gotcha

Graph edit modal: (1) Neo4j DateTime objects were being serialized as complex Maps on save - added isPrimitive filter to PATCH endpoint

## The Solution

isPrimitive filter to PATCH endpoint

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed Graph edit modal: (1) Neo4j DateTime objects were being serialized as complex Maps on save - added isPrimitive filter to PATCH endpoint. (2) View wasn't updating after modal close - added React Query cache invalidation on save.

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/graph/nodes/[id]/route.ts`
- `dashboard/src/app/dashboard/graph/page.tsx`

---
*This context module was automatically generated from session insights.*