/**
 * @fileType: api-route
 * @status: new
 * @updated: 2025-08-04
 * @tags: [vercel, serverless, health, monitoring]
 * @related: [serverless-api]
 * @priority: medium
 * @complexity: low
 * @dependencies: [@vercel/node]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  handlePreflight, 
  sendSuccess,
  initializeDatabase
} from './_utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight requests
  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    // Health checks should only respond to GET
    return sendSuccess(res, { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      method: req.method,
      message: 'Health endpoint only responds to GET requests'
    });
  }

  const timestamp = new Date().toISOString();
  const healthData: any = {
    status: 'healthy',
    timestamp,
    service: 'Ginko MCP Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    deployment: {
      platform: 'vercel',
      region: process.env.VERCEL_REGION || 'unknown',
      function: 'serverless'
    }
  };

  try {
    console.log('[HEALTH] Testing database connection...');
    const db = await initializeDatabase();
    
    // Test database connectivity with a simple query
    const result = await db.query('SELECT 1 as test');
    console.log('[HEALTH] Database query successful:', result);
    
    healthData.database = {
      status: 'connected',
      type: 'postgresql',
      note: 'Database connected and operational'
    };
  } catch (dbError) {
    console.error('[HEALTH] Database unavailable:', dbError);
    healthData.database = {
      status: 'error',
      error: dbError instanceof Error ? dbError.message : String(dbError),
      note: 'Database connection failed - service degraded'
    };
    // Still return health data but with clear error status
  }

  // Add system information
  healthData.system = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  };

  console.log(`[${timestamp}] ✅ Health check completed - all systems operational`);
  sendSuccess(res, healthData);
}