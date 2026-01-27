/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-05
 * @tags: [insights, coaching, dashboard, client, member-filter, epic-008]
 * @related: [page.tsx, InsightsOverview.tsx, MemberFilter.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, heroicons, next/navigation]
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { InsightsOverview, TimescalePeriod } from '@/components/insights/InsightsOverview'
import { MemberFilter } from '@/components/insights/MemberFilter'
import CoachingSettings from '@/components/insights/CoachingSettings'
import { DashboardCoachingReport } from '@/lib/insights/types'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface InsightsPageClientProps {
  userId: string
  userEmail: string
}

export function InsightsPageClient({ userId, userEmail }: InsightsPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [report, setReport] = useState<DashboardCoachingReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<TimescalePeriod>(30)

  // Member filter state - null means current user
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    searchParams.get('memberId')
  )
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string | null>(
    searchParams.get('memberEmail')
  )

  // Update URL when member selection changes
  const handleMemberChange = useCallback((memberId: string | null, memberEmail: string | null) => {
    setSelectedMemberId(memberId)
    setSelectedMemberEmail(memberEmail)

    // Update URL for sharing
    const params = new URLSearchParams(searchParams.toString())
    if (memberId && memberId !== userId) {
      params.set('memberId', memberId)
      if (memberEmail) {
        params.set('memberEmail', memberEmail)
      }
    } else {
      params.delete('memberId')
      params.delete('memberEmail')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router, userId])

  const loadInsights = useCallback(async (period: TimescalePeriod = selectedPeriod, memberEmail?: string | null) => {
    setLoading(true)
    setError(null)

    try {
      // Fetch from Supabase via API with period filter
      // Use provided memberEmail or fall back to state/current user
      const targetEmail = memberEmail !== undefined ? memberEmail : selectedMemberEmail
      const queryParams = new URLSearchParams({
        limit: '10',
        days: String(period)
      })
      if (targetEmail && targetEmail !== userEmail) {
        queryParams.set('memberEmail', targetEmail)
      }
      const response = await fetch(`/api/v1/insights/sync?${queryParams.toString()}`)

      if (response.ok) {
        const data = await response.json()
        if (data.runs && data.runs.length > 0) {
          // Find run matching the requested period, or use the closest one
          const matchingRun = data.runs.find((r: any) => r.metadata?.periodDays === period) || data.runs[0]
          const run = matchingRun

          // Check if we have trend scores for the selected period
          const trendScores = run.metadata?.trendScores
          const runPeriodDays = run.metadata?.periodDays || 30
          const periodMismatch = runPeriodDays !== period

          // Use trend score if available and period doesn't match run's period
          let overallScore = run.overall_score
          let previousScore: number | undefined
          let scoreTrend: 'up' | 'down' | 'stable' | undefined

          if (periodMismatch && trendScores) {
            const trendKey = period === 1 ? 'day1' : period === 7 ? 'day7' : 'day30'
            const trendData = trendScores[trendKey]
            if (trendData?.score !== undefined) {
              overallScore = trendData.score
              previousScore = trendData.previousScore
              scoreTrend = trendData.trend
            }
          }

          // Transform from DB format to DashboardCoachingReport format
          const report: DashboardCoachingReport = {
            userId: run.user_id,
            projectId: run.project_id,
            runAt: run.run_at,
            period: {
              start: run.data_window_start,
              end: run.data_window_end,
              days: period  // Use selected period, not run's period
            },
            overallScore,
            previousScore,
            scoreTrend,
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
            summary: run.summary,
            // Track when insights are from a different period than selected
            insightsPeriodDays: periodMismatch ? runPeriodDays : undefined
          }
          setReport(report)
          setLoading(false)
          return
        }
      }

      // No data from API, show empty state
      setReport(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [userId, userEmail, selectedPeriod, selectedMemberEmail])

  // Handle period change
  const handlePeriodChange = useCallback((period: TimescalePeriod) => {
    setSelectedPeriod(period)
    loadInsights(period, selectedMemberEmail)
  }, [loadInsights, selectedMemberEmail])

  // Reload when member changes
  useEffect(() => {
    loadInsights(selectedPeriod, selectedMemberEmail)
  }, [selectedMemberEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadInsights()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          {/* Member Filter - only visible to team owners */}
          <MemberFilter
            currentUserId={userId}
            currentUserEmail={userEmail}
            selectedMemberId={selectedMemberId}
            onMemberChange={handleMemberChange}
          />
          <button
            onClick={() => loadInsights()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono text-sm"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content - Grid layout with Insights and Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Insights (3/4 width on large screens) */}
        <div className="lg:col-span-3">
          <InsightsOverview
            report={report}
            loading={loading}
            error={error}
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </div>

        {/* Coaching Settings Sidebar (1/4 width on large screens) */}
        <div className="lg:col-span-1">
          <CoachingSettings report={report} loading={loading} />
        </div>
      </div>
    </div>
  )
}
