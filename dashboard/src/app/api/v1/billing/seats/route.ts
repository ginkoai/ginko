/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, seats, upgrade, downgrade, stripe, epic-008]
 * @related: [seat-sync.ts, ManageSeats.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [stripe, supabase]
 *
 * Seat management API for upgrade/downgrade flows (EPIC-008 Sprint 4 Task 5)
 *
 * POST: Update seat count (add/remove seats)
 * - Add seats: immediate billing with proration
 * - Remove seats: effective at period end (no proration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeClient, TEAM_PRICING } from '@/lib/stripe/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UpdateSeatsRequest {
  teamId: string;
  newSeatCount: number;
}

/**
 * POST /api/v1/billing/seats
 * Update seat allocation for a team
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request
    const body: UpdateSeatsRequest = await request.json();
    const { teamId, newSeatCount } = body;

    if (!teamId || typeof newSeatCount !== 'number') {
      return NextResponse.json(
        { error: 'teamId and newSeatCount are required' },
        { status: 400 }
      );
    }

    // Validate seat count
    if (newSeatCount < 1) {
      return NextResponse.json(
        { error: 'Seat count must be at least 1' },
        { status: 400 }
      );
    }

    if (TEAM_PRICING.maxSeats && newSeatCount > TEAM_PRICING.maxSeats) {
      return NextResponse.json(
        { error: `Maximum ${TEAM_PRICING.maxSeats} seats allowed. Contact sales for larger teams.` },
        { status: 400 }
      );
    }

    // Verify user is team owner
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only team owners can manage seats' },
        { status: 403 }
      );
    }

    // Get team and organization
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id, name, organization_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get organization's Stripe subscription
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, stripe_subscription_id, stripe_customer_id')
      .eq('id', team.organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!org.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription. Please subscribe first.' },
        { status: 400 }
      );
    }

    // Get Stripe client
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Billing system unavailable' },
        { status: 503 }
      );
    }

    // Get current subscription
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    } catch (stripeError: any) {
      console.error('[SEATS] Failed to retrieve subscription:', stripeError.message);
      return NextResponse.json(
        { error: 'Failed to retrieve subscription' },
        { status: 500 }
      );
    }

    // Check subscription status
    if (!['active', 'trialing'].includes(subscription.status)) {
      return NextResponse.json(
        { error: `Subscription is ${subscription.status}. Cannot modify seats.` },
        { status: 400 }
      );
    }

    const currentSeats = subscription.items.data[0]?.quantity || 1;
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: 'Invalid subscription configuration' },
        { status: 500 }
      );
    }

    // Check current member count - can't reduce below actual members
    const { count: memberCount } = await supabaseAdmin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    const actualMembers = memberCount || 1;

    if (newSeatCount < actualMembers) {
      return NextResponse.json(
        {
          error: `Cannot reduce seats below current member count (${actualMembers}). Remove team members first.`,
          currentMembers: actualMembers,
        },
        { status: 400 }
      );
    }

    // Determine proration behavior
    // Adding seats: immediate proration (charge now)
    // Removing seats: effective at period end (no immediate credit)
    const isAddingSeats = newSeatCount > currentSeats;
    const prorationBehavior = isAddingSeats ? 'create_prorations' : 'none';

    // Update subscription
    try {
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscriptionItemId,
          quantity: newSeatCount,
        }],
        proration_behavior: prorationBehavior,
        metadata: {
          ...subscription.metadata,
          seatCount: String(newSeatCount),
          lastSeatUpdate: new Date().toISOString(),
          updatedBy: user.id,
        },
      });
    } catch (stripeError: any) {
      console.error('[SEATS] Failed to update subscription:', stripeError.message);
      return NextResponse.json(
        { error: `Failed to update seats: ${stripeError.message}` },
        { status: 500 }
      );
    }

    // Calculate billing impact
    const pricePerSeat = subscription.items.data[0]?.price?.unit_amount || TEAM_PRICING.monthly.amount;
    const interval = subscription.items.data[0]?.price?.recurring?.interval || 'month';
    const seatDelta = newSeatCount - currentSeats;
    const monthlyImpact = (seatDelta * pricePerSeat) / 100;

    console.log(`[SEATS] Updated team ${teamId}: ${currentSeats} → ${newSeatCount} (prorated: ${isAddingSeats})`);

    return NextResponse.json({
      success: true,
      previousSeats: currentSeats,
      newSeats: newSeatCount,
      seatDelta,
      prorated: isAddingSeats,
      effectiveAt: isAddingSeats ? 'immediately' : 'period_end',
      billing: {
        pricePerSeat: pricePerSeat / 100,
        interval,
        monthlyImpact: isAddingSeats ? monthlyImpact : 0,
        message: isAddingSeats
          ? `Added ${seatDelta} seat(s). Prorated charge applied.`
          : `Removed ${Math.abs(seatDelta)} seat(s). Takes effect at end of billing period.`,
      },
    });

  } catch (error: any) {
    console.error('[SEATS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/billing/seats
 * Get current seat allocation and limits
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const teamId = request.nextUrl.searchParams.get('teamId');
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // Verify user is team member
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team and organization
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('id, name, organization_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get organization's Stripe subscription
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, stripe_subscription_id')
      .eq('id', team.organization_id)
      .single();

    // Get current member count
    const { count: memberCount } = await supabaseAdmin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    const currentMembers = memberCount || 1;

    // If no subscription, return basic info
    if (!org?.stripe_subscription_id) {
      return NextResponse.json({
        seats: {
          current: currentMembers,
          allocated: currentMembers,
          max: TEAM_PRICING.maxSeats,
          canModify: false,
        },
        subscription: null,
        pricing: {
          monthly: TEAM_PRICING.monthly.amount / 100,
          yearly: TEAM_PRICING.yearly.amount / 100,
          maxSeats: TEAM_PRICING.maxSeats,
        },
      });
    }

    // Get subscription details from Stripe
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({
        seats: {
          current: currentMembers,
          allocated: currentMembers,
          max: TEAM_PRICING.maxSeats,
          canModify: false,
        },
        subscription: { status: 'unknown' },
        pricing: {
          monthly: TEAM_PRICING.monthly.amount / 100,
          yearly: TEAM_PRICING.yearly.amount / 100,
          maxSeats: TEAM_PRICING.maxSeats,
        },
      });
    }

    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    } catch {
      return NextResponse.json({
        seats: {
          current: currentMembers,
          allocated: currentMembers,
          max: TEAM_PRICING.maxSeats,
          canModify: false,
        },
        subscription: { status: 'error' },
        pricing: {
          monthly: TEAM_PRICING.monthly.amount / 100,
          yearly: TEAM_PRICING.yearly.amount / 100,
          maxSeats: TEAM_PRICING.maxSeats,
        },
      });
    }

    const allocatedSeats = subscription.items.data[0]?.quantity || 1;
    const pricePerSeat = (subscription.items.data[0]?.price?.unit_amount || TEAM_PRICING.monthly.amount) / 100;
    const interval = subscription.items.data[0]?.price?.recurring?.interval || 'month';

    return NextResponse.json({
      seats: {
        current: currentMembers,
        allocated: allocatedSeats,
        max: TEAM_PRICING.maxSeats,
        canModify: ['active', 'trialing'].includes(subscription.status) && membership.role === 'owner',
        needsSync: currentMembers !== allocatedSeats,
      },
      subscription: {
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      pricing: {
        pricePerSeat,
        interval,
        monthly: TEAM_PRICING.monthly.amount / 100,
        yearly: TEAM_PRICING.yearly.amount / 100,
        maxSeats: TEAM_PRICING.maxSeats,
      },
    });

  } catch (error: any) {
    console.error('[SEATS] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
