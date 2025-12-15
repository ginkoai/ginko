/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-15
 * @tags: [dashboard, focus, react, nextjs, supabase, auth, server-component, ginko-branding]
 * @related: [SprintProgressCard.tsx, MyTasksList.tsx, RecentCompletions.tsx, LastSessionSummary.tsx, ActionItems.tsx]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [next, supabase-ssr]
 */

import { createServerClient } from '@/lib/supabase/server'
import { SprintProgressCard, MyTasksList, LastSessionSummary, RecentCompletions, ActionItems } from '@/components/focus'

// Default graph ID for beta - all users share this graph
const DEFAULT_GRAPH_ID = process.env.NEXT_PUBLIC_GRAPH_ID || 'gin_1762125961056_dg4bsd';

export default async function FocusPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const graphId = DEFAULT_GRAPH_ID
  const userId = user.email || user.id

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-mono font-bold text-foreground">
          Focus
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your current work at a glance.
        </p>
      </div>

      {/* Action Items - Warnings at top for visibility */}
      {graphId && <ActionItems userId={userId} graphId={graphId} />}

      {/* Top Row: Sprint Progress + My Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SprintProgressCard graphId={graphId} />
        <MyTasksList userId={userId} graphId={graphId} />
      </div>

      {/* Last Session Summary */}
      <LastSessionSummary userId={userId} graphId={graphId} />

      {/* Recent Completions - Full width */}
      <RecentCompletions userId={userId} graphId={graphId} />
    </div>
  )
}
