import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key required in request body' });
    }

    console.log('[SUPABASE-AUTH] Testing API key:', apiKey.substring(0, 20) + '...');
    
    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ 
        error: 'Supabase configuration missing',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!serviceRoleKey
        }
      });
    }
    
    console.log('[SUPABASE-AUTH] Creating Supabase client...');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Query user_profiles table
    console.log('[SUPABASE-AUTH] Querying user profiles...');
    const { data: profiles, error: queryError } = await supabase
      .from('user_profiles')
      .select('id, email, api_key_hash, api_key_prefix, subscription_tier, is_active')
      .eq('is_active', true)
      .not('api_key_hash', 'is', null);
    
    if (queryError) {
      console.error('[SUPABASE-AUTH] Query error:', queryError);
      return res.status(500).json({
        error: 'Database query failed',
        details: queryError.message
      });
    }
    
    console.log('[SUPABASE-AUTH] Found', profiles?.length || 0, 'active profiles with API keys');
    
    if (!profiles || profiles.length === 0) {
      return res.json({
        success: false,
        error: 'No active profiles with API keys found',
        debug: {
          profileCount: 0
        }
      });
    }
    
    // Test bcrypt comparison with each profile
    for (const profile of profiles) {
      console.log('[SUPABASE-AUTH] Testing profile:', profile.email, 'prefix:', profile.api_key_prefix);
      
      try {
        const isValidKey = await bcrypt.compare(apiKey, profile.api_key_hash);
        console.log('[SUPABASE-AUTH] Bcrypt comparison result:', isValidKey);
        
        if (isValidKey) {
          return res.json({
            success: true,
            message: 'Authentication successful!',
            user: {
              id: profile.id,
              email: profile.email,
              prefix: profile.api_key_prefix,
              tier: profile.subscription_tier
            }
          });
        }
      } catch (bcryptError) {
        console.error('[SUPABASE-AUTH] Bcrypt error for profile', profile.email, ':', bcryptError);
      }
    }
    
    return res.json({
      success: false,
      error: 'Invalid API key - no matching hash found',
      debug: {
        apiKeyFormat: apiKey.split('_').slice(0, 3).join('_') + '_***',
        profileCount: profiles.length,
        prefixes: profiles.map(p => p.api_key_prefix)
      }
    });
    
  } catch (error) {
    console.error('[SUPABASE-AUTH] Endpoint error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}