/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, portal, stripe, api, epic-008]
 * @related: [billing/overview/route.ts, stripe/client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [stripe, supabase]
 *
 * Stripe Customer Portal session creator (EPIC-008 Sprint 4 Task 4)
 * Returns a URL to redirect users to Stripe's customer portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getStripeClient } from '@/lib/stripe/client';

export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      // Parse request body
      const body = await request.json().catch(() => ({}));
      const { teamId, returnUrl } = body;

      // Get user's team membership
      let query = supabase
        .from('team_members')
        .select('team_id, role, teams(id, organization_id)')
        .eq('user_id', user.id);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data: memberships, error: memberError } = await query;

      if (memberError || !memberships?.length) {
        return NextResponse.json({ error: 'No team membership found' }, { status: 404 });
      }

      // Find team with owner role, or use specified team
      let targetMembership = memberships.find((m: any) => m.role === 'owner');
      if (!targetMembership) {
        targetMembership = memberships[0];
      }

      const team = targetMembership.teams as unknown as { id: string; organization_id: string };

      // Only owners can access billing portal
      if (targetMembership.role !== 'owner') {
        return NextResponse.json(
          { error: 'Only team owners can access billing portal' },
          { status: 403 }
        );
      }

      // Get organization with Stripe customer ID
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, stripe_customer_id')
        .eq('id', team.organization_id)
        .single();

      if (orgError || !org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      if (!org.stripe_customer_id) {
        return NextResponse.json(
          { error: 'No billing account configured. Please contact support.' },
          { status: 400 }
        );
      }

      // Get Stripe client
      const stripe = getStripeClient();
      if (!stripe) {
        return NextResponse.json(
          { error: 'Billing system not configured' },
          { status: 503 }
        );
      }

      // Create billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
      });

      return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
      console.error('[BILLING_PORTAL] Error:', error);
      return NextResponse.json(
        { error: 'Failed to create portal session', message: error.message },
        { status: 500 }
      );
    }
  });
}
