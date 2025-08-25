import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DatabaseManager } from './_lib/database.js';
import { AuthManager } from './_lib/auth-manager.js';
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

    console.log('[DEBUG] Testing API key:', apiKey.substring(0, 20) + '...');
    console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
    
    // Test database connection
    const db = new DatabaseManager({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || 'postgres',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production'
    });
    
    console.log('[DEBUG] Testing database connection...');
    const testQuery = await db.query('SELECT 1 as test');
    console.log('[DEBUG] Database test result:', testQuery.rows);
    
    // Test user_profiles query
    console.log('[DEBUG] Querying user_profiles...');
    const profilesQuery = await db.query(`
      SELECT id, email, api_key_hash, api_key_prefix, subscription_tier, is_active 
      FROM user_profiles 
      WHERE api_key_hash IS NOT NULL 
      LIMIT 3
    `);
    console.log('[DEBUG] Found', profilesQuery.rows.length, 'profiles with API keys');
    
    // Test bcrypt comparison with each profile
    for (const row of profilesQuery.rows) {
      console.log('[DEBUG] Testing profile:', row.email, 'prefix:', row.api_key_prefix);
      const isValidKey = await bcrypt.compare(apiKey, row.api_key_hash);
      console.log('[DEBUG] Bcrypt comparison result:', isValidKey);
      if (isValidKey) {
        return res.json({
          success: true,
          message: 'Authentication successful',
          user: {
            email: row.email,
            prefix: row.api_key_prefix,
            tier: row.subscription_tier
          }
        });
      }
    }
    
    console.log('[DEBUG] No matching API key found');
    
    // Test with AuthManager
    console.log('[DEBUG] Testing with AuthManager...');
    const authManager = new AuthManager(db);
    
    try {
      const user = await authManager.authenticateApiKey(apiKey);
      return res.json({
        success: true,
        message: 'AuthManager authentication successful',
        user: {
          email: user.email,
          prefix: user.apiKeyPrefix,
          tier: user.planTier
        }
      });
    } catch (authError) {
      console.log('[DEBUG] AuthManager error:', authError);
      return res.json({
        success: false,
        error: 'Authentication failed',
        details: authError instanceof Error ? authError.message : String(authError)
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] Debug endpoint error:', error);
    return res.status(500).json({
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}