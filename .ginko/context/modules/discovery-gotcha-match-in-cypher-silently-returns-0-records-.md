---
type: discovery
tags: [insight, high, api]
relevance: critical
created: 2026-02-09T16:30:47.045Z
updated: 2026-02-09T16:30:47.045Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1770654647037
insightId: 1e68f725-b684-4009-9167-00747c31321b
---

# Gotcha: MATCH in Cypher silently returns 0 records when n...

**Type**: discovery  
**Tags**: insight, high, api  
**Created**: 2026-02-09  

## What Was Discovered

Gotcha: MATCH in Cypher silently returns 0 records when no node exists — it does NOT error

## How It Works

Gotcha: MATCH in Cypher silently returns 0 records when no node exists — it does NOT error. Combined with a 201 API response, this creates a silent failure pattern. Always surface MATCH miss as a warning in the API response, not just console.warn.

## Example Usage

*No code example available*

## Value

Gotcha: MATCH in Cypher silently returns 0 records when no node exists — it does NOT error. Combined with a 201 API response, this creates a silent failure pattern. Always surface MATCH miss as a warning in the API response, not just console.warn.

- **Time Saved**: 240 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/context/index.json`
- `.ginko/graph/config.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`