/**
 * @fileType: api-route
 * @status: new
 * @updated: 2025-08-13
 * @tags: [vercel, serverless, sessions, scorecards, dashboard]
 * @related: [session-handoff.ts, database.ts, collaboration-dashboard]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@vercel/node, session-analytics, database]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAuthenticatedUser, 
  handlePreflight, 
  sendError, 
  sendSuccess,
  checkToolAccess,
  trackUsage,
  extractTeamAndProject,
  initializeDatabase
} from '../_utils.js';

async function getScorecards(
  adapter: any, 
  teamId: string, 
  userId: string, 
  options: {
    limit?: number;
    days?: number;
    includeCoaching?: boolean;
  } = {}
) {
  try {
    const { limit = 20, days = 30, includeCoaching = false } = options;
    
    // Try database first
    let scorecards = [];
    try {
      // Get session scorecards from database
      const result = await adapter.query(`
        SELECT 
          session_id,
          session_start,
          session_end,
          duration_minutes,
          scores,
          work_metrics,
          context_usage,
          mood,
          handoff_assessment,
          ${includeCoaching ? 'coaching,' : ''}
          patterns,
          created_at,
          updated_at
        FROM session_scorecards
        WHERE user_id = $1 
        AND team_id = $2
        AND session_start >= NOW() - INTERVAL '${days} days'
        ORDER BY session_start DESC
        LIMIT $3
      `, [userId, teamId, limit]);

      scorecards = result.rows.map((row: any) => ({
        sessionId: row.session_id,
        sessionStart: row.session_start,
        sessionEnd: row.session_end,
        durationMinutes: row.duration_minutes,
        scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
        workMetrics: typeof row.work_metrics === 'string' ? JSON.parse(row.work_metrics) : row.work_metrics,
        contextUsage: typeof row.context_usage === 'string' ? JSON.parse(row.context_usage) : row.context_usage,
        mood: typeof row.mood === 'string' ? JSON.parse(row.mood) : row.mood,
        handoffAssessment: typeof row.handoff_assessment === 'string' ? JSON.parse(row.handoff_assessment) : row.handoff_assessment,
        ...(includeCoaching && row.coaching ? {
          coaching: typeof row.coaching === 'string' ? JSON.parse(row.coaching) : row.coaching
        } : {}),
        patterns: typeof row.patterns === 'string' ? JSON.parse(row.patterns) : row.patterns,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      console.log(`[SCORECARDS] Database returned ${scorecards.length} scorecards for user ${userId}, team ${teamId}`);
    } catch (dbError) {
      console.warn('[SCORECARDS] Database query failed:', dbError);
      // Return empty array for graceful fallback
      scorecards = [];
    }

    // Calculate summary statistics
    const stats = calculateSummaryStats(scorecards);

    if (scorecards.length === 0) {
      return {
        scorecards: [],
        summary: {
          totalSessions: 0,
          avgCollaborationScore: 0,
          avgTaskCompletion: 0,
          avgHandoffQuality: 0,
          totalSessionTime: 0,
          periodDays: days
        },
        message: `No scorecard data available for the last ${days} days. Start using /handoff command to generate collaboration analytics.`
      };
    }

    return {
      scorecards,
      summary: stats,
      metadata: {
        totalFound: scorecards.length,
        periodDays: days,
        includeCoaching,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('[SCORECARDS] Error fetching scorecards:', error);
    throw error;
  }
}

function calculateSummaryStats(scorecards: any[]) {
  if (scorecards.length === 0) {
    return {
      totalSessions: 0,
      avgCollaborationScore: 0,
      avgTaskCompletion: 0,
      avgHandoffQuality: 0,
      totalSessionTime: 0,
      trend: 'no-data'
    };
  }

  const validScores = scorecards.filter(s => s.scores);
  const totalSessions = scorecards.length;
  const totalSessionTime = scorecards.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const avgCollaborationScore = validScores.length > 0 
    ? Math.round(validScores.reduce((sum, s) => sum + (s.scores.overallCollaboration || 0), 0) / validScores.length)
    : 0;

  const avgTaskCompletion = validScores.length > 0
    ? Math.round(validScores.reduce((sum, s) => sum + (s.scores.taskCompletion || 0), 0) / validScores.length)
    : 0;

  const avgHandoffQuality = validScores.length > 0
    ? Math.round(validScores.reduce((sum, s) => sum + (s.scores.handoffQuality || 0), 0) / validScores.length)
    : 0;

  // Calculate trend (simple: last 3 vs previous 3)
  let trend = 'stable';
  if (validScores.length >= 6) {
    const recent = validScores.slice(0, 3).reduce((sum, s) => sum + (s.scores.overallCollaboration || 0), 0) / 3;
    const previous = validScores.slice(3, 6).reduce((sum, s) => sum + (s.scores.overallCollaboration || 0), 0) / 3;
    
    if (recent > previous + 5) trend = 'improving';
    else if (recent < previous - 5) trend = 'declining';
  }

  return {
    totalSessions,
    avgCollaborationScore,
    avgTaskCompletion,
    avgHandoffQuality,
    totalSessionTime,
    trend
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight requests
  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }

  const timestamp = new Date().toISOString();

  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    
    // Extract query parameters
    const limit = parseInt(req.query.limit as string) || 20;
    const days = parseInt(req.query.days as string) || 30;
    const includeCoaching = req.query.includeCoaching === 'true';
    const userId = (req.query.userId as string) || user.id;
    
    // Extract team and project IDs
    const { teamId } = extractTeamAndProject({ teamId: req.query.teamId as string }, user);

    // Log the request
    console.log(`[${timestamp}] 📊 Getting scorecards for team: ${teamId}, user: ${userId}, days: ${days}, limit: ${limit}`);

    // Check access
    await checkToolAccess(user, 'get_dashboard_metrics');

    // Track usage
    await trackUsage(user, 'get_scorecards', { teamId, userId, days, limit, includeCoaching });

    // Initialize database adapter
    const adapter = await initializeDatabase();

    // Get scorecards
    const result = await getScorecards(adapter, teamId, userId, { limit, days, includeCoaching });

    console.log(`[${timestamp}] ✅ Scorecards fetched successfully: ${result.scorecards.length} sessions`);
    sendSuccess(res, result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[${timestamp}] ❌ Scorecards fetch failed: ${errorMessage}`);
    
    sendError(res, errorMessage);
  }
}

// Vercel configuration for this serverless function
export const config = {
  maxDuration: 30
};