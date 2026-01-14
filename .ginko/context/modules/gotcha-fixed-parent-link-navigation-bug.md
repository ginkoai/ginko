---
type: gotcha
tags: [fix, high, cli]
relevance: critical
created: 2026-01-14T23:03:49.183Z
updated: 2026-01-14T23:03:49.183Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768431829139
insightId: 17fbb12a-6e9e-4fbc-9d27-4e09122df2e6
---

# Fixed parent link navigation bug

**Type**: gotcha  
**Tags**: fix, high, cli  
**Created**: 2026-01-14  
**Session**: session-chris-at-watchhill-ai-1768431829139  

## The Gotcha

parent link navigation bug

## The Solution

Fixed parent link navigation bug. When clicking parent link (Sprint→Epic), the node wasn't loading because the fetch condition checked \!selectedNode which was always false. Fixed to check if selectedNode.id \!== selectedNodeId.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed parent link navigation bug. When clicking parent link (Sprint→Epic), the node wasn't loading because the fetch condition checked \!selectedNode which was always false. Fixed to check if selectedNode.id \!== selectedNodeId.

## Related Files

- `dashboard/src/app/dashboard/graph/page.tsx`

---
*This context module was automatically generated from session insights.*