/**
 * @fileType: service
 * @status: new
 * @updated: 2025-08-09
 * @tags: [authentication, supabase, api-keys]
 * @related: [auth-manager.js, supabase-adapter.js, test-supabase-auth.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@supabase/supabase-js, bcrypt]
 */

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

export class SupabaseAuthManager {
  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    }
    
    this.supabase = createClient(supabaseUrl, serviceRoleKey);
    console.log('[SUPABASE-AUTH] Manager initialized successfully');
  }

  /**
   * Authenticate API key using Supabase
   * This method matches the test-supabase-auth.ts implementation that's confirmed working
   */
  async authenticateApiKey(apiKey) {
    try {
      if (!apiKey) {
        console.log('[SUPABASE-AUTH] No API key provided');
        return null;
      }

      // Remove 'Bearer ' prefix if present
      const cleanKey = apiKey.replace(/^Bearer\s+/i, '');
      console.log('[SUPABASE-AUTH] Authenticating key:', cleanKey.substring(0, 20) + '...');
      
      // Query user_profiles table (same as the working test endpoint)
      const { data: profiles, error: queryError } = await this.supabase
        .from('user_profiles')
        .select('id, email, api_key_hash, api_key_prefix, subscription_tier, is_active')
        .eq('is_active', true)
        .not('api_key_hash', 'is', null);
      
      if (queryError) {
        console.error('[SUPABASE-AUTH] Query error:', queryError);
        return null;
      }
      
      console.log('[SUPABASE-AUTH] Found', profiles?.length || 0, 'active profiles with API keys');
      
      if (!profiles || profiles.length === 0) {
        console.log('[SUPABASE-AUTH] No active profiles with API keys found');
        return null;
      }
      
      // Test bcrypt comparison with each profile
      for (const profile of profiles) {
        console.log('[SUPABASE-AUTH] Testing profile:', profile.email, 'prefix:', profile.api_key_prefix);
        
        try {
          const isValidKey = await bcrypt.compare(cleanKey, profile.api_key_hash);
          console.log('[SUPABASE-AUTH] Bcrypt comparison result:', isValidKey);
          
          if (isValidKey) {
            // Return authenticated user in the expected format
            return {
              id: profile.id,
              email: profile.email,
              organizationId: profile.id, // Use user ID as organization ID for now
              teamId: profile.id, // Use user ID as team ID for now
              planTier: profile.subscription_tier || 'free',
              planStatus: 'active',
              role: 'owner', // Default role
              permissions: ['*'], // Full permissions for now
              apiKeyPrefix: profile.api_key_prefix,
              lastActive: new Date()
            };
          }
        } catch (bcryptError) {
          console.error('[SUPABASE-AUTH] Bcrypt error for profile', profile.email, ':', bcryptError);
        }
      }
      
      console.log('[SUPABASE-AUTH] No matching API key found');
      return null;
      
    } catch (error) {
      console.error('[SUPABASE-AUTH] Authentication error:', error);
      return null;
    }
  }

  /**
   * Middleware function for Express routes
   * Compatible with the existing AuthManager interface
   */
  createAuthMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        const apiKey = req.body?.apiKey || authHeader;
        
        if (!apiKey) {
          console.log('[SUPABASE-AUTH] No API key in request');
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        const user = await this.authenticateApiKey(apiKey);
        
        if (!user) {
          console.log('[SUPABASE-AUTH] Invalid API key');
          return res.status(401).json({ error: 'Invalid API key' });
        }
        
        // Attach user to request
        req.user = user;
        console.log('[SUPABASE-AUTH] User authenticated:', user.email);
        next();
      } catch (error) {
        console.error('[SUPABASE-AUTH] Middleware error:', error);
        return res.status(500).json({ error: 'Authentication error' });
      }
    };
  }

  /**
   * Optional authentication middleware for development environments
   * Compatible with the existing AuthManager interface
   */
  createOptionalAuthMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        const apiKey = req.body?.apiKey || authHeader;
        
        if (apiKey) {
          const user = await this.authenticateApiKey(apiKey);
          if (user) {
            req.user = user;
            console.log('[SUPABASE-AUTH] User authenticated (optional):', user.email);
          }
        }
        
        // Always proceed, even without authentication
        next();
      } catch (error) {
        console.error('[SUPABASE-AUTH] Optional middleware error:', error);
        // Continue anyway
        next();
      }
    };
  }

  /**
   * Check if user has specific permission
   * Compatible with the existing AuthManager interface
   */
  async checkPermission(user, permission) {
    // For now, all authenticated users have all permissions
    return !!user;
  }
}

export default SupabaseAuthManager;