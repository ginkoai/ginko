---
type: discovery
tags: [insight, high]
relevance: critical
created: 2026-01-07T23:58:18.510Z
updated: 2026-01-07T23:58:18.510Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767830298443
insightId: b9adc702-c031-4fd6-b98c-918bb844cd0b
---

# GOTCHA: Timestamp-based ID generation creates malformed e...

**Type**: discovery  
**Tags**: insight, high  
**Created**: 2026-01-07  

## What Was Discovered

GOTCHA: Timestamp-based ID generation creates malformed entities

## How It Works

GOTCHA: Timestamp-based ID generation creates malformed entities. Using Date.now() for entity IDs (e.g., epic_ginko_1763746656116) breaks sequential ID patterns and poisons max calculations. Always use sequential IDs with proper format validation (EPIC-NNN, ADR-NNN).

## Example Usage

*No code example available*

## Value

GOTCHA: Timestamp-based ID generation creates malformed entities. Using Date.now() for entity IDs (e.g., epic_ginko_1763746656116) breaks sequential ID patterns and poisons max calculations. Always use sequential IDs with proper format validation (EPIC-NNN, ADR-NNN).

- **Time Saved**: 240 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`