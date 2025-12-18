/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, overview, dashboard, main]
 * @related: [InsightCard.tsx, InsightCategoryTabs.tsx, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, heroicons, clsx]
 */
'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { InsightCard } from './InsightCard'
import { InsightCategoryTabs, CategoryScoreCard } from './InsightCategoryTabs'
import {
  DashboardCoachingReport,
  InsightCategory,
  getScoreRating,
  getScoreBarColor,
  getTrendIcon,
  getTrendColor
} from '@/lib/insights/types'

interface InsightsOverviewProps {
  report: DashboardCoachingReport | null
  loading?: boolean
  error?: string | null
}

export function InsightsOverview({ report, loading, error }: InsightsOverviewProps) {
  const [activeCategory, setActiveCategory] = useState<InsightCategory | 'all'>('all')

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-red-400 font-mono">Error loading insights</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">○</div>
          <p className="text-muted-foreground font-mono">No insights available</p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Run <code className="bg-secondary px-1 py-0.5 rounded">ginko insights --json</code> to generate insights
          </p>
        </div>
      </Card>
    )
  }

  const rating = getScoreRating(report.overallScore)
  const barColor = getScoreBarColor(report.overallScore)
  const trendIcon = getTrendIcon(report.scoreTrend)
  const trendColor = getTrendColor(report.scoreTrend)

  // Filter insights by category
  const filteredInsights = activeCategory === 'all'
    ? report.insights
    : report.insights.filter(i => i.category === activeCategory)

  // Sort by severity (critical first)
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, suggestion: 2, info: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card withBrackets>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Coaching Insights</CardTitle>
              <CardDescription>
                Analysis period: {report.period.days} days ({new Date(report.period.start).toLocaleDateString()} - {new Date(report.period.end).toLocaleDateString()})
              </CardDescription>
            </div>
            <Badge className="bg-secondary text-muted-foreground">
              Last analyzed: {new Date(report.runAt).toLocaleString()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            {/* Score Circle */}
            <div className="text-center">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="absolute inset-0 w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-secondary"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${(report.overallScore / 100) * 251.2} 251.2`}
                    className={clsx(
                      report.overallScore >= 90 ? 'text-green-500' :
                      report.overallScore >= 75 ? 'text-cyan-500' :
                      report.overallScore >= 60 ? 'text-yellow-500' :
                      report.overallScore >= 40 ? 'text-orange-500' : 'text-red-500'
                    )}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="font-mono font-bold text-2xl relative z-10">{report.overallScore}</span>
              </div>
              <div className={clsx('font-mono font-medium mt-2', rating.color)}>
                {rating.label}
              </div>
              {report.scoreTrend && (
                <div className={clsx('text-sm', trendColor)}>
                  {trendIcon} {report.previousScore && `from ${report.previousScore}`}
                </div>
              )}
            </div>

            {/* Category Scores Grid */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {report.categoryScores.map((categoryScore) => (
                <CategoryScoreCard
                  key={categoryScore.category}
                  categoryScore={categoryScore}
                  onClick={() => setActiveCategory(categoryScore.category)}
                  isActive={activeCategory === categoryScore.category}
                />
              ))}
            </div>
          </div>

          {/* Summary */}
          {report.summary && (
            <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground">{report.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <InsightCategoryTabs
        categoryScores={report.categoryScores}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Insights List */}
      <div className="space-y-3">
        {sortedInsights.length === 0 ? (
          <Card className="p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground font-mono">No insights in this category</p>
            </div>
          </Card>
        ) : (
          sortedInsights.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} />
          ))
        )}
      </div>

      {/* Run Analysis Prompt */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm text-foreground">Need fresh insights?</p>
            <p className="text-xs text-muted-foreground">
              Run analysis from the CLI to update
            </p>
          </div>
          <code className="bg-secondary px-3 py-2 rounded font-mono text-sm text-primary">
            ginko insights --json
          </code>
        </div>
      </Card>
    </div>
  )
}
