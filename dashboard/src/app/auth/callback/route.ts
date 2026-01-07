/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-06
 * @tags: [auth, oauth, supabase, callback, github, production, cli]
 * @related: [oauth-handler.tsx, auth-form.tsx, middleware.ts, cli-session-storage.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [next/server, @/lib/supabase/server, @/lib/cli-session-storage, next/headers]
 */
import { createServerClient } from '@/lib/supabase/server'
import { cliSessionStorage } from '@/lib/cli-session-storage'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Read CLI session ID from cookie (set by authorize page)
  const cookieStore = await cookies()
  const cliSessionId = cookieStore.get('cli_session_id')?.value || searchParams.get('cli_session_id')

  if (error) {
    // If CLI session, show error page instead of redirect
    if (cliSessionId) {
      const response = NextResponse.redirect(
        `${origin}/auth/cli/complete?status=error&message=${encodeURIComponent(error)}`
      )
      response.cookies.delete('cli_session_id')
      return response
    }
    return NextResponse.redirect(`${origin}/auth/login?error=${error}`)
  }

  if (code) {
    try {
      const supabase = await createServerClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (!exchangeError && data?.session) {
        // If this is a CLI authentication, store session and redirect to success page
        if (cliSessionId) {
          cliSessionStorage.set(cliSessionId, {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at || 0,
            user: {
              id: data.session.user.id,
              email: data.session.user.email,
              github_username: data.session.user.user_metadata?.user_name ||
                               data.session.user.user_metadata?.preferred_username
            }
          })

          // Clear the CLI session cookie after use
          const response = NextResponse.redirect(
            `${origin}/auth/cli/complete?status=success`
          )
          response.cookies.delete('cli_session_id')

          return response
        }

        // Normal web authentication - redirect to dashboard or custom next URL
        const nextUrl = searchParams.get('next')
        const redirectUrl = nextUrl && nextUrl.startsWith('/') ? `${origin}${nextUrl}` : `${origin}/dashboard`
        return NextResponse.redirect(redirectUrl)
      }
    } catch (err) {
      // Silent error handling - redirect to login or CLI error
      if (cliSessionId) {
        const response = NextResponse.redirect(
          `${origin}/auth/cli/complete?status=error&message=Authentication failed`
        )
        response.cookies.delete('cli_session_id')
        return response
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}