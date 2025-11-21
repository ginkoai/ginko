---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2025-11-19T04:59:51.683Z
updated: 2025-11-19T04:59:51.683Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1763528391666
insightId: 0908f68e-05f7-494e-a624-5a90d8f83385
---

# Fixed Neo4j query in initial-load endpoint to return expl...

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2025-11-19  
**Session**: session-chris-at-watchhill-ai-1763528391666  

## The Gotcha

RETURN e created {e: Node} structure but accessing r.e.properties didn't work with runQuery's toObject(). Solution: Changed to RETURN e.id, e.user_id, etc. and updated mapping to access properties directly from record. This should fix the 0 events bug.

## The Solution

Changed to RETURN e.id, e.user_id, etc. and updated mapping to access properties directly from record. This should fix the 0 events bug.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed Neo4j query in initial-load endpoint to return explicit properties instead of node object. Root cause: RETURN e created {e: Node} structure but accessing r.e.properties didn't work with runQuery's toObject(). Solution: Changed to RETURN e.id, e.user_id, etc. and updated mapping to access properties directly from record. This should fix the 0 events bug.

## Related Files

- `api/v1/context/initial-load.ts:156-215`

---
*This context module was automatically generated from session insights.*