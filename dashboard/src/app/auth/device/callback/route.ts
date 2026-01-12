/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-11
 * @tags: [auth, oauth, device-flow, callback]
 * @related: [../page.tsx, ../../callback/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [next/server, supabase]
 */

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Device Auth OAuth Callback
 *
 * This is a dedicated callback for the device auth flow.
 * After GitHub OAuth, it always redirects back to /auth/device
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/auth/device?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    try {
      const supabase = await createServerClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[DeviceCallback] Exchange error:', exchangeError)
        return NextResponse.redirect(`${origin}/auth/device?error=${encodeURIComponent(exchangeError.message)}`)
      }

      // Success - redirect back to device auth page
      return NextResponse.redirect(`${origin}/auth/device`)
    } catch (err) {
      console.error('[DeviceCallback] Exception:', err)
      return NextResponse.redirect(`${origin}/auth/device?error=Authentication failed`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/device`)
}
