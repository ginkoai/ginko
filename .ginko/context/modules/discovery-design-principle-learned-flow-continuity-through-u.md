---
type: discovery
tags: [insight, high, api]
relevance: critical
created: 2026-01-22T00:10:38.378Z
updated: 2026-01-22T00:10:38.378Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1769040638332
insightId: f81e606f-dbe6-4aaa-b802-ff6ec7d843ac
---

# Design principle learned: Flow continuity through user in...

**Type**: discovery  
**Tags**: insight, high, api  
**Created**: 2026-01-22  

## What Was Discovered

Design principle learned: Flow continuity through user intent

## How It Works

Design principle learned: Flow continuity through user intent. When auto-detection fails (timestamps lie, data quality issues), fall back to explicit user choice. The pattern: (1) Let user explicitly set their focus with a command, (2) Persist that choice locally, (3) Pass it to APIs as a preference parameter, (4) Show 2-3 alternatives for when they're ready to shift. Don't try to be smarter than the human - just maintain their context and make it easy to change.

## Example Usage

*No code example available*

## Value

Design principle learned: Flow continuity through user intent. When auto-detection fails (timestamps lie, data quality issues), fall back to explicit user choice. The pattern: (1) Let user explicitly set their focus with a command, (2) Persist that choice locally, (3) Pass it to APIs as a preference parameter, (4) Show 2-3 alternatives for when they're ready to shift. Don't try to be smarter than the human - just maintain their context and make it easy to change.

- **Time Saved**: 240 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/sprint/active/route.ts`