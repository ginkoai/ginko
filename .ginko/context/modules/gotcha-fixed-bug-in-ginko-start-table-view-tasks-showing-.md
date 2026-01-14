---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2026-01-14T20:22:58.847Z
updated: 2026-01-14T20:22:58.847Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768422178721
insightId: 94421804-5512-4943-b523-b225df2e05e7
---

# Fixed bug in ginko start table view: tasks showing [ ] in...

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2026-01-14  
**Session**: session-chris-at-watchhill-ai-1768422178721  

## The Gotcha

buildAIContext was using t.status (undefined) instead of t.state. Tasks from sprint-loader have state property, not status. Bumped to v2.0.4.

## The Solution

Fixed bug in ginko start table view: tasks showing [ ] instead of [x]. Root cause: buildAIContext was using t.status (undefined) instead of t.state. Tasks from sprint-loader have state property, not status. Bumped to v2.0.4.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed bug in ginko start table view: tasks showing [ ] instead of [x]. Root cause: buildAIContext was using t.status (undefined) instead of t.state. Tasks from sprint-loader have state property, not status. Bumped to v2.0.4.

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`

---
*This context module was automatically generated from session insights.*