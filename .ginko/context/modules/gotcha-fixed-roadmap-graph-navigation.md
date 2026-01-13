---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2026-01-13T18:15:56.844Z
updated: 2026-01-13T18:15:56.844Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768328156801
insightId: cce0d212-aa5a-4864-93e5-6de695f62062
---

# Fixed Roadmap → Graph navigation

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2026-01-13  
**Session**: session-chris-at-watchhill-ai-1768328156801  

## The Gotcha

Roadmap → Graph navigation

## The Solution

adding getNodeById API function and preventing 'Node not found' flash during async fetch

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed Roadmap → Graph navigation. Added 'View in Graph' button to EpicEditModal. Fixed node lookup for deep links by adding getNodeById API function and preventing 'Node not found' flash during async fetch.

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/dashboard/graph/page.tsx`
- `dashboard/src/components/roadmap/EpicEditModal.tsx`
- `dashboard/src/lib/graph/api-client.ts`

---
*This context module was automatically generated from session insights.*