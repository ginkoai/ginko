/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-29
 * @tags: [api, admin, projects, cleanup]
 * @related: [../teams/route.ts, ../../graph/cleanup/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, supabase]
 */

/**
 * Admin endpoints for project management:
 * - GET: List all Project nodes in Neo4j (for finding test/stale projects)
 * - DELETE: Delete a Project node and its associated team
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runQuery } from '../../graph/_neo4j';

// Admin user IDs
const ADMIN_USER_IDS = [
  'b27cb2ea-dcae-4255-9e77-9949daa53d77', // Chris Norton
];

export async function GET(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Admin Projects API] GET called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter'); // Optional: 'test', 'uat', etc.

    try {
      // Query all Project nodes from Neo4j
      let query = `
        MATCH (p:Project)
        RETURN p.graphId as graphId, p.projectName as name, p.userId as userId,
               p.namespace as namespace, p.createdAt as createdAt
        ORDER BY p.createdAt DESC
      `;

      if (filter) {
        query = `
          MATCH (p:Project)
          WHERE toLower(p.projectName) CONTAINS toLower($filter)
          RETURN p.graphId as graphId, p.projectName as name, p.userId as userId,
                 p.namespace as namespace, p.createdAt as createdAt
          ORDER BY p.createdAt DESC
        `;
      }

      const results = await runQuery<{
        graphId: string;
        name: string;
        userId: string;
        namespace: string;
        createdAt: string;
      }>(query, filter ? { filter } : {});

      const projects = results.map(r => ({
        graphId: r.graphId,
        name: r.name,
        userId: r.userId,
        namespace: r.namespace,
        createdAt: r.createdAt,
      }));

      return NextResponse.json({
        projects,
        count: projects.length,
        filter: filter || null,
      });

    } catch (error) {
      console.error('[Admin Projects API] Error:', error);
      return NextResponse.json(
        {
          error: 'Failed to list projects',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Admin Projects API] DELETE called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');

    if (!graphId) {
      return NextResponse.json(
        { error: 'graphId parameter required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const deleted: { neo4j: boolean; teams: string[]; teamMembers: number } = {
      neo4j: false,
      teams: [],
      teamMembers: 0,
    };

    try {
      // 1. Find the project in Neo4j first
      const projectResult = await runQuery<{ p: { projectName: string; userId: string } }>(
        `MATCH (p:Project {graphId: $graphId}) RETURN p { .projectName, .userId } LIMIT 1`,
        { graphId }
      );

      if (projectResult.length === 0) {
        return NextResponse.json(
          { error: 'Project not found in Neo4j', graphId },
          { status: 404 }
        );
      }

      const projectName = projectResult[0].p.projectName;
      console.log(`[Admin Projects API] Deleting project: ${projectName} (${graphId})`);

      // 2. Delete associated teams from Supabase (will cascade delete team_members)
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('graph_id', graphId);

      if (!teamsError && teams) {
        for (const team of teams) {
          // Count members before deletion
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          deleted.teamMembers += count || 0;

          const { error: deleteError } = await supabase
            .from('teams')
            .delete()
            .eq('id', team.id);

          if (!deleteError) {
            deleted.teams.push(team.name);
            console.log(`[Admin Projects API] Deleted team: ${team.name}`);
          }
        }
      }

      // 3. Delete the Project node from Neo4j
      await runQuery(
        `MATCH (p:Project {graphId: $graphId}) DETACH DELETE p`,
        { graphId }
      );
      deleted.neo4j = true;
      console.log(`[Admin Projects API] Deleted Neo4j Project node: ${graphId}`);

      // 4. Optionally delete all nodes associated with this graphId
      const { searchParams } = new URL(request.url);
      if (searchParams.get('deleteAllNodes') === 'true') {
        const deleteResult = await runQuery<{ count: number }>(
          `MATCH (n {graphId: $graphId}) WITH n LIMIT 1000 DETACH DELETE n RETURN count(*) as count`,
          { graphId }
        );
        console.log(`[Admin Projects API] Deleted associated nodes for graphId: ${graphId}`);
      }

      return NextResponse.json({
        success: true,
        message: `Deleted project: ${projectName}`,
        graphId,
        deleted,
      });

    } catch (error) {
      console.error('[Admin Projects API] Error:', error);
      return NextResponse.json(
        {
          error: 'Delete failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
