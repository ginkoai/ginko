---
type: gotcha
tags: [fix, high, cli]
relevance: critical
created: 2025-12-03T21:19:27.016Z
updated: 2025-12-03T21:19:27.016Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1764796767003
insightId: 998a6d24-3718-404c-a6ab-4ed70c71bc5e
---

# Fixed sprint loader to correctly identify active sprints

**Type**: gotcha  
**Tags**: fix, high, cli  
**Created**: 2025-12-03  
**Session**: session-chris-at-watchhill-ai-1764796767003  

## The Gotcha

sprint loader to correctly identify active sprints

## The Solution

priority logic - in-progress sprints (1-99% or [@] markers) now prioritized over not-started sprints (0%)

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed sprint loader to correctly identify active sprints. Two issues: (1) Regex mismatch - was looking for **Progress**: but files use **Progress:** (colon inside bold). (2) Added priority logic - in-progress sprints (1-99% or [@] markers) now prioritized over not-started sprints (0%). Previously Sprint 3 (0%) was shown before Sprint 2 (60%) due to filename sort order. Files: packages/cli/src/lib/sprint-loader.ts:140-188

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `packages/cli/src/lib/sprint-loader.ts`

---
*This context module was automatically generated from session insights.*