---
type: gotcha
tags: [fix, high, api, cli]
relevance: critical
created: 2026-01-22T00:10:26.031Z
updated: 2026-01-22T00:10:26.031Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1769040625973
insightId: 7ef29d8e-3d7c-486a-9114-3426f567ccb6
---

# Fixed active sprint selection sync issue (EPIC-016)

**Type**: gotcha  
**Tags**: fix, high, api, cli  
**Created**: 2026-01-22  
**Session**: session-chris-at-watchhill-ai-1769040625973  

## The Gotcha

task timestamps reflected graph sync time, not actual user activity - Sprint 2 (0%) had newer timestamps than Sprint 3 (83%) despite no work done. Solution: User intent beats auto-detection. Added sprintId param to /api/v1/sprint/active API, ginko sprint start now saves user preference locally, CLI passes preference to API. Design insight from vibecheck: 'Trust the human to prioritize' - show last-worked-on sprint + 2-3 alternatives with summary, don't over-engineer detection algorithms. Simplicity won.

## The Solution

User intent beats auto-detection. Added sprintId param to /api/v1/sprint/active API, ginko sprint start now saves user preference locally, CLI passes preference to API. Design insight from vibecheck: 'Trust the human to prioritize' - show last-worked-on sprint + 2-3 alternatives with summary, don't over-engineer detection algorithms. Simplicity won.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed active sprint selection sync issue (EPIC-016). Root cause: task timestamps reflected graph sync time, not actual user activity - Sprint 2 (0%) had newer timestamps than Sprint 3 (83%) despite no work done. Solution: User intent beats auto-detection. Added sprintId param to /api/v1/sprint/active API, ginko sprint start now saves user preference locally, CLI passes preference to API. Design insight from vibecheck: 'Trust the human to prioritize' - show last-worked-on sprint + 2-3 alternatives with summary, don't over-engineer detection algorithms. Simplicity won.

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/sprint/active/route.ts`

---
*This context module was automatically generated from session insights.*