/**
 * @fileType: page
 * @status: current
 * @updated: 2026-01-17
 * @tags: [dashboard, focus, react, nextjs, supabase, auth, client-component, ginko-branding, adhoc_260117_s01]
 * @related: [SprintProgressCard.tsx, MyTasksList.tsx, RecentCompletions.tsx, LastSessionSummary.tsx, ActionItems.tsx]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [next, supabase-ssr]
 */

'use client';

import { SprintProgressCard, MyTasksList, LastSessionSummary, RecentCompletions, ActionItems } from '@/components/focus'
import { useUserGraph } from '@/contexts/UserGraphContext'
import { useSupabase } from '@/components/providers'
import { Skeleton } from '@/components/ui/skeleton'

export default function FocusPage() {
  const { user, loading: userLoading } = useSupabase()
  const { graphId, isLoading: graphLoading, error: graphError, source } = useUserGraph()

  // Show loading state
  if (userLoading || graphLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="pb-4 border-b border-border">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Show message if no project
  if (!graphId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="pb-4 border-b border-border">
          <h1 className="text-2xl font-mono font-bold text-foreground">Focus</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your current work at a glance.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">No Project Found</h2>
          <p className="text-muted-foreground mb-4">
            {graphError || "You don't have any projects yet. Use the CLI to create one:"}
          </p>
          <pre className="bg-muted rounded p-4 text-sm font-mono text-left inline-block">
            ginko login{'\n'}
            ginko init
          </pre>
        </div>
      </div>
    )
  }

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
