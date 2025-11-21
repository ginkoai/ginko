---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2025-11-19T01:15:48.241Z
updated: 2025-11-19T01:15:48.241Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1763514948225
insightId: 04b0a420-fd43-444f-82aa-4a34d3c7de3e
---

# Fixed EventQueue timer keeping process alive

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2025-11-19  
**Session**: session-chris-at-watchhill-ai-1763514948225  

## The Gotcha

setInterval kept event loop alive. Solution: Added .unref(). Startup 90s → 2s.

## The Solution

Added .unref(). Startup 90s → 2s.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed EventQueue timer keeping process alive. Root cause: setInterval kept event loop alive. Solution: Added .unref(). Startup 90s → 2s.

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `.ginko/sessions/chris-at-watchhill-ai/cursors.json`
- `docs/adr/ADR-INDEX.md`

---
*This context module was automatically generated from session insights.*