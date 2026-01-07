---
type: pattern
tags: [feature, high, api, cli]
relevance: critical
created: 2026-01-07T17:01:12.176Z
updated: 2026-01-07T17:01:12.176Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767805272138
insightId: 5f2e001d-828a-4756-abcf-73c55d6bc7b6
---

# Implemented ADR-058 entity ID conflict resolution

**Type**: pattern  
**Tags**: feature, high, api, cli  
**Created**: 2026-01-07  

## Pattern Description

Implemented ADR-058 entity ID conflict resolution

## Implementation

ADR-058 entity ID conflict resolution

## Code Example

*No code example available*

## When to Use

Implemented ADR-058 entity ID conflict resolution. Added first-claim-wins strategy with rename suggestion for team epic sync. CLI now checks for ID conflicts before sync and prompts user to rename (e.g., EPIC-010 → EPIC-011), skip, or cancel. Created new API endpoints: /api/v1/epic/check (conflict detection), /api/v1/epic/ids (ID listing). Updated epic sync to track createdBy/updatedBy. Deployed to production.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `.ginko/sessions/chris-at-watchhill-ai/insights-schedule.json`
- `dashboard/src/app/api/v1/epic/sync/route.ts`
- `package-lock.json`