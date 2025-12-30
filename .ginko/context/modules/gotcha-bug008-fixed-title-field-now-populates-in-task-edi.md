---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-12-29T22:12:24.622Z
updated: 2025-12-29T22:12:24.622Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767046344598
insightId: 7a69361a-4c08-49c7-bb47-a210a98700d2
---

# BUG-008 FIXED: Title field now populates in Task edit modal

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-12-29  
**Session**: session-chris-at-watchhill-ai-1767046344598  

## The Gotcha

API endpoints returned properties flat on node object instead of nested in node.properties. Fixed GET/PATCH responses in nodes/[id]/route.ts and unsynced/route.ts to wrap properties correctly.

## The Solution

BUG-008 FIXED: Title field now populates in Task edit modal. Root cause: API endpoints returned properties flat on node object instead of nested in node.properties. Fixed GET/PATCH responses in nodes/[id]/route.ts and unsynced/route.ts to wrap properties correctly.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- BUG-008 FIXED: Title field now populates in Task edit modal. Root cause: API endpoints returned properties flat on node object instead of nested in node.properties. Fixed GET/PATCH responses in nodes/[id]/route.ts and unsynced/route.ts to wrap properties correctly.

## Related Files

- `dashboard/src/app/api/v1/graph/nodes/[id]/route.ts`
- `dashboard/src/app/api/v1/graph/nodes/unsynced/route.ts`

---
*This context module was automatically generated from session insights.*