---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2026-01-17T23:59:28.124Z
updated: 2026-01-17T23:59:28.124Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768694368087
insightId: 57428948-636b-410a-8d3b-7035b754673f
---

# Fixed critical data isolation bug in graph and roadmap pages

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2026-01-17  
**Session**: session-chris-at-watchhill-ai-1768694368087  

## The Gotcha

hardcoded DEFAULT_GRAPH_ID fallback showing ginko project data to all users. Fix: Both pages now use useUserGraph hook to get user's own graphId from context, with proper loading and no-project states. Also removed NEXT_PUBLIC_GRAPH_ID env var from production. Ed's vschool project should now be visible.

## The Solution

Fixed critical data isolation bug in graph and roadmap pages. Root cause: hardcoded DEFAULT_GRAPH_ID fallback showing ginko project data to all users. Fix: Both pages now use useUserGraph hook to get user's own graphId from context, with proper loading and no-project states. Also removed NEXT_PUBLIC_GRAPH_ID env var from production. Ed's vschool project should now be visible.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed critical data isolation bug in graph and roadmap pages. Root cause: hardcoded DEFAULT_GRAPH_ID fallback showing ginko project data to all users. Fix: Both pages now use useUserGraph hook to get user's own graphId from context, with proper loading and no-project states. Also removed NEXT_PUBLIC_GRAPH_ID env var from production. Ed's vschool project should now be visible.

## Related Files

- `dashboard/src/app/dashboard/graph/page.tsx`
- `dashboard/src/app/dashboard/roadmap/page.tsx`

---
*This context module was automatically generated from session insights.*