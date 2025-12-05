/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agents, card, status, epic-004, sprint-2]
 * @related: [agent-status-grid.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, tailwind]
 */

'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'busy' | 'offline'
  capabilities: string[]
  organizationId: string
  createdAt: string
  updatedAt: string
  metadata?: {
    currentTask?: string
    [key: string]: unknown
  }
}

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const statusConfig = {
    active: { label: 'Active', variant: 'success' as const, pulse: false },
    idle: { label: 'Idle', variant: 'warning' as const, pulse: false },
    busy: { label: 'Busy', variant: 'default' as const, pulse: true },
    offline: { label: 'Offline', variant: 'secondary' as const, pulse: false },
  }

  const status = statusConfig[agent.status] || statusConfig.offline
  const timeSince = getTimeSince(agent.updatedAt)

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{agent.name}</h4>
          <p className="text-xs text-gray-500 font-mono">{agent.id.substring(0, 16)}...</p>
        </div>
        <Badge variant={status.variant} className={status.pulse ? 'animate-pulse' : ''}>
          {status.label}
        </Badge>
      </div>

      {agent.status === 'busy' && agent.metadata?.currentTask && (
        <div className="mb-3 p-2 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-600 font-medium">Current Task</p>
          <p className="text-sm text-blue-900">{agent.metadata.currentTask}</p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 4).map(cap => (
            <span
              key={cap}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 4 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
              +{agent.capabilities.length - 4}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last activity: {timeSince}</span>
        </div>
      </div>
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
