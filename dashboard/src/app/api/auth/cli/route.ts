/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-10-28
 * @tags: [auth, cli, oauth, token-exchange, supabase]
 * @related: [auth/callback/route.ts, cli/login.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [next/server, @supabase/ssr]
 */

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * CLI Authentication Endpoint
 *
 * This endpoint is called by the CLI's localhost callback server to exchange
 * an OAuth code for Supabase session tokens. The CLI can then store these
 * tokens locally and use them for authenticated API requests.
 *
 * Flow:
 * 1. CLI opens browser to Supabase OAuth page
 * 2. User authenticates with GitHub
 * 3. Supabase redirects to http://localhost:8765/callback?code=xxx
 * 4. CLI localhost server captures code and calls this endpoint
 * 5. This endpoint exchanges code for session tokens
 * 6. Returns tokens to CLI for local storage
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createServerClient()

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !data?.session) {
      console.error('Token exchange error:', exchangeError)
      return NextResponse.json(
        { error: 'Failed to exchange code for session', details: exchangeError?.message },
        { status: 401 }
      )
    }

    // Get user profile information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('github_username, github_id, email, full_name')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.warn('Failed to fetch user profile:', profileError)
      // Continue without profile data - not critical
    }

    // Return session tokens and user info for CLI storage
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email,
        github_username: profile?.github_username || data.user.user_metadata?.user_name,
        github_id: profile?.github_id || data.user.user_metadata?.provider_id,
        full_name: profile?.full_name || data.user.user_metadata?.full_name,
      }
    })

  } catch (error) {
    console.error('CLI auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Token Refresh Endpoint for CLI
 *
 * Allows CLI to refresh expired access tokens using refresh token
 */
export async function PUT(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Missing refresh token' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Refresh session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    })

    if (error || !data?.session) {
      return NextResponse.json(
        { error: 'Failed to refresh session', details: error?.message },
        { status: 401 }
      )
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
