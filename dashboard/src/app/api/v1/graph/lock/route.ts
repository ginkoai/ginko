/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-03
 * @tags: [edit-locking, concurrency, collaboration, epic-008, rest-api]
 * @related: [../../lib/edit-lock-manager.ts, ../nodes/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * POST /api/v1/graph/lock - Acquire a lock on a node
 * GET /api/v1/graph/lock - Check lock status for a node
 * DELETE /api/v1/graph/lock - Release a lock on a node
 *
 * EPIC-008 Sprint 2: Team Collaboration - Edit Locking System
 *
 * Locks prevent concurrent edit conflicts with:
 * - 15-minute auto-expiry
 * - Automatic cleanup of expired locks
 * - Lock extension when same user re-acquires
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface AcquireLockRequest {
  nodeId: string;
  graphId: string;
}

interface ReleaseLockRequest {
  nodeId: string;
  graphId: string;
}

interface EditLock {
  nodeId: string;
  graphId: string;
  userId: string;
  userEmail: string;
  acquiredAt: string;
  expiresAt: string;
}

/**
 * Default lock duration in minutes
 */
const LOCK_DURATION_MINUTES = 15;

/**
 * POST /api/v1/graph/lock
 * Acquire a lock on a node for editing
 *
 * Request body: { nodeId: string, graphId: string }
 *
 * Response:
 * - 200: Lock acquired or extended
 *   { success: true, lock: EditLock }
 * - 409: Lock held by another user
 *   { success: false, error: string, heldBy: { userId, email, since } }
 * - 400: Missing required fields
 * - 401: Unauthorized
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: AcquireLockRequest = await request.json();

      // Validate required fields
      if (!body.nodeId) {
        return NextResponse.json(
          { error: 'Missing required field: nodeId' },
          { status: 400 }
        );
      }

      if (!body.graphId) {
        return NextResponse.json(
          { error: 'Missing required field: graphId' },
          { status: 400 }
        );
      }

      // Clean up expired locks first
      await supabase
        .from('node_locks')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Check for existing lock
      const { data: existingLock, error: checkError } = await supabase
        .from('node_locks')
        .select('*')
        .eq('node_id', body.nodeId)
        .eq('graph_id', body.graphId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows found" - that's fine
        console.error('[Lock API] Check lock error:', checkError);
        return NextResponse.json(
          { error: 'Failed to check lock status' },
          { status: 500 }
        );
      }

      if (existingLock) {
        // Lock exists - check if it's the same user
        if (existingLock.user_id === user.id) {
          // Same user - extend the lock
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + LOCK_DURATION_MINUTES);

          const { error: updateError } = await supabase
            .from('node_locks')
            .update({ expires_at: expiresAt.toISOString() })
            .eq('node_id', body.nodeId)
            .eq('graph_id', body.graphId);

          if (updateError) {
            console.error('[Lock API] Extend lock error:', updateError);
            return NextResponse.json(
              { error: 'Failed to extend lock' },
              { status: 500 }
            );
          }

          const lock: EditLock = {
            nodeId: existingLock.node_id,
            graphId: existingLock.graph_id,
            userId: existingLock.user_id,
            userEmail: existingLock.user_email,
            acquiredAt: existingLock.acquired_at,
            expiresAt: expiresAt.toISOString(),
          };

          return NextResponse.json({
            success: true,
            lock,
            message: 'Lock extended',
          });
        } else {
          // Different user holds the lock - conflict
          return NextResponse.json(
            {
              success: false,
              error: 'Node is locked by another user',
              heldBy: {
                userId: existingLock.user_id,
                email: existingLock.user_email,
                since: existingLock.acquired_at,
              },
            },
            { status: 409 }
          );
        }
      }

      // No lock exists - create one
      const acquiredAt = new Date();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + LOCK_DURATION_MINUTES);

      const { error: insertError } = await supabase.from('node_locks').insert({
        node_id: body.nodeId,
        graph_id: body.graphId,
        user_id: user.id,
        user_email: user.email,
        acquired_at: acquiredAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        // Handle race condition where another user inserted while we were checking
        if (insertError.code === '23505') {
          // Unique constraint violation - another user got the lock
          const { data: conflictLock } = await supabase
            .from('node_locks')
            .select('*')
            .eq('node_id', body.nodeId)
            .eq('graph_id', body.graphId)
            .single();

          if (conflictLock) {
            return NextResponse.json(
              {
                success: false,
                error: 'Node is locked by another user',
                heldBy: {
                  userId: conflictLock.user_id,
                  email: conflictLock.user_email,
                  since: conflictLock.acquired_at,
                },
              },
              { status: 409 }
            );
          }
        }

        console.error('[Lock API] Insert lock error:', insertError);
        return NextResponse.json(
          { error: 'Failed to acquire lock', message: insertError.message },
          { status: 500 }
        );
      }

      const lock: EditLock = {
        nodeId: body.nodeId,
        graphId: body.graphId,
        userId: user.id,
        userEmail: user.email,
        acquiredAt: acquiredAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      return NextResponse.json(
        {
          success: true,
          lock,
          message: 'Lock acquired',
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('[Lock API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to acquire lock', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/v1/graph/lock
 * Check if a node is locked
 *
 * Query params: nodeId, graphId
 *
 * Response:
 * - 200: Lock status
 *   { locked: boolean, lock?: EditLock, isOwnLock?: boolean }
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const nodeId = searchParams.get('nodeId');
      const graphId = searchParams.get('graphId');

      if (!nodeId) {
        return NextResponse.json(
          { error: 'Missing required parameter: nodeId' },
          { status: 400 }
        );
      }

      if (!graphId) {
        return NextResponse.json(
          { error: 'Missing required parameter: graphId' },
          { status: 400 }
        );
      }

      // Clean up expired locks first
      await supabase
        .from('node_locks')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Check for lock
      const { data: lockData, error } = await supabase
        .from('node_locks')
        .select('*')
        .eq('node_id', nodeId)
        .eq('graph_id', graphId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Lock API] Check lock error:', error);
        return NextResponse.json(
          { error: 'Failed to check lock status' },
          { status: 500 }
        );
      }

      if (!lockData) {
        return NextResponse.json({
          locked: false,
        });
      }

      const lock: EditLock = {
        nodeId: lockData.node_id,
        graphId: lockData.graph_id,
        userId: lockData.user_id,
        userEmail: lockData.user_email,
        acquiredAt: lockData.acquired_at,
        expiresAt: lockData.expires_at,
      };

      return NextResponse.json({
        locked: true,
        lock,
        isOwnLock: lockData.user_id === user.id,
      });
    } catch (error: any) {
      console.error('[Lock API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to check lock status', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/v1/graph/lock
 * Release a lock on a node
 *
 * Request body: { nodeId: string, graphId: string }
 *
 * Response:
 * - 200: Lock released
 *   { success: true, message: 'Lock released' }
 * - 404: Lock not found (or already released)
 * - 403: Lock held by another user
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: ReleaseLockRequest = await request.json();

      if (!body.nodeId) {
        return NextResponse.json(
          { error: 'Missing required field: nodeId' },
          { status: 400 }
        );
      }

      if (!body.graphId) {
        return NextResponse.json(
          { error: 'Missing required field: graphId' },
          { status: 400 }
        );
      }

      // Check if lock exists and belongs to current user
      const { data: existingLock, error: checkError } = await supabase
        .from('node_locks')
        .select('user_id')
        .eq('node_id', body.nodeId)
        .eq('graph_id', body.graphId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Lock API] Check lock error:', checkError);
        return NextResponse.json(
          { error: 'Failed to check lock status' },
          { status: 500 }
        );
      }

      if (!existingLock) {
        // Lock doesn't exist - already released or never acquired
        return NextResponse.json({
          success: true,
          message: 'Lock already released',
        });
      }

      if (existingLock.user_id !== user.id) {
        // Lock belongs to another user
        return NextResponse.json(
          { error: 'Cannot release lock held by another user' },
          { status: 403 }
        );
      }

      // Delete the lock
      const { error: deleteError } = await supabase
        .from('node_locks')
        .delete()
        .eq('node_id', body.nodeId)
        .eq('graph_id', body.graphId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[Lock API] Delete lock error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to release lock', message: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Lock released',
      });
    } catch (error: any) {
      console.error('[Lock API] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to release lock', message: error.message },
        { status: 500 }
      );
    }
  });
}
