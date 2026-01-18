/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-17
 * @tags: [api, admin, migration, teams, adhoc_260117_s01]
 * @related: [../../graph/init/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [supabase, neo4j-driver]
 */

/**
 * POST /api/v1/admin/migrate-teams
 *
 * Migration endpoint to create Supabase teams for existing Neo4j projects
 * that were created before the team-linking fix (adhoc_260117_s01_t09).
 *
 * This is a one-time migration to backfill teams for existing projects.
 * Only accessible to admin users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runQuery } from '../../graph/_neo4j';

// Admin user IDs that can run this migration
const ADMIN_USER_IDS = [
  'b27cb2ea-dcae-4255-9e77-9949daa53d77', // Chris Norton
];

interface MigrationResult {
  projectName: string;
  graphId: string;
  userId: string;
  status: 'created' | 'already_exists' | 'error';
  teamId?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Migrate Teams API] POST called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const results: MigrationResult[] = [];
    const supabase = createServiceRoleClient();

    try {
      // 1. Get all Project nodes from Neo4j
      console.log('[Migrate Teams API] Querying Neo4j for all projects...');
      const projects = await runQuery<{
        p: { graphId: string; projectName: string; userId: string };
      }>(
        `
        MATCH (p:Project)
        WHERE p.graphId IS NOT NULL AND p.userId IS NOT NULL
        RETURN p { .graphId, .projectName, .userId }
        ORDER BY p.createdAt DESC
        `
      );

      console.log(`[Migrate Teams API] Found ${projects.length} projects in Neo4j`);

      // 2. For each project, check if a team exists and create if not
      for (const result of projects) {
        const { graphId, projectName, userId } = result.p;

        if (!graphId || !userId) {
          results.push({
            projectName: projectName || 'Unknown',
            graphId: graphId || 'Unknown',
            userId: userId || 'Unknown',
            status: 'error',
            error: 'Missing graphId or userId',
          });
          continue;
        }

        // Check if a team with this graph_id already exists
        const { data: existingTeam, error: lookupError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('graph_id', graphId)
          .single();

        if (existingTeam) {
          results.push({
            projectName,
            graphId,
            userId,
            status: 'already_exists',
            teamId: existingTeam.id,
          });
          continue;
        }

        // Create new team
        const slug = (projectName || 'project')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100);

        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            name: projectName || 'Migrated Project',
            slug: `${slug}-${Date.now().toString(36)}`,
            graph_id: graphId,
            created_by: userId,
          })
          .select()
          .single();

        if (createError) {
          console.error(`[Migrate Teams API] Error creating team for ${graphId}:`, createError);
          results.push({
            projectName,
            graphId,
            userId,
            status: 'error',
            error: createError.message,
          });
          continue;
        }

        // Add user as team owner
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: newTeam.id,
            user_id: userId,
            role: 'owner',
          });

        if (memberError) {
          console.error(`[Migrate Teams API] Error adding owner for team ${newTeam.id}:`, memberError);
          // Rollback team creation
          await supabase.from('teams').delete().eq('id', newTeam.id);
          results.push({
            projectName,
            graphId,
            userId,
            status: 'error',
            error: `Team created but failed to add owner: ${memberError.message}`,
          });
          continue;
        }

        console.log(`[Migrate Teams API] Created team ${newTeam.id} for project ${graphId}`);
        results.push({
          projectName,
          graphId,
          userId,
          status: 'created',
          teamId: newTeam.id,
        });
      }

      // Summary
      const created = results.filter(r => r.status === 'created').length;
      const existing = results.filter(r => r.status === 'already_exists').length;
      const errors = results.filter(r => r.status === 'error').length;

      console.log(`[Migrate Teams API] Migration complete: ${created} created, ${existing} existing, ${errors} errors`);

      return NextResponse.json({
        success: true,
        summary: {
          total: results.length,
          created,
          alreadyExists: existing,
          errors,
        },
        results,
      });

    } catch (error) {
      console.error('[Migrate Teams API] Error:', error);
      return NextResponse.json(
        {
          error: 'Migration failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
