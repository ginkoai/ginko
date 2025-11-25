/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-25
 * @tags: [api, gotcha, resolve, tracking, epic-002-sprint-3-task-4]
 * @related: [../encounter/route.ts, ../../task/[id]/gotchas/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/gotcha/{id}/resolve
 *
 * Mark a gotcha as resolved, linking to the fix commit
 * Increments resolution count and creates RESOLVED_BY relationship
 *
 * EPIC-002 Sprint 3 TASK-4: Gotcha Resolution Tracking
 *
 * Request Body:
 * {
 *   commitHash: string        // Git commit that fixed the issue
 *   description?: string      // How it was resolved
 *   sessionId?: string        // Session where resolved
 *   files?: string[]          // Files modified in the fix
 * }
 *
 * Response:
 * {
 *   gotcha: { id, encounters, resolutions, effectivenessScore },
 *   resolution: { timestamp, commitHash, description }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '@/app/api/v1/graph/_neo4j';

interface ResolveRequest {
  commitHash: string;
  description?: string;
  sessionId?: string;
  files?: string[];
}

interface ResolveResponse {
  gotcha: {
    id: string;
    encounters: number;
    resolutions: number;
    effectivenessScore: number;
  };
  resolution: {
    timestamp: string;
    commitHash: string;
    description?: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gotchaId } = await params;

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    // Parse request body
    let body: ResolveRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.commitHash) {
      return NextResponse.json(
        { error: 'Missing required field: commitHash' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();

    // Atomically increment resolution count and create RESOLVED_BY relationship
    // This links the gotcha to the commit that fixed it
    const query = `
      MATCH (g:Gotcha {id: $gotchaId})

      // Increment resolution count
      SET g.resolutions = COALESCE(g.resolutions, 0) + 1,
          g.lastResolvedAt = datetime(),
          g.updatedAt = datetime()

      // Create or merge Commit node
      MERGE (c:Commit {hash: $commitHash})
      ON CREATE SET
        c.id = 'commit_' + $commitHash,
        c.createdAt = datetime()
      SET c.updatedAt = datetime()

      // Create RESOLVED_BY relationship with metadata
      CREATE (g)-[r:RESOLVED_BY {
        timestamp: datetime($timestamp),
        description: $description,
        sessionId: $sessionId,
        files: $files
      }]->(c)

      RETURN g.id as id,
             g.encounters as encounters,
             g.resolutions as resolutions,
             CASE
               WHEN g.encounters > 0
               THEN round(toFloat(g.resolutions) / toFloat(g.encounters) * 100)
               ELSE 0
             END as effectivenessScore
    `;

    const result = await runQuery(query, {
      gotchaId,
      commitHash: body.commitHash,
      timestamp,
      description: body.description || null,
      sessionId: body.sessionId || null,
      files: body.files || [],
    });

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Gotcha not found: ${gotchaId}` },
        { status: 404 }
      );
    }

    const record = result[0];

    const response: ResolveResponse = {
      gotcha: {
        id: record.id,
        encounters: record.encounters,
        resolutions: record.resolutions,
        effectivenessScore: record.effectivenessScore,
      },
      resolution: {
        timestamp,
        commitHash: body.commitHash,
        description: body.description,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Gotcha Resolve] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/gotcha/{id}/resolve
 *
 * Get resolution history for a gotcha
 * Returns all commits that resolved this gotcha
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gotchaId } = await params;

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    // Query gotcha and its resolutions
    const query = `
      MATCH (g:Gotcha {id: $gotchaId})
      OPTIONAL MATCH (g)-[r:RESOLVED_BY]->(c:Commit)
      RETURN g.id as id,
             g.title as title,
             g.encounters as encounters,
             g.resolutions as resolutions,
             CASE
               WHEN g.encounters > 0
               THEN round(toFloat(g.resolutions) / toFloat(g.encounters) * 100)
               ELSE 0
             END as effectivenessScore,
             collect({
               commitHash: c.hash,
               timestamp: r.timestamp,
               description: r.description,
               sessionId: r.sessionId,
               files: r.files
             }) as resolutionHistory
    `;

    const result = await runQuery(query, { gotchaId });

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Gotcha not found: ${gotchaId}` },
        { status: 404 }
      );
    }

    const record = result[0];

    // Filter out null entries from resolution history
    const resolutions = (record.resolutionHistory || []).filter(
      (r: any) => r.commitHash !== null
    );

    return NextResponse.json({
      gotcha: {
        id: record.id,
        title: record.title || record.id,
        encounters: record.encounters || 0,
        resolutions: record.resolutions || 0,
        effectivenessScore: record.effectivenessScore || 0,
      },
      resolutionHistory: resolutions,
    });

  } catch (error) {
    console.error('[Gotcha Resolve GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
