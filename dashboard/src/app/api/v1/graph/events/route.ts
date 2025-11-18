/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-05
 * @tags: [api, graph, events, adr-043, neo4j]
 * @related: [../_neo4j.ts, ../documents/batch/route.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection, getSession } from '../_neo4j';

interface EventInput {
  id: string;
  user_id: string;
  organization_id?: string;
  project_id: string;
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
  description: string;
  timestamp: string;
  impact: 'high' | 'medium' | 'low';
  files: string[];
  branch: string;
  tags: string[];
  shared: boolean;
  commit_hash?: string;
  pressure?: number;
}

interface CreateEventsRequest {
  graphId: string;
  events: EventInput[];
}

interface CreateEventsResponse {
  created: number;
  events: Array<{ id: string; timestamp: string }>;
}

/**
 * POST /api/v1/graph/events
 * Create events in the knowledge graph (ADR-043 Event Stream Model)
 */
export async function POST(request: NextRequest) {
  console.log('[Events API] POST /api/v1/graph/events called');

  try {
    // Verify Neo4j connection
    console.log('[Events API] Verifying Neo4j connection...');
    const isConnected = await verifyConnection();
    console.log('[Events API] Neo4j connection status:', isConnected);

    if (!isConnected) {
      console.error('[Events API] Neo4j connection failed - returning 503');
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

    const token = authHeader.substring(7);
    // TODO: Verify token with Supabase in production
    // For now, extract user_id from the first event (they should all be from same user)

    // Parse request body
    const body = (await request.json()) as CreateEventsRequest;
    console.log('[Events API] Request body:', {
      graphId: body.graphId,
      eventCount: body.events?.length,
      firstEventId: body.events?.[0]?.id
    });

    // Validate required fields
    if (!body.graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId is required',
          },
        },
        { status: 400 }
      );
    }

    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_EVENTS',
            message: 'events array is required and must not be empty',
          },
        },
        { status: 400 }
      );
    }

    // Validate each event has required fields
    for (const event of body.events) {
      if (!event.id || !event.user_id || !event.project_id || !event.category || !event.description) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_EVENT',
              message: 'Each event must have id, user_id, project_id, category, and description',
            },
          },
          { status: 400 }
        );
      }
    }

    // Create events in Neo4j
    console.log('[Events API] Creating Neo4j session...');
    const createdEvents = [];
    const session = getSession();
    console.log('[Events API] Session created, processing', body.events.length, 'events');

    try {
      // Create events in a write transaction (ensures commits)
      await session.executeWrite(async (tx) => {
        for (const event of body.events) {
          console.log('[Events API] Processing event:', event.id);

          // First, ensure User node exists
          console.log('[Events API] Creating/merging user node:', event.user_id);
          await tx.run(
            `
            MERGE (u:User {id: $userId})
            ON CREATE SET u.created_at = datetime()
            `,
            { userId: event.user_id }
          );
          console.log('[Events API] User node created/merged');

          // Create event with temporal chain link
          console.log('[Events API] Creating event node and relationships...');
          const result = await tx.run(
          `
          // Create the event
          CREATE (e:Event {
            id: $id,
            user_id: $userId,
            organization_id: $organizationId,
            project_id: $projectId,
            graph_id: $graphId,
            timestamp: datetime($timestamp),
            category: $category,
            description: $description,
            files: $files,
            impact: $impact,
            pressure: $pressure,
            branch: $branch,
            tags: $tags,
            shared: $shared,
            commit_hash: $commitHash
          })

          // Link to user
          WITH e
          MATCH (u:User {id: $userId})
          CREATE (u)-[:LOGGED]->(e)

          // Link to previous event (temporal chain)
          WITH e
          OPTIONAL MATCH (prev:Event)
          WHERE prev.user_id = $userId
            AND prev.project_id = $projectId
          ORDER BY prev.timestamp DESC
          LIMIT 1
          FOREACH (p IN CASE WHEN prev IS NOT NULL THEN [prev] ELSE [] END |
            CREATE (p)-[:NEXT]->(e)
          )

          RETURN e.id as id, e.timestamp as timestamp
          `,
          {
            id: event.id,
            userId: event.user_id,
            organizationId: event.organization_id || null,
            projectId: event.project_id,
            graphId: body.graphId,
            timestamp: event.timestamp,
            category: event.category,
            description: event.description,
            files: event.files || [],
            impact: event.impact,
            pressure: event.pressure ?? 0,
            branch: event.branch || 'main',
            tags: event.tags || [],
            shared: event.shared ?? false,
            commitHash: event.commit_hash || null,
          }
        );

        console.log('[Events API] Event creation query completed, records:', result.records.length);

          if (result.records.length > 0) {
            const record = result.records[0];
            const createdEvent = {
              id: record.get('id'),
              timestamp: record.get('timestamp').toString(),
            };
            createdEvents.push(createdEvent);
            console.log('[Events API] Event created successfully:', createdEvent.id);
          } else {
            console.warn('[Events API] Event creation returned no records for:', event.id);
          }
        }
      });

      console.log('[Events API] Transaction committed. Created:', createdEvents.length, '/', body.events.length);

      // Success response
      const response: CreateEventsResponse = {
        created: createdEvents.length,
        events: createdEvents,
      };

      console.log('[Events API] Returning success response:', response);
      return NextResponse.json(response, { status: 201 });
    } finally {
      console.log('[Events API] Closing Neo4j session');
      await session.close();
      console.log('[Events API] Session closed');
    }
  } catch (error) {
    console.error('[Events API] ERROR creating events:', error);
    console.error('[Events API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create events',
        },
      },
      { status: 500 }
    );
  }
}
