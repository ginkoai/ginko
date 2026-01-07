/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-07
 * @tags: [epic, conflict-check, ADR-058, team-collaboration]
 * @related: [../sync/route.ts, ../../graph/_cloud-graph-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/epic/check
 *
 * Check if an Epic ID already exists in the graph (ADR-058)
 * Used for first-claim-wins conflict detection before sync
 *
 * Query Parameters:
 * - graphId: Graph namespace identifier (required)
 * - id: Epic ID to check (required, e.g., "EPIC-010" or "e010")
 *
 * Returns:
 * - exists: boolean
 * - createdBy: string (email of creator if exists)
 * - createdAt: string (ISO timestamp if exists)
 * - title: string (epic title if exists)
 * - suggestedId: string (next available ID if conflict)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '@/app/api/v1/graph/_neo4j';

interface EpicCheckResponse {
  exists: boolean;
  createdBy?: string;
  createdAt?: string;
  title?: string;
  suggestedId?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Extract Bearer token for authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const epicId = searchParams.get('id');

    if (!graphId || !epicId) {
      return NextResponse.json(
        { error: 'Missing required parameters: graphId and id' },
        { status: 400 }
      );
    }

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    // Check if epic exists
    const checkQuery = `
      MATCH (e:Epic {graphId: $graphId})
      WHERE e.id = $epicId OR e.id = $epicIdNormalized
      RETURN e.id as id,
             e.title as title,
             e.createdBy as createdBy,
             toString(e.createdAt) as createdAt
      LIMIT 1
    `;

    // Normalize ID formats (EPIC-010 vs e010)
    const epicIdNormalized = normalizeEpicId(epicId);

    const result = await runQuery(checkQuery, {
      graphId,
      epicId,
      epicIdNormalized,
    });

    if (result.length === 0) {
      // Epic doesn't exist - no conflict
      return NextResponse.json({ exists: false });
    }

    // Epic exists - potential conflict
    const existing = result[0];

    // Find next available ID
    const suggestedId = await findNextAvailableId(graphId, epicId);

    const response: EpicCheckResponse = {
      exists: true,
      createdBy: existing.createdBy || 'unknown',
      createdAt: existing.createdAt || undefined,
      title: existing.title || undefined,
      suggestedId,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Epic Check] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Normalize Epic ID to handle different formats
 * EPIC-010 -> EPIC-010
 * e010 -> EPIC-010
 */
function normalizeEpicId(id: string): string {
  // If already in EPIC-XXX format, return as is
  if (/^EPIC-\d+$/i.test(id)) {
    return id.toUpperCase();
  }

  // If in eXXX format, convert to EPIC-XXX
  const match = id.match(/^e(\d+)$/i);
  if (match) {
    return `EPIC-${match[1].padStart(3, '0')}`;
  }

  return id;
}

/**
 * Find next available Epic ID in the graph
 */
async function findNextAvailableId(graphId: string, conflictId: string): Promise<string> {
  try {
    // Get all epic IDs in the graph
    const query = `
      MATCH (e:Epic {graphId: $graphId})
      RETURN e.id as id
    `;

    const result = await runQuery(query, { graphId });
    const existingIds = result.map((r) => r.id as string);

    // Parse the conflict ID to get the base number
    const match = conflictId.match(/(?:EPIC-)?(\d+)/i);
    if (!match) {
      return `${conflictId}-new`;
    }

    // Find the maximum epic number
    let maxNum = parseInt(match[1], 10);

    for (const id of existingIds) {
      const numMatch = id.match(/(?:EPIC-)?(\d+)/i);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    // Suggest next number with proper padding
    const nextNum = maxNum + 1;
    return `EPIC-${nextNum.toString().padStart(3, '0')}`;
  } catch {
    return `${conflictId}-new`;
  }
}
