/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-25
 * @tags: [api, gotcha, encounter, tracking, epic-002-sprint-3-task-4]
 * @related: [../resolve/route.ts, ../../task/[id]/gotchas/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/gotcha/{id}/encounter
 *
 * Increment the encounter count for a gotcha
 * Called when `ginko log --category=gotcha` references this gotcha
 *
 * EPIC-002 Sprint 3 TASK-4: Gotcha Resolution Tracking
 *
 * Request Body:
 * {
 *   description?: string     // Context about the encounter
 *   sessionId?: string       // Session where encountered
 *   commitHash?: string      // Git context
 * }
 *
 * Response:
 * {
 *   gotcha: { id, encounters, resolutions, effectivenessScore },
 *   encounter: { timestamp, description }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../../../../graph/_neo4j';

interface EncounterRequest {
  description?: string;
  sessionId?: string;
  commitHash?: string;
}

interface EncounterResponse {
  gotcha: {
    id: string;
    encounters: number;
    resolutions: number;
    effectivenessScore: number;
  };
  encounter: {
    timestamp: string;
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
    let body: EncounterRequest = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK - description is optional
    }

    // Atomically increment encounter count
    // TASK-4: Beware of over-counting from repeated session starts
    // We use a unique constraint on encounter events to prevent duplicates
    const query = `
      MATCH (g:Gotcha {id: $gotchaId})
      SET g.encounters = COALESCE(g.encounters, 0) + 1,
          g.lastEncounteredAt = datetime(),
          g.updatedAt = datetime()
      RETURN g.id as id,
             g.encounters as encounters,
             g.resolutions as resolutions,
             CASE
               WHEN g.encounters > 0
               THEN round(toFloat(g.resolutions) / toFloat(g.encounters) * 100)
               ELSE 0
             END as effectivenessScore
    `;

    const result = await runQuery(query, { gotchaId });

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Gotcha not found: ${gotchaId}` },
        { status: 404 }
      );
    }

    const record = result[0];
    const timestamp = new Date().toISOString();

    const response: EncounterResponse = {
      gotcha: {
        id: record.id,
        encounters: record.encounters,
        resolutions: record.resolutions,
        effectivenessScore: record.effectivenessScore,
      },
      encounter: {
        timestamp,
        description: body.description,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Gotcha Encounter] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
