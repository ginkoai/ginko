---
type: discovery
tags: [insight, high, api]
relevance: critical
created: 2026-01-21T17:42:38.463Z
updated: 2026-01-21T17:42:38.463Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1769017358395
insightId: daf48419-f98d-46b6-b36a-5afbd5e5a655
---

# Root cause identified for graph loading bug

**Type**: discovery  
**Tags**: insight, high, api  
**Created**: 2026-01-21  

## What Was Discovered

Root cause identified for graph loading bug

## How It Works

but: 1) embeddings silently skipped, 2) summary field never populated, 3) job status lies (always returns completed), 4) status endpoint hardcodes withEmbeddings:0

## Example Usage

*No code example available*

## Value

Root cause identified for graph loading bug. When Voyage AI embedding fails, nodes are created but: 1) embeddings silently skipped, 2) summary field never populated, 3) job status lies (always returns completed), 4) status endpoint hardcodes withEmbeddings:0. Affects new projects where VOYAGE_API_KEY may be misconfigured or rate limited.

- **Time Saved**: 240 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `.ginko/sessions/chris-at-watchhill-ai/insights-schedule.json`