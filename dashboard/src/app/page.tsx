/**
 * @fileType: page
 * @status: current
 * @updated: 2025-01-31
 * @tags: [landing-page, auth-redirect, supabase, next-js]
 * @related: [dashboard/page.tsx, components/landing-page.tsx, auth/login/page.tsx]
 * @priority: critical
 * @complexity: low
 * @dependencies: [next, supabase]
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/landing-page'

export default async function HomePage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/dashboard')
  }
  
  return <LandingPage />
}