/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [auth, middleware, api, token-verification, security]
 * @related: [api/auth/cli/route.ts, supabase/server.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@supabase/ssr, next/server]
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
 * Supports both:
 * - Cookie-based auth (dashboard users)
 * - Bearer token auth (CLI users)
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

      // Verify token with Supabase
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
