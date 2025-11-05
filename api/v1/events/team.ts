/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-04
 * @tags: [events, adr-043, team-collaboration, context-loading]
 * @related: [_cloud-graph-client.ts, context-loader-events.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/events/team
 *
 * Load team high-signal events (ADR-043 Phase 3)
 *
 * Query Parameters:
 * - projectId: Project ID for multi-tenant filtering
 * - graphId: Graph ID
 * - excludeUserId: User ID to exclude (current user)
 * - limit: Number of events to load (default: 20)
 * - days: Load events from last N days (default: 7)
 * - categories: Filter by categories (default: decision,achievement,git)
 *
 * Returns:
 * - events: Array of high-signal team events (excludes current user)
 * - totalCount: Number of events returned
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { runQuery } from '../graph/_neo4j.js';
import neo4j from 'neo4j-driver';

interface TeamEvent {
  id: string;
  user_id: string;
  project_id: string;
  timestamp: Date;
  category: string;
  description: string;
  files: string[];
  impact: string;
  branch?: string;
  tags?: string[];
  shared: boolean;
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
      projectId,
      excludeUserId,
      limit = '20',
      days = '7',
      categories = 'decision,achievement,git',
    } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Missing required parameter: projectId' });
    }

    if (!excludeUserId || typeof excludeUserId !== 'string') {
      return res.status(400).json({ error: 'Missing required parameter: excludeUserId' });
    }

    const eventLimit = parseInt(limit as string, 10);
    if (isNaN(eventLimit) || eventLimit < 1 || eventLimit > 100) {
      return res.status(400).json({ error: 'Invalid limit (must be 1-100)' });
    }

    const daysCount = parseInt(days as string, 10);
    if (isNaN(daysCount) || daysCount < 1 || daysCount > 90) {
      return res.status(400).json({ error: 'Invalid days (must be 1-90)' });
    }

    // Parse category filter
    const categoryList = (categories as string).split(',').map(c => c.trim());

    // Query team high-signal events
    const result = await runQuery<any>(
      `
      MATCH (user:User)-[:LOGGED]->(e:Event)
      WHERE e.project_id = $projectId
        AND e.user_id <> $excludeUserId
        AND e.shared = true
        AND e.category IN $categories
        AND e.timestamp > datetime() - duration({days: $days})
      ORDER BY e.timestamp DESC
      LIMIT $limit
      RETURN e
      `,
      {
        projectId,
        excludeUserId,
        categories: categoryList,
        days: neo4j.int(daysCount),
        limit: neo4j.int(eventLimit),
      }
    );

    const events: TeamEvent[] = result.map((r: any) => ({
      ...r.e.properties,
      timestamp: new Date(r.e.properties.timestamp),
    }));

    return res.status(200).json({
      events,
      totalCount: events.length,
      appliedFilters: {
        projectId,
        excludeUserId,
        categories: categoryList,
        days: daysCount,
      },
    });
  } catch (error: any) {
    console.error('[Team Events API] Error:', error);

    return res.status(500).json({
      error: 'Failed to load team events',
      message: error.message,
    });
  }
}
