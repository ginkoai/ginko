---
type: gotcha
tags: [fix, high, api, cli]
relevance: critical
created: 2026-01-21T15:33:48.703Z
updated: 2026-01-21T15:33:48.703Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1769009628656
insightId: 3ce03f73-68ee-4837-8076-3c8e38ea3564
---

# Fixed ginko start sprint detection and output display

**Type**: gotcha  
**Tags**: fix, high, api, cli  
**Created**: 2026-01-21  
**Session**: session-chris-at-watchhill-ai-1769009628656  

## The Gotcha

1) API sprint/active query treated sprints with 0 tasks as incomplete (priority 0), causing stale sprints to be selected. Fix: Deprioritize sprints with 0 tasks to priority 1. 2) CLI was using user-assigned sprint file path instead of graph's active sprint ID. Fix: Use findSprintFileById to locate correct file. 3) Spinner output in non-TTY mode polluted table display. Fix: Disable spinner when isTTY \!== true.

## The Solution

Fixed ginko start sprint detection and output display. Root cause: 1) API sprint/active query treated sprints with 0 tasks as incomplete (priority 0), causing stale sprints to be selected. Fix: Deprioritize sprints with 0 tasks to priority 1. 2) CLI was using user-assigned sprint file path instead of graph's active sprint ID. Fix: Use findSprintFileById to locate correct file. 3) Spinner output in non-TTY mode polluted table display. Fix: Disable spinner when isTTY \!== true.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed ginko start sprint detection and output display. Root cause: 1) API sprint/active query treated sprints with 0 tasks as incomplete (priority 0), causing stale sprints to be selected. Fix: Deprioritize sprints with 0 tasks to priority 1. 2) CLI was using user-assigned sprint file path instead of graph's active sprint ID. Fix: Use findSprintFileById to locate correct file. 3) Spinner output in non-TTY mode polluted table display. Fix: Disable spinner when isTTY \!== true.

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/sprint/active/route.ts`
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/lib/sprint-loader.ts`

---
*This context module was automatically generated from session insights.*