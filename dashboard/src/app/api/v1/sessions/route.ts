/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-15
 * @tags: [sessions, events, adr-043, dashboard]
 * @related: [../events/route.ts, ../graph/events/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * GET /api/v1/sessions
 *
 * Fetch user sessions with events grouped by session boundary.
 * Sessions are determined by gaps of 4+ hours between events.
 *
 * Query Parameters:
 * - graphId: Graph ID to query
 * - userId: User ID to filter by (optional, uses auth if not provided)
 * - limit: Number of sessions to return (default: 10)
 * - days: Number of days to look back (default: 30)
 *
 * Returns:
 * - sessions: Array of sessions with events
 * - totalCount: Total number of sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface Event {
  id: string;
  user_id: string;
  project_id: string;
  timestamp: string;
  category: string;
  description: string;
  files: string[];
  impact: string;
  branch?: string;
  tags?: string[];
}

interface Session {
  id: string;
  startTime: string;
  endTime: string;
  events: Event[];
  eventCount: number;
  categories: Record<string, number>;
  impactSummary: {
    high: number;
    medium: number;
    low: number;
  };
  title: string;
  description: string;
}

// Session boundary threshold: 4 hours gap = new session
const SESSION_GAP_HOURS = 4;

export async function GET(request: NextRequest) {
  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const graphId = searchParams.get('graphId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    // Calculate date range
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Query events from Neo4j
    const query = userId
      ? `
        MATCH (e:Event)
        WHERE e.graph_id = $graphId
          AND e.user_id = $userId
          AND e.timestamp >= datetime($sinceDate)
        RETURN e
        ORDER BY e.timestamp DESC
        LIMIT 500
      `
      : `
        MATCH (e:Event)
        WHERE e.graph_id = $graphId
          AND e.timestamp >= datetime($sinceDate)
        RETURN e
        ORDER BY e.timestamp DESC
        LIMIT 500
      `;

    const result = await runQuery<{ e: { properties: Event } }>(query, {
      graphId,
      userId: userId || '',
      sinceDate: sinceDate.toISOString(),
    });

    // Process events into session format
    const events: Event[] = result.map((r) => ({
      ...r.e.properties,
      timestamp: typeof r.e.properties.timestamp === 'object'
        ? (r.e.properties.timestamp as any).toString()
        : r.e.properties.timestamp,
    }));

    // Group events into sessions based on time gaps
    const sessions = groupEventsIntoSessions(events, SESSION_GAP_HOURS);

    // Limit the number of sessions returned
    const limitedSessions = sessions.slice(0, limit);

    return NextResponse.json({
      sessions: limitedSessions,
      totalCount: sessions.length,
      parameters: {
        graphId,
        userId: userId || 'all',
        days,
        limit,
      },
    });
  } catch (error: any) {
    console.error('[Sessions API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sessions',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Group events into sessions based on time gaps.
 * A new session starts when there's a gap of SESSION_GAP_HOURS or more.
 */
function groupEventsIntoSessions(events: Event[], gapHours: number): Session[] {
  if (events.length === 0) {
    return [];
  }

  // Sort events by timestamp (newest first, but we'll process oldest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const sessions: Session[] = [];
  let currentSession: Event[] = [sortedEvents[0]];
  const gapMs = gapHours * 60 * 60 * 1000;

  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currEvent = sortedEvents[i];

    const prevTime = new Date(prevEvent.timestamp).getTime();
    const currTime = new Date(currEvent.timestamp).getTime();
    const gap = currTime - prevTime;

    if (gap > gapMs) {
      // Start a new session
      sessions.push(createSessionFromEvents(currentSession));
      currentSession = [currEvent];
    } else {
      // Continue current session
      currentSession.push(currEvent);
    }
  }

  // Don't forget the last session
  if (currentSession.length > 0) {
    sessions.push(createSessionFromEvents(currentSession));
  }

  // Return in reverse chronological order (most recent first)
  return sessions.reverse();
}

/**
 * Create a session object from a group of events.
 */
function createSessionFromEvents(events: Event[]): Session {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const startTime = sortedEvents[0].timestamp;
  const endTime = sortedEvents[sortedEvents.length - 1].timestamp;

  // Count categories
  const categories: Record<string, number> = {};
  for (const event of events) {
    categories[event.category] = (categories[event.category] || 0) + 1;
  }

  // Count impact levels
  const impactSummary = { high: 0, medium: 0, low: 0 };
  for (const event of events) {
    if (event.impact === 'high') impactSummary.high++;
    else if (event.impact === 'medium') impactSummary.medium++;
    else impactSummary.low++;
  }

  // Generate session title based on dominant activity
  const dominantCategory = Object.entries(categories).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0] || 'development';

  const title = generateSessionTitle(dominantCategory, events.length, startTime);
  const description = generateSessionDescription(categories, impactSummary);

  // Create session ID from start timestamp
  const sessionId = `session_${new Date(startTime).getTime()}`;

  return {
    id: sessionId,
    startTime,
    endTime,
    events: sortedEvents.reverse(), // Most recent first within session
    eventCount: events.length,
    categories,
    impactSummary,
    title,
    description,
  };
}

/**
 * Generate a human-readable session title.
 */
function generateSessionTitle(
  dominantCategory: string,
  eventCount: number,
  startTime: string
): string {
  const date = new Date(startTime);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const categoryLabels: Record<string, string> = {
    fix: 'Bug Fix Session',
    feature: 'Feature Development',
    decision: 'Architecture Session',
    insight: 'Discovery Session',
    git: 'Code Integration',
    achievement: 'Milestone Session',
  };

  const label = categoryLabels[dominantCategory] || 'Development Session';
  return `${label} - ${dateStr}`;
}

/**
 * Generate a session description summary.
 */
function generateSessionDescription(
  categories: Record<string, number>,
  impactSummary: { high: number; medium: number; low: number }
): string {
  const parts: string[] = [];

  // Add category breakdown
  const categoryParts = Object.entries(categories)
    .map(([cat, count]) => `${count} ${cat}${count > 1 ? 's' : ''}`)
    .join(', ');
  parts.push(categoryParts);

  // Add impact summary if there are high-impact events
  if (impactSummary.high > 0) {
    parts.push(`${impactSummary.high} high-impact`);
  }

  return parts.join(' • ');
}
