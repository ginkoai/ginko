/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-16
 * @tags: [insights, sidebar, navigation, collapsible]
 * @related: [InsightsOverview.tsx, InsightCategoryTabs.tsx, tree-explorer.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, heroicons, clsx, framer-motion]
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FunnelIcon,
  BoltIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import type { InsightCategory, InsightSeverity, RawInsight } from '@/lib/insights/types'
import { CATEGORY_DISPLAY_NAMES, CATEGORY_COLORS, SEVERITY_ICONS } from '@/lib/insights/types'

// =============================================================================
// Types
// =============================================================================

export interface InsightsSidebarProps {
  insights: RawInsight[]
  selectedCategory: InsightCategory | null
  selectedSeverity: InsightSeverity | null
  onSelectCategory: (category: InsightCategory | null) => void
  onSelectSeverity: (severity: InsightSeverity | null) => void
  className?: string
}

interface CategoryCount {
  category: InsightCategory
  count: number
  criticalCount: number
  warningCount: number
}

interface SeverityCount {
  severity: InsightSeverity
  count: number
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_ICONS: Record<InsightCategory, typeof BoltIcon> = {
  'efficiency': BoltIcon,
  'patterns': SparklesIcon,
  'quality': ShieldCheckIcon,
  'anti-patterns': ExclamationTriangleIcon
}

const STORAGE_KEY = 'insights-sidebar-collapsed'

// =============================================================================
// Component
// =============================================================================

export function InsightsSidebar({
  insights,
  selectedCategory,
  selectedSeverity,
  onSelectCategory,
  onSelectSeverity,
  className
}: InsightsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['categories', 'severity'])
  )

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(stored === 'true')
    }
  }, [])

  // Save collapsed state
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  // Calculate counts
  const categoryCounts: CategoryCount[] = (['efficiency', 'patterns', 'quality', 'anti-patterns'] as InsightCategory[]).map(category => {
    const categoryInsights = insights.filter(i => i.category === category)
    return {
      category,
      count: categoryInsights.length,
      criticalCount: categoryInsights.filter(i => i.severity === 'critical').length,
      warningCount: categoryInsights.filter(i => i.severity === 'warning').length
    }
  })

  const severityCounts: SeverityCount[] = (['critical', 'warning', 'suggestion', 'info'] as InsightSeverity[]).map(severity => ({
    severity,
    count: insights.filter(i => i.severity === severity).length
  }))

  // Collapsed state - show icons only
  if (isCollapsed) {
    return (
      <div className={clsx(
        'w-12 border-r border-border bg-card flex flex-col',
        className
      )}>
        {/* Expand Button */}
        <div className="p-2 border-b border-border">
          <button
            onClick={handleToggleCollapse}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
            title="Expand sidebar"
          >
            <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Category Icons */}
        <div className="flex-1 py-2 space-y-1">
          {categoryCounts.map(({ category, count, criticalCount }) => {
            const Icon = CATEGORY_ICONS[category]
            const colors = CATEGORY_COLORS[category]
            const isSelected = selectedCategory === category
            const hasCritical = criticalCount > 0

            return (
              <button
                key={category}
                onClick={() => onSelectCategory(isSelected ? null : category)}
                className={clsx(
                  'w-full p-2 flex justify-center rounded-md transition-colors relative',
                  isSelected
                    ? `${colors.bg} ${colors.text}`
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title={`${CATEGORY_DISPLAY_NAMES[category]} (${count})`}
              >
                <Icon className="h-5 w-5" />
                {hasCritical && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Filter Icon */}
        <div className="p-2 border-t border-border">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground"
            title="Filters"
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  // Expanded state
  return (
    <motion.div
      initial={{ width: 48 }}
      animate={{ width: 256 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'w-64 border-r border-border bg-card flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-mono font-semibold text-sm text-foreground flex items-center gap-2">
          <FunnelIcon className="h-4 w-4" />
          Filters
        </h3>
        <button
          onClick={handleToggleCollapse}
          className="p-1 rounded-md hover:bg-secondary transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeftIcon className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Categories Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('categories')}
            className="w-full p-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Categories
            </span>
            <ChevronDownIcon
              className={clsx(
                'h-4 w-4 text-muted-foreground transition-transform',
                !expandedSections.has('categories') && '-rotate-90'
              )}
            />
          </button>

          <AnimatePresence>
            {expandedSections.has('categories') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-3 space-y-1">
                  {categoryCounts.map(({ category, count, criticalCount, warningCount }) => {
                    const Icon = CATEGORY_ICONS[category]
                    const colors = CATEGORY_COLORS[category]
                    const isSelected = selectedCategory === category

                    return (
                      <button
                        key={category}
                        onClick={() => onSelectCategory(isSelected ? null : category)}
                        className={clsx(
                          'w-full p-2 flex items-center gap-2 rounded-md transition-colors text-sm',
                          isSelected
                            ? `${colors.bg} ${colors.text}`
                            : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left truncate">
                          {CATEGORY_DISPLAY_NAMES[category]}
                        </span>
                        <span className={clsx(
                          'text-xs font-mono px-1.5 py-0.5 rounded',
                          isSelected ? 'bg-white/10' : 'bg-secondary'
                        )}>
                          {count}
                        </span>
                        {criticalCount > 0 && (
                          <span className="text-xs text-red-400">🚨</span>
                        )}
                        {warningCount > 0 && !criticalCount && (
                          <span className="text-xs text-yellow-400">⚠️</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Severity Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('severity')}
            className="w-full p-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
          >
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Severity
            </span>
            <ChevronDownIcon
              className={clsx(
                'h-4 w-4 text-muted-foreground transition-transform',
                !expandedSections.has('severity') && '-rotate-90'
              )}
            />
          </button>

          <AnimatePresence>
            {expandedSections.has('severity') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-3 space-y-1">
                  {severityCounts.map(({ severity, count }) => {
                    const isSelected = selectedSeverity === severity
                    const icon = SEVERITY_ICONS[severity]

                    return (
                      <button
                        key={severity}
                        onClick={() => onSelectSeverity(isSelected ? null : severity)}
                        className={clsx(
                          'w-full p-2 flex items-center gap-2 rounded-md transition-colors text-sm',
                          isSelected
                            ? 'bg-secondary text-foreground'
                            : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span className="text-base">{icon}</span>
                        <span className="flex-1 text-left capitalize">
                          {severity}
                        </span>
                        <span className={clsx(
                          'text-xs font-mono px-1.5 py-0.5 rounded',
                          isSelected ? 'bg-white/10' : 'bg-secondary'
                        )}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Clear Filters */}
      {(selectedCategory || selectedSeverity) && (
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              onSelectCategory(null)
              onSelectSeverity(null)
            }}
            className="w-full p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </motion.div>
  )
}
