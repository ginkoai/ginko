/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-17
 * @tags: [api, user, graph, access-control, adhoc_260117_s01]
 * @related: [../../graph/init/route.ts, ../../../lib/graph/access.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [supabase, neo4j-driver]
 */

/**
 * GET /api/v1/user/graph
 *
 * Get the current user's default graph ID based on their ownership or team membership.
 * This ensures users only see data from projects they have access to.
 *
 * Returns:
 * - graphId: The user's primary graph ID
 * - source: How the graphId was determined ('owner' | 'team_member' | 'none')
 * - projects: List of all projects the user has access to
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/auth/resolve-user';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runQuery } from '../../graph/_neo4j';

interface UserGraph {
  graphId: string;
  projectName: string;
  source: 'owner' | 'team_member';
  teamId?: string;
  teamName?: string;
}

interface UserGraphResponse {
  defaultGraphId: string | null;
  source: 'owner' | 'team_member' | 'none';
  projects: UserGraph[];
}

export async function GET(request: NextRequest) {
  console.log('[User Graph API] GET /api/v1/user/graph called');

  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required. Include Bearer token in Authorization header.',
          },
        },
        { status: 401 }
      );
    }

    // Resolve token to userId
    const token = authHeader.substring(7);
    const userResult = await resolveUserId(token);

    if ('error' in userResult) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_INVALID',
            message: userResult.error,
          },
        },
        { status: 401 }
      );
    }

    const { userId } = userResult;
    console.log(`[User Graph API] Resolved userId: ${userId}`);

    const projects: UserGraph[] = [];

    // 1. Find graphs the user directly owns (from Neo4j)
    try {
      const ownedGraphs = await runQuery<{ p: { graphId: string; projectName: string } }>(
        `
        MATCH (p:Project {userId: $userId})
        RETURN p { .graphId, .projectName }
        ORDER BY p.createdAt DESC
        `,
        { userId }
      );

      for (const result of ownedGraphs) {
        if (result.p?.graphId) {
          projects.push({
            graphId: result.p.graphId,
            projectName: result.p.projectName || 'Unnamed Project',
            source: 'owner',
          });
        }
      }
      console.log(`[User Graph API] Found ${ownedGraphs.length} owned graphs`);
    } catch (error) {
      console.error('[User Graph API] Error querying owned graphs:', error);
    }

    // 2. Find graphs via team membership (from Supabase)
    try {
      const supabase = createServiceRoleClient();

      // Get user's team memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(id, name, graph_id)')
        .eq('user_id', userId);

      if (membershipError) {
        console.error('[User Graph API] Error querying team memberships:', membershipError);
      } else if (memberships) {
        for (const membership of memberships) {
          const team = membership.teams as any;
          if (team?.graph_id) {
            // Check if this graph is already in the list (user might own it AND be a team member)
            const existing = projects.find(p => p.graphId === team.graph_id);
            if (!existing) {
              // Get project name from Neo4j
              let projectName = 'Team Project';
              try {
                const graphInfo = await runQuery<{ p: { projectName: string } }>(
                  `MATCH (p:Project {graphId: $graphId}) RETURN p { .projectName } LIMIT 1`,
                  { graphId: team.graph_id }
                );
                if (graphInfo.length > 0 && graphInfo[0].p?.projectName) {
                  projectName = graphInfo[0].p.projectName;
                }
              } catch (e) {
                // Use team name as fallback
                projectName = team.name || 'Team Project';
              }

              projects.push({
                graphId: team.graph_id,
                projectName,
                source: 'team_member',
                teamId: team.id,
                teamName: team.name,
              });
            }
          }
        }
        console.log(`[User Graph API] Found ${memberships.length} team memberships`);
      }
    } catch (error) {
      console.error('[User Graph API] Error querying team memberships:', error);
    }

    // Determine default graphId (first owned, then first team membership)
    let defaultGraphId: string | null = null;
    let source: 'owner' | 'team_member' | 'none' = 'none';

    const ownedProject = projects.find(p => p.source === 'owner');
    if (ownedProject) {
      defaultGraphId = ownedProject.graphId;
      source = 'owner';
    } else if (projects.length > 0) {
      defaultGraphId = projects[0].graphId;
      source = projects[0].source;
    }

    const response: UserGraphResponse = {
      defaultGraphId,
      source,
      projects,
    };

    console.log(`[User Graph API] Returning ${projects.length} projects, default: ${defaultGraphId}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[User Graph API] Error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
