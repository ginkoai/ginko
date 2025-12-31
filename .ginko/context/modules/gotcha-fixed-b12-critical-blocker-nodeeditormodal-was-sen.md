---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-12-31T16:25:03.672Z
updated: 2025-12-31T16:25:03.672Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767198303650
insightId: 1f7f9357-2e51-4c11-888c-0ca20b46ff5f
---

# Fixed B12 critical blocker: NodeEditorModal was sending g...

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-12-31  
**Session**: session-chris-at-watchhill-ai-1767198303650  

## The Gotcha

B12 critical blocker: NodeEditorModal was sending graphId in request body but API expects it as query parameter

## The Solution

Fixed B12 critical blocker: NodeEditorModal was sending graphId in request body but API expects it as query parameter. Changed fetch URL from /api/v1/graph/nodes/{id} to /api/v1/graph/nodes/{id}?graphId={graphId}. Also wrapped formData in 'properties' key to match API expectation.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed B12 critical blocker: NodeEditorModal was sending graphId in request body but API expects it as query parameter. Changed fetch URL from /api/v1/graph/nodes/{id} to /api/v1/graph/nodes/{id}?graphId={graphId}. Also wrapped formData in 'properties' key to match API expectation.

## Related Files

- `dashboard/src/components/graph/NodeEditorModal.tsx:241`

---
*This context module was automatically generated from session insights.*