/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, seats, sync, stripe, epic-008]
 * @related: [stripe/client.ts, api/v1/billing/seats/sync/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [stripe]
 *
 * Seat sync helper for team membership changes (EPIC-008 Sprint 4)
 *
 * This utility provides a function to trigger seat count synchronization
 * directly from other API routes without going through HTTP.
 */

import { getStripeClient, TEAM_PRICING, SeatSyncResult } from '@/lib/stripe/client';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Synchronize Stripe seat count with actual team member count
 *
 * Call this after:
 * - Adding a member to a team
 * - Removing a member from a team
 * - Member joining via invitation
 *
 * @param supabase - Authenticated Supabase client
 * @param teamId - Team ID to sync
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncTeamSeats(
  supabase: SupabaseClient,
  teamId: string,
  options: {
    prorate?: boolean;
    triggeredBy?: string;
  } = {}
): Promise<SeatSyncResult & { skipped?: boolean; reason?: string }> {
  const { prorate = true, triggeredBy } = options;

  try {
    // Get Stripe client
    const stripe = getStripeClient();
    if (!stripe) {
      console.log('[SEAT_SYNC] Stripe not configured, skipping seat sync');
      return {
        success: true,
        previousSeats: 0,
        newSeats: 0,
        prorated: false,
        skipped: true,
        reason: 'Stripe not configured',
      };
    }

    // Get team with organization info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, organization_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.warn(`[SEAT_SYNC] Team not found: ${teamId}`);
      return {
        success: false,
        previousSeats: 0,
        newSeats: 0,
        prorated: false,
        error: 'Team not found',
      };
    }

    // Get organization's Stripe subscription info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_subscription_id, plan_tier')
      .eq('id', team.organization_id)
      .single();

    if (orgError || !org) {
      console.warn(`[SEAT_SYNC] Organization not found for team: ${teamId}`);
      return {
        success: true,
        previousSeats: 0,
        newSeats: 0,
        prorated: false,
        skipped: true,
        reason: 'Organization not found',
      };
    }

    // If no Stripe subscription, skip sync
    if (!org.stripe_subscription_id) {
      console.log(`[SEAT_SYNC] No subscription for org ${org.id}, skipping`);
      return {
        success: true,
        previousSeats: 0,
        newSeats: 0,
        prorated: false,
        skipped: true,
        reason: 'No active subscription',
      };
    }

    // Count current team members
    const { count: memberCount, error: countError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (countError) {
      console.error('[SEAT_SYNC] Error counting members:', countError);
      return {
        success: false,
        previousSeats: 0,
        newSeats: 0,
        prorated: false,
        error: 'Failed to count team members',
      };
    }

    const currentMembers = memberCount || 1;

    // Get current Stripe subscription
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    } catch (stripeError: any) {
      console.error('[SEAT_SYNC] Failed to retrieve subscription:', stripeError.message);
      return {
        success: false,
        previousSeats: 0,
        newSeats: 0,
        prorated: false,
        error: `Stripe error: ${stripeError.message}`,
      };
    }

    // Check if subscription is active
    if (!['active', 'trialing'].includes(subscription.status)) {
      console.log(`[SEAT_SYNC] Subscription not active (${subscription.status})`);
      return {
        success: true,
        previousSeats: 0,
        newSeats: 0,
        prorated: false,
        skipped: true,
        reason: `Subscription status: ${subscription.status}`,
      };
    }

    const previousSeats = subscription.items.data[0]?.quantity || 1;

    // Check if sync is needed
    if (currentMembers === previousSeats) {
      console.log(`[SEAT_SYNC] Already in sync: ${currentMembers} seats`);
      return {
        success: true,
        previousSeats,
        newSeats: previousSeats,
        prorated: false,
        skipped: true,
        reason: 'Already in sync',
      };
    }

    // Validate against plan limits
    if (TEAM_PRICING.maxSeats && currentMembers > TEAM_PRICING.maxSeats) {
      console.error(`[SEAT_SYNC] Exceeds limit: ${currentMembers} > ${TEAM_PRICING.maxSeats}`);
      return {
        success: false,
        previousSeats,
        newSeats: previousSeats,
        prorated: false,
        error: `Exceeds plan limit of ${TEAM_PRICING.maxSeats} seats`,
      };
    }

    // Ensure at least 1 seat
    const newSeatCount = Math.max(1, currentMembers);

    // Update Stripe subscription quantity
    try {
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          quantity: newSeatCount,
        }],
        proration_behavior: prorate ? 'create_prorations' : 'none',
        metadata: {
          ...subscription.metadata,
          seatCount: String(newSeatCount),
          lastSeatSync: new Date().toISOString(),
          syncedBy: triggeredBy || 'system',
        },
      });
    } catch (stripeError: any) {
      console.error('[SEAT_SYNC] Failed to update subscription:', stripeError.message);
      return {
        success: false,
        previousSeats,
        newSeats: previousSeats,
        prorated: false,
        error: `Stripe update failed: ${stripeError.message}`,
      };
    }

    console.log(`[SEAT_SYNC] Updated team ${teamId}: ${previousSeats} → ${newSeatCount} (prorated: ${prorate})`);

    return {
      success: true,
      previousSeats,
      newSeats: newSeatCount,
      prorated: prorate,
    };

  } catch (error: any) {
    console.error('[SEAT_SYNC] Unexpected error:', error);
    return {
      success: false,
      previousSeats: 0,
      newSeats: 0,
      prorated: false,
      error: error.message,
    };
  }
}

/**
 * Check if team needs seat sync
 * Useful for displaying warnings in UI
 */
export async function checkSeatSyncNeeded(
  supabase: SupabaseClient,
  teamId: string
): Promise<{ needsSync: boolean; currentMembers: number; allocatedSeats: number }> {
  try {
    // Get team with organization info
    const { data: team } = await supabase
      .from('teams')
      .select('organization_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return { needsSync: false, currentMembers: 0, allocatedSeats: 0 };
    }

    // Get organization's Stripe subscription
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_subscription_id')
      .eq('id', team.organization_id)
      .single();

    if (!org?.stripe_subscription_id) {
      return { needsSync: false, currentMembers: 0, allocatedSeats: 0 };
    }

    // Count current members
    const { count: memberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    const currentMembers = memberCount || 1;

    // Get allocated seats from Stripe
    const stripe = getStripeClient();
    if (!stripe) {
      return { needsSync: false, currentMembers, allocatedSeats: currentMembers };
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
      const allocatedSeats = subscription.items.data[0]?.quantity || 1;
      return {
        needsSync: currentMembers !== allocatedSeats,
        currentMembers,
        allocatedSeats,
      };
    } catch {
      return { needsSync: false, currentMembers, allocatedSeats: currentMembers };
    }
  } catch {
    return { needsSync: false, currentMembers: 0, allocatedSeats: 0 };
  }
}
