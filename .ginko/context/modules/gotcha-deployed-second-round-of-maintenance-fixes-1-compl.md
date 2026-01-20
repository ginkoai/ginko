---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2026-01-20T20:50:55.049Z
updated: 2026-01-20T20:50:55.049Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768942255016
insightId: 8040f4db-505a-4c7a-9d48-9f9fcf458e4a
---

# Deployed second round of maintenance fixes: (1) Complete ...

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2026-01-20  
**Session**: session-chris-at-watchhill-ai-1768942255016  

## The Gotcha

active sprint query with fallback when all sprints are complete, (4) Sprint-to-epic matching now works across duplicate nodes

## The Solution

canonical ID and picks best display node while keeping ALL variants in epicMap for sprint matching, (2) Added epic title sanitization for malformed data like 'string,', (3) Fixed active sprint query with fallback when all sprints are complete, (4) Sprint-to-epic matching now works across duplicate nodes

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Deployed second round of maintenance fixes: (1) Complete rewrite of epic deduplication - now groups by canonical ID and picks best display node while keeping ALL variants in epicMap for sprint matching, (2) Added epic title sanitization for malformed data like 'string,', (3) Fixed active sprint query with fallback when all sprints are complete, (4) Sprint-to-epic matching now works across duplicate nodes.

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/graph/roadmap/route.ts`
- `dashboard/src/app/api/v1/sprint/active/route.ts`

---
*This context module was automatically generated from session insights.*