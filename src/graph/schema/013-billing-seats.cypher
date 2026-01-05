// Migration 013: Billing Seat Schema for EPIC-008 Sprint 4
// Purpose: Enable per-seat billing tracking and seat allocation management
// Date: 2026-01-05
// Related: EPIC-008 Sprint 4 (Billing & Seats), ADR-005 (Stripe Payment Integration)

// ============================================================================
// SeatAllocation Node - Tracks seat usage and allocation per team
// ============================================================================

// SeatAllocation nodes must have unique IDs (format: org_{orgId}_team_{teamId})
CREATE CONSTRAINT seat_allocation_id_unique IF NOT EXISTS
FOR (s:SeatAllocation)
REQUIRE s.id IS UNIQUE;

// Index on SeatAllocation.organizationId for billing queries
CREATE INDEX seat_allocation_org_idx IF NOT EXISTS
FOR (s:SeatAllocation)
ON (s.organizationId);

// Index on SeatAllocation.teamId for team seat lookups
CREATE INDEX seat_allocation_team_idx IF NOT EXISTS
FOR (s:SeatAllocation)
ON (s.teamId);

// Index on SeatAllocation.lastSyncedAt for stale allocation cleanup
CREATE INDEX seat_allocation_sync_idx IF NOT EXISTS
FOR (s:SeatAllocation)
ON (s.lastSyncedAt);

// ============================================================================
// BillingEvent Node - Audit trail for seat changes
// ============================================================================

// BillingEvent nodes must have unique IDs
CREATE CONSTRAINT billing_event_id_unique IF NOT EXISTS
FOR (b:BillingEvent)
REQUIRE b.id IS UNIQUE;

// Index on BillingEvent.organizationId for billing history
CREATE INDEX billing_event_org_idx IF NOT EXISTS
FOR (b:BillingEvent)
ON (b.organizationId);

// Index on BillingEvent.eventType for filtering by event type
CREATE INDEX billing_event_type_idx IF NOT EXISTS
FOR (b:BillingEvent)
ON (b.eventType);

// Index on BillingEvent.createdAt for chronological queries
CREATE INDEX billing_event_created_idx IF NOT EXISTS
FOR (b:BillingEvent)
ON (b.createdAt);

// Composite index for org + time range queries
CREATE INDEX billing_event_org_time_idx IF NOT EXISTS
FOR (b:BillingEvent)
ON (b.organizationId, b.createdAt);

// ============================================================================
// Relationships
// ============================================================================

// SeatAllocation -[:BELONGS_TO]-> Team (allocation is for a team)
// SeatAllocation -[:BILLED_TO]-> Organization (billing entity)
// BillingEvent -[:AFFECTS]-> SeatAllocation (event changed allocation)
// BillingEvent -[:TRIGGERED_BY]-> User (who initiated the change)

// ============================================================================
// Node Property Reference
// ============================================================================

// SeatAllocation {
//   id: string (format: org_{orgId}_team_{teamId}),
//   organizationId: string,
//   teamId: string,
//   currentSeats: integer (active team members),
//   allocatedSeats: integer (paid seats in Stripe),
//   maxSeats: integer | null (plan limit, null = unlimited),
//   pricePerSeat: integer (cents),
//   planTier: string (free | pro | team | enterprise),
//   stripeSubscriptionId: string | null,
//   lastSyncedAt: datetime,
//   createdAt: datetime,
//   updatedAt: datetime
// }

// BillingEvent {
//   id: string (UUID),
//   organizationId: string,
//   teamId: string | null,
//   eventType: string (seat_added | seat_removed | plan_changed | sync_completed),
//   previousValue: integer | null,
//   newValue: integer | null,
//   amount: integer (cents, for billing impact),
//   description: string,
//   stripeEventId: string | null (for webhook correlation),
//   triggeredBy: string (userId or 'system'),
//   createdAt: datetime
// }

// ============================================================================
// Event Types Reference
// ============================================================================

// seat_added: Team member added, seat count increased
// seat_removed: Team member removed, seat count decreased
// seat_sync: Automatic sync between actual members and subscription quantity
// plan_upgrade: Upgraded to higher tier (more seats or unlimited)
// plan_downgrade: Downgraded to lower tier
// proration_applied: Mid-cycle seat change with prorated charge
// payment_failed: Seat expansion blocked due to payment failure

// ============================================================================
// Free Tier Limits
// ============================================================================

// Free tier constraints (enforced in application code):
// - maxSeats: 2 (owner + 1 collaborator)
// - No Stripe subscription required
// - Upgrade prompt when limit reached

// ============================================================================
// Validation Query (to verify schema creation)
// ============================================================================

// SHOW CONSTRAINTS YIELD name WHERE name STARTS WITH 'seat_' OR name STARTS WITH 'billing_event';
// SHOW INDEXES YIELD name WHERE name STARTS WITH 'seat_' OR name STARTS WITH 'billing_event';
