/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-17
 * @tags: [api, admin, cleanup, teams, adhoc_260117_s01]
 * @related: [../migrate-teams/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [supabase]
 */

/**
 * DELETE /api/v1/admin/cleanup-test-teams
 *
 * Cleanup endpoint to remove orphaned e2e/test teams from Supabase.
 * These teams were created during testing and clutter the team list.
 *
 * Deletes teams where:
 * 1. Name contains 'e2e', 'test', or 'uat' (case insensitive)
 * 2. OR graph_id contains 'e2e', 'test', or 'uat' (case insensitive)
 *
 * Only accessible to admin users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Admin user IDs that can run this cleanup
const ADMIN_USER_IDS = [
  'b27cb2ea-dcae-4255-9e77-9949daa53d77', // Chris Norton
];

interface CleanupResult {
  id: string;
  name: string;
  graph_id: string | null;
  created_at: string;
  reason: string;
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Cleanup Test Teams API] DELETE called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createServiceRoleClient();
    const deleted: CleanupResult[] = [];

    try {
      // First, identify teams to be deleted
      const { data: teamsToDelete, error: selectError } = await supabase
        .from('teams')
        .select('id, name, graph_id, created_at')
        .or(
          'name.ilike.%e2e%,' +
          'name.ilike.%test%,' +
          'name.ilike.%uat%,' +
          'graph_id.ilike.%e2e%,' +
          'graph_id.ilike.%test%,' +
          'graph_id.ilike.%uat%'
        );

      if (selectError) {
        console.error('[Cleanup Test Teams API] Error finding teams:', selectError);
        return NextResponse.json(
          { error: 'Failed to find test teams', details: selectError.message },
          { status: 500 }
        );
      }

      console.log(`[Cleanup Test Teams API] Found ${teamsToDelete?.length || 0} teams to delete`);

      if (!teamsToDelete || teamsToDelete.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No test teams found to delete',
          deleted: [],
          count: 0,
        });
      }

      // Delete each team (team_members will cascade delete)
      for (const team of teamsToDelete) {
        // Determine why this team is being deleted
        const nameLower = (team.name || '').toLowerCase();
        const graphIdLower = (team.graph_id || '').toLowerCase();
        let reason = '';
        if (nameLower.includes('e2e') || graphIdLower.includes('e2e')) {
          reason = 'e2e';
        } else if (nameLower.includes('test') || graphIdLower.includes('test')) {
          reason = 'test';
        } else if (nameLower.includes('uat') || graphIdLower.includes('uat')) {
          reason = 'uat';
        }

        const { error: deleteError } = await supabase
          .from('teams')
          .delete()
          .eq('id', team.id);

        if (deleteError) {
          console.error(`[Cleanup Test Teams API] Error deleting team ${team.id}:`, deleteError);
        } else {
          deleted.push({
            id: team.id,
            name: team.name,
            graph_id: team.graph_id,
            created_at: team.created_at,
            reason,
          });
          console.log(`[Cleanup Test Teams API] Deleted team: ${team.name} (${team.id})`);
        }
      }

      console.log(`[Cleanup Test Teams API] Cleanup complete: ${deleted.length} teams deleted`);

      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted.length} test teams`,
        deleted,
        count: deleted.length,
      });

    } catch (error) {
      console.error('[Cleanup Test Teams API] Error:', error);
      return NextResponse.json(
        {
          error: 'Cleanup failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}

// Also support GET to preview what will be deleted
export async function GET(request: NextRequest) {
  return withAuth(request, async (user, _supabase) => {
    console.log('[Cleanup Test Teams API] GET (preview) called by user:', user.id);

    // Check admin access
    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createServiceRoleClient();

    try {
      // Find teams that would be deleted
      const { data: teamsToDelete, error: selectError } = await supabase
        .from('teams')
        .select('id, name, graph_id, created_at')
        .or(
          'name.ilike.%e2e%,' +
          'name.ilike.%test%,' +
          'name.ilike.%uat%,' +
          'graph_id.ilike.%e2e%,' +
          'graph_id.ilike.%test%,' +
          'graph_id.ilike.%uat%'
        );

      if (selectError) {
        console.error('[Cleanup Test Teams API] Error finding teams:', selectError);
        return NextResponse.json(
          { error: 'Failed to find test teams', details: selectError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        preview: true,
        message: `Found ${teamsToDelete?.length || 0} test teams that would be deleted`,
        teams: teamsToDelete || [],
        count: teamsToDelete?.length || 0,
      });

    } catch (error) {
      console.error('[Cleanup Test Teams API] Error:', error);
      return NextResponse.json(
        {
          error: 'Preview failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
