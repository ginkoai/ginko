/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-04
 * @tags: [auth, cli, session, polling, api]
 * @related: [cli/commands/login.ts, auth/callback/route.ts, cli-session-storage.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [next/server, @/lib/cli-session-storage]
 */

import { NextRequest, NextResponse } from 'next/server'
import { cliSessionStorage } from '@/lib/cli-session-storage'

/**
 * CLI Session Polling Endpoint
 *
 * GET /api/auth/cli/session?session_id=xxx
 *
 * Returns:
 * - 200: Session found (returns tokens)
 * - 404: Session not ready yet (continue polling)
 * - 410: Session expired or doesn't exist
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  // Validate session_id
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session_id parameter' },
      { status: 400 }
    )
  }

  // Check if session exists
  const session = cliSessionStorage.get(sessionId)

  if (!session) {
    // Session doesn't exist yet - client should continue polling
    return NextResponse.json(
      { message: 'Session not ready' },
      { status: 404 }
    )
  }

  // Session found! Delete it (one-time use) and return to CLI
  cliSessionStorage.delete(sessionId)

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user: session.user
  })
}

/**
 * Delete a CLI session (called if user cancels)
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session_id parameter' },
      { status: 400 }
    )
  }

  cliSessionStorage.delete(sessionId)

  return NextResponse.json({ success: true })
}
