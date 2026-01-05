/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-05
 * @tags: [insights, coaching, sync, supabase, task-11, member-filter, epic-008]
 * @related: [../../lib/auth/middleware.ts, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * POST /api/v1/insights/sync
 *
 * Sync coaching insights from CLI to Supabase (TASK-11)
 *
 * Receives a CoachingReport and stores:
 * - insight_runs: The analysis run metadata
 * - insights: Individual insights from the run
 * - insight_trends: Key metrics for trend tracking
 *
 * Request Body:
 * - userId: string
 * - projectId: string
 * - graphId?: string
 * - overallScore: number (0-100)
 * - categoryScores: CategoryScore[]
 * - insights: RawInsight[]
 * - summary: string
 * - period: { start, end, days }
 *
 * Returns:
 * - success: boolean
 * - runId: UUID of the created insight run
 * - insightCount: Number of insights stored
 * - trendCount: Number of trend points stored
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth/middleware';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Types matching CLI CoachingReport structure
interface InsightEvidence {
  type: 'event' | 'task' | 'commit' | 'session' | 'pattern' | 'gotcha';
  id: string;
  description: string;
  timestamp?: string;
}

interface RawInsight {
  category: 'efficiency' | 'patterns' | 'quality' | 'anti-patterns';
  severity: 'info' | 'suggestion' | 'warning' | 'critical';
  title: string;
  description: string;
  metricName?: string;
  metricValue?: number;
  metricTarget?: number;
  metricUnit?: string;
  scoreImpact: number;
  evidence: InsightEvidence[];
  recommendations: string[];
}

interface CategoryScore {
  category: 'efficiency' | 'patterns' | 'quality' | 'anti-patterns';
  score: number;
  baseScore: number;
  adjustments: number;
  insightCount: number;
  criticalCount: number;
  warningCount: number;
}

interface SyncRequest {
  userId: string;
  projectId: string;
  graphId?: string;
  overallScore: number;
  categoryScores: CategoryScore[];
  insights: RawInsight[];
  summary: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (user: AuthenticatedUser, _supabase: any) => {
    try {
      const body: SyncRequest = await request.json();

      // Validate required fields
      if (!body.userId || !body.projectId) {
        return NextResponse.json(
          { error: 'Missing required fields: userId, projectId' },
          { status: 400 }
        );
      }

      if (body.overallScore === undefined || body.overallScore < 0 || body.overallScore > 100) {
        return NextResponse.json(
          { error: 'Invalid overallScore: must be 0-100' },
          { status: 400 }
        );
      }

      // Verify user matches authenticated user (security check)
      // Allow userId to be email or id format
      const userEmail = user.email;
      if (body.userId !== userEmail && body.userId !== user.id) {
        console.warn(`[Insights Sync] User mismatch: ${body.userId} vs ${userEmail}`);
      }

      // Use service role client to bypass RLS for inserts
      // We've already authenticated the user via withAuth
      const supabase = createServiceRoleClient();

      // Normalize userId to email for consistency with RLS policies
      const normalizedUserId = userEmail || body.userId;

      // Create insight run
      const { data: run, error: runError } = await supabase
        .from('insight_runs')
        .insert({
          user_id: normalizedUserId,
          project_id: body.projectId,
          graph_id: body.graphId || null,
          status: 'completed',
          overall_score: body.overallScore,
          summary: body.summary,
          data_window_start: body.period.start,
          data_window_end: body.period.end,
          metadata: {
            categoryScores: body.categoryScores,
            periodDays: body.period.days,
          },
        })
        .select()
        .single();

      if (runError) {
        console.error('[Insights Sync] Create run error:', runError);
        return NextResponse.json(
          { error: 'Failed to create insight run', message: runError.message },
          { status: 500 }
        );
      }

      // Insert individual insights
      let insightCount = 0;
      if (body.insights && body.insights.length > 0) {
        const insightsToInsert = body.insights.map((insight) => ({
          run_id: run.id,
          category: insight.category,
          severity: insight.severity,
          title: insight.title,
          description: insight.description,
          metric_name: insight.metricName || null,
          metric_value: insight.metricValue ?? null,
          metric_target: insight.metricTarget ?? null,
          metric_unit: insight.metricUnit || null,
          score_impact: insight.scoreImpact,
          evidence: insight.evidence,
          recommendations: insight.recommendations,
        }));

        const { error: insightError } = await supabase
          .from('insights')
          .insert(insightsToInsert);

        if (insightError) {
          console.error('[Insights Sync] Insert insights error:', insightError);
          // Don't fail the whole request - run is created, insights failed
          console.warn('[Insights Sync] Continuing without insights');
        } else {
          insightCount = insightsToInsert.length;
        }
      }

      // Insert trend points for key metrics
      let trendCount = 0;
      const trendsToInsert: any[] = [];

      // Overall score trend
      trendsToInsert.push({
        user_id: normalizedUserId,
        project_id: body.projectId,
        run_id: run.id,
        metric_name: 'overall_score',
        metric_value: body.overallScore,
        metric_unit: 'points',
      });

      // Category score trends
      for (const cs of body.categoryScores) {
        trendsToInsert.push({
          user_id: normalizedUserId,
          project_id: body.projectId,
          run_id: run.id,
          metric_name: `${cs.category}_score`,
          metric_value: cs.score,
          metric_unit: 'points',
        });
      }

      // Extract specific metric trends from insights
      for (const insight of body.insights) {
        if (insight.metricName && insight.metricValue !== undefined) {
          trendsToInsert.push({
            user_id: normalizedUserId,
            project_id: body.projectId,
            run_id: run.id,
            metric_name: insight.metricName,
            metric_value: insight.metricValue,
            metric_unit: insight.metricUnit || null,
          });
        }
      }

      if (trendsToInsert.length > 0) {
        const { error: trendError } = await supabase
          .from('insight_trends')
          .insert(trendsToInsert);

        if (trendError) {
          console.error('[Insights Sync] Insert trends error:', trendError);
          // Don't fail - trends are supplementary
        } else {
          trendCount = trendsToInsert.length;
        }
      }

      console.log(`[Insights Sync] Success: run=${run.id}, insights=${insightCount}, trends=${trendCount}`);

      return NextResponse.json({
        success: true,
        runId: run.id,
        insightCount,
        trendCount,
        overallScore: body.overallScore,
      }, { status: 201 });

    } catch (error: any) {
      console.error('[Insights Sync] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to sync insights', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/v1/insights/sync
 *
 * Get latest insight run for the authenticated user
 * Optional query params:
 * - projectId: Filter by project
 * - limit: Number of runs to return (default 1)
 * - memberEmail: Query insights for a specific team member (owners only)
 *
 * Also calculates trend scores for 1-day and 7-day periods from historical data.
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user: AuthenticatedUser, _supabase: any) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');
      const limit = parseInt(searchParams.get('limit') || '1', 10);
      const days = searchParams.get('days');
      const memberEmail = searchParams.get('memberEmail');

      // Use service role client to bypass RLS - we've already authenticated via withAuth
      const supabase = createServiceRoleClient();

      // Determine which user's insights to query
      let targetUserEmail = user.email;

      // If memberEmail is specified, verify requester is an owner of a shared team
      if (memberEmail && memberEmail !== user.email) {
        // Check if current user is an owner of any team that includes the target member
        const { data: ownerTeams } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .eq('role', 'owner');

        if (!ownerTeams || ownerTeams.length === 0) {
          return NextResponse.json(
            { error: 'Only team owners can view other members\' insights' },
            { status: 403 }
          );
        }

        // Verify target member is in one of the owner's teams
        const teamIds = ownerTeams.map((t: any) => t.team_id);

        // Get target user's ID from their email
        const { data: targetProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', memberEmail)
          .single();

        if (!targetProfile) {
          return NextResponse.json(
            { error: 'Member not found' },
            { status: 404 }
          );
        }

        const { data: memberCheck } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', targetProfile.id)
          .in('team_id', teamIds)
          .limit(1);

        if (!memberCheck || memberCheck.length === 0) {
          return NextResponse.json(
            { error: 'You can only view insights for members of your teams' },
            { status: 403 }
          );
        }

        targetUserEmail = memberEmail;
      }

      let query = supabase
        .from('insight_runs')
        .select(`
          *,
          insights (*)
        `)
        .eq('user_id', targetUserEmail)
        .eq('status', 'completed')
        .order('run_at', { ascending: false })
        .limit(Math.min(limit, 10));

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: allRuns, error } = await query;

      // Filter by period days if specified (stored in metadata.periodDays)
      let runs = allRuns;
      if (days && allRuns) {
        const targetDays = parseInt(days, 10);
        runs = allRuns.filter((run: any) =>
          run.metadata?.periodDays === targetDays
        );
        // If no matching period found, fall back to most recent run
        if (runs.length === 0) {
          runs = allRuns.slice(0, 1);
        }
      }

      if (error) {
        console.error('[Insights Sync] GET error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch insight runs', message: error.message },
          { status: 500 }
        );
      }

      // Calculate trend scores from historical data
      if (runs && runs.length > 0) {
        const latestRun = runs[0];
        const trendScores = await calculateTrendScores(supabase, targetUserEmail, latestRun.project_id);

        // Add trendScores to metadata
        if (latestRun.metadata) {
          latestRun.metadata.trendScores = trendScores;
        } else {
          latestRun.metadata = { trendScores };
        }
      }

      return NextResponse.json({
        runs: runs || [],
        count: runs?.length || 0,
      });

    } catch (error: any) {
      console.error('[Insights Sync] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch insight runs', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * Calculate trend scores for different time periods.
 * Uses historical trend data to compute 1-day, 7-day, and 30-day scores.
 */
async function calculateTrendScores(
  supabase: any,
  userId: string,
  projectId: string
): Promise<{
  day1?: { score: number; previousScore?: number; trend?: 'up' | 'down' | 'stable'; periodDays: number; lastUpdated?: string };
  day7?: { score: number; previousScore?: number; trend?: 'up' | 'down' | 'stable'; periodDays: number; lastUpdated?: string };
  day30?: { score: number; previousScore?: number; trend?: 'up' | 'down' | 'stable'; periodDays: number; lastUpdated?: string };
}> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Fetch overall_score trends from the last 60 days
  const { data: trends, error } = await supabase
    .from('insight_trends')
    .select('metric_value, measured_at')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('metric_name', 'overall_score')
    .gte('measured_at', sixtyDaysAgo.toISOString())
    .order('measured_at', { ascending: false });

  if (error || !trends || trends.length === 0) {
    return {};
  }

  // Helper to calculate average score for a time window
  const calculatePeriodScore = (startDate: Date, endDate: Date): number | null => {
    const periodTrends = trends.filter((t: any) => {
      const date = new Date(t.measured_at);
      return date >= startDate && date <= endDate;
    });
    if (periodTrends.length === 0) return null;
    const sum = periodTrends.reduce((acc: number, t: any) => acc + t.metric_value, 0);
    return Math.round(sum / periodTrends.length);
  };

  // Helper to determine trend direction
  const getTrend = (current: number, previous: number | null): 'up' | 'down' | 'stable' | undefined => {
    if (previous === null) return undefined;
    const diff = current - previous;
    if (diff > 2) return 'up';
    if (diff < -2) return 'down';
    return 'stable';
  };

  const result: any = {};

  // 1-day score (last 24 hours vs previous 24 hours)
  const day1Score = calculatePeriodScore(oneDayAgo, now);
  const day1Previous = calculatePeriodScore(new Date(oneDayAgo.getTime() - 24 * 60 * 60 * 1000), oneDayAgo);
  if (day1Score !== null) {
    result.day1 = {
      score: day1Score,
      previousScore: day1Previous ?? undefined,
      trend: getTrend(day1Score, day1Previous),
      periodDays: 1,
      lastUpdated: now.toISOString(),
    };
  }

  // 7-day score (last 7 days vs previous 7 days)
  const day7Score = calculatePeriodScore(sevenDaysAgo, now);
  const day7Previous = calculatePeriodScore(new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000), sevenDaysAgo);
  if (day7Score !== null) {
    result.day7 = {
      score: day7Score,
      previousScore: day7Previous ?? undefined,
      trend: getTrend(day7Score, day7Previous),
      periodDays: 7,
      lastUpdated: now.toISOString(),
    };
  }

  // 30-day score (last 30 days vs previous 30 days)
  const day30Score = calculatePeriodScore(thirtyDaysAgo, now);
  const day30Previous = calculatePeriodScore(sixtyDaysAgo, thirtyDaysAgo);
  if (day30Score !== null) {
    result.day30 = {
      score: day30Score,
      previousScore: day30Previous ?? undefined,
      trend: getTrend(day30Score, day30Previous),
      periodDays: 30,
      lastUpdated: now.toISOString(),
    };
  }

  return result;
}
