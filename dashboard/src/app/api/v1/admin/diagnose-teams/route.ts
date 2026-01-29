/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-29
 * @tags: [api, admin, diagnostic, teams, BUG-003, BUG-004]
 * @related: [../teams/route.ts, ../../user/graph/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [supabase, neo4j-driver]
 */

/**
 * GET /api/v1/admin/diagnose-teams
 *
 * Diagnostic endpoint to understand team membership issues (BUG-003, BUG-004).
 * Shows all teams a user is a member of, with Neo4j validation status.
 *
 * Query Parameters:
 * - userId: (optional) Specific user ID to diagnose. Defaults to current user.
 *
 * Only accessible to admin users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runQuery } from '../../graph/_neo4j';

// Admin user IDs
const ADMIN_USER_IDS = [
  'b27cb2ea-dcae-4255-9e77-9949daa53d77', // Chris Norton
];

interface TeamDiagnostic {
  teamId: string;
  teamName: string;
  graphId: string | null;
  role: string;
  createdAt: string;
  neo4jStatus: 'valid' | 'missing' | 'error';
  projectName: string | null;
  projectOwner: string | null;
  recommendation: 'keep' | 'remove' | 'investigate';
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Diagnose Teams API] GET called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId') || user.id;

    const supabase = createServiceRoleClient();
    const diagnostics: TeamDiagnostic[] = [];

    try {
      // Get all team memberships for the user
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          created_at,
          teams (
            id,
            name,
            graph_id,
            created_at,
            created_by
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (membershipError) {
        console.error('[Diagnose Teams API] Error querying memberships:', membershipError);
        return NextResponse.json(
          { error: 'Failed to query memberships', details: membershipError.message },
          { status: 500 }
        );
      }

      console.log(`[Diagnose Teams API] Found ${memberships?.length || 0} memberships for user ${targetUserId}`);

      // Check each team's Neo4j status
      for (const membership of memberships || []) {
        const team = membership.teams as any;
        if (!team) continue;

        const diagnostic: TeamDiagnostic = {
          teamId: team.id,
          teamName: team.name,
          graphId: team.graph_id,
          role: membership.role,
          createdAt: membership.created_at,
          neo4jStatus: 'missing',
          projectName: null,
          projectOwner: null,
          recommendation: 'investigate',
        };

        // Check if there's a valid Neo4j Project node
        if (team.graph_id) {
          try {
            const graphInfo = await runQuery<{ p: { projectName: string; userId: string } }>(
              `MATCH (p:Project {graphId: $graphId}) RETURN p { .projectName, .userId } LIMIT 1`,
              { graphId: team.graph_id }
            );

            if (graphInfo.length > 0 && graphInfo[0].p) {
              diagnostic.neo4jStatus = 'valid';
              diagnostic.projectName = graphInfo[0].p.projectName;
              diagnostic.projectOwner = graphInfo[0].p.userId;

              // Determine recommendation
              if (diagnostic.projectOwner === targetUserId) {
                diagnostic.recommendation = 'keep'; // User owns this project
              } else if (membership.role === 'owner' || membership.role === 'admin') {
                diagnostic.recommendation = 'keep'; // User has explicit elevated role
              } else {
                diagnostic.recommendation = 'investigate'; // Member of team for another user's project
              }
            } else {
              diagnostic.neo4jStatus = 'missing';
              diagnostic.recommendation = 'remove'; // No valid project - orphaned team membership
            }
          } catch (e) {
            diagnostic.neo4jStatus = 'error';
            diagnostic.recommendation = 'investigate';
            console.warn(`[Diagnose Teams API] Neo4j error for team ${team.id}:`, e);
          }
        } else {
          diagnostic.neo4jStatus = 'missing';
          diagnostic.recommendation = 'remove'; // No graph_id - orphaned team
        }

        diagnostics.push(diagnostic);
      }

      // Generate summary
      const summary = {
        totalMemberships: diagnostics.length,
        valid: diagnostics.filter(d => d.neo4jStatus === 'valid').length,
        missing: diagnostics.filter(d => d.neo4jStatus === 'missing').length,
        errors: diagnostics.filter(d => d.neo4jStatus === 'error').length,
        recommendations: {
          keep: diagnostics.filter(d => d.recommendation === 'keep').length,
          remove: diagnostics.filter(d => d.recommendation === 'remove').length,
          investigate: diagnostics.filter(d => d.recommendation === 'investigate').length,
        },
      };

      return NextResponse.json({
        userId: targetUserId,
        diagnostics,
        summary,
        teamsToRemove: diagnostics
          .filter(d => d.recommendation === 'remove')
          .map(d => ({ teamId: d.teamId, teamName: d.teamName, reason: `${d.neo4jStatus} Neo4j project` })),
      });

    } catch (error) {
      console.error('[Diagnose Teams API] Error:', error);
      return NextResponse.json(
        {
          error: 'Diagnostic failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
