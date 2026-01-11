/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-06
 * @tags: [auth, device-flow, cli, init]
 * @related: [authorize/route.ts, status/route.ts, cli/commands/login.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [next/server, supabase, crypto]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { randomUUID, randomBytes } from 'crypto'

/**
 * Generate a human-friendly device code (e.g., "ABCD-1234")
 * Format: 4 uppercase letters + hyphen + 4 digits
 */
function generateUserCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Excluding I, O to avoid confusion
  const digits = '0123456789'

  let code = ''
  for (let i = 0; i < 4; i++) {
    code += letters[Math.floor(Math.random() * letters.length)]
  }
  code += '-'
  for (let i = 0; i < 4; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }

  return code
}

/**
 * Device Auth Init Endpoint
 *
 * POST /api/auth/device/init
 *
 * Creates a new device authentication request.
 * Called by CLI at the start of `ginko login`.
 *
 * Returns:
 * - device_id: UUID for CLI to use when polling
 * - user_code: Human-readable code for user to enter in browser
 * - expires_in: Seconds until the code expires
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const deviceId = randomUUID()
    const userCode = generateUserCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Insert the device auth request
    const { error: insertError } = await supabase
      .from('device_auth_requests')
      .insert({
        device_id: deviceId,
        user_code: userCode,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      console.error('Failed to create device auth request:', insertError)
      return NextResponse.json(
        { error: 'Failed to initialize device authentication' },
        { status: 500 }
      )
    }

    // Trim the URL to handle any trailing whitespace/newlines in env var
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.ginkoai.com').trim()

    return NextResponse.json({
      device_id: deviceId,
      user_code: userCode,
      expires_in: 600, // 10 minutes in seconds
      verification_uri: `${baseUrl}/auth/device`
    })

  } catch (error) {
    console.error('Device auth init error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
