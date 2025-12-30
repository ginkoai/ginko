---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2025-12-30T22:54:02.833Z
updated: 2025-12-30T22:54:02.833Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767135242793
insightId: 91ca8290-31e8-45d5-8b40-966e927d8e97
---

# Fixed insights period filtering

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2025-12-30  
**Session**: session-chris-at-watchhill-ai-1767135242793  

## The Gotcha

date parsing in collectSessions was broken - regex replaced ALL hyphens with colons, making Invalid Date for all archive files. Solution: targeted regex that only converts time portion (T15-22-55-104Z → T15:22:55.104Z). Sessions now properly filter by 1/7/30 day periods. All insights re-synced to dashboard.

## The Solution

targeted regex that only converts time portion (T15-22-55-104Z → T15:22:55.104Z). Sessions now properly filter by 1/7/30 day periods. All insights re-synced to dashboard.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed insights period filtering. Root cause: date parsing in collectSessions was broken - regex replaced ALL hyphens with colons, making Invalid Date for all archive files. Solution: targeted regex that only converts time portion (T15-22-55-104Z → T15:22:55.104Z). Sessions now properly filter by 1/7/30 day periods. All insights re-synced to dashboard.

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`

---
*This context module was automatically generated from session insights.*