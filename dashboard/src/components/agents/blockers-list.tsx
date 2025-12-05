/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agents, blockers, status, epic-004, sprint-2]
 * @related: [agent-status-grid.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, tailwind]
 */

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BlockerEvent {
  id: string
  description: string
  blocked_by?: string
  blocking_tasks?: string[]
  blocker_severity?: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  agent_id?: string
  user_id?: string
}

interface EventStreamResponse {
  events: BlockerEvent[]
  hasMore: boolean
  lastEventId?: string
}

export function BlockersList() {
  const [blockers, setBlockers] = useState<BlockerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBlockers = async () => {
    try {
      // Fetch recent blocker events (last 24 hours)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const response = await fetch(
        `/api/v1/events/stream?categories=blocker&limit=10&since_time=${encodeURIComponent(since)}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        // Event stream might not be available - that's okay
        if (response.status === 404) {
          setBlockers([])
          setError(null)
          return
        }
        throw new Error(`Failed to fetch blockers: ${response.statusText}`)
      }

      const data: EventStreamResponse = await response.json()
      setBlockers(data.events || [])
      setError(null)
    } catch (err) {
      // Blocker fetch is non-critical
      setBlockers([])
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlockers()
    // Poll every 10 seconds
    const interval = setInterval(fetchBlockers, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <p className="text-yellow-700 text-sm">Unable to load blockers: {error}</p>
      </Card>
    )
  }

  if (blockers.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600">No active blockers</p>
        <p className="text-sm text-gray-500 mt-1">All clear for the last 24 hours</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {blockers.map(blocker => (
        <BlockerCard key={blocker.id} blocker={blocker} />
      ))}
    </div>
  )
}

function BlockerCard({ blocker }: { blocker: BlockerEvent }) {
  const severityConfig = {
    critical: { label: 'Critical', variant: 'destructive' as const, bg: 'bg-red-50', border: 'border-red-200' },
    high: { label: 'High', variant: 'destructive' as const, bg: 'bg-red-50', border: 'border-red-200' },
    medium: { label: 'Medium', variant: 'warning' as const, bg: 'bg-yellow-50', border: 'border-yellow-200' },
    low: { label: 'Low', variant: 'secondary' as const, bg: 'bg-gray-50', border: 'border-gray-200' },
  }

  const severity = severityConfig[blocker.blocker_severity || 'medium'] || severityConfig.medium
  const timeSince = getTimeSince(blocker.timestamp)

  return (
    <Card className={`p-4 ${severity.bg} ${severity.border}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {blocker.blocked_by || 'Unknown blocker'}
          </span>
          <Badge variant={severity.variant}>{severity.label}</Badge>
        </div>
        <span className="text-xs text-gray-500">{timeSince}</span>
      </div>

      <p className="text-sm text-gray-700 mb-2">{blocker.description}</p>

      {blocker.blocking_tasks && blocker.blocking_tasks.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-medium">Affects:</span>
          <div className="flex flex-wrap gap-1">
            {blocker.blocking_tasks.map(task => (
              <span
                key={task}
                className="px-2 py-0.5 bg-white rounded border border-gray-200"
              >
                {task}
              </span>
            ))}
          </div>
        </div>
      )}

      {blocker.agent_id && (
        <p className="text-xs text-gray-500 mt-2">
          Reported by agent: {blocker.agent_id.substring(0, 12)}...
        </p>
      )}
    </Card>
  )
}

function getTimeSince(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  } catch {
    return 'unknown'
  }
}
