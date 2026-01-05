/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, seats, stripe, sync, epic-008]
 * @related: [stripe/client.ts, teams/members/route.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [stripe, supabase]
 *
 * POST /api/v1/billing/seats/sync - Synchronize Stripe seat count with team members
 *
 * EPIC-008 Sprint 4: Seat Count Synchronization
 *
 * This endpoint is called after team membership changes to ensure
 * the Stripe subscription quantity matches actual member count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getStripeClient, TEAM_PRICING, SeatSyncResult } from '@/lib/stripe/client';

interface SyncSeatsRequest {
  teamId: string;
  prorate?: boolean; // Default: true for mid-cycle changes
}

/**
 * POST /api/v1/billing/seats/sync
 * Sync Stripe subscription quantity with team member count
 *
 * Called internally after:
 * - Member added via POST /api/v1/teams/[id]/members
 * - Member removed via DELETE /api/v1/teams/[id]/members/[userId]
 * - Member joins via POST /api/v1/team/join
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: SyncSeatsRequest = await request.json();

      if (!body.teamId) {
        return NextResponse.json(
          { error: 'Missing required field: teamId' },
          { status: 400 }
        );
      }

      const prorate = body.prorate !== false; // Default to true

      // Get Stripe client
      const stripe = getStripeClient();
      if (!stripe) {
        // Stripe not configured - skip sync but don't fail
        console.log('[SEAT_SYNC] Stripe not configured, skipping seat sync');
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'Stripe not configured',
        });
      }

      // Verify user has access to this team (must be owner for billing)
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', body.teamId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: 'Team not found or access denied' },
          { status: 404 }
        );
      }

      // Only owners can trigger billing sync
      if (membership.role !== 'owner') {
        return NextResponse.json(
          { error: 'Only team owners can manage billing' },
          { status: 403 }
        );
      }

      // Get team with organization info
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, organization_id')
        .eq('id', body.teamId)
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }

      // Get organization's Stripe subscription info
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, stripe_subscription_id, plan_tier')
        .eq('id', team.organization_id)
        .single();

      if (orgError || !org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      // Count current team members
      const { count: memberCount, error: countError } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', body.teamId);

      if (countError) {
        console.error('[SEAT_SYNC] Error counting members:', countError);
        return NextResponse.json(
          { error: 'Failed to count team members' },
          { status: 500 }
        );
      }

      const currentMembers = memberCount || 1;

      // If no Stripe subscription, skip sync
      if (!org.stripe_subscription_id) {
        console.log('[SEAT_SYNC] No Stripe subscription for org, skipping sync');
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'No active subscription',
          currentMembers,
        });
      }

      // Get current Stripe subscription
      let subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
      } catch (stripeError: any) {
        console.error('[SEAT_SYNC] Failed to retrieve subscription:', stripeError);
        return NextResponse.json(
          { error: 'Failed to retrieve subscription', details: stripeError.message },
          { status: 500 }
        );
      }

      // Check if subscription is active
      if (!['active', 'trialing'].includes(subscription.status)) {
        console.log(`[SEAT_SYNC] Subscription not active (${subscription.status}), skipping sync`);
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: `Subscription status: ${subscription.status}`,
          currentMembers,
        });
      }

      const previousSeats = subscription.items.data[0]?.quantity || 1;

      // Check if sync is needed
      if (currentMembers === previousSeats) {
        console.log(`[SEAT_SYNC] Seats already synced: ${currentMembers}`);
        return NextResponse.json({
          success: true,
          synced: false,
          reason: 'Already in sync',
          currentMembers,
          allocatedSeats: previousSeats,
        });
      }

      // Validate against plan limits
      if (TEAM_PRICING.maxSeats && currentMembers > TEAM_PRICING.maxSeats) {
        return NextResponse.json(
          {
            error: `Exceeds plan limit of ${TEAM_PRICING.maxSeats} seats`,
            currentMembers,
            maxSeats: TEAM_PRICING.maxSeats,
          },
          { status: 400 }
        );
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
            syncedBy: user.id,
          },
        });
      } catch (stripeError: any) {
        console.error('[SEAT_SYNC] Failed to update subscription:', stripeError);
        return NextResponse.json(
          { error: 'Failed to update seat count', details: stripeError.message },
          { status: 500 }
        );
      }

      const result: SeatSyncResult = {
        success: true,
        previousSeats,
        newSeats: newSeatCount,
        prorated: prorate,
      };

      console.log(`[SEAT_SYNC] Updated seats for team ${body.teamId}: ${previousSeats} → ${newSeatCount} (prorated: ${prorate})`);

      return NextResponse.json({
        ...result,
        teamId: body.teamId,
        message: `Seat count updated: ${previousSeats} → ${newSeatCount}`,
      });

    } catch (error: any) {
      console.error('[SEAT_SYNC] Error:', error);
      return NextResponse.json(
        { error: 'Failed to sync seats', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/v1/billing/seats/sync
 * Get current seat allocation status for a team
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const teamId = searchParams.get('teamId');

      if (!teamId) {
        return NextResponse.json(
          { error: 'Missing required parameter: teamId' },
          { status: 400 }
        );
      }

      // Verify user has access to this team
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: 'Team not found or access denied' },
          { status: 404 }
        );
      }

      // Get team with organization info
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, organization_id')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }

      // Get organization's Stripe subscription info
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, stripe_subscription_id, plan_tier')
        .eq('id', team.organization_id)
        .single();

      if (orgError || !org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      // Count current team members
      const { count: memberCount, error: countError } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (countError) {
        console.error('[SEAT_SYNC] Error counting members:', countError);
        return NextResponse.json(
          { error: 'Failed to count team members' },
          { status: 500 }
        );
      }

      const currentMembers = memberCount || 1;
      let allocatedSeats = 1;
      let subscriptionStatus = 'none';

      // Get allocated seats from Stripe if subscription exists
      if (org.stripe_subscription_id) {
        const stripe = getStripeClient();
        if (stripe) {
          try {
            const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
            allocatedSeats = subscription.items.data[0]?.quantity || 1;
            subscriptionStatus = subscription.status;
          } catch (e: any) {
            console.warn('[SEAT_SYNC] Could not retrieve subscription:', e.message);
          }
        }
      }

      const needsSync = currentMembers !== allocatedSeats;

      return NextResponse.json({
        teamId,
        teamName: team.name,
        currentMembers,
        allocatedSeats,
        maxSeats: TEAM_PRICING.maxSeats,
        needsSync,
        subscriptionStatus,
        planTier: org.plan_tier,
        pricePerSeat: {
          monthly: TEAM_PRICING.monthly.amount / 100,
          yearly: TEAM_PRICING.yearly.amount / 100,
        },
      });

    } catch (error: any) {
      console.error('[SEAT_SYNC] GET Error:', error);
      return NextResponse.json(
        { error: 'Failed to get seat allocation', message: error.message },
        { status: 500 }
      );
    }
  });
}
