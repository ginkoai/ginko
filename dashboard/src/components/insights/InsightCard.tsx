/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-16
 * @tags: [insights, coaching, card, dashboard, interactive]
 * @related: [InsightsOverview.tsx, InsightCategoryTabs.tsx, types.ts, PrinciplePreviewModal.tsx]
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
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  RawInsight,
  InsightEvidence,
  SEVERITY_ICONS,
  SEVERITY_COLORS
} from '@/lib/insights/types'
import {
  PrinciplePreviewModal,
  mapRecommendationToPrinciple,
  type Principle
} from './PrinciplePreviewModal'

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

/**
 * Format timestamp for display with relative time.
 */
function formatTimestamp(timestamp: string): { relative: string; absolute: string } {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  let relative: string
  if (diffMinutes < 60) {
    relative = diffMinutes <= 1 ? 'just now' : `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    relative = diffHours === 1 ? '1h ago' : `${diffHours}h ago`
  } else if (diffDays < 7) {
    relative = diffDays === 1 ? 'yesterday' : `${diffDays}d ago`
  } else {
    relative = date.toLocaleDateString()
  }

  const absolute = date.toLocaleString()
  return { relative, absolute }
}

export function InsightCard({ insight, expanded: initialExpanded = false }: InsightCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded)
  const [principleModalOpen, setPrincipleModalOpen] = useState(false)
  const [selectedPrinciple, setSelectedPrinciple] = useState<Principle | null>(null)

  const severityColors = SEVERITY_COLORS[insight.severity]
  const severityIcon = SEVERITY_ICONS[insight.severity]

  const hasDetails = insight.evidence.length > 0 || insight.recommendations.length > 0 || insight.metricName

  // Handle recommendation click - check if it maps to a principle
  const handleRecommendationClick = (recommendation: string) => {
    const principle = mapRecommendationToPrinciple(recommendation)
    if (principle) {
      setSelectedPrinciple(principle)
      setPrincipleModalOpen(true)
    }
  }

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
          'w-full p-4 text-left',
          hasDetails && 'cursor-pointer hover:bg-white/5'
        )}
      >
        {/* Mobile: Controls row at top */}
        <div className="flex items-center gap-2 mb-2 md:hidden">
          {hasDetails && (
            <span className="text-muted-foreground">
              {expanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </span>
          )}
          <span className="text-lg">{severityIcon}</span>
          {insight.scoreImpact !== 0 && (
            <Badge
              className={clsx(
                'text-xs ml-auto',
                insight.scoreImpact > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              )}
            >
              {insight.scoreImpact > 0 ? '+' : ''}{insight.scoreImpact}
            </Badge>
          )}
        </div>

        {/* Desktop: Original horizontal layout */}
        <div className="hidden md:flex items-start gap-3">
          {hasDetails && (
            <span className="mt-0.5 text-muted-foreground">
              {expanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </span>
          )}
          <span className="text-lg mt-[-2px]">{severityIcon}</span>
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
        </div>

        {/* Mobile: Title and description full width below controls */}
        <div className="md:hidden">
          <h4 className="font-mono font-medium text-foreground mb-1">
            {insight.title}
          </h4>
          <p className="text-sm text-muted-foreground">
            {insight.description}
          </p>
          {insight.metricName && (
            <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
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
                {insight.evidence.map((ev, idx) => {
                  const time = ev.timestamp ? formatTimestamp(ev.timestamp) : null
                  const isClickable = Boolean(ev.url)

                  return (
                    <div
                      key={idx}
                      className={clsx(
                        'flex items-start gap-2 text-sm p-2 rounded-md -mx-2',
                        isClickable && 'hover:bg-white/5 cursor-pointer group transition-colors'
                      )}
                      onClick={() => ev.url && window.open(ev.url, '_blank')}
                    >
                      <EvidenceIcon type={ev.type} />
                      <div className="flex-1 min-w-0">
                        <span className={clsx(
                          'text-foreground',
                          isClickable && 'group-hover:text-primary'
                        )}>
                          {ev.description}
                        </span>
                        {isClickable && (
                          <ArrowTopRightOnSquareIcon className="inline h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      {time && (
                        <span
                          className="text-muted-foreground text-xs whitespace-nowrap"
                          title={time.absolute}
                        >
                          {time.relative}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insight.recommendations.length > 0 && (
            <div>
              <h5 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Recommendations
              </h5>
              <ul className="space-y-2">
                {insight.recommendations.map((rec, idx) => {
                  const principle = mapRecommendationToPrinciple(rec)
                  const hasPrinciple = Boolean(principle)
                  return (
                    <li
                      key={idx}
                      className={clsx(
                        'rounded-md -mx-2',
                        hasPrinciple && 'bg-primary/5 border border-primary/20'
                      )}
                    >
                      {/* Recommendation text */}
                      <div
                        className={clsx(
                          'flex items-start gap-2 text-sm p-2',
                          hasPrinciple && 'cursor-pointer group hover:bg-primary/10 transition-colors'
                        )}
                        onClick={() => hasPrinciple && handleRecommendationClick(rec)}
                      >
                        <span className={clsx(
                          'mt-0.5',
                          hasPrinciple ? 'text-primary' : 'text-muted-foreground'
                        )}>
                          {hasPrinciple ? (
                            <LightBulbIcon className="h-4 w-4" />
                          ) : (
                            '-'
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={clsx(
                            hasPrinciple
                              ? 'text-foreground group-hover:text-primary'
                              : 'text-muted-foreground'
                          )}>
                            {rec}
                          </span>
                        </div>
                        {hasPrinciple && (
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Learn more →
                          </span>
                        )}
                      </div>
                      {/* Inline principle preview */}
                      {principle && (
                        <div
                          className="px-8 pb-2 cursor-pointer group"
                          onClick={() => handleRecommendationClick(rec)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                              {principle.name}
                            </Badge>
                            {principle.source && (
                              <span className="text-xs text-muted-foreground">
                                from {principle.source}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                            {principle.theory.split('\n')[0]}
                          </p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Principle Modal */}
      <PrinciplePreviewModal
        principle={selectedPrinciple}
        open={principleModalOpen}
        onOpenChange={setPrincipleModalOpen}
      />
    </div>
  )
}
