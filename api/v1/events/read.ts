/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-04
 * @tags: [events, adr-043, session-cursor, context-loading]
 * @related: [_cloud-graph-client.ts, context-loader-events.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/events/read
 *
 * Read events backward from cursor position (ADR-043 Phase 3)
 *
 * Query Parameters:
 * - cursorId: Session cursor ID
 * -limit: Number of events to read (default: 50)
 * - categories: Filter by event categories (comma-separated)
 * - branch: Filter by git branch
 *
 * Returns:
 * - events: Array of events in reverse chronological order
 * - cursor: Session cursor information
 * - totalCount: Number of events returned
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { runQuery } from '../graph/_neo4j.js';
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Parse query parameters
    const {
      cursorId,
      limit = '50',
      categories,
      branch,
    } = req.query;

    if (!cursorId || typeof cursorId !== 'string') {
      return res.status(400).json({ error: 'Missing required parameter: cursorId' });
    }

    const eventLimit = parseInt(limit as string, 10);
    if (isNaN(eventLimit) || eventLimit < 1 || eventLimit > 200) {
      return res.status(400).json({ error: 'Invalid limit (must be 1-200)' });
    }

    // Read events backward from cursor
    const result = await runQuery<any>(
      `
      MATCH (cursor:SessionCursor {id: $cursorId})-[:POSITIONED_AT]->(current:Event)

      // Read backwards via NEXT relationships
      MATCH path = (e:Event)-[:NEXT*0..${eventLimit}]->(current)
      WHERE e.organization_id = cursor.organization_id
        AND e.project_id = cursor.project_id
        AND (e.branch = cursor.branch OR cursor.branch IS NULL)

      WITH DISTINCT e
      ORDER BY e.timestamp DESC
      LIMIT $limit

      RETURN e
      `,
      {
        cursorId,
        limit: neo4j.int(eventLimit),
      }
    );

    let events: Event[] = result.map((r: any) => ({
      ...r.e.properties,
      timestamp: new Date(r.e.properties.timestamp),
    }));

    // Apply additional filters if provided
    if (categories && typeof categories === 'string') {
      const categoryList = categories.split(',').map(c => c.trim());
      events = events.filter(e => categoryList.includes(e.category));
    }

    if (branch && typeof branch === 'string') {
      events = events.filter(e => e.branch === branch);
    }

    // Get cursor info
    const cursorResult = await runQuery<any>(
      `MATCH (cursor:SessionCursor {id: $cursorId}) RETURN cursor`,
      { cursorId }
    );

    const cursor = cursorResult.length > 0 ? cursorResult[0].cursor.properties : null;

    return res.status(200).json({
      events,
      cursor,
      totalCount: events.length,
      appliedFilters: {
        categories: categories ? categories : null,
        branch: branch ? branch : null,
      },
    });
  } catch (error: any) {
    console.error('[Events Read API] Error:', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: 'Cursor not found' });
    }

    return res.status(500).json({
      error: 'Failed to read events',
      message: error.message,
    });
  }
}
