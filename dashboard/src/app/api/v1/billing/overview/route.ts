/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, overview, stripe, seats, api, epic-008]
 * @related: [billing/seats/sync/route.ts, stripe/client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [stripe, supabase]
 *
 * Billing overview API for dashboard display (EPIC-008 Sprint 4 Task 4)
 * Returns seat usage, billing status, and next billing information
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getStripeClient, TEAM_PRICING } from '@/lib/stripe/client';

export interface BillingOverview {
  // Seat information
  seats: {
    current: number;
    allocated: number;
    max: number;
    needsSync: boolean;
  };
  // Subscription status
  subscription: {
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';
    planTier: string;
    interval: 'month' | 'year' | null;
    trialEndsAt: string | null;
  };
  // Billing information
  billing: {
    nextBillingDate: string | null;
    nextAmount: number | null; // in cents
    currency: string;
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
  };
  // Organization/Team info
  organization: {
    id: string;
    name: string;
    stripeCustomerId: string | null;
  };
  // Stripe portal URL (generated on demand)
  portalAvailable: boolean;
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      // Get teamId from query params (optional - will use first owned team if not specified)
      const { searchParams } = new URL(request.url);
      const teamId = searchParams.get('teamId');

      // Get user's teams
      const { data: memberships, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(id, name, organization_id)')
        .eq('user_id', user.id);

      if (memberError || !memberships?.length) {
        return NextResponse.json({
          error: 'No teams found',
          overview: createEmptyOverview(),
        }, { status: 200 });
      }

      // Find target team (specified or first owned)
      let targetTeam: { id: string; name: string; organization_id: string } | null = null;
      let userRole = 'member';

      for (const membership of memberships) {
        const team = membership.teams as unknown as { id: string; name: string; organization_id: string };
        if (teamId && team.id === teamId) {
          targetTeam = team;
          userRole = membership.role;
          break;
        }
        if (!teamId && membership.role === 'owner' && !targetTeam) {
          targetTeam = team;
          userRole = membership.role;
        }
      }

      // Fall back to first team if no owner team found
      if (!targetTeam && memberships.length > 0) {
        const firstMembership = memberships[0];
        targetTeam = firstMembership.teams as unknown as { id: string; name: string; organization_id: string };
        userRole = firstMembership.role;
      }

      if (!targetTeam) {
        return NextResponse.json({
          error: 'Team not found',
          overview: createEmptyOverview(),
        }, { status: 200 });
      }

      // Get organization info
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, stripe_customer_id, stripe_subscription_id, plan_tier')
        .eq('id', targetTeam.organization_id)
        .single();

      if (orgError || !org) {
        return NextResponse.json({
          error: 'Organization not found',
          overview: createEmptyOverview(),
        }, { status: 200 });
      }

      // Count team members
      const { count: memberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', targetTeam.id);

      const currentMembers = memberCount || 1;

      // Get Stripe information if available
      const stripe = getStripeClient();
      let subscriptionData = createDefaultSubscriptionData();
      let billingData = createDefaultBillingData();
      let allocatedSeats = currentMembers;

      if (stripe && org.stripe_subscription_id) {
        try {
          const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
            expand: ['latest_invoice', 'customer'],
          });

          allocatedSeats = subscription.items.data[0]?.quantity || 1;
          const priceAmount = subscription.items.data[0]?.price?.unit_amount || 0;

          subscriptionData = {
            status: subscription.status as BillingOverview['subscription']['status'],
            planTier: org.plan_tier || 'team',
            interval: subscription.items.data[0]?.price?.recurring?.interval as 'month' | 'year' || 'month',
            trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          };

          // Calculate next billing
          const nextBillingDate = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          // Next amount = price per seat * allocated seats
          const nextAmount = priceAmount * allocatedSeats;

          // Get last payment info from latest invoice
          const latestInvoice = subscription.latest_invoice as any;
          const lastPaymentDate = latestInvoice?.status_transitions?.paid_at
            ? new Date(latestInvoice.status_transitions.paid_at * 1000).toISOString()
            : null;
          const lastPaymentAmount = latestInvoice?.amount_paid || null;

          billingData = {
            nextBillingDate,
            nextAmount,
            currency: subscription.currency || 'usd',
            lastPaymentDate,
            lastPaymentAmount,
          };
        } catch (stripeError: any) {
          console.error('[BILLING_OVERVIEW] Stripe error:', stripeError.message);
          // Continue with defaults if Stripe fails
        }
      }

      const overview: BillingOverview = {
        seats: {
          current: currentMembers,
          allocated: allocatedSeats,
          max: TEAM_PRICING.maxSeats,
          needsSync: currentMembers !== allocatedSeats,
        },
        subscription: subscriptionData,
        billing: billingData,
        organization: {
          id: org.id,
          name: org.name || targetTeam.name,
          stripeCustomerId: org.stripe_customer_id,
        },
        portalAvailable: !!(stripe && org.stripe_customer_id),
      };

      return NextResponse.json({ overview, teamId: targetTeam.id, userRole });
    } catch (error: any) {
      console.error('[BILLING_OVERVIEW] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  });
}

function createEmptyOverview(): BillingOverview {
  return {
    seats: { current: 0, allocated: 0, max: TEAM_PRICING.maxSeats, needsSync: false },
    subscription: { status: 'none', planTier: 'free', interval: null, trialEndsAt: null },
    billing: { nextBillingDate: null, nextAmount: null, currency: 'usd', lastPaymentDate: null, lastPaymentAmount: null },
    organization: { id: '', name: '', stripeCustomerId: null },
    portalAvailable: false,
  };
}

function createDefaultSubscriptionData(): BillingOverview['subscription'] {
  return {
    status: 'none',
    planTier: 'free',
    interval: null,
    trialEndsAt: null,
  };
}

function createDefaultBillingData(): BillingOverview['billing'] {
  return {
    nextBillingDate: null,
    nextAmount: null,
    currency: 'usd',
    lastPaymentDate: null,
    lastPaymentAmount: null,
  };
}
