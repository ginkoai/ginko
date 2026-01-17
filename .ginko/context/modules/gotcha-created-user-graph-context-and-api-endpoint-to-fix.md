---
type: gotcha
tags: [fix, high, supabase, api]
relevance: critical
created: 2026-01-17T22:59:59.327Z
updated: 2026-01-17T22:59:59.327Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768690799279
insightId: db853446-36cf-4294-b04d-7fef43ae908d
---

# Created user graph context and API endpoint to fix data i...

**Type**: gotcha  
**Tags**: fix, high, supabase, api  
**Created**: 2026-01-17  
**Session**: session-chris-at-watchhill-ai-1768690799279  

## The Gotcha

Dashboard used hardcoded graphId for all users ('gin_1762125961056_dg4bsd'). SOLUTION: 1) Created /api/v1/user/graph endpoint that looks up user's graphId from Neo4j ownership or Supabase team membership. 2) Created UserGraphContext that fetches and provides user's graphId. 3) Updated providers.tsx to include UserGraphProvider. 4) Updated dashboard/page.tsx to use context instead of hardcoded value. Now users only see their own project data.

## The Solution

1) Created /api/v1/user/graph endpoint that looks up user's graphId from Neo4j ownership or Supabase team membership. 2) Created UserGraphContext that fetches and provides user's graphId. 3) Updated providers.tsx to include UserGraphProvider. 4) Updated dashboard/page.tsx to use context instead of hardcoded value. Now users only see their own project data.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Created user graph context and API endpoint to fix data isolation in dashboard. ROOT CAUSE: Dashboard used hardcoded graphId for all users ('gin_1762125961056_dg4bsd'). SOLUTION: 1) Created /api/v1/user/graph endpoint that looks up user's graphId from Neo4j ownership or Supabase team membership. 2) Created UserGraphContext that fetches and provides user's graphId. 3) Updated providers.tsx to include UserGraphProvider. 4) Updated dashboard/page.tsx to use context instead of hardcoded value. Now users only see their own project data.

## Related Files

- `dashboard/src/app/api/v1/user/graph/route.ts`
- `dashboard/src/contexts/UserGraphContext.tsx`
- `dashboard/src/components/providers.tsx`
- `dashboard/src/app/dashboard/page.tsx`

---
*This context module was automatically generated from session insights.*