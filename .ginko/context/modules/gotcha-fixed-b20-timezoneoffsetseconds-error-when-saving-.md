---
type: gotcha
tags: [fix, high, api, git]
relevance: critical
created: 2025-12-31T18:36:57.530Z
updated: 2025-12-31T18:36:57.530Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767206217467
insightId: 4c985cbc-63a6-4bf6-9092-f4f152a948b3
---

# Fixed B20: timeZoneOffsetSeconds error when saving nodes

**Type**: gotcha  
**Tags**: fix, high, api, git  
**Created**: 2025-12-31  
**Session**: session-chris-at-watchhill-ai-1767206217467  

## The Gotcha

Neo4j DateTime objects from loaded nodes were being sent back in form data. Solution: Filter out system-managed fields (editedAt, updatedAt, createdAt, syncedAt, synced, contentHash, gitHash, id, graphId) before building the Cypher SET clause. These fields are auto-managed by the API.

## The Solution

Filter out system-managed fields (editedAt, updatedAt, createdAt, syncedAt, synced, contentHash, gitHash, id, graphId) before building the Cypher SET clause. These fields are auto-managed by the API.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed B20: timeZoneOffsetSeconds error when saving nodes. Root cause: Neo4j DateTime objects from loaded nodes were being sent back in form data. Solution: Filter out system-managed fields (editedAt, updatedAt, createdAt, syncedAt, synced, contentHash, gitHash, id, graphId) before building the Cypher SET clause. These fields are auto-managed by the API.

## Related Files

- `dashboard/src/app/api/v1/graph/nodes/[id]/route.ts:139-146`

---
*This context module was automatically generated from session insights.*