/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agents, status, grid, epic-004, sprint-2]
 * @related: [agent-card.tsx, use-agent-data.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, tailwind]
 */

'use client'

import { useEffect, useState } from 'react'
import { AgentCard } from './agent-card'
import { Card } from '@/components/ui/card'

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

interface AgentListResponse {
  agents: Agent[]
  total: number
  limit: number
  offset: number
}

export function AgentStatusGrid() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/v1/agent?limit=50', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`)
      }

      const data: AgentListResponse = await response.json()
      setAgents(data.agents)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchAgents, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-600">Error loading agents: {error}</p>
        <button
          onClick={() => { setLoading(true); fetchAgents() }}
          className="mt-2 text-sm text-red-700 underline hover:no-underline"
        >
          Retry
        </button>
      </Card>
    )
  }

  if (agents.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No agents registered</h3>
        <p className="text-gray-600 mt-1">
          Register an agent to get started with multi-agent coordination.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          <code className="bg-gray-100 px-2 py-1 rounded">ginko agent register --name "Worker-1" --capabilities typescript,testing</code>
        </p>
      </Card>
    )
  }

  // Group agents by status
  const busyAgents = agents.filter(a => a.status === 'busy')
  const idleAgents = agents.filter(a => a.status === 'idle' || a.status === 'active')
  const offlineAgents = agents.filter(a => a.status === 'offline')

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Agents" value={agents.length} color="gray" />
        <StatCard label="Busy" value={busyAgents.length} color="blue" />
        <StatCard label="Idle" value={idleAgents.length} color="green" />
        <StatCard label="Offline" value={offlineAgents.length} color="gray" />
      </div>

      {/* Busy Agents Section */}
      {busyAgents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Active ({busyAgents.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {busyAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* Idle Agents Section */}
      {idleAgents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Idle ({idleAgents.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {idleAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* Offline Agents Section (Collapsed) */}
      {offlineAgents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Offline ({offlineAgents.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {offlineAgents.map(agent => (
              <span
                key={agent.id}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
              >
                {agent.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'gray' | 'blue' | 'green' | 'yellow' | 'red' }) {
  const colorClasses = {
    gray: 'text-gray-900',
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  }

  return (
    <Card className="p-4 text-center">
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </Card>
  )
}
