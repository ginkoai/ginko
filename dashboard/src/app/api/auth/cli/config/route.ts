/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-10-28
 * @tags: [auth, cli, config, oauth]
 * @related: [api/auth/cli/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [next/server]
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Get OAuth configuration for CLI
 *
 * Returns the Supabase OAuth URL so CLI can construct the authorization URL
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const redirectUri = searchParams.get('redirect_uri')

  if (!redirectUri) {
    return NextResponse.json(
      { error: 'Missing redirect_uri parameter' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

  if (!supabaseUrl) {
    return NextResponse.json(
      { error: 'Supabase URL not configured' },
      { status: 500 }
    )
  }

  // Construct OAuth URL
  const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectUri)}`

  return NextResponse.json({
    oauth_url: oauthUrl,
    provider: 'github',
  })
}
