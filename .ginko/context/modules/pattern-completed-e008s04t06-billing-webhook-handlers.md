---
type: pattern
tags: [feature, high, api]
relevance: critical
created: 2026-01-05T21:55:31.003Z
updated: 2026-01-05T21:55:31.003Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767650130967
insightId: b485967f-6dec-46c5-b7b6-7bf47edb9cfe
---

# Completed e008_s04_t06: Billing Webhook Handlers

**Type**: pattern  
**Tags**: feature, high, api  
**Created**: 2026-01-05  

## Pattern Description

Completed e008_s04_t06: Billing Webhook Handlers

## Implementation

/api/webhooks/stripe endpoint with signature verification

## Code Example

*No code example available*

## When to Use

Completed e008_s04_t06: Billing Webhook Handlers. Created /api/webhooks/stripe endpoint with signature verification. Handles customer.subscription.updated (seat/plan changes), customer.subscription.deleted (downgrade to free), invoice.payment_failed (track failures), invoice.payment_succeeded (clear failures), checkout.session.completed (link new subs). Updates org records and logs billing events for audit.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/dashboard/billing/page.tsx`