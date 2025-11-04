/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-04
 * @tags: [api, graph, events, adr-043, serverless]
 * @related: [_neo4j.ts, init.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runQuery, verifyConnection, getSession } from './_neo4j.js';

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
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed. Use POST.',
      },
    });
  }

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Graph database is unavailable. Please try again later.',
        },
      });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Include Bearer token in Authorization header.',
        },
      });
    }

    const token = authHeader.substring(7);
    // TODO: Verify token with Supabase in production
    // For now, extract user_id from the first event (they should all be from same user)

    // Parse request body
    const body = req.body as CreateEventsRequest;

    // Validate required fields
    if (!body.graphId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_GRAPH_ID',
          message: 'graphId is required',
        },
      });
    }

    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_EVENTS',
          message: 'events array is required and must not be empty',
        },
      });
    }

    // Validate each event has required fields
    for (const event of body.events) {
      if (!event.id || !event.user_id || !event.project_id || !event.category || !event.description) {
        return res.status(400).json({
          error: {
            code: 'INVALID_EVENT',
            message: 'Each event must have id, user_id, project_id, category, and description',
          },
        });
      }
    }

    // Create events in Neo4j
    const createdEvents = [];
    const session = getSession();

    try {
      // Create events in a transaction
      for (const event of body.events) {
        // First, ensure User node exists
        await session.run(
          `
          MERGE (u:User {id: $userId})
          ON CREATE SET u.created_at = datetime()
          `,
          { userId: event.user_id }
        );

        // Create event with temporal chain link
        const result = await session.run(
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

        if (result.records.length > 0) {
          const record = result.records[0];
          createdEvents.push({
            id: record.get('id'),
            timestamp: record.get('timestamp').toString(),
          });
        }
      }

      // Success response
      const response: CreateEventsResponse = {
        created: createdEvents.length,
        events: createdEvents,
      };

      return res.status(201).json(response);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[API] Error creating events:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create events',
      },
    });
  }
}
