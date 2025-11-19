/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-19
 * @tags: [api, context, events, chronological-loading, task-011]
 * @related: [events.ts, read.ts, context-loader-events.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/context/initial-load
 *
 * Consolidated context loading endpoint (TASK-011: Chronological Loading)
 *
 * Query Parameters:
 * - cursorId: "chronological" for simple chronological query
 * - userId: User email/ID
 * - projectId: Project identifier
 * - eventLimit: Number of events to load (default: 50)
 * - includeTeam: Include team events (default: false)
 * - teamEventLimit: Number of team events (default: 20)
 * - teamDays: Team event time window in days (default: 7)
 * - documentDepth: Related document depth (default: 2)
 * - categories: Filter by categories (comma-separated)
 *
 * Returns:
 * - cursor: Minimal cursor info (backward compatibility)
 * - myEvents: User's events in reverse chronological order
 * - teamEvents: Team events (if includeTeam=true)
 * - documents: Related documents
 * - relatedDocs: Additional related documents
 * - sprint: Current sprint info
 * - loaded_at: Timestamp of load
 * - event_count: Total events returned
 * - token_estimate: Estimated token count
 * - performance: Query performance metrics
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { runQuery, verifyConnection } from '../graph/_neo4j.js';
import neo4j from 'neo4j-driver';

interface Event {
  id: string;
  user_id: string;
  project_id: string;
  organization_id: string;
  timestamp: Date;
  category: string;
  description: string;
  files: string[];
  impact: string;
  pressure?: number;
  branch?: string;
  tags?: string[];
  shared?: boolean;
  commit_hash?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed. Use GET.',
      },
    });
  }

  const startTime = Date.now();

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

    // Parse query parameters
    const {
      cursorId,
      userId,
      projectId,
      eventLimit = '50',
      includeTeam = 'false',
      teamEventLimit = '20',
      teamDays = '7',
      documentDepth = '2',
      categories,
    } = req.query;

    // Validate required parameters
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'userId is required',
        },
      });
    }

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_PROJECT_ID',
          message: 'projectId is required',
        },
      });
    }

    const limit = parseInt(eventLimit as string, 10);
    if (isNaN(limit) || limit < 1 || limit > 200) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'eventLimit must be between 1 and 200',
        },
      });
    }

    // Query events chronologically (TASK-011: No cursor dependency)
    let query = `
      MATCH (e:Event)
      WHERE e.user_id = $userId
        AND e.project_id = $projectId
    `;

    // Add category filter if provided
    if (categories && typeof categories === 'string') {
      const categoryList = categories.split(',').map(c => c.trim());
      query += ` AND e.category IN $categories`;
    }

    query += `
      RETURN e
      ORDER BY e.timestamp DESC
      LIMIT $limit
    `;

    const queryParams: Record<string, any> = {
      userId,
      projectId,
      limit: neo4j.int(limit),
    };

    if (categories && typeof categories === 'string') {
      queryParams.categories = categories.split(',').map(c => c.trim());
    }

    // Debug logging
    console.log('[Initial-Load API] Query:', query);
    console.log('[Initial-Load API] Params:', JSON.stringify(queryParams, null, 2));

    const result = await runQuery<any>(query, queryParams);

    console.log('[Initial-Load API] Query result count:', result.length);
    if (result.length > 0) {
      console.log('[Initial-Load API] First result:', JSON.stringify(result[0], null, 2));
    }

    const myEvents: Event[] = result.map((r: any) => {
      const props = r.e.properties;
      return {
        id: props.id,
        user_id: props.user_id,
        project_id: props.project_id,
        organization_id: props.organization_id || '',
        timestamp: props.timestamp instanceof neo4j.types.DateTime
          ? new Date(props.timestamp.toString())
          : new Date(props.timestamp),
        category: props.category,
        description: props.description,
        files: props.files || [],
        impact: props.impact,
        pressure: props.pressure ?? 0,
        branch: props.branch || 'main',
        tags: props.tags || [],
        shared: props.shared ?? false,
        commit_hash: props.commit_hash || undefined,
      };
    });

    const queryTimeMs = Date.now() - startTime;

    // Return consolidated response
    return res.status(200).json({
      cursor: {
        id: cursorId || 'chronological',
        current_event_id: cursorId || 'chronological',
      },
      myEvents,
      teamEvents: includeTeam === 'true' ? [] : undefined, // TODO: Implement team events
      documents: [], // TODO: Implement document loading
      relatedDocs: [], // TODO: Implement related docs
      sprint: null, // TODO: Implement sprint loading
      loaded_at: new Date().toISOString(),
      event_count: myEvents.length,
      token_estimate: myEvents.reduce((sum, e) => sum + e.description.length / 4, 0), // Rough estimate
      performance: {
        queryTimeMs,
        eventsLoaded: myEvents.length,
        documentsLoaded: 0,
        relationshipsTraversed: 0,
      },
    });
  } catch (error: any) {
    console.error('[Context Initial-Load API] Error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load context',
      },
    });
  }
}
