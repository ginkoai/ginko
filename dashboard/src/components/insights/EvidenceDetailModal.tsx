/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-16
 * @tags: [insights, evidence, modal, detail-view]
 * @related: [InsightCard.tsx, dialog.tsx, types.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, dialog, heroicons]
 */
'use client'

import {
  ClockIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  FolderIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InsightEvidence } from '@/lib/insights/types'

interface EvidenceDetailModalProps {
  evidence: InsightEvidence | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TYPE_CONFIG = {
  event: {
    icon: ClockIcon,
    label: 'Event',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
  },
  task: {
    icon: DocumentTextIcon,
    label: 'Task',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  },
  commit: {
    icon: CodeBracketIcon,
    label: 'Commit',
    color: 'bg-green-500/10 text-green-400 border-green-500/30'
  },
  session: {
    icon: FolderIcon,
    label: 'Session',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  },
  pattern: {
    icon: LightBulbIcon,
    label: 'Pattern',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
  },
  gotcha: {
    icon: ExclamationTriangleIcon,
    label: 'Gotcha',
    color: 'bg-red-500/10 text-red-400 border-red-500/30'
  }
}

/**
 * Modal for viewing detailed evidence from an insight.
 * Shows the full evidence record with timestamp and optional link to source.
 */
export function EvidenceDetailModal({
  evidence,
  open,
  onOpenChange
}: EvidenceDetailModalProps) {
  if (!evidence) return null

  const config = TYPE_CONFIG[evidence.type]
  const Icon = config.icon

  const formatFullTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      })
    }
  }

  const timestamp = evidence.timestamp ? formatFullTimestamp(evidence.timestamp) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={clsx('p-2 rounded-lg', config.color.split(' ')[0])}>
              <Icon className={clsx('h-5 w-5', config.color.split(' ')[1])} />
            </div>
            <div className="flex-1">
              <DialogTitle>Evidence Detail</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge className={clsx('text-xs border', config.color)}>
                  {config.label}
                </Badge>
                <span className="text-muted-foreground text-xs font-mono">
                  {evidence.id}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Description */}
            <div>
              <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Description
              </h4>
              <p className="text-sm text-foreground leading-relaxed">
                {evidence.description}
              </p>
            </div>

            {/* Timestamp */}
            {timestamp && (
              <div>
                <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Timestamp
                </h4>
                <div className="text-sm space-y-1">
                  <p className="text-foreground">{timestamp.date}</p>
                  <p className="text-muted-foreground font-mono">{timestamp.time}</p>
                </div>
              </div>
            )}

            {/* Source Link */}
            {evidence.url && (
              <div>
                <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Source
                </h4>
                <a
                  href={evidence.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  View in source
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          {evidence.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(evidence.url, '_blank')}
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
              Open Source
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
