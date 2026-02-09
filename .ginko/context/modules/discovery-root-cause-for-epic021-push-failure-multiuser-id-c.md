---
type: discovery
tags: [insight, high, api, git, auth]
relevance: critical
created: 2026-02-09T15:17:49.891Z
updated: 2026-02-09T15:17:49.891Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1770650269877
insightId: efff7a99-0c14-49ee-a8c0-826d04e6f48a
---

# Root cause for EPIC-021 push failure: multi-user ID colli...

**Type**: discovery  
**Tags**: insight, high, api, git, auth  
**Created**: 2026-02-09  

## What Was Discovered

Root cause for EPIC-021 push failure: multi-user ID collision

## How It Works

EPIC-019 (GTM Launch) with sprints/tasks and pushed to graph

## Example Usage

*No code example available*

## Value

Root cause for EPIC-021 push failure: multi-user ID collision. Reese created EPIC-019 (GTM Launch) with sprints/tasks and pushed to graph. Chris's local didn't have it (Reese hasn't pushed to GitHub). Chris independently created EPIC-019 (Graph-Authoritative Tasks), pushed it, overwrote Reese's e019 node content but left her child sprints/tasks orphaned. Renumbered to EPIC-021 but API won't create new node — likely content similarity dedup against corrupted e019.

- **Time Saved**: 240 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/graph/config.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `.ginko/sessions/chris-at-watchhill-ai/insights-schedule.json`