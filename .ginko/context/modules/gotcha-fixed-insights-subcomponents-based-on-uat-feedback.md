---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2025-12-30T19:59:33.088Z
updated: 2025-12-30T19:59:33.088Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767124773054
insightId: 60fea09c-4a47-4ffd-8ffc-697069ed374e
---

# Fixed Insights subcomponents based on UAT feedback: (1) C...

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2025-12-30  
**Session**: session-chris-at-watchhill-ai-1767124773054  

## The Gotcha

Insights subcomponents based on UAT feedback: (1) Cold start ratio detection now considers handoffs from previous sessions and events in sessions - sessions with events or following a handoff are warm, not cold; (2) Evidence items now include richer descriptions with timestamps, event counts, and handoff status; (3) Commit message evidence expanded from 40 to 80 chars; (4) Clarified Silent Sessions (zero events) vs Low Event Logging (avg rate below target) with distinct descriptions; (5) Added 5 new principles: ADR, Pattern Documentation, Atomic Commits, Session Handoff, ginko log - now ADR Awareness and Pattern Library insights show principles when expanded

## The Solution

5 new principles: ADR, Pattern Documentation, Atomic Commits, Session Handoff, ginko log - now ADR Awareness and Pattern Library insights show principles when expanded

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed Insights subcomponents based on UAT feedback: (1) Cold start ratio detection now considers handoffs from previous sessions and events in sessions - sessions with events or following a handoff are warm, not cold; (2) Evidence items now include richer descriptions with timestamps, event counts, and handoff status; (3) Commit message evidence expanded from 40 to 80 chars; (4) Clarified Silent Sessions (zero events) vs Low Event Logging (avg rate below target) with distinct descriptions; (5) Added 5 new principles: ADR, Pattern Documentation, Atomic Commits, Session Handoff, ginko log - now ADR Awareness and Pattern Library insights show principles when expanded.

## Related Files

- `packages/cli/src/lib/insights/data-collector.ts`
- `packages/cli/src/lib/insights/analyzers/*.ts`
- `dashboard/src/components/insights/PrinciplePreviewModal.tsx`

---
*This context module was automatically generated from session insights.*