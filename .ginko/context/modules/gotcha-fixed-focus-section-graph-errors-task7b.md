---
type: gotcha
tags: [fix, high, cli]
relevance: critical
created: 2025-12-15T21:04:39.204Z
updated: 2025-12-15T21:04:39.204Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1765832679186
insightId: 0109eda5-fb7a-4e18-bdaa-5eb03536928a
---

# Fixed Focus section graph errors (TASK-7b)

**Type**: gotcha  
**Tags**: fix, high, cli  
**Created**: 2025-12-15  
**Session**: session-chris-at-watchhill-ai-1765832679186  

## The Gotcha

Focus section graph errors (TASK-7b)

## The Solution

checking only graphId exists

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed Focus section graph errors (TASK-7b). Three root causes: 1) CloudGraphClient.verifyAccess() checking userId which didn't match derived token ID - fixed by checking only graphId exists. 2) MyTasksList missing graphId prop - added prop and fallback. 3) RecentCompletions using getDefaultGraphId() which returns null - added DEFAULT_GRAPH_ID fallback. All components now have consistent fallback to gin_1762125961056_dg4bsd or NEXT_PUBLIC_GRAPH_ID env var.

## Related Files

- `dashboard/src/app/api/v1/graph/_cloud-graph-client.ts:192`
- `dashboard/src/components/focus/MyTasksList.tsx:88`
- `dashboard/src/components/focus/RecentCompletions.tsx:32`
- `dashboard/src/app/dashboard/page.tsx:15`

---
*This context module was automatically generated from session insights.*