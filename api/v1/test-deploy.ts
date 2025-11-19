/**
 * Test endpoint to verify deployments are working
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    message: 'Deployment test successful',
    timestamp: new Date().toISOString(),
    version: 'v3', // Increment this with each deploy to verify updates
  });
}
