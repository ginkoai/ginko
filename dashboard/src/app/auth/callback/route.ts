/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-08-01
 * @tags: [auth, oauth, supabase, callback, github, production]
 * @related: [oauth-handler.tsx, auth-form.tsx, middleware.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [next/server, @/lib/supabase/server]
 */
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=${error}`)
  }
  
  if (code) {
    try {
      const supabase = await createServerClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!exchangeError && data?.session) {
        return NextResponse.redirect(`${origin}/dashboard`)
      }
    } catch (err) {
      // Silent error handling - redirect to login
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}