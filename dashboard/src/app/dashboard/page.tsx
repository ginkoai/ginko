/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-11
 * @tags: [dashboard, react, nextjs, supabase, auth, server-component, consolidated, ginko-branding]
 * @related: [collaboration-metrics.tsx, sessions-with-scores.tsx, coaching-insights.tsx]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [next, supabase-ssr]
 */

import { createServerClient } from '@/lib/supabase/server'
import { CollaborationMetrics } from '@/components/dashboard/collaboration-metrics'
import { SessionsWithScores } from '@/components/dashboard/sessions-with-scores'
import { CoachingInsights } from '@/components/dashboard/coaching-insights'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header - Ginko branded typography */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-mono font-bold text-foreground">
          Collaboration Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          AI-powered insights to help you collaborate more effectively.
        </p>
      </div>

      {/* Top: Collaboration Scorecard Scores */}
      <section>
        <CollaborationMetrics userId={user.id} />
      </section>

      {/* Bottom: Sessions with embedded scores and coaching */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SessionsWithScores userId={user.id} />
        </div>
        <div className="xl:col-span-1">
          <CoachingInsights userId={user.id} />
        </div>
      </div>
    </div>
  )
}