/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-05
 * @tags: [dashboard, agents, multi-agent, epic-004, sprint-2]
 * @related: [../layout.tsx, agent-status-grid.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next, tailwind]
 */

/**
 * Agent Status Dashboard (EPIC-004 Sprint 2 TASK-5)
 *
 * Visual dashboard showing:
 * - Active agents and their status (idle, busy, offline)
 * - Current task for each busy agent
 * - Recent events per agent
 * - Blockers affecting agents
 */

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgentStatusGrid } from '@/components/agents/agent-status-grid'
import { BlockersList } from '@/components/agents/blockers-list'

export default async function AgentStatusPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">Agent Status</h1>
        <p className="text-gray-600 mt-2">
          Monitor active agents and their current tasks in real-time
        </p>
      </section>

      <section className="space-y-6">
        <AgentStatusGrid />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Active Blockers</h2>
        <BlockersList />
      </section>
    </div>
  )
}
