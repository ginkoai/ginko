/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, sync, supabase, task-11]
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
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user: AuthenticatedUser, _supabase: any) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');
      const limit = parseInt(searchParams.get('limit') || '1', 10);

      // Use service role client to bypass RLS - we've already authenticated via withAuth
      const supabase = createServiceRoleClient();

      let query = supabase
        .from('insight_runs')
        .select(`
          *,
          insights (*)
        `)
        .eq('user_id', user.email)
        .eq('status', 'completed')
        .order('run_at', { ascending: false })
        .limit(Math.min(limit, 10));

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: runs, error } = await query;

      if (error) {
        console.error('[Insights Sync] GET error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch insight runs', message: error.message },
          { status: 500 }
        );
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
