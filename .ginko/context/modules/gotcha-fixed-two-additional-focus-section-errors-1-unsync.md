---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-12-15T21:14:57.486Z
updated: 2025-12-15T21:14:57.486Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1765833297465
insightId: 0d15beb1-9aa9-4fca-9877-59ff1b9a1b6a
---

# Fixed two additional Focus section errors: 1) Unsynced no...

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-12-15  
**Session**: session-chris-at-watchhill-ai-1765833297465  

## The Gotcha

two additional Focus section errors: 1) Unsynced nodes API 500 error - query was searching for graph_id property on nodes but they're linked via Graph relationship pattern

## The Solution

safeParseDate() helper that handles Neo4j datetime objects, Date objects, and ISO strings with fallback

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed two additional Focus section errors: 1) Unsynced nodes API 500 error - query was searching for graph_id property on nodes but they're linked via Graph relationship pattern. Fixed query to use MATCH (g:Graph)-[:CONTAINS]->(n). 2) RangeError Invalid time value - Neo4j datetime objects weren't parsing correctly. Added safeParseDate() helper that handles Neo4j datetime objects, Date objects, and ISO strings with fallback.

## Related Files

- `dashboard/src/app/api/v1/graph/nodes/unsynced/route.ts:108`
- `dashboard/src/components/focus/SprintProgressCard.tsx:61`

---
*This context module was automatically generated from session insights.*