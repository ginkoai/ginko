# SPRINT: Team Collaboration Sprint 4 - Billing & Seats

## Sprint Overview

**Sprint Goal**: Implement per-seat monthly billing via Stripe and prepare team features for launch
**Duration**: 1-2 weeks (2026-02-10 to 2026-02-21)
**Type**: Infrastructure + Launch sprint
**Progress:** 12.5% (1/8 tasks complete)

**Success Criteria:**
- [ ] Per-seat monthly billing operational via Stripe
- [ ] Seat count updates automatically on member add/remove
- [ ] Dashboard shows seat usage and billing status
- [ ] Upgrade/downgrade flows work correctly
- [ ] Launch checklist complete

---

## Sprint Tasks

### e008_s04_t01: Extend Billing Schema for Seats (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Update billing schema to support per-seat model

**Implementation Notes:**
Extend existing ADR-005 Stripe integration:
- Add seat count to subscription metadata
- Track per-team seat allocation
- Define pricing: $15/seat/month (Team tier)

**Files:**
- `packages/mcp-server/src/billing-manager.ts` (extended)
- `packages/mcp-server/src/auth-manager.ts` (added 'team' to PlanTier)
- `packages/mcp-server/src/entitlements-manager.ts` (added team tier limits)
- `src/graph/schema/013-billing-seats.cypher` (new)

Follow: ADR-005 (Stripe Payment Integration)

---

### e008_s04_t02: Stripe Per-Seat Product Configuration (2h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Configure Stripe products for per-seat pricing

**Implementation Notes:**
- Create new Stripe product: "Ginko Team"
- Pricing: per-seat, monthly billing
- Configure metered billing or quantity-based
- Test in Stripe test mode first

**Files:**
- `scripts/stripe-setup-seats.ts` (new)
- `.env.example` (add seat product IDs)

---

### e008_s04_t03: Seat Count Synchronization (6h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Automatically update Stripe seat count when members change

**Implementation Notes:**
- Hook into member add/remove events
- Update Stripe subscription quantity
- Handle proration for mid-cycle changes
- Sync seat count on startup for consistency

**Files:**
- `packages/mcp-server/src/billing-manager.ts` (add seat sync)
- `dashboard/src/app/api/v1/team/members/route.ts` (trigger billing update)

---

### e008_s04_t04: Dashboard Billing Overview (6h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Show seat usage and billing status in dashboard

**Implementation Notes:**
- Current seat count vs. plan limit
- Next billing date and amount
- Usage graph (seats over time)
- Link to Stripe customer portal

**Files:**
- `dashboard/src/components/billing/SeatUsage.tsx` (new)
- `dashboard/src/components/billing/BillingOverview.tsx` (new)
- `dashboard/src/app/settings/billing/page.tsx` (new or update)

---

### e008_s04_t05: Upgrade/Downgrade Flows (6h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Enable teams to adjust seat count and plan tier

**Implementation Notes:**
- Add seats: immediate billing (prorated)
- Remove seats: effective at period end
- Plan upgrade: immediate
- Plan downgrade: effective at period end
- Clear confirmation dialogs

**Files:**
- `dashboard/src/components/billing/ManageSeats.tsx` (new)
- `dashboard/src/app/api/v1/billing/seats/route.ts` (new)

---

### e008_s04_t06: Billing Webhook Handlers (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Handle Stripe webhooks for seat-related events

**Implementation Notes:**
Extend existing webhook handler for:
- `customer.subscription.updated` - seat count changes
- `invoice.payment_failed` - handle payment issues
- `customer.subscription.deleted` - team downgrade

**Files:**
- `dashboard/src/app/api/webhooks/stripe/route.ts` (update)

---

### e008_s04_t07: Free Tier / Trial Configuration (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assigned:** chris@watchhill.ai

**Goal:** Configure free tier limits and trial period for teams

**Implementation Notes:**
- Free tier: 2 seats max (owner + 1)
- Trial: 14 days with full features
- Clear upgrade prompts when limits hit
- Grace period handling

**Files:**
- `packages/mcp-server/src/billing-manager.ts` (add tier logic)
- `dashboard/src/lib/subscription-limits.ts` (new)

---

### e008_s04_t08: Launch Checklist & Final Testing (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assigned:** chris@watchhill.ai

**Goal:** Complete pre-launch validation for team features

**Implementation Notes:**
Verify:
- [ ] Full invite → join → collaborate flow works
- [ ] Billing correctly charges for seats
- [ ] Proration works for mid-cycle changes
- [ ] Webhooks fire and process correctly
- [ ] Error handling for payment failures
- [ ] Documentation complete
- [ ] No security issues (permission checks)

**Files:**
- `docs/launch/EPIC-008-launch-checklist.md` (new)

---

## Accomplishments This Sprint

### 2026-01-05: Extended Billing Schema for Seats (e008_s04_t01)
- Added 'team' tier to PlanTier type with per-seat billing model
- Extended BillingSubscription interface with seatCount, seatLimit, pricePerSeat fields
- Added TeamSeatAllocation interface for tracking seat usage
- Implemented seat management methods in BillingManager:
  - `getSeatAllocation(teamId)` - Get current seat allocation for a team
  - `canAddSeats(teamId, count)` - Check if team can add more seats
  - `updateSeatCount(orgId, count)` - Update Stripe subscription quantity
  - `syncSeatCount(teamId)` - Sync seat count with actual team members
  - `getSeatUsageSummary(orgId)` - Get billing display summary
- Team tier pricing: $15/seat/month ($150/seat/year)
- Added team tier entitlements with 50 max seats, 25 projects, team insights
- Created Neo4j schema (013-billing-seats.cypher) for SeatAllocation and BillingEvent nodes
- Files changed:
  - `packages/mcp-server/src/billing-manager.ts`
  - `packages/mcp-server/src/auth-manager.ts`
  - `packages/mcp-server/src/entitlements-manager.ts`
  - `src/graph/schema/013-billing-seats.cypher` (new)

## Next Steps

**Immediate** (next session):
1. e008_s04_t02: Stripe Per-Seat Product Configuration (2h)
   - Create "Ginko Team" product in Stripe
   - Configure per-seat monthly billing
   - Test in Stripe test mode
   - Add price IDs to environment

**After Sprint 4 completion:**
- EPIC-008 complete
- Team collaboration features ready for launch
- Move to EPIC-007 or next priority

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-008 (Team Collaboration)
**Sprint ID:** e008_s04
**Created:** 2026-01-03
**Participants:** Chris Norton, Claude
