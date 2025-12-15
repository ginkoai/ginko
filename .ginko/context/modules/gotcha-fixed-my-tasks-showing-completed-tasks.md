---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-12-15T22:40:46.798Z
updated: 2025-12-15T22:40:46.798Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1765838446777
insightId: 2b9aeaac-ea4c-418d-a451-7042ed6eaf68
---

# Fixed My Tasks showing completed tasks

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-12-15  
**Session**: session-chris-at-watchhill-ai-1765838446777  

## The Gotcha

sprint sync used createNode (INSERT) instead of mergeNode (UPSERT), so task status updates weren't persisted. Fix: Changed sprint sync to use mergeNode for Tasks which updates status on re-sync. Also added status mapping (not_started -> todo) for graph consistency. Immediate fix: Updated existing tasks via PATCH API.

## The Solution

createNode (INSERT) instead of mergeNode (UPSERT), so task status updates weren't persisted

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed My Tasks showing completed tasks. Root cause: sprint sync used createNode (INSERT) instead of mergeNode (UPSERT), so task status updates weren't persisted. Fix: Changed sprint sync to use mergeNode for Tasks which updates status on re-sync. Also added status mapping (not_started -> todo) for graph consistency. Immediate fix: Updated existing tasks via PATCH API.

## Related Files

- `dashboard/src/app/api/v1/sprint/sync/route.ts:467-486`

---
*This context module was automatically generated from session insights.*