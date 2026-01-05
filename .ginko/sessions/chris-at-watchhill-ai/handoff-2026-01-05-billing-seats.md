# Session Handoff: Per-Seat Billing Schema

**Date**: 2026-01-05
**Model**: Claude Opus 4.5 (claude-opus-4-5-20251101)
**Provider**: Anthropic
**Branch**: main
**Commit**: 3a9f5e0

## Summary

Completed **e008_s04_t01: Extend Billing Schema for Seats** - the first task of EPIC-008 Sprint 4 (Billing & Seats).

## What Was Done

### 1. Extended PlanTier Type
- Added `'team'` to PlanTier union type in `auth-manager.ts:31`
- New type: `'free' | 'pro' | 'team' | 'enterprise'`

### 2. Extended BillingSubscription Interface
- Added seat-related fields to `billing-manager.ts:29-43`:
  - `seatCount?: number` - Current number of seats
  - `seatLimit?: number` - Max seats for plan
  - `pricePerSeat?: number` - Price per seat in cents

### 3. Added TeamSeatAllocation Interface
- New interface at `billing-manager.ts:62-73` for tracking:
  - `teamId`, `organizationId`
  - `currentSeats`, `allocatedSeats`, `maxSeats`
  - `lastSyncedAt`

### 4. Added Team Tier Pricing
- `billing-manager.ts:185-230`
- Monthly: $15/seat/month
- Yearly: $150/seat/year (17% savings)
- Max 50 seats per team
- 14-day trial period

### 5. Implemented Seat Management Methods
Added to BillingManager class (`billing-manager.ts:886-1145`):
- `getSeatAllocation(teamId)` - Get current seat allocation
- `canAddSeats(teamId, count)` - Check if expansion allowed
- `updateSeatCount(orgId, count)` - Update Stripe subscription quantity
- `syncSeatCount(teamId)` - Sync with actual team member count
- `getSeatUsageSummary(orgId)` - Get billing display data

### 6. Added Team Tier Entitlements
- `entitlements-manager.ts:159-184`
- 50 max seats, 25 projects, 5000 sessions/month
- Team insights, priority support enabled
- Rate limits: 500 context queries, 100 session creation, 250 git webhooks

### 7. Created Neo4j Schema
- New file: `src/graph/schema/013-billing-seats.cypher`
- SeatAllocation node with indexes
- BillingEvent node for audit trail

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `packages/mcp-server/src/auth-manager.ts` | 31 | Added 'team' to PlanTier |
| `packages/mcp-server/src/billing-manager.ts` | +260 | Seat interfaces, pricing, methods |
| `packages/mcp-server/src/entitlements-manager.ts` | +26 | Team tier entitlements |
| `src/graph/schema/013-billing-seats.cypher` | 116 | New schema file |
| `docs/sprints/CURRENT-SPRINT.md` | +20 | Task marked complete |

## Sprint Progress

**EPIC-008 Sprint 4 - Billing & Seats**: 12.5% (1/8 tasks)

## Next Steps

Ready for **e008_s04_t02: Stripe Per-Seat Product Configuration** (2h):
- Create new Stripe product: "Ginko Team"
- Configure per-seat, monthly billing in Stripe
- Test in Stripe test mode
- Add product IDs to environment

## Technical Notes

- Build passes (verified with `npm run build`)
- No type errors (verified with `npx tsc --noEmit`)
- Free tier gets 2 seats (owner + 1)
- Team tier max 50 seats
- Enterprise tier unlimited seats

## Environment

No new environment variables required yet. Task t02 will add:
- `STRIPE_TEAM_MONTHLY_PRICE_ID`
- `STRIPE_TEAM_YEARLY_PRICE_ID`
