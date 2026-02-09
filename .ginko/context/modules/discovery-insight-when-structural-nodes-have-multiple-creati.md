---
type: discovery
tags: [insight, high, api]
relevance: critical
created: 2026-02-09T16:30:39.695Z
updated: 2026-02-09T16:30:39.695Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1770654639677
insightId: d2fbd21f-32de-4265-8c19-57ee27177062
---

# Insight: When structural nodes have multiple creation pat...

**Type**: discovery  
**Tags**: insight, high, api  
**Created**: 2026-02-09  

## What Was Discovered

Insight: When structural nodes have multiple creation paths (task sync vs document upload), verify each path independently

## How It Works

Insight: When structural nodes have multiple creation paths (task sync vs document upload), verify each path independently. Epic had a gap: task sync only creates Epic nodes when sprints reference them, so standalone Epics with no sprints had no creation path. The API returned 201 success masking the silent failure.

## Example Usage

*No code example available*

## Value

Insight: When structural nodes have multiple creation paths (task sync vs document upload), verify each path independently. Epic had a gap: task sync only creates Epic nodes when sprints reference them, so standalone Epics with no sprints had no creation path. The API returned 201 success masking the silent failure.

- **Time Saved**: 240 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/context/index.json`
- `.ginko/graph/config.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`