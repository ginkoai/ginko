/**
 * @fileType: utility
 * @status: new
 * @updated: 2025-08-05
 * @tags: [supabase, database, adapter, serverless]
 * @related: [database.ts, _utils.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@supabase/supabase-js]
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseAdapter {
  public client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    console.log('[SUPABASE] Client initialized successfully');
  }

  /**
   * Get user by API key (for authentication)
   */
  async getUserByApiKey(apiKeyHash: string): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select(`
          id,
          email,
          organization_id,
          role,
          api_key_hash,
          api_key_prefix,
          last_active,
          is_active,
          organizations!inner(
            name,
            plan_tier,
            plan_status
          )
        `)
        .eq('api_key_hash', apiKeyHash)
        .eq('is_active', true)
        .eq('organizations.plan_status', 'active')
        .single();

      if (error) {
        console.warn('[SUPABASE] User lookup failed:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[SUPABASE] Error in getUserByApiKey:', error);
      return null;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string, teamId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[SUPABASE] Sessions query failed:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[SUPABASE] Error in getUserSessions:', error);
      return [];
    }
  }

  /**
   * Get team best practices
   */
  async getTeamBestPractices(teamId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('team_best_practices')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        console.warn('[SUPABASE] Best practices query failed:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[SUPABASE] Error in getTeamBestPractices:', error);
      return [];
    }
  }

  /**
   * Save session capture
   */
  async saveSession(sessionData: any): Promise<string | null> {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .insert([sessionData])
        .select('id')
        .single();

      if (error) {
        console.warn('[SUPABASE] Session save failed:', error.message);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('[SUPABASE] Error in saveSession:', error);
      return null;
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.warn('[SUPABASE] Session lookup failed:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[SUPABASE] Error in getSessionById:', error);
      return null;
    }
  }

  /**
   * Track team activity
   */
  async logActivity(activityData: any): Promise<void> {
    try {
      const { error } = await this.client
        .from('team_activity')
        .insert([activityData]);

      if (error) {
        console.warn('[SUPABASE] Activity logging failed:', error.message);
      }
    } catch (error) {
      console.error('[SUPABASE] Error in logActivity:', error);
    }
  }

  /**
   * Update user last active timestamp
   */
  async updateUserLastActive(userId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.warn('[SUPABASE] User update failed:', error.message);
      }
    } catch (error) {
      console.error('[SUPABASE] Error in updateUserLastActive:', error);
    }
  }

  /**
   * Health check - test database connectivity
   */
  async healthCheck(): Promise<{ status: string; type: string; note?: string }> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        return {
          status: 'error',
          type: 'supabase',
          note: `Connection failed: ${error.message}`
        };
      }

      return {
        status: 'connected',
        type: 'supabase'
      };
    } catch (error) {
      return {
        status: 'error',
        type: 'supabase',
        note: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}