/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, tabs, navigation, dashboard]
 * @related: [InsightsOverview.tsx, InsightCard.tsx, types.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, clsx]
 */
'use client'

import { clsx } from 'clsx'
import {
  InsightCategory,
  CategoryScore,
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_COLORS
} from '@/lib/insights/types'

interface InsightCategoryTabsProps {
  categoryScores: CategoryScore[]
  activeCategory: InsightCategory | 'all'
  onCategoryChange: (category: InsightCategory | 'all') => void
}

export function InsightCategoryTabs({
  categoryScores,
  activeCategory,
  onCategoryChange
}: InsightCategoryTabsProps) {
  const totalInsights = categoryScores.reduce((sum, c) => sum + c.insightCount, 0)
  const totalCritical = categoryScores.reduce((sum, c) => sum + c.criticalCount, 0)
  const totalWarning = categoryScores.reduce((sum, c) => sum + c.warningCount, 0)

  return (
    <div className="flex flex-wrap gap-2">
      {/* All Tab */}
      <button
        onClick={() => onCategoryChange('all')}
        className={clsx(
          'px-4 py-2 rounded-lg font-mono text-sm transition-all',
          activeCategory === 'all'
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-transparent'
        )}
      >
        <span className="flex items-center gap-2">
          <span>All</span>
          <span className="text-xs opacity-70">({totalInsights})</span>
          {totalCritical > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
              {totalCritical}
            </span>
          )}
        </span>
      </button>

      {/* Category Tabs */}
      {categoryScores.map((categoryScore) => {
        const colors = CATEGORY_COLORS[categoryScore.category]
        const isActive = activeCategory === categoryScore.category

        return (
          <button
            key={categoryScore.category}
            onClick={() => onCategoryChange(categoryScore.category)}
            className={clsx(
              'px-4 py-2 rounded-lg font-mono text-sm transition-all border',
              isActive
                ? `${colors.bg} ${colors.text} ${colors.border}`
                : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border-transparent'
            )}
          >
            <span className="flex items-center gap-2">
              <span>{CATEGORY_DISPLAY_NAMES[categoryScore.category]}</span>
              <span className="text-xs opacity-70">({categoryScore.insightCount})</span>
              {categoryScore.criticalCount > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                  {categoryScore.criticalCount}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface CategoryScoreCardProps {
  categoryScore: CategoryScore
  onClick?: () => void
  isActive?: boolean
}

// Category-specific bar colors for consistent branding
const CATEGORY_BAR_COLORS: Record<InsightCategory, string> = {
  'efficiency': 'bg-cyan-500',
  'patterns': 'bg-green-500',  // Use green for high-scoring patterns
  'quality': 'bg-slate-400',   // Neutral gray for quality (will be replaced based on score)
  'anti-patterns': 'bg-yellow-500'
}

// Get bar color based on score AND category
function getCategoryBarColor(category: InsightCategory, score: number): string {
  // For quality and efficiency, use score-based coloring
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-emerald-500'; // More visible than cyan
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function CategoryScoreCard({ categoryScore, onClick, isActive }: CategoryScoreCardProps) {
  const colors = CATEGORY_COLORS[categoryScore.category]
  const barColor = getCategoryBarColor(categoryScore.category, categoryScore.score)

  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-4 rounded-lg border transition-all text-left w-full',
        isActive
          ? `${colors.bg} ${colors.border}`
          : 'bg-card border-border hover:border-border/80 hover:bg-secondary/50'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={clsx('font-mono font-medium text-sm', isActive ? colors.text : 'text-foreground')}>
          {CATEGORY_DISPLAY_NAMES[categoryScore.category]}
        </h4>
        <span className={clsx('font-mono font-bold', isActive ? colors.text : 'text-foreground')}>
          {categoryScore.score}
        </span>
      </div>

      {/* Score Bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
        <div
          className={clsx('h-full rounded-full transition-all', barColor)}
          style={{ width: `${categoryScore.score}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{categoryScore.insightCount} insights</span>
        {categoryScore.criticalCount > 0 && (
          <span className="text-red-400">{categoryScore.criticalCount} critical</span>
        )}
        {categoryScore.warningCount > 0 && (
          <span className="text-yellow-400">{categoryScore.warningCount} warnings</span>
        )}
      </div>
    </button>
  )
}
