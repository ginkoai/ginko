/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-29
 * @tags: [api, user, graph, access-control, adhoc_260117_s01, BUG-003, BUG-004]
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
    // BUG-003/BUG-004 FIX: Only include teams that have valid Neo4j Project nodes
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
        // Track seen graphIds to deduplicate
        const seenGraphIds = new Set(projects.map(p => p.graphId));
        let skippedInvalid = 0;
        let skippedDuplicate = 0;

        for (const membership of memberships) {
          const team = membership.teams as any;
          if (team?.graph_id) {
            // Skip if already in the list (user owns it or seen from another team)
            if (seenGraphIds.has(team.graph_id)) {
              skippedDuplicate++;
              continue;
            }

            // Verify the project exists in Neo4j before adding
            // BUG-003 FIX: Only add teams with valid Neo4j Project nodes
            // BUG-004 FIX: Only include projects user owns OR has elevated team role
            try {
              const graphInfo = await runQuery<{ p: { projectName: string; userId: string } }>(
                `MATCH (p:Project {graphId: $graphId}) RETURN p { .projectName, .userId } LIMIT 1`,
                { graphId: team.graph_id }
              );

              if (graphInfo.length > 0 && graphInfo[0].p?.projectName) {
                const projectOwnerId = graphInfo[0].p.userId;
                const userRole = membership.role;

                // BUG-004 FIX: Only include if user owns the project OR has elevated role
                // This prevents showing projects from other users where current user
                // was accidentally added as a basic team member
                const isProjectOwner = projectOwnerId === userId;
                const hasElevatedRole = userRole === 'owner' || userRole === 'admin';

                if (isProjectOwner || hasElevatedRole) {
                  // Valid project with proper access - add to list
                  seenGraphIds.add(team.graph_id);
                  projects.push({
                    graphId: team.graph_id,
                    projectName: graphInfo[0].p.projectName,
                    source: 'team_member',
                    teamId: team.id,
                    teamName: team.name,
                  });
                } else {
                  // User is only a basic member of someone else's project - skip
                  skippedInvalid++;
                  console.log(`[User Graph API] Skipping team ${team.id} (${team.name}): user is only '${userRole}' member of project owned by ${projectOwnerId}`);
                }
              } else {
                // No valid project in Neo4j - skip this team
                skippedInvalid++;
                console.log(`[User Graph API] Skipping team ${team.id} (${team.name}): no valid Project node for graphId ${team.graph_id}`);
              }
            } catch (e) {
              // Neo4j query failed - skip this team to avoid showing invalid projects
              skippedInvalid++;
              console.warn(`[User Graph API] Skipping team ${team.id}: Neo4j query failed`, e);
            }
          }
        }
        console.log(`[User Graph API] Found ${memberships.length} team memberships, added ${memberships.length - skippedInvalid - skippedDuplicate} valid, skipped ${skippedInvalid} invalid, ${skippedDuplicate} duplicates`);
      }
    } catch (error) {
      console.error('[User Graph API] Error querying team memberships:', error);
    }

    // Determine default graphId
    // Priority: 1. Non-test owned projects, 2. Non-test team projects, 3. Any project
    let defaultGraphId: string | null = null;
    let source: 'owner' | 'team_member' | 'none' = 'none';

    // Filter out test/e2e projects for default selection
    const isRealProject = (p: UserGraph) =>
      !p.projectName.includes('e2e') &&
      !p.projectName.includes('test') &&
      !p.projectName.includes('uat');

    const realOwnedProject = projects.find(p => p.source === 'owner' && isRealProject(p));
    const realTeamProject = projects.find(p => p.source === 'team_member' && isRealProject(p));
    const anyOwnedProject = projects.find(p => p.source === 'owner');

    if (realOwnedProject) {
      defaultGraphId = realOwnedProject.graphId;
      source = 'owner';
    } else if (realTeamProject) {
      defaultGraphId = realTeamProject.graphId;
      source = 'team_member';
    } else if (anyOwnedProject) {
      defaultGraphId = anyOwnedProject.graphId;
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
