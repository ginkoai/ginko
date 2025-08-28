/**
 * @fileType: api-route
 * @status: new
 * @updated: 2025-08-26
 * @tags: [api, auth, api-keys, security, revoke]
 * @related: [generate-api-key/route.ts, middleware.ts, server.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Remove API key from user profile by setting to null
    const { error: revokeError } = await supabase
      .from('user_profiles')
      .update({
        api_key_hash: null,
        api_key_prefix: null,
        api_key_created_at: null
      })
      .eq('id', user.id)

    if (revokeError) {
      console.error('Error revoking API key:', revokeError)
      return NextResponse.json(
        { 
          error: 'Failed to revoke API key',
          details: revokeError.message,
          code: revokeError.code 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully'
    })
    
  } catch (error) {
    console.error('Revoke API key error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}