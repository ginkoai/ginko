---
type: pattern
tags: [feature, high, supabase, api, cli]
relevance: critical
created: 2026-01-06T16:19:53.503Z
updated: 2026-01-06T16:19:53.503Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767716393433
insightId: 168f6d98-34cb-42ab-a24d-7613ef28b889
---

# Implemented device code flow for ginko login (like GitHub...

**Type**: pattern  
**Tags**: feature, high, supabase, api, cli  
**Created**: 2026-01-06  

## Pattern Description

Implemented device code flow for ginko login (like GitHub CLI)

## Implementation

device code flow for ginko login (like GitHub CLI)

## Code Example

*No code example available*

## When to Use

Implemented device code flow for ginko login (like GitHub CLI). Created: Supabase migration for device_auth_requests table, 3 API endpoints (/api/auth/device/init, authorize, status), /auth/device page UI, updated CLI login command. Flow: CLI generates code -> user enters in browser -> CLI receives API key. Replaces broken in-memory session storage approach.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `.ginko/sessions/chris-at-watchhill-ai/insights-schedule.json`
- `dashboard/src/app/auth/callback/route.ts`
- `packages/cli/src/commands/login.ts`