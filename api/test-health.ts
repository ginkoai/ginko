import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Minimal health check without any imports that might fail
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Ginko MCP Server - Test',
    environment: process.env.NODE_ENV || 'development',
    deployment: {
      platform: 'vercel',
      region: process.env.VERCEL_REGION || 'unknown',
      function: 'serverless'
    }
  };

  res.status(200).json(healthData);
}