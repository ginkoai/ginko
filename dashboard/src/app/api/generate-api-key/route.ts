/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-08-14
 * @tags: [api, auth, api-keys, security, crypto, bcrypt]
 * @related: [middleware.ts, server.ts, dashboard/settings/page.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase, crypto, bcryptjs]
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import * as bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Support both cookie-based (browser) and token-based (CLI) auth
    let user = null
    let authError = null

    // Try Authorization header first (for CLI)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data, error } = await supabase.auth.getUser(token)
      user = data.user
      authError = error
    } else {
      // Fall back to cookie-based auth (for browser)
      const { data, error } = await supabase.auth.getUser()
      user = data.user
      authError = error
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service role client for database operations (bypasses RLS)
    const adminSupabase = createServiceRoleClient()

    // Generate a new API key with Ginko format: gk_{hex}
    const keySecret = randomBytes(32).toString('hex')
    const apiKey = `gk_${keySecret}`
    
    // Hash the API key for secure storage (12 rounds like AuthManager)
    const apiKeyHash = await bcrypt.hash(apiKey, 12)
    
    // Extract prefix for display (gk_ + first 8 chars of the secret)
    const apiKeyPrefix = `gk_${keySecret.substring(0, 8)}`
    
    // Check if user profile exists (using admin client)
    const { data: existingProfile } = await adminSupabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      // Update existing profile with hashed API key (MVP schema)
      const { data: profile, error: updateError } = await adminSupabase
        .from('user_profiles')
        .update({
          api_key_hash: apiKeyHash,
          api_key_prefix: apiKeyPrefix,
          api_key_created_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating profile with API key:', updateError)
        console.error('Update attempted with data:', {
          api_key_hash: apiKeyHash?.substring(0, 20) + '...',
          api_key_prefix: apiKeyPrefix,
          user_id: user.id
        })
        return NextResponse.json(
          { 
            error: 'Failed to generate API key',
            details: updateError.message,
            code: updateError.code 
          },
          { status: 500 }
        )
      }

      // Return the ACTUAL key (only shown once)
      return NextResponse.json({
        success: true,
        api_key: apiKey, // Return the actual key, not the hash
        created_at: profile.api_key_created_at
      })
    } else {
      // Create new profile with hashed API key (MVP schema)
      const { data: profile, error: createError } = await adminSupabase
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
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile with API key:', createError)
        console.error('Create attempted with data:', {
          api_key_hash: apiKeyHash?.substring(0, 20) + '...',
          api_key_prefix: apiKeyPrefix,
          user_id: user.id,
          email: user.email
        })
        return NextResponse.json(
          { 
            error: 'Failed to generate API key',
            details: createError.message,
            code: createError.code 
          },
          { status: 500 }
        )
      }

      // Return the ACTUAL key (only shown once)
      return NextResponse.json({
        success: true,
        api_key: apiKey, // Return the actual key, not the hash
        created_at: profile.api_key_created_at
      })
    }
  } catch (error) {
    console.error('Generate API key error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}