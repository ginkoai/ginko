/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-08-14
 * @tags: [api, sessions, scorecards, analytics, mcp-proxy]
 * @related: [dashboard/page.tsx, api.ts, remote-server.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [next/server, supabase]
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[SCORECARDS] Request received')
    console.log('[SCORECARDS] Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)
    })

    // Get authenticated user from Supabase
    let supabase
    try {
      supabase = await createServerClient()
      console.log('[SCORECARDS] Supabase client created')
    } catch (error) {
      console.error('[SCORECARDS] Failed to create Supabase client:', error)
      console.error('[SCORECARDS] Error details:', error instanceof Error ? error.message : String(error))
      throw error
    }

    let user
    try {
      const result = await supabase.auth.getUser()
      user = result.data?.user
      console.log('[SCORECARDS] User retrieved:', user ? user.id : 'none')
    } catch (error) {
      console.error('[SCORECARDS] Failed to get user:', error)
      throw error
    }

    if (!user) {
      console.log('[SCORECARDS] No user - returning 401')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || user.id
    const limit = parseInt(searchParams.get('limit') || '20')
    const days = parseInt(searchParams.get('days') || '30')
    const includeCoaching = searchParams.get('includeCoaching') === 'true'
    // Normalize team_id to match MCP server UUID format
    const rawTeamId = user.user_metadata?.team_id || 'default'
    const teamId = rawTeamId === 'default' ? '00000000-0000-0000-0000-000000000001' : rawTeamId

    // Query scorecards directly from Supabase
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - days)

    console.log('[SCORECARDS] Querying with params:', { userId, teamId, dateLimit: dateLimit.toISOString(), limit })

    // Query scorecards with proper filters
    let query = supabase
      .from('session_scorecards')
      .select(includeCoaching ? '*' : 'session_id, session_start, session_end, duration_minutes, scores, work_metrics, context_usage, mood, handoff_assessment, patterns, created_at, updated_at')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .gte('session_start', dateLimit.toISOString())
      .order('session_start', { ascending: false })
      .limit(limit)

    const { data: scorecards, error } = await query
    console.log('[SCORECARDS] Query result:', { recordCount: scorecards?.length, error: error?.message })

    if (error) {
      console.error('Failed to fetch scorecards from Supabase:', error)
      console.error('Query details:', { teamId, dateLimit: dateLimit.toISOString(), limit })

      // If table doesn't exist, return empty data with 200 status (this is expected for new users)
      const tableNotFoundMessages = [
        'relation',
        'does not exist',
        'Could not find the table',
        'schema cache'
      ]
      const isTableNotFound = tableNotFoundMessages.some(msg => error.message?.includes(msg))

      if (isTableNotFound) {
        console.log('[SCORECARDS] Table does not exist yet - returning empty data')
        return NextResponse.json({
          scorecards: [],
          summary: {
            totalSessions: 0,
            avgCollaborationScore: 0,
            avgTaskCompletion: 0,
            avgHandoffQuality: 0,
            totalSessionTime: 0,
            periodDays: days
          },
          message: 'No sessions recorded yet'
        })
      }

      // Return error with more detail for other errors
      return NextResponse.json({
        error: 'Database query failed',
        details: error.message,
        queryParams: { teamId, dateLimit: dateLimit.toISOString(), limit },
        scorecards: [],
        summary: {
          totalSessions: 0,
          avgCollaborationScore: 0,
          avgTaskCompletion: 0,
          avgHandoffQuality: 0,
          totalSessionTime: 0,
          periodDays: days
        },
        message: 'Database error - check logs'
      }, { status: 500 })
    }


    // Transform and calculate summary statistics
    const transformedScorecards = (scorecards || []).map((row: any) => {
      // Safely parse JSON fields
      const parseJsonField = (field: any, fallback = {}) => {
        try {
          return typeof field === 'string' ? JSON.parse(field) : (field || fallback);
        } catch (e) {
          console.warn('Failed to parse JSON field:', e);
          return fallback;
        }
      };

      const scores = parseJsonField(row.scores, {});
      
      return {
        sessionId: row.session_id,
        sessionStart: row.session_start,
        sessionEnd: row.session_end,
        durationMinutes: row.duration_minutes,
        scores,
        workMetrics: parseJsonField(row.work_metrics, {}),
        contextUsage: parseJsonField(row.context_usage, {}),
        mood: parseJsonField(row.mood, {}),
        handoffAssessment: parseJsonField(row.handoff_assessment, {}),
        ...(includeCoaching && row.coaching ? {
          coaching: parseJsonField(row.coaching, {})
        } : {}),
        patterns: parseJsonField(row.patterns, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    })

    // Calculate summary stats
    const validScores = transformedScorecards.filter(s => s.scores)
    const totalSessions = transformedScorecards.length
    const totalSessionTime = transformedScorecards.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

    // Use the actual field names from the database
    const avgCollaborationScore = validScores.length > 0 
      ? Math.round(validScores.reduce((sum, s) => sum + (s.scores?.overallCollaboration || 0), 0) / validScores.length)
      : 0

    const avgTaskCompletion = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + (s.scores?.taskCompletion || 0), 0) / validScores.length)
      : 0

    const avgHandoffQuality = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + (s.scores?.handoffQuality || 0), 0) / validScores.length)
      : 0


    // Calculate trend
    let trend = 'stable'
    if (validScores.length >= 6) {
      const recent = validScores.slice(0, 3).reduce((sum, s) => sum + (s.scores.overallCollaboration || 0), 0) / 3
      const previous = validScores.slice(3, 6).reduce((sum, s) => sum + (s.scores.overallCollaboration || 0), 0) / 3
      
      if (recent > previous + 5) trend = 'improving'
      else if (recent < previous - 5) trend = 'declining'
    }

    const summary = {
      totalSessions,
      avgCollaborationScore,
      avgTaskCompletion,
      avgHandoffQuality,
      totalSessionTime,
      trend,
      periodDays: days
    }


    // If we have real data, return it
    if (transformedScorecards.length > 0) {
      return NextResponse.json({
        scorecards: transformedScorecards,
        summary,
        metadata: {
          totalFound: transformedScorecards.length,
          periodDays: days,
          includeCoaching,
          generatedAt: new Date().toISOString()
        }
      })
    }

    // No data yet - return mock data for demonstration
    console.log(`No scorecards found in the last ${days} days - returning mock data`)
    
    const mockData = {
      scorecards: [
        {
          id: '1',
          session_id: 'session-1',
          user_id: userId,
          created_at: new Date().toISOString(),
          scores: {
            communication: 8.5,
            context_sharing: 7.8,
            problem_solving: 9.0,
            adaptability: 8.2,
            overall: 8.4
          },
          insights: [
            {
              type: 'strength',
              title: 'Excellent Problem Solving',
              description: 'Your approach to breaking down complex problems is highly effective.',
              actionable_tip: 'Consider documenting your problem-solving patterns for the team.',
              priority: 'low'
            },
            {
              type: 'improvement',
              title: 'Context Sharing Could Be Enhanced',
              description: 'Some handoffs lack critical context about decision rationale.',
              actionable_tip: 'Include a "Key Decisions" section in your handoffs explaining the "why" behind choices.',
              priority: 'high'
            }
          ],
          session_summary: 'Productive session with strong problem-solving demonstrated',
          handoff_quality: 8.0
        }
      ],
      trends: {
        scores: [
          { 
            date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            scores: { communication: 7.5, context_sharing: 7.0, problem_solving: 8.5, adaptability: 7.8, overall: 7.7 }
          },
          { 
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            scores: { communication: 7.8, context_sharing: 7.2, problem_solving: 8.7, adaptability: 8.0, overall: 7.9 }
          },
          { 
            date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            scores: { communication: 8.0, context_sharing: 7.5, problem_solving: 8.8, adaptability: 8.1, overall: 8.1 }
          },
          { 
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            scores: { communication: 8.2, context_sharing: 7.6, problem_solving: 8.9, adaptability: 8.2, overall: 8.2 }
          },
          { 
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            scores: { communication: 8.3, context_sharing: 7.7, problem_solving: 8.9, adaptability: 8.2, overall: 8.3 }
          },
          { 
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            scores: { communication: 8.5, context_sharing: 7.8, problem_solving: 9.0, adaptability: 8.2, overall: 8.4 }
          }
        ],
        handoff_quality: [
          { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), quality: 7.5 },
          { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), quality: 7.7 },
          { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), quality: 7.8 },
          { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), quality: 7.9 },
          { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), quality: 8.0 },
          { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), quality: 8.0 }
        ]
      },
      aggregated_insights: [
        {
          type: 'improvement',
          title: 'Context Sharing Could Be Enhanced',
          description: 'Some handoffs lack critical context about decision rationale.',
          actionable_tip: 'Include a "Key Decisions" section in your handoffs explaining the "why" behind choices.',
          priority: 'high'
        },
        {
          type: 'trend',
          title: 'Improving Communication Skills',
          description: 'Your communication scores have steadily increased over the past week.',
          actionable_tip: 'Keep using structured formats and clear language in your handoffs.',
          priority: 'medium'
        },
        {
          type: 'strength',
          title: 'Excellent Problem Solving',
          description: 'Your approach to breaking down complex problems is highly effective.',
          actionable_tip: 'Consider documenting your problem-solving patterns for the team.',
          priority: 'low'
        },
        {
          type: 'improvement',
          title: 'Include More Visual Context',
          description: 'Text-heavy handoffs can be harder to parse quickly.',
          actionable_tip: 'Add diagrams or screenshots when explaining complex architectures.',
          priority: 'medium'
        },
        {
          type: 'strength',
          title: 'Strong Adaptability',
          description: 'You handle changing requirements and pivots very well.',
          actionable_tip: 'Share your strategies for staying flexible with the team.',
          priority: 'low'
        }
      ]
    }
    
    return NextResponse.json(mockData)
    
  } catch (error) {
    console.error('Error fetching scorecards:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Failed to fetch collaboration data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}