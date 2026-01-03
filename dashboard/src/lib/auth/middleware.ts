/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-06
 * @tags: [auth, middleware, api, token-verification, api-key, security]
 * @related: [api/auth/cli/route.ts, supabase/server.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@supabase/ssr, next/server, bcryptjs]
 */

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';

export interface AuthenticatedUser {
  id: string;
  email: string;
  github_username?: string;
  github_id?: string;
  full_name?: string;
}

/**
 * Verify authentication token from request headers
 *
 * Supports:
 * - Cookie-based auth (dashboard users)
 * - Bearer token auth (CLI OAuth users)
 * - API key auth (CLI long-lived keys with gk_ prefix)
 */
export async function verifyAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser; supabase: any } | { error: string; status: number }> {
  try {
    const supabase = await createServerClient();

    // Check for Bearer token (CLI)
    const authHeader = request.headers.get('authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Check if this is an API key (gk_ prefix)
      if (token.startsWith('gk_')) {
        // Use service role client to bypass RLS for API key validation
        // (We're not authenticated yet, so anon client can't query other users' hashes)
        const serviceClient = createServiceRoleClient();

        // Query all users with API keys
        const { data: profiles, error: queryError } = await serviceClient
          .from('user_profiles')
          .select('id, api_key_hash, email, github_username, github_id, full_name')
          .not('api_key_hash', 'is', null);

        if (queryError) {
          console.error('[AUTH] API key query error:', queryError);
          return {
            error: 'Internal server error',
            status: 500
          };
        }

        if (!profiles || profiles.length === 0) {
          return {
            error: 'Invalid API key',
            status: 401
          };
        }

        // Validate API key against stored hashes
        for (const profile of profiles) {
          try {
            const isValid = await bcrypt.compare(token, profile.api_key_hash);
            if (isValid) {
              // Return service client for API key auth (bypasses RLS)
              // API key users are trusted and should have full access
              return {
                user: {
                  id: profile.id,
                  email: profile.email || '',
                  github_username: profile.github_username,
                  github_id: profile.github_id,
                  full_name: profile.full_name,
                },
                supabase: serviceClient
              };
            }
          } catch (bcryptError) {
            console.error('[AUTH] Bcrypt comparison error:', bcryptError);
            // Continue to next profile
          }
        }

        // No matching API key found
        return {
          error: 'Invalid API key',
          status: 401
        };
      }

      // Standard OAuth token verification
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return {
          error: 'Invalid or expired token',
          status: 401
        };
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('github_username, github_id, email, full_name')
        .eq('id', user.id)
        .single();

      return {
        user: {
          id: user.id,
          email: user.email || profile?.email || '',
          github_username: profile?.github_username || user.user_metadata?.user_name,
          github_id: profile?.github_id || user.user_metadata?.provider_id,
          full_name: profile?.full_name || user.user_metadata?.full_name,
        },
        supabase
      };
    }

    // Check for cookie-based session (dashboard)
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        error: 'Authentication required',
        status: 401
      };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('github_username, github_id, email, full_name')
      .eq('id', user.id)
      .single();

    return {
      user: {
        id: user.id,
        email: user.email || profile?.email || '',
        github_username: profile?.github_username || user.user_metadata?.user_name,
        github_id: profile?.github_id || user.user_metadata?.provider_id,
        full_name: profile?.full_name || user.user_metadata?.full_name,
      },
      supabase
    };

  } catch (error) {
    console.error('Auth verification error:', error);
    return {
      error: 'Internal server error',
      status: 500
    };
  }
}

/**
 * Middleware wrapper for API routes requiring authentication
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withAuth(request, async (user, supabase) => {
 *     // Your authenticated route logic here
 *     return NextResponse.json({ data: 'protected data' });
 *   });
 * }
 * ```
 */
export async function withAuth(
  request: NextRequest,
  handler: (user: AuthenticatedUser, supabase: any) => Promise<NextResponse>
): Promise<NextResponse> {
  const authResult = await verifyAuth(request);

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  return handler(authResult.user, authResult.supabase);
}
