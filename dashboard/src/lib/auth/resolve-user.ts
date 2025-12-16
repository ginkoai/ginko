/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-16
 * @tags: [auth, token-resolution, api-key, oauth, shared]
 * @related: [middleware.ts, _cloud-graph-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@supabase/ssr, bcryptjs]
 */

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import * as bcrypt from 'bcryptjs';

export interface ResolvedUser {
  userId: string;  // Supabase UUID
  email: string;
  method: 'api_key' | 'oauth';
}

export interface ResolutionError {
  error: string;
}

/**
 * Resolve a bearer token to a Supabase user ID
 *
 * Supports:
 * - API keys (gk_ prefix): Look up via bcrypt hash comparison in user_profiles
 * - OAuth JWTs: Verify via Supabase auth and extract user ID
 *
 * Returns the actual Supabase UUID for consistent userId across all auth methods.
 * This ensures CLI (gk_ tokens) and Dashboard (OAuth JWTs) resolve to the same userId.
 *
 * @param token - The bearer token (either gk_* API key or OAuth JWT)
 * @returns ResolvedUser with Supabase UUID, or ResolutionError
 *
 * @example
 * ```typescript
 * const result = await resolveUserId('gk_abc123...');
 * if ('error' in result) {
 *   throw new Error(result.error);
 * }
 * console.log(result.userId); // Supabase UUID like '550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export async function resolveUserId(token: string): Promise<ResolvedUser | ResolutionError> {
  if (!token || token.length < 8) {
    return { error: 'Invalid token' };
  }

  try {
    // Check if this is an API key (gk_ prefix)
    if (token.startsWith('gk_')) {
      return await resolveApiKey(token);
    }

    // Otherwise, treat as OAuth JWT
    return await resolveOAuthToken(token);
  } catch (error) {
    console.error('[resolveUserId] Unexpected error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Resolve a gk_ API key to Supabase user ID
 */
async function resolveApiKey(apiKey: string): Promise<ResolvedUser | ResolutionError> {
  // Use service role client to bypass RLS for API key validation
  const serviceClient = createServiceRoleClient();

  // Query all users with API keys
  const { data: profiles, error: queryError } = await serviceClient
    .from('user_profiles')
    .select('id, api_key_hash, email')
    .not('api_key_hash', 'is', null);

  if (queryError) {
    console.error('[resolveApiKey] Query error:', queryError);
    return { error: 'Internal server error' };
  }

  if (!profiles || profiles.length === 0) {
    return { error: 'Invalid API key' };
  }

  // Validate API key against stored hashes
  for (const profile of profiles) {
    try {
      const isValid = await bcrypt.compare(apiKey, profile.api_key_hash);
      if (isValid) {
        return {
          userId: profile.id,
          email: profile.email || '',
          method: 'api_key',
        };
      }
    } catch (bcryptError) {
      console.error('[resolveApiKey] Bcrypt comparison error:', bcryptError);
      // Continue to next profile
    }
  }

  return { error: 'Invalid API key' };
}

/**
 * Resolve an OAuth JWT to Supabase user ID
 * Uses service role client to properly verify JWT tokens
 */
async function resolveOAuthToken(token: string): Promise<ResolvedUser | ResolutionError> {
  // Use service role client for JWT verification - it works correctly with passed tokens
  // The cookie-based createServerClient doesn't properly verify passed JWT tokens
  const supabase = createServiceRoleClient();

  console.log('[resolveOAuthToken] Verifying OAuth JWT...');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error) {
    console.error('[resolveOAuthToken] JWT verification error:', error.message);
    return { error: 'Invalid or expired token' };
  }

  if (!user) {
    console.error('[resolveOAuthToken] No user returned from JWT verification');
    return { error: 'Invalid or expired token' };
  }

  console.log('[resolveOAuthToken] Successfully resolved userId:', user.id);
  return {
    userId: user.id,
    email: user.email || '',
    method: 'oauth',
  };
}
