/**
 * @fileType: api-route
 * @status: new
 * @updated: 2025-08-04
 * @tags: [vercel, serverless, mcp, sessions, resume]
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
  initializeDatabase
} from '../_utils.js';
import SessionHandoffManager from '../_lib/session-handoff.js';

async function resumeSession(db: any, sessionId: string) {
  try {
    const startTime = Date.now();
    
    // Try to load from database first
    let sessionContext = null;
    try {
      sessionContext = await db.loadSession(sessionId);
      console.log(`[SESSION] Successfully loaded session ${sessionId} from database`);
    } catch (dbError) {
      console.warn('[SESSION] Database load failed, trying local storage:', dbError);
    }

    // Fallback to local session manager
    if (!sessionContext) {
      const sessionManager = new SessionHandoffManager(db);
      const resumptionData = await sessionManager.resumeSession(sessionId);
      sessionContext = resumptionData.context;
      console.log(`[SESSION] Successfully loaded session ${sessionId} from local storage`);
    }

    if (!sessionContext) {
      return {
        content: [{
          type: 'text',
          text: [
            '# Session Not Found ❌\n',
            `Session \`${sessionId}\` was not found or has expired.`,
            '',
            '## Possible Reasons',
            '- Session ID is incorrect or malformed',
            '- Session has expired (older than 30 days)',
            '- Session was created by a different user or team',
            '',
            '## Next Steps',
            'Use `list_sessions` to see your available sessions.'
          ].join('\n')
        }]
      };
    }

    const resumptionTime = Date.now() - startTime;

    // Record successful resumption
    try {
      await db.recordSessionHandoff(
        sessionId,
        `${sessionId}_resumed_${Date.now()}`,
        sessionContext.userId,
        sessionContext.teamId,
        sessionContext.projectId,
        'resume',
        {
          originalCaptureTime: sessionContext.capturedAt,
          resumptionTime,
          executionTimeMs: resumptionTime
        }
      );
    } catch (metricsError) {
      console.warn('[SESSION] Failed to record resumption metrics:', metricsError);
    }

    // Format the resumption response
    const capturedAt = new Date(sessionContext.capturedAt);
    const now = new Date();
    const timeSinceCapture = Math.round((now.getTime() - capturedAt.getTime()) / (1000 * 60)); // minutes

    const content = [
      '# Session Resumed Successfully ✅\n',
      `**Session ID**: \`${sessionId}\``,
      `**Task**: ${sessionContext.currentTask || 'No task description'}`,
      `**Team**: ${sessionContext.teamId}`,
      `**Project**: ${sessionContext.projectId}`,
      `**Originally Captured**: ${capturedAt.toLocaleString()} (${timeSinceCapture} minutes ago)`,
      `**Resumption Time**: ${resumptionTime}ms`,
      '',
      '## Context Summary',
      sessionContext.contextSummary || 'No context summary available',
      ''
    ];

    // Add development state if available
    if (sessionContext.developmentState) {
      content.push('## Development State');
      content.push(`**Working Directory**: ${sessionContext.developmentState.workingDirectory || 'Unknown'}`);
      
      if (sessionContext.developmentState.recentFiles && sessionContext.developmentState.recentFiles.length > 0) {
        content.push(`**Recent Files**: ${sessionContext.developmentState.recentFiles.slice(0, 5).join(', ')}`);
      }
      
      if (sessionContext.developmentState.gitStatus) {
        content.push(`**Git Status**: ${sessionContext.developmentState.gitStatus}`);
      }
      content.push('');
    }

    // Add tool history if available
    if (sessionContext.toolHistory && sessionContext.toolHistory.length > 0) {
      content.push('## Recent Tool Usage');
      sessionContext.toolHistory.slice(-5).forEach((tool: any, index: number) => {
        content.push(`${index + 1}. **${tool.name}** - ${new Date(tool.timestamp).toLocaleTimeString()}`);
      });
      content.push('');
    }

    content.push('## Next Steps');
    content.push('You can now continue working where you left off. Your previous context has been restored.');

    return {
      content: [{
        type: 'text',
        text: content.join('\n')
      }]
    };
  } catch (error) {
    console.error('[SESSION] Resume failed:', error);
    return {
      content: [{
        type: 'text',
        text: [
          '# Session Resume Failed ❌\n',
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          '',
          '## Troubleshooting',
          '- Verify the session ID is correct',
          '- Check that you have access to this session',
          '- Ensure the session hasn\'t expired',
          '',
          'Please check the session ID and try again, or use `list_sessions` to see available sessions.'
        ].join('\n')
      }]
    };
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
    
    // Extract session ID from URL path
    const sessionId = req.query.id as string;
    
    if (!sessionId) {
      return sendError(res, 'Session ID is required', 400);
    }

    // Log the request
    console.log(`[${timestamp}] ▶️  Resuming session: ${sessionId}`);

    // Check access
    await checkToolAccess(user, 'resume_session');

    // Track usage
    await trackUsage(user, 'resume_session', { sessionId });

    // Initialize database
    const db = await initializeDatabase();

    // Resume session
    const result = await resumeSession(db, sessionId);

    console.log(`[${timestamp}] ✅ Session resume completed successfully`);
    sendSuccess(res, { result });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[${timestamp}] ❌ Session resume failed: ${errorMessage}`);
    
    sendError(res, errorMessage);
  }
}