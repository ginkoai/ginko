/**
 * @fileType: api-route
 * @status: new 
 * @updated: 2025-08-04
 * @tags: [vercel, serverless, mcp, activity, team]
 * @related: [database.ts, serverless-api]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@vercel/node, database]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAuthenticatedUser, 
  handlePreflight, 
  sendError, 
  sendSuccess,
  initializeDatabase
} from '../_utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight requests
  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }

  const timestamp = new Date().toISOString();

  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    
    // Extract team ID from URL path
    const { teamId } = req.query;
    const { since, projectId } = req.query;
    
    if (!teamId || typeof teamId !== 'string') {
      return sendError(res, 'Team ID is required', 400);
    }

    // Log the request
    console.log(`[${timestamp}] 👥 Getting team activity for team: ${teamId}`);
    console.log(`[${timestamp}] 📊 Parameters: projectId=${projectId || 'all'}, since=${since || 'default'}`);

    // Initialize database
    const db = await initializeDatabase();
    
    // Get team activities since timestamp
    // Convert 'since' hours to actual hours, default to 1 hour
    const hoursBack = since ? parseInt(since as string, 10) : 1;
    const activities = await db.getTeamActivity(teamId, projectId as string, hoursBack);
    
    console.log(`[${timestamp}] 📊 Found ${activities?.length || 0} activities for team ${teamId}`);

    sendSuccess(res, { 
      activities: activities || [],
      timestamp: new Date().toISOString(),
      teamId,
      projectId: projectId || null,
      hoursBack
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[${timestamp}] ❌ Team activity query failed: ${errorMessage}`);
    
    // For team activity endpoint, we want to return empty results rather than error
    // in case the database is unavailable, so teams can still function
    console.warn(`[${timestamp}] 🔄 Returning empty activity due to error: ${errorMessage}`);
    
    sendSuccess(res, { 
      activities: [],
      timestamp: new Date().toISOString(),
      error: 'Unable to fetch team activity',
      teamId: req.query.teamId
    });
  }
}