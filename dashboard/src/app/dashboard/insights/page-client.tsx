/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, dashboard, client]
 * @related: [page.tsx, InsightsOverview.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, heroicons]
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { InsightsOverview } from '@/components/insights/InsightsOverview'
import { DashboardCoachingReport } from '@/lib/insights/types'
import {
  ArrowPathIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'

interface InsightsPageClientProps {
  userId: string
  userEmail: string
}

// Sample data for demonstration - in production this would come from Supabase
const SAMPLE_REPORT: DashboardCoachingReport = {
  userId: 'demo-user',
  projectId: 'ginko',
  runAt: new Date().toISOString(),
  period: {
    start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    days: 14
  },
  overallScore: 78,
  previousScore: 72,
  scoreTrend: 'up',
  categoryScores: [
    {
      category: 'efficiency',
      score: 85,
      baseScore: 75,
      adjustments: 10,
      insightCount: 3,
      criticalCount: 0,
      warningCount: 1
    },
    {
      category: 'patterns',
      score: 72,
      baseScore: 75,
      adjustments: -3,
      insightCount: 4,
      criticalCount: 0,
      warningCount: 2
    },
    {
      category: 'quality',
      score: 82,
      baseScore: 75,
      adjustments: 7,
      insightCount: 3,
      criticalCount: 0,
      warningCount: 0
    },
    {
      category: 'anti-patterns',
      score: 73,
      baseScore: 75,
      adjustments: -2,
      insightCount: 2,
      criticalCount: 1,
      warningCount: 1
    }
  ],
  insights: [
    {
      category: 'efficiency',
      severity: 'info',
      title: 'Excellent Time-to-Flow',
      description: 'Your average time-to-flow is 32 seconds, which is in the excellent range. Session starts are quick and efficient.',
      metricName: 'Time-to-flow',
      metricValue: 32,
      metricTarget: 60,
      metricUnit: 's',
      scoreImpact: 5,
      evidence: [
        { type: 'session', id: 'sess-1', description: 'Session started in 28s on Dec 14' },
        { type: 'session', id: 'sess-2', description: 'Session started in 35s on Dec 13' }
      ],
      recommendations: [
        'Continue using event-based context loading',
        'Keep session archives organized for fast retrieval'
      ]
    },
    {
      category: 'efficiency',
      severity: 'suggestion',
      title: 'Context Load Optimization',
      description: 'Context loads have increased 15% this week. Consider archiving older events to maintain performance.',
      metricName: 'Context load time',
      metricValue: 1.2,
      metricTarget: 1.0,
      metricUnit: 's',
      scoreImpact: -2,
      evidence: [
        { type: 'event', id: 'evt-1', description: '450 events in current stream' }
      ],
      recommendations: [
        'Archive events older than 7 days',
        'Use ginko handoff at end of sessions'
      ]
    },
    {
      category: 'patterns',
      severity: 'info',
      title: 'Strong ADR Adoption',
      description: 'ADR-002 and ADR-043 were referenced 15 times across commits and events. Great pattern adherence.',
      scoreImpact: 5,
      evidence: [
        { type: 'commit', id: 'abc123', description: '8 commits referenced ADR-002' },
        { type: 'event', id: 'evt-2', description: '7 events mentioned ADR-043' }
      ],
      recommendations: []
    },
    {
      category: 'patterns',
      severity: 'warning',
      title: 'Undocumented Patterns Detected',
      description: '2 new patterns were discovered but not yet documented. Consider adding them to the pattern library.',
      scoreImpact: -3,
      evidence: [
        { type: 'pattern', id: 'pat-1', description: 'retry-with-backoff pattern used 5 times' },
        { type: 'pattern', id: 'pat-2', description: 'defensive-logging pattern used 3 times' }
      ],
      recommendations: [
        'Document retry-with-backoff pattern in docs/patterns/',
        'Add defensive-logging to pattern library'
      ]
    },
    {
      category: 'quality',
      severity: 'info',
      title: 'High Task Completion Rate',
      description: 'Task completion rate is 85%, up from 75% last period. Excellent progress on sprint tasks.',
      metricName: 'Task completion',
      metricValue: 85,
      metricTarget: 80,
      metricUnit: '%',
      scoreImpact: 5,
      evidence: [
        { type: 'task', id: 'e005_s03_t08', description: 'TASK-8 completed on time' },
        { type: 'task', id: 'e005_s03_t10', description: 'TASK-10 completed ahead of schedule' }
      ],
      recommendations: []
    },
    {
      category: 'quality',
      severity: 'info',
      title: 'Healthy Commit Frequency',
      description: 'Average of 4.2 commits per session. Commits are well-sized with meaningful messages.',
      metricName: 'Commits/session',
      metricValue: 4.2,
      scoreImpact: 2,
      evidence: [],
      recommendations: []
    },
    {
      category: 'anti-patterns',
      severity: 'critical',
      title: 'Stuck Task Detected',
      description: 'TASK-9 has been in progress for 5+ days without completion. This may indicate scope creep or blockers.',
      scoreImpact: -10,
      evidence: [
        { type: 'task', id: 'e005_s03_t09', description: 'Dashboard Insights Display - started Dec 10' }
      ],
      recommendations: [
        'Review task scope and break into smaller subtasks',
        'Identify and document any blockers',
        'Consider pausing with [Z] status if blocked'
      ]
    },
    {
      category: 'anti-patterns',
      severity: 'warning',
      title: 'Sessions Without Archive',
      description: '2 sessions ended without archiving. This may cause context loss for future sessions.',
      metricName: 'Archive rate',
      metricValue: 70,
      metricTarget: 90,
      metricUnit: '%',
      scoreImpact: -3,
      evidence: [
        { type: 'session', id: 'sess-3', description: 'Session on Dec 12 not archived' }
      ],
      recommendations: [
        'Run ginko handoff at session end',
        'Enable auto-archive in settings'
      ]
    }
  ],
  summary: 'Overall good collaboration patterns with strong ADR adoption and task completion. Focus areas: document emerging patterns and ensure session archiving for context continuity.'
}

export function InsightsPageClient({ userId, userEmail }: InsightsPageClientProps) {
  const [report, setReport] = useState<DashboardCoachingReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useDemo, setUseDemo] = useState(false)

  const loadInsights = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch from Supabase via API
      const response = await fetch('/api/v1/insights/sync?limit=1')

      if (response.ok) {
        const data = await response.json()
        if (data.runs && data.runs.length > 0) {
          const run = data.runs[0]
          // Transform from DB format to DashboardCoachingReport format
          const report: DashboardCoachingReport = {
            userId: run.user_id,
            projectId: run.project_id,
            runAt: run.run_at,
            period: {
              start: run.data_window_start,
              end: run.data_window_end,
              days: run.metadata?.periodDays || 30
            },
            overallScore: run.overall_score,
            categoryScores: run.metadata?.categoryScores || [],
            insights: run.insights?.map((i: any) => ({
              category: i.category,
              severity: i.severity,
              title: i.title,
              description: i.description,
              metricName: i.metric_name,
              metricValue: i.metric_value,
              metricTarget: i.metric_target,
              metricUnit: i.metric_unit,
              scoreImpact: i.score_impact,
              evidence: i.evidence || [],
              recommendations: i.recommendations || []
            })) || [],
            summary: run.summary
          }
          setReport(report)
          setLoading(false)
          return
        }
      }

      // No data from API, show empty state or demo
      if (useDemo) {
        setReport({ ...SAMPLE_REPORT, userId, projectId: 'ginko' })
      } else {
        setReport(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [userId, useDemo])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-foreground">Coaching Insights</h1>
          <p className="text-muted-foreground mt-1">
            AI-driven analysis of your collaboration patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUseDemo(!useDemo)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors font-mono text-sm"
          >
            <DocumentArrowUpIcon className="h-4 w-4" />
            {useDemo ? 'Hide Demo' : 'Show Demo'}
          </button>
          <button
            onClick={loadInsights}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono text-sm"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      <InsightsOverview report={report} loading={loading} error={error} />
    </div>
  )
}
