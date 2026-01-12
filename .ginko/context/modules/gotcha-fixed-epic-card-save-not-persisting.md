---
type: gotcha
tags: [fix, high, supabase, api, auth]
relevance: critical
created: 2026-01-12T02:03:23.291Z
updated: 2026-01-12T02:03:23.291Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768183403258
insightId: 5cf4c6ff-8a19-47a8-b3ca-e96d182f2c3f
---

# Fixed Epic card save not persisting

**Type**: gotcha  
**Tags**: fix, high, supabase, api, auth  
**Created**: 2026-01-12  
**Session**: session-chris-at-watchhill-ai-1768183403258  

## The Gotcha

PATCH requests to /api/v1/graph/nodes/:id were missing Authorization Bearer token. Solution: Added Supabase auth via getAuthHeaders() helper, included session token in updateEpicLane and updateEpicProperties functions. Also fixed graphId query param placement. Verified working in production.

## The Solution

Added Supabase auth via getAuthHeaders() helper, included session token in updateEpicLane and updateEpicProperties functions. Also fixed graphId query param placement. Verified working in production.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed Epic card save not persisting. Root cause: PATCH requests to /api/v1/graph/nodes/:id were missing Authorization Bearer token. Solution: Added Supabase auth via getAuthHeaders() helper, included session token in updateEpicLane and updateEpicProperties functions. Also fixed graphId query param placement. Verified working in production.

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/components/roadmap/EpicCard.tsx`
- `dashboard/src/components/roadmap/EpicEditModal.tsx`

---
*This context module was automatically generated from session insights.*