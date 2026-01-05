---
type: pattern
tags: [feature, high, vercel, api]
relevance: critical
created: 2026-01-05T21:51:55.974Z
updated: 2026-01-05T21:51:55.974Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767649915935
insightId: 1bdf09df-d0c4-4c3d-8e64-0ad52924120b
---

# Completed e008_s04_t05: Upgrade/Downgrade Flows

**Type**: pattern  
**Tags**: feature, high, vercel, api  
**Created**: 2026-01-05  

## Pattern Description

Completed e008_s04_t05: Upgrade/Downgrade Flows

## Implementation

seat management API (/api/v1/billing/seats) with POST for updating seat count and GET for current allocation

## Code Example

*No code example available*

## When to Use

Completed e008_s04_t05: Upgrade/Downgrade Flows. Created seat management API (/api/v1/billing/seats) with POST for updating seat count and GET for current allocation. Built ManageSeats component with add/remove seat modals showing billing impact, confirmation dialogs, and proper proration handling (add=immediate charge, remove=period_end). Integrated into billing page for team owners. Also added Stripe env vars to Vercel and fixed stripe-setup-seats.ts features parameter issue.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/dashboard/billing/page.tsx`
- `dashboard/src/components/billing/index.ts`