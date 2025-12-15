/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, dashboard, page]
 * @related: [InsightsOverview.tsx, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next, supabase]
 */

import { createServerClient } from '@/lib/supabase/server'
import { InsightsPageClient } from './page-client'

export const metadata = {
  title: 'Coaching Insights | Ginko',
  description: 'AI-driven coaching insights for human-AI collaboration'
}

export default async function InsightsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return <InsightsPageClient userId={user.id} userEmail={user.email || ''} />
}
