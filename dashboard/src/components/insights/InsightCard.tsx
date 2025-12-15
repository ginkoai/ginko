/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, card, dashboard]
 * @related: [InsightsOverview.tsx, InsightCategoryTabs.tsx, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, heroicons, clsx]
 */
'use client'

import { clsx } from 'clsx'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  FolderIcon,
  LightBulbIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  RawInsight,
  InsightEvidence,
  SEVERITY_ICONS,
  SEVERITY_COLORS
} from '@/lib/insights/types'

interface InsightCardProps {
  insight: RawInsight
  expanded?: boolean
}

function EvidenceIcon({ type }: { type: InsightEvidence['type'] }) {
  const iconClass = 'h-4 w-4 text-muted-foreground'
  switch (type) {
    case 'event':
      return <ClockIcon className={iconClass} />
    case 'task':
      return <DocumentTextIcon className={iconClass} />
    case 'commit':
      return <CodeBracketIcon className={iconClass} />
    case 'session':
      return <FolderIcon className={iconClass} />
    case 'pattern':
      return <LightBulbIcon className={iconClass} />
    case 'gotcha':
      return <ExclamationTriangleIcon className={iconClass} />
    default:
      return <DocumentTextIcon className={iconClass} />
  }
}

export function InsightCard({ insight, expanded: initialExpanded = false }: InsightCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded)
  const severityColors = SEVERITY_COLORS[insight.severity]
  const severityIcon = SEVERITY_ICONS[insight.severity]

  const hasDetails = insight.evidence.length > 0 || insight.recommendations.length > 0 || insight.metricName

  return (
    <div
      className={clsx(
        'rounded-lg border transition-all',
        severityColors.border,
        severityColors.bg
      )}
    >
      {/* Header */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
        className={clsx(
          'w-full p-4 text-left flex items-start gap-3',
          hasDetails && 'cursor-pointer hover:bg-white/5'
        )}
      >
        {/* Expand/Collapse Icon */}
        {hasDetails && (
          <span className="mt-0.5 text-muted-foreground">
            {expanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </span>
        )}

        {/* Severity Icon */}
        <span className="text-lg mt-[-2px]">{severityIcon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-mono font-medium text-foreground truncate">
              {insight.title}
            </h4>
            {insight.scoreImpact !== 0 && (
              <Badge
                className={clsx(
                  'text-xs',
                  insight.scoreImpact > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                )}
              >
                {insight.scoreImpact > 0 ? '+' : ''}{insight.scoreImpact}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {insight.description}
          </p>

          {/* Metric Display (if present) */}
          {insight.metricName && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{insight.metricName}:</span>
              <span className={clsx('font-mono font-medium', severityColors.text)}>
                {insight.metricValue}{insight.metricUnit || ''}
              </span>
              {insight.metricTarget && (
                <span className="text-muted-foreground">
                  (target: {insight.metricTarget}{insight.metricUnit || ''})
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border/50 mt-0">
          {/* Evidence */}
          {insight.evidence.length > 0 && (
            <div className="pt-4">
              <h5 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Evidence
              </h5>
              <div className="space-y-2">
                {insight.evidence.map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <EvidenceIcon type={ev.type} />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground">{ev.description}</span>
                      {ev.timestamp && (
                        <span className="text-muted-foreground text-xs ml-2">
                          {new Date(ev.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insight.recommendations.length > 0 && (
            <div>
              <h5 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Recommendations
              </h5>
              <ul className="space-y-1">
                {insight.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">-</span>
                    <span className="text-muted-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
