/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-05
 * @tags: [api, verification, task, epic-004, sprint-3, task-7]
 * @related: [../../../../lib/verification-storage.ts, ../../../../../packages/cli/src/commands/verify.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, ../../../lib/verification-storage]
 */

/**
 * Task Verification API (EPIC-004 Sprint 3 TASK-7)
 *
 * POST /api/v1/task/verify - Store verification result in graph
 *
 * This endpoint receives verification results from CLI or agents and stores
 * them in the knowledge graph for audit trail and analytics.
 *
 * Request body:
 * {
 *   taskId: string,
 *   taskTitle?: string,
 *   passed: boolean,
 *   timestamp: string,
 *   criteria: CriterionResult[],
 *   summary: string,
 *   agentId?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   verificationId: string,
 *   stored: {
 *     taskId: string,
 *     passed: boolean,
 *     timestamp: string,
 *     criteriaPassed: number,
 *     criteriaTotal: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  storeVerificationResult,
  getVerificationHistory,
  getRecentVerifications,
  getVerificationStats,
  type VerificationResult,
} from '../../../../../lib/verification-storage';
import { verifyConnection } from '../../graph/_neo4j';

/**
 * POST /api/v1/task/verify
 * Store a verification result in the graph
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Graph database is unavailable. Please try again later.',
          },
        },
        { status: 503 }
      );
    }

    // Verify authentication (optional for now, can be enforced later)
    const authHeader = request.headers.get('authorization');
    let agentId: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract agent ID from token if needed
      // For now, accept agentId from request body
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.taskId || typeof body.taskId !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_TASK_ID',
            message: 'taskId is required and must be a string',
          },
        },
        { status: 400 }
      );
    }

    if (typeof body.passed !== 'boolean') {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_PASSED',
            message: 'passed is required and must be a boolean',
          },
        },
        { status: 400 }
      );
    }

    if (!body.criteria || !Array.isArray(body.criteria)) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_CRITERIA',
            message: 'criteria is required and must be an array',
          },
        },
        { status: 400 }
      );
    }

    // Construct verification result
    const verificationResult: VerificationResult = {
      taskId: body.taskId,
      taskTitle: body.taskTitle,
      passed: body.passed,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      criteria: body.criteria,
      summary: body.summary || `Verification ${body.passed ? 'passed' : 'failed'}`,
    };

    // Store in graph
    const verificationId = await storeVerificationResult(
      verificationResult,
      body.agentId || agentId
    );

    // Return success response
    return NextResponse.json(
      {
        success: true,
        verificationId,
        stored: {
          taskId: verificationResult.taskId,
          passed: verificationResult.passed,
          timestamp: verificationResult.timestamp.toISOString(),
          criteriaPassed: verificationResult.criteria.filter(c => c.passed).length,
          criteriaTotal: verificationResult.criteria.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Verification API] Error storing verification result:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to store verification result',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/task/verify?taskId=TASK-1&limit=10
 * Get verification history for a task
 *
 * Query params:
 * - taskId: string (required if not getting all)
 * - limit: number (default: 10)
 * - agentId: string (optional filter)
 * - passedOnly: boolean (optional filter)
 * - stats: boolean (get stats instead of history)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Graph database is unavailable. Please try again later.',
          },
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const agentId = searchParams.get('agentId') || undefined;
    const passedOnly = searchParams.get('passedOnly') === 'true' ? true : undefined;
    const stats = searchParams.get('stats') === 'true';

    // Get stats for a specific task
    if (stats && taskId) {
      const statistics = await getVerificationStats(taskId);
      return NextResponse.json({
        taskId,
        stats: statistics,
      });
    }

    // Get history for a specific task
    if (taskId) {
      const history = await getVerificationHistory(taskId, limit);
      return NextResponse.json({
        taskId,
        history,
        count: history.length,
      });
    }

    // Get recent verifications across all tasks
    const recent = await getRecentVerifications(limit, agentId, passedOnly);
    return NextResponse.json({
      verifications: recent,
      count: recent.length,
    });
  } catch (error) {
    console.error('[Verification API] Error fetching verification data:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch verification data',
        },
      },
      { status: 500 }
    );
  }
}
