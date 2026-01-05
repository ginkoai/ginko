/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, seats, stripe, reconcile, admin, epic-008]
 * @related: [../sync/route.ts, stripe/client.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [stripe, supabase]
 *
 * POST /api/v1/billing/seats/reconcile - Reconcile seat counts for teams
 *
 * EPIC-008 Sprint 4: Seat Count Synchronization
 *
 * This endpoint reconciles Stripe subscription seat counts with actual
 * team member counts. Useful for:
 * - Application startup consistency check
 * - Periodic cron job reconciliation
 * - Manual admin reconciliation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { syncTeamSeats } from '@/lib/billing/seat-sync';
import { getStripeClient, TEAM_PRICING } from '@/lib/stripe/client';

interface ReconcileRequest {
  organizationId?: string;  // Optional: reconcile specific org
  teamId?: string;          // Optional: reconcile specific team
  dryRun?: boolean;         // If true, report only without making changes
}

interface ReconcileResult {
  teamId: string;
  teamName: string;
  currentMembers: number;
  previousSeats: number;
  newSeats: number;
  synced: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * POST /api/v1/billing/seats/reconcile
 * Reconcile seat counts for one or more teams
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: ReconcileRequest = await request.json().catch(() => ({}));
      const { organizationId, teamId, dryRun = false } = body;

      // Get Stripe client
      const stripe = getStripeClient();
      if (!stripe) {
        return NextResponse.json({
          success: false,
          error: 'Stripe not configured',
        }, { status: 503 });
      }

      let teams: any[] = [];

      if (teamId) {
        // Reconcile specific team
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

        // Verify user has access (must be owner)
        const { data: membership } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .single();

        if (!membership || membership.role !== 'owner') {
          return NextResponse.json(
            { error: 'Only team owners can reconcile billing' },
            { status: 403 }
          );
        }

        teams = [team];
      } else if (organizationId) {
        // Reconcile all teams in organization
        // First verify user is org admin
        const { data: orgTeams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, organization_id')
          .eq('organization_id', organizationId);

        if (teamsError || !orgTeams?.length) {
          return NextResponse.json(
            { error: 'No teams found for organization' },
            { status: 404 }
          );
        }

        // Verify user owns at least one team in org
        const teamIds = orgTeams.map((t: { id: string }) => t.id);
        const { data: memberships } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .in('team_id', teamIds);

        if (!memberships?.length) {
          return NextResponse.json(
            { error: 'Only organization owners can reconcile billing' },
            { status: 403 }
          );
        }

        teams = orgTeams;
      } else {
        // Reconcile all teams user owns
        const { data: ownedTeams, error: ownedError } = await supabase
          .from('team_members')
          .select('team_id, teams(id, name, organization_id)')
          .eq('user_id', user.id)
          .eq('role', 'owner');

        if (ownedError || !ownedTeams?.length) {
          return NextResponse.json({
            success: true,
            message: 'No teams to reconcile',
            results: [],
          });
        }

        teams = ownedTeams.map((t: { teams: any }) => t.teams).filter(Boolean);
      }

      const results: ReconcileResult[] = [];
      let totalSynced = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const team of teams) {
        // Get current member count
        const { count: memberCount } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        const currentMembers = memberCount || 1;

        // Get organization's subscription
        const { data: org } = await supabase
          .from('organizations')
          .select('stripe_subscription_id, plan_tier')
          .eq('id', team.organization_id)
          .single();

        if (!org?.stripe_subscription_id) {
          results.push({
            teamId: team.id,
            teamName: team.name,
            currentMembers,
            previousSeats: 0,
            newSeats: 0,
            synced: false,
            skipped: true,
            error: 'No subscription',
          });
          totalSkipped++;
          continue;
        }

        // Get current Stripe seat count
        let previousSeats = 1;
        let subscriptionItemId: string | null = null;
        let subscriptionId: string | null = null;

        try {
          const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
          previousSeats = subscription.items.data[0]?.quantity || 1;
          subscriptionItemId = subscription.items.data[0]?.id;
          subscriptionId = subscription.id;

          if (!['active', 'trialing'].includes(subscription.status)) {
            results.push({
              teamId: team.id,
              teamName: team.name,
              currentMembers,
              previousSeats,
              newSeats: previousSeats,
              synced: false,
              skipped: true,
              error: `Subscription ${subscription.status}`,
            });
            totalSkipped++;
            continue;
          }
        } catch (e: any) {
          results.push({
            teamId: team.id,
            teamName: team.name,
            currentMembers,
            previousSeats: 0,
            newSeats: 0,
            synced: false,
            skipped: false,
            error: `Stripe error: ${e.message}`,
          });
          totalErrors++;
          continue;
        }

        // Check if sync needed
        if (currentMembers === previousSeats) {
          results.push({
            teamId: team.id,
            teamName: team.name,
            currentMembers,
            previousSeats,
            newSeats: previousSeats,
            synced: false,
            skipped: true,
          });
          totalSkipped++;
          continue;
        }

        // Validate against plan limits
        if (TEAM_PRICING.maxSeats && currentMembers > TEAM_PRICING.maxSeats) {
          results.push({
            teamId: team.id,
            teamName: team.name,
            currentMembers,
            previousSeats,
            newSeats: previousSeats,
            synced: false,
            skipped: false,
            error: `Exceeds limit of ${TEAM_PRICING.maxSeats} seats`,
          });
          totalErrors++;
          continue;
        }

        const newSeatCount = Math.max(1, currentMembers);

        if (dryRun) {
          // Report what would be changed
          results.push({
            teamId: team.id,
            teamName: team.name,
            currentMembers,
            previousSeats,
            newSeats: newSeatCount,
            synced: false,
            skipped: false,
          });
        } else {
          // Actually sync
          try {
            await stripe.subscriptions.update(subscriptionId!, {
              items: [{
                id: subscriptionItemId!,
                quantity: newSeatCount,
              }],
              proration_behavior: currentMembers > previousSeats ? 'create_prorations' : 'none',
              metadata: {
                seatCount: String(newSeatCount),
                lastReconcile: new Date().toISOString(),
                reconciledBy: user.id,
              },
            });

            results.push({
              teamId: team.id,
              teamName: team.name,
              currentMembers,
              previousSeats,
              newSeats: newSeatCount,
              synced: true,
              skipped: false,
            });
            totalSynced++;

            console.log(`[RECONCILE] Team ${team.id}: ${previousSeats} → ${newSeatCount}`);
          } catch (e: any) {
            results.push({
              teamId: team.id,
              teamName: team.name,
              currentMembers,
              previousSeats,
              newSeats: previousSeats,
              synced: false,
              skipped: false,
              error: `Update failed: ${e.message}`,
            });
            totalErrors++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        dryRun,
        summary: {
          total: teams.length,
          synced: totalSynced,
          skipped: totalSkipped,
          errors: totalErrors,
        },
        results,
      });

    } catch (error: any) {
      console.error('[RECONCILE] Error:', error);
      return NextResponse.json(
        { error: 'Reconciliation failed', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/v1/billing/seats/reconcile
 * Get reconciliation status (what would be synced)
 */
export async function GET(request: NextRequest) {
  // Reuse POST with dryRun=true
  const modifiedRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ dryRun: true }),
  });

  return POST(modifiedRequest);
}
