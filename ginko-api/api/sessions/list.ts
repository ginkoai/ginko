/**
 * @fileType: api-route
 * @status: new
 * @updated: 2025-08-04
 * @tags: [vercel, serverless, mcp, sessions]
 * @related: [session-handoff.ts, database.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@vercel/node, session-handoff]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAuthenticatedUser, 
  handlePreflight, 
  sendError, 
  sendSuccess,
  checkToolAccess,
  trackUsage,
  logToolCall,
  extractTeamAndProject,
  initializeDatabase
} from '../_utils.js';
// Import removed - using database-only approach for Vercel deployment

async function listSessions(adapter: any, teamId: string, userId: string = 'current-user', limit: number = 10) {
  try {
    let sessions = [];
    
    // Try database first (either PostgreSQL or in-memory)
    try {
      sessions = await adapter.getUserSessions(userId, teamId, limit);
      console.log(`[SESSION] Database returned ${sessions.length} sessions for user ${userId}, team ${teamId}, limit ${limit}`);
    } catch (dbError) {
      console.warn('[SESSION] Database query failed:', dbError);
      // For Vercel deployment, just return empty array if database fails
      sessions = [];
      console.log(`[SESSION] Database fallback: returning empty sessions array`);
    }

    if (sessions.length === 0) {
      return {
        content: [{
          type: 'text',
          text: [
            '# No Sessions Available 📭',
            '',
            'You don\'t have any captured sessions yet.',
            '',
            '## Getting Started',
            '1. Use `capture_session` to save your current work state',
            '2. Start a fresh session to avoid context rot',
            '3. Use `resume_session` to continue where you left off',
            '',
            'Session handoff prevents context rot by preserving your development state between AI sessions.'
          ].join('\n')
        }]
      };
    }

    // Clean menu format like a restaurant menu
    const content = [
      `# Available Sessions 📋\n`,
      `${sessions.length} available sessions:\n`
    ];

    sessions.forEach((session: any, index: number) => {
      const capturedAt = new Date(session.createdAt || session.capturedAt).toLocaleString();
      const timeAgo = getTimeAgo(new Date(session.createdAt || session.capturedAt));
      
      content.push(`## ${index + 1}. \`${session.id}\``);
      content.push(`**Task**: ${session.currentTask || 'No task description'}`);
      content.push(`**Captured**: ${timeAgo} (${capturedAt})`);
      content.push(`**Team**: ${session.teamId}`);
      
      if (session.contextSummary) {
        const summary = session.contextSummary.length > 100 
          ? session.contextSummary.substring(0, 100) + '...' 
          : session.contextSummary;
        content.push(`**Context**: ${summary}`);
      }
      
      content.push('');
    });

    content.push('Use `resume_session <session-id>` to continue any of these sessions.');

    return {
      content: [{
        type: 'text',
        text: content.join('\n')
      }]
    };
  } catch (error) {
    console.error('[SESSION] Error listing sessions:', error);
    return {
      content: [{
        type: 'text',
        text: `# Error Listing Sessions ❌\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease try again or contact support.`
      }]
    };
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else {
    return `${diffDays} days ago`;
  }
}

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
    
    // Extract query parameters
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = (req.query.userId as string) || user.id; // Use actual user ID
    
    // Extract team and project IDs (use user org as fallback for teamId)
    const { teamId } = extractTeamAndProject({ teamId: req.query.teamId as string }, user);

    // Log the request
    console.log(`[${timestamp}] 📋 Listing available sessions for team: ${teamId}, user: ${userId}, limit: ${limit}`);

    // Check access
    await checkToolAccess(user, 'list_sessions');

    // Track usage
    await trackUsage(user, 'list_sessions', { teamId, userId, limit });

    // Initialize database adapter
    const adapter = await initializeDatabase();

    // Get sessions
    const result = await listSessions(adapter, teamId, userId, limit);

    console.log(`[${timestamp}] ✅ Sessions list completed successfully`);
    sendSuccess(res, { result });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[${timestamp}] ❌ Sessions list failed: ${errorMessage}`);
    
    sendError(res, errorMessage);
  }
}