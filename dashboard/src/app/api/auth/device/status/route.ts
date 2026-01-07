/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-06
 * @tags: [auth, device-flow, cli, polling, status]
 * @related: [init/route.ts, authorize/route.ts, cli/commands/login.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [next/server, supabase]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Device Auth Status Endpoint
 *
 * GET /api/auth/device/status?device_id=xxx
 *
 * Called by CLI to poll for authorization status.
 *
 * Returns:
 * - 200 + status: 'pending' - Continue polling
 * - 200 + status: 'authorized' + api_key + user - Success!
 * - 200 + status: 'expired' - Code expired, start over
 * - 200 + status: 'denied' - User denied authorization
 * - 400 - Missing device_id
 * - 404 - Device request not found
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('device_id')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing device_id parameter' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Find the device auth request
    const { data: deviceRequest, error: findError } = await supabase
      .from('device_auth_requests')
      .select('*')
      .eq('device_id', deviceId)
      .single()

    if (findError || !deviceRequest) {
      return NextResponse.json(
        { error: 'Device request not found' },
        { status: 404 }
      )
    }

    // Check if expired (and update status if needed)
    if (deviceRequest.status === 'pending' && new Date(deviceRequest.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('device_auth_requests')
        .update({ status: 'expired' })
        .eq('id', deviceRequest.id)

      return NextResponse.json({
        status: 'expired',
        message: 'The authorization code has expired. Please start over.'
      })
    }

    // Return current status
    switch (deviceRequest.status) {
      case 'pending':
        return NextResponse.json({
          status: 'pending',
          message: 'Waiting for user authorization...'
        })

      case 'authorized':
        // Return the API key and user info (one-time retrieval)
        // Delete the request after successful retrieval for security
        await supabase
          .from('device_auth_requests')
          .delete()
          .eq('id', deviceRequest.id)

        return NextResponse.json({
          status: 'authorized',
          api_key: deviceRequest.api_key,
          user: {
            id: deviceRequest.user_id,
            email: deviceRequest.user_email,
            github_username: deviceRequest.user_github_username
          }
        })

      case 'expired':
        return NextResponse.json({
          status: 'expired',
          message: 'The authorization code has expired. Please start over.'
        })

      case 'denied':
        return NextResponse.json({
          status: 'denied',
          message: 'Authorization was denied by the user.'
        })

      default:
        return NextResponse.json({
          status: 'unknown',
          message: 'Unknown authorization status.'
        })
    }

  } catch (error) {
    console.error('Device auth status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
