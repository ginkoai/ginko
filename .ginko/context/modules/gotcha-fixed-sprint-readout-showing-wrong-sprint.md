---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-12-11T17:23:24.302Z
updated: 2025-12-11T17:23:24.302Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1765473804274
insightId: 2717164e-fbd1-4667-b969-9dd97cf974cb
---

# Fixed sprint readout showing wrong sprint

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-12-11  
**Session**: session-chris-at-watchhill-ai-1765473804274  

## The Gotcha

sprint readout showing wrong sprint

## The Solution

Fixed sprint readout showing wrong sprint. Two fixes: (1) API property extraction - Neo4j returns nodes wrapped in properties object, now properly extracted. (2) Smart source selection - local sprint file now preferred over stale graph data when it has more tasks or higher completion. Before: Test Sprint 0%, After: EPIC-005 Sprint 1 70%. Committed 44e3d8d, deployed dashboard to production.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed sprint readout showing wrong sprint. Two fixes: (1) API property extraction - Neo4j returns nodes wrapped in properties object, now properly extracted. (2) Smart source selection - local sprint file now preferred over stale graph data when it has more tasks or higher completion. Before: Test Sprint 0%, After: EPIC-005 Sprint 1 70%. Committed 44e3d8d, deployed dashboard to production.

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `package-lock.json`

---
*This context module was automatically generated from session insights.*