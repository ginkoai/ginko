/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-06
 * @tags: [auth, device-flow, cli, authorize, api-key]
 * @related: [init/route.ts, status/route.ts, generate-api-key/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase, crypto, bcryptjs]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'

/**
 * Device Auth Authorize Endpoint
 *
 * POST /api/auth/device/authorize
 * Body: { user_code: string }
 *
 * Called by dashboard when user enters the device code.
 * User must be authenticated via Supabase session.
 *
 * Actions:
 * 1. Validates the user_code exists and is pending
 * 2. Generates an API key for the user
 * 3. Stores API key in device_auth_requests for CLI to retrieve
 * 4. Updates user_profiles with the new API key hash
 *
 * Returns:
 * - 200: Authorization successful
 * - 400: Invalid or expired code
 * - 401: User not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to authorize a device' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { user_code } = body

    if (!user_code || typeof user_code !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid user_code' },
        { status: 400 }
      )
    }

    // Normalize the code (uppercase, trim)
    const normalizedCode = user_code.toUpperCase().trim()

    // Use service role client for database operations
    const adminSupabase = createServiceRoleClient()

    // Find the pending device auth request
    const { data: deviceRequest, error: findError } = await adminSupabase
      .from('device_auth_requests')
      .select('*')
      .eq('user_code', normalizedCode)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (findError || !deviceRequest) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please try again.' },
        { status: 400 }
      )
    }

    // Generate a new API key
    const keySecret = randomBytes(32).toString('hex')
    const apiKey = `gk_${keySecret}`
    const apiKeyHash = await bcrypt.hash(apiKey, 12)
    const apiKeyPrefix = `gk_${keySecret.substring(0, 8)}`

    // Update or create user profile with the new API key
    const { data: existingProfile } = await adminSupabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      const { error: updateError } = await adminSupabase
        .from('user_profiles')
        .update({
          api_key_hash: apiKeyHash,
          api_key_prefix: apiKeyPrefix,
          api_key_created_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update user profile with API key:', updateError)
        return NextResponse.json(
          { error: 'Failed to generate API key' },
          { status: 500 }
        )
      }
    } else {
      const { error: createError } = await adminSupabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          github_username: user.user_metadata?.user_name || null,
          api_key_hash: apiKeyHash,
          api_key_prefix: apiKeyPrefix,
          api_key_created_at: new Date().toISOString(),
          subscription_tier: 'free'
        })

      if (createError) {
        console.error('Failed to create user profile with API key:', createError)
        return NextResponse.json(
          { error: 'Failed to generate API key' },
          { status: 500 }
        )
      }
    }

    // Update the device auth request with the API key and user info
    const { error: updateDeviceError } = await adminSupabase
      .from('device_auth_requests')
      .update({
        status: 'authorized',
        api_key: apiKey,
        user_id: user.id,
        user_email: user.email,
        user_github_username: user.user_metadata?.user_name || user.user_metadata?.preferred_username || null,
        authorized_at: new Date().toISOString()
      })
      .eq('id', deviceRequest.id)

    if (updateDeviceError) {
      console.error('Failed to update device auth request:', updateDeviceError)
      return NextResponse.json(
        { error: 'Failed to authorize device' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Device authorized successfully. You can close this window.'
    })

  } catch (error) {
    console.error('Device auth authorize error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
