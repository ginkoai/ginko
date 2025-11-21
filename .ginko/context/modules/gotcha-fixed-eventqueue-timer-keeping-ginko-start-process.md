---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2025-11-19T00:37:16.102Z
updated: 2025-11-19T00:37:16.102Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1763512636088
insightId: 3b9e4cc2-a838-4e3a-996f-d16289ed211c
---

# Fixed EventQueue timer keeping ginko start process alive ...

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2025-11-19  
**Session**: session-chris-at-watchhill-ai-1763512636088  

## The Gotcha

setInterval at event-queue.ts:82 kept Node.js event loop alive. Solution: Added .unref() to allow clean exit. Reduced startup from 90s to 2s.

## The Solution

Added .unref() to allow clean exit. Reduced startup from 90s to 2s.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed EventQueue timer keeping ginko start process alive indefinitely. Root cause: setInterval at event-queue.ts:82 kept Node.js event loop alive. Solution: Added .unref() to allow clean exit. Reduced startup from 90s to 2s.

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `.ginko/sessions/chris-at-watchhill-ai/cursors.json`
- `docs/adr/ADR-INDEX.md`
- `docs/sprints/CURRENT-SPRINT.md`

---
*This context module was automatically generated from session insights.*