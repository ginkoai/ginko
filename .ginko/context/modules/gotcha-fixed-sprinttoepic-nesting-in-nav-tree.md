---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2026-01-14T22:03:01.174Z
updated: 2026-01-14T22:03:01.174Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768428181138
insightId: 7b5475f1-d410-4581-b8b2-c37ab226e1c5
---

# Fixed Sprint-to-Epic nesting in Nav Tree

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2026-01-14  
**Session**: session-chris-at-watchhill-ai-1768428181138  

## The Gotcha

Sprint-to-Epic nesting in Nav Tree

## The Solution

Fixed Sprint-to-Epic nesting in Nav Tree. Issue: extractEpicId only matched prefix patterns, but real data has epic refs in middle of IDs like SPRINT-2026-01-epic010-sprint2. Updated extractEpicId to match patterns anywhere: e009-s05, epic010, etc. Also extract from sprint ID, node ID, and title for maximum matching.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed Sprint-to-Epic nesting in Nav Tree. Issue: extractEpicId only matched prefix patterns, but real data has epic refs in middle of IDs like SPRINT-2026-01-epic010-sprint2. Updated extractEpicId to match patterns anywhere: e009-s05, epic010, etc. Also extract from sprint ID, node ID, and title for maximum matching.

## Related Files

- `dashboard/src/lib/graph/api-client.ts`

---
*This context module was automatically generated from session insights.*