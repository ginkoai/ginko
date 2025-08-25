/**
 * @fileType: api-route
 * @status: new
 * @updated: 2025-08-04
 * @tags: [vercel, serverless, mcp, sessions, capture]
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
import SessionHandoffManager from '../_lib/session-handoff.js';

async function captureSession(db: any, teamId: string, projectId: string, currentTask: string, options: any) {
  try {
    // Determine user ID (would come from authentication in production)
    const userId = options.userId || 'current-user';
    
    const sessionManager = new SessionHandoffManager(db);
    const sessionContext = await sessionManager.captureSession(userId, teamId, projectId, {
      preserveConversationHistory: options.preserveConversation !== false,
      includeDevelopmentState: true,
      includeToolHistory: true,
      compressionLevel: options.compressionLevel || 'standard',
      maxContextAge: 24
    });

    // Override the current task with user-provided description
    sessionContext.currentTask = currentTask;

    // Save to database if available
    try {
      await db.saveSession(sessionContext);
      await db.createSessionSnapshot(sessionContext.id, sessionContext, 'handoff', userId);
      console.log(`[SESSION] Session ${sessionContext.id} saved to database successfully`);
    } catch (dbError) {
      console.warn('[SESSION] Database save failed, session stored locally:', dbError);
    }

    // Record handoff metrics
    try {
      await db.recordSessionHandoff(
        'new-session',
        sessionContext.id,
        userId,
        teamId,
        projectId,
        'capture',
        {
          currentTask,
          compressionLevel: options.compressionLevel || 'standard',
          preserveConversation: options.preserveConversation !== false,
          contextSize: JSON.stringify(sessionContext).length
        }
      );
    } catch (metricsError) {
      console.warn('[SESSION] Failed to record handoff metrics:', metricsError);
    }

    const textSections = [
      '# Session Captured Successfully ✅\n',
      `**Session ID**: \`${sessionContext.id}\``,
      `**Task**: ${currentTask}`,
      `**Team**: ${teamId}`,
      `**Project**: ${projectId}`,
      `**Captured**: ${new Date().toLocaleString()}`,
      `**Compression**: ${options.compressionLevel || 'standard'}`,
      `**Preserve Conversation**: ${options.preserveConversation !== false ? 'Yes' : 'No'}`
    ];
    
    // Add mode information if available
    if (sessionContext.currentMode) {
      textSections.push(`**Current Mode**: ${sessionContext.currentMode}`);
    }
    if (sessionContext.nextMode) {
      textSections.push(`**Next Mode**: ${sessionContext.nextMode} ${sessionContext.modeRationale ? `(${sessionContext.modeRationale})` : ''}`);
    }
    
    textSections.push(
      '',
      '## What\'s Preserved',
      '- Current development context and progress',
      '- Tool usage history and patterns',
      '- Recent file changes and modifications',
      '- Team collaboration insights'
    );
    
    // Add mode-aware context if available
    if (sessionContext.rapportContext || sessionContext.embeddedContext) {
      textSections.push('- Mode-aware rapport and embedded context for seamless continuation');
    }
    
    textSections.push(
      '',
      '## Next Steps',
      `Use \`resume_session ${sessionContext.id}\` to continue your work later.`,
      '',
      '💡 **Tip**: Session handoff prevents context rot by preserving your development state between AI sessions.'
    );
    
    return {
      content: [{
        type: 'text',
        text: textSections.join('\n')
      }]
    };
  } catch (error) {
    console.error('[SESSION] Capture failed:', error);
    return {
      content: [{
        type: 'text',
        text: [
          '# Session Capture Failed ❌\n',
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          '',
          '## Troubleshooting',
          '- Ensure you have write permissions in the project directory',
          '- Check that the current task description is provided',
          '- Verify your authentication is valid',
          '',
          'Please try again or contact support if the issue persists.'
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

  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }

  const timestamp = new Date().toISOString();

  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    
    // Extract request body
    const { 
      currentTask, 
      preserveConversation = true, 
      compressionLevel = 'standard',
      teamId: requestTeamId,
      projectId: requestProjectId,
      userId: requestUserId,
      mode,
      rapportContext,
      embeddedContext
    } = req.body;
    
    if (!currentTask) {
      return sendError(res, 'currentTask is required', 400);
    }

    // Extract team and project IDs with fallbacks
    const { teamId, projectId } = extractTeamAndProject({ teamId: requestTeamId, projectId: requestProjectId }, user);
    const userId = requestUserId || user.id; // Use actual user ID, not 'current-user'

    const options = {
      preserveConversation,
      compressionLevel,
      userId,
      mode,
      rapportContext,
      embeddedContext
    };

    // Log the request
    console.log(`[${timestamp}] 📸 Capturing session state for task: "${currentTask}"`);
    console.log(`[${timestamp}] 🎯 Team: ${teamId}, Project: ${projectId}, User: ${userId}`);

    // Check access and rate limits
    await checkToolAccess(user, 'capture_session');

    // Track usage
    await trackUsage(user, 'capture_session', { teamId, projectId, currentTask });

    // Initialize database
    const db = await initializeDatabase();

    // Capture session
    const result = await captureSession(db, teamId, projectId, currentTask, options);

    console.log(`[${timestamp}] ✅ Session capture completed successfully`);
    sendSuccess(res, { result });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[${timestamp}] ❌ Session capture failed: ${errorMessage}`);
    
    sendError(res, errorMessage);
  }
}