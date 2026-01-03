/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-03
 * @tags: [teams, activity, feed, rest-api, epic-008, neo4j, events]
 * @related: [../invite/route.ts, ../../graph/events/route.ts, ../../teams/[id]/members/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase, neo4j-driver]
 */

/**
 * GET /api/v1/team/activity - Get team activity feed
 *
 * EPIC-008: Team Collaboration Sprint 2
 *
 * Query Parameters:
 * - team_id: Required - the team to query
 * - limit: Maximum activities to return (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 * - since: ISO timestamp - only return activities after this time
 * - member_id: Filter by specific team member
 * - category: Filter by event category (fix, feature, decision, insight, git, achievement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { runQuery, verifyConnection } from '../../graph/_neo4j';
import neo4j from 'neo4j-driver';

interface ActivityMember {
  user_id: string;
  email: string;
  avatar_url?: string;
}

interface ActivityItem {
  id: string;
  member: ActivityMember;
  action: 'synced' | 'edited' | 'created' | 'logged';
  target_type: 'ADR' | 'Pattern' | 'Sprint' | 'Event';
  target_id: string;
  target_title?: string;
  timestamp: string;
  description?: string;
}

interface ActivityResponse {
  activities: ActivityItem[];
  count: number;
  hasMore: boolean;
}

/**
 * Map event category to activity action
 */
function mapCategoryToAction(category: string): 'synced' | 'edited' | 'created' | 'logged' {
  switch (category) {
    case 'git':
      return 'synced';
    case 'feature':
    case 'fix':
      return 'created';
    case 'decision':
    case 'insight':
      return 'logged';
    default:
      return 'logged';
  }
}

/**
 * Map event category to target type
 */
function mapCategoryToTargetType(category: string): 'ADR' | 'Pattern' | 'Sprint' | 'Event' {
  switch (category) {
    case 'decision':
      return 'ADR';
    case 'insight':
      return 'Pattern';
    default:
      return 'Event';
  }
}

/**
 * Helper: Check if user is team member
 */
async function isTeamMember(
  supabase: any,
  teamId: string,
  userId: string
): Promise<{ isMember: boolean; role?: string }> {
  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  return { isMember: !!data, role: data?.role };
}

/**
 * Helper: Get team's graph_id
 */
async function getTeamGraphId(
  supabase: any,
  teamId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('teams')
    .select('graph_id')
    .eq('id', teamId)
    .single();

  return data?.graph_id || null;
}

/**
 * Helper: Get team member profiles
 */
async function getTeamMemberProfiles(
  supabase: any,
  teamId: string
): Promise<Map<string, { email: string; github_username?: string }>> {
  const { data: members } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (!members || members.length === 0) {
    return new Map();
  }

  const userIds = members.map((m: any) => m.user_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, email, github_username')
    .in('id', userIds);

  const profileMap = new Map<string, { email: string; github_username?: string }>();
  (profiles || []).forEach((p: any) => {
    profileMap.set(p.id, {
      email: p.email || '',
      github_username: p.github_username,
    });
  });

  return profileMap;
}

/**
 * Query activities from Neo4j
 */
async function queryTeamActivities(
  graphId: string,
  limit: number,
  offset: number,
  since: string | null,
  memberId: string | null,
  category: string | null
): Promise<{ events: any[]; total: number }> {
  // Build WHERE conditions
  const whereConditions: string[] = ['e.graph_id = $graphId'];
  const params: Record<string, any> = {
    graphId,
    limit: neo4j.int(limit + 1), // Fetch one extra to detect hasMore
    skip: neo4j.int(offset),
  };

  if (since) {
    whereConditions.push('e.timestamp > datetime($since)');
    params.since = since;
  }

  if (memberId) {
    whereConditions.push('e.user_id = $memberId');
    params.memberId = memberId;
  }

  if (category) {
    whereConditions.push('e.category = $category');
    params.category = category;
  }

  const whereClause = whereConditions.join(' AND ');

  // Query events
  const cypher = `
    MATCH (e:Event)
    WHERE ${whereClause}
    RETURN e
    ORDER BY e.timestamp DESC
    SKIP $skip
    LIMIT $limit
  `;

  const results = await runQuery<{ e: { properties: any } }>(cypher, params);

  // Query total count
  const countCypher = `
    MATCH (e:Event)
    WHERE ${whereClause}
    RETURN count(e) as total
  `;
  const countParams = { ...params };
  delete countParams.limit;
  delete countParams.skip;

  const countResults = await runQuery<{ total: any }>(countCypher, countParams);
  const total = countResults[0]?.total?.toNumber?.() || countResults[0]?.total || 0;

  const events = results.map((r) => {
    const props = r.e.properties;
    return {
      id: props.id,
      user_id: props.user_id,
      timestamp: props.timestamp?.toString() || new Date().toISOString(),
      category: props.category,
      description: props.description,
      impact: props.impact,
      files: props.files || [],
      branch: props.branch,
      tags: props.tags || [],
    };
  });

  return { events, total };
}

/**
 * GET /api/v1/team/activity
 * Get team activity feed
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const teamId = searchParams.get('team_id');
      const limitStr = searchParams.get('limit') || '50';
      const offsetStr = searchParams.get('offset') || '0';
      const since = searchParams.get('since');
      const memberId = searchParams.get('member_id');
      const category = searchParams.get('category');

      // Validate required team_id
      if (!teamId) {
        return NextResponse.json(
          { error: 'Missing required parameter: team_id' },
          { status: 400 }
        );
      }

      // Parse and validate limit/offset
      const limit = Math.min(Math.max(parseInt(limitStr, 10) || 50, 1), 200);
      const offset = Math.max(parseInt(offsetStr, 10) || 0, 0);

      // Validate since timestamp if provided
      if (since) {
        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid since parameter: must be a valid ISO timestamp' },
            { status: 400 }
          );
        }
      }

      // Validate category if provided
      const validCategories = ['fix', 'feature', 'decision', 'insight', 'git', 'achievement'];
      if (category && !validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category: must be one of ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }

      // Check if user is team member
      const { isMember } = await isTeamMember(supabase, teamId, user.id);
      if (!isMember) {
        return NextResponse.json(
          { error: 'You must be a team member to view activity' },
          { status: 403 }
        );
      }

      // Get team's graph_id
      const graphId = await getTeamGraphId(supabase, teamId);
      if (!graphId) {
        // No graph_id means no activity yet - return empty
        return NextResponse.json({
          activities: [],
          count: 0,
          hasMore: false,
        } as ActivityResponse);
      }

      // Verify Neo4j connection
      const isConnected = await verifyConnection();
      if (!isConnected) {
        return NextResponse.json(
          { error: 'Graph database is unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      // Get team member profiles for enrichment
      const memberProfiles = await getTeamMemberProfiles(supabase, teamId);

      // If member_id filter is provided, verify they're a team member
      if (memberId && !memberProfiles.has(memberId)) {
        return NextResponse.json(
          { error: 'Specified member is not part of this team' },
          { status: 400 }
        );
      }

      // Query activities from Neo4j
      const { events, total } = await queryTeamActivities(
        graphId,
        limit,
        offset,
        since,
        memberId,
        category
      );

      // Determine hasMore
      const hasMore = events.length > limit;
      const trimmedEvents = hasMore ? events.slice(0, limit) : events;

      // Transform events to activity items
      const activities: ActivityItem[] = trimmedEvents.map((event) => {
        const profile = memberProfiles.get(event.user_id);
        const githubUsername = profile?.github_username;

        return {
          id: event.id,
          member: {
            user_id: event.user_id,
            email: profile?.email || '',
            avatar_url: githubUsername
              ? `https://github.com/${githubUsername}.png`
              : undefined,
          },
          action: mapCategoryToAction(event.category),
          target_type: mapCategoryToTargetType(event.category),
          target_id: event.id,
          target_title: event.files?.[0] || undefined,
          timestamp: event.timestamp,
          description: event.description,
        };
      });

      const response: ActivityResponse = {
        activities,
        count: total,
        hasMore,
      };

      return NextResponse.json(response);

    } catch (error: any) {
      console.error('[Team Activity API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team activity', message: error.message },
        { status: 500 }
      );
    }
  });
}
