---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-12-11T21:51:25.643Z
updated: 2025-12-11T21:51:25.643Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1765489885492
insightId: e265c25f-8c46-4d58-8495-0f1da8190214
---

# Fixed sprint readout showing wrong sprint

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-12-11  
**Session**: session-chris-at-watchhill-ai-1765489885492  

## The Gotcha

comparison logic between local file and graph API was choosing stale graph data (Sprint 1 with 90% progress) over current local file (Sprint 2 with 87%). Fix: Added check for different sprint names - when sprints differ, local file always wins as source of truth. This handles graph sync lag when moving between sprints.

## The Solution

check for different sprint names - when sprints differ, local file always wins as source of truth

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed sprint readout showing wrong sprint. Root cause: comparison logic between local file and graph API was choosing stale graph data (Sprint 1 with 90% progress) over current local file (Sprint 2 with 87%). Fix: Added check for different sprint names - when sprints differ, local file always wins as source of truth. This handles graph sync lag when moving between sprints.

## Related Files

- `packages/cli/src/commands/start/start-reflection.ts:211-242`

---
*This context module was automatically generated from session insights.*