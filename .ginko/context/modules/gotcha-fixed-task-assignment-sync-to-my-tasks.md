---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-12-17T00:49:03.897Z
updated: 2025-12-17T00:49:03.897Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1765932543876
insightId: a6efb271-0973-470a-862c-2569a4e4f846
---

# Fixed task assignment sync to My Tasks

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-12-17  
**Session**: session-chris-at-watchhill-ai-1765932543876  

## The Gotcha

nodes API sorted by created_at (snake_case) but sprint sync creates tasks with createdAt (camelCase). Tasks with null created_at fell to end of results. Solution: Changed ORDER BY to COALESCE(n.createdAt, n.created_at) DESC. Impact: Sprint 2 tasks now appear in My Tasks dashboard.

## The Solution

Changed ORDER BY to COALESCE(n.createdAt, n.created_at) DESC. Impact: Sprint 2 tasks now appear in My Tasks dashboard.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed task assignment sync to My Tasks. Root cause: nodes API sorted by created_at (snake_case) but sprint sync creates tasks with createdAt (camelCase). Tasks with null created_at fell to end of results. Solution: Changed ORDER BY to COALESCE(n.createdAt, n.created_at) DESC. Impact: Sprint 2 tasks now appear in My Tasks dashboard.

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/graph/nodes/route.ts`

---
*This context module was automatically generated from session insights.*