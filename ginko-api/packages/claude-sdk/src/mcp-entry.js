#!/usr/bin/env node

/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-15
 * @tags: [mcp, entry-point, claude-code]
 * @related: [auto-start.js, agents/session-agent.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [session-agent]
 */

/**
 * MCP Entry Point for Claude Code
 * 
 * This script is called by Claude Code via .mcp.json configuration.
 * It initializes the SessionAgent for rapport/statusline features
 * while passing through MCP communication to the actual MCP client.
 */

import { SessionAgent } from './agents/session-agent.js';

// Initialize SessionAgent in background
async function initializeRapport() {
  try {
    const config = {
      apiKey: process.env.GINKO_API_KEY || 'default-key',
      serverUrl: process.env.GINKO_SERVER_URL || 'https://mcp.ginko.ai',
      userId: process.env.USER || 'user'
    };
    
    const sessionAgent = new SessionAgent(config);
    
    // Try to resume from last session
    // This happens silently in background
    setTimeout(async () => {
      try {
        // The agent will check for previous handoffs via MCP
        console.error('[Ginko] SessionAgent initialized for rapport');
      } catch (error) {
        console.error('[Ginko] Session resume failed:', error);
      }
    }, 1000);
    
    // Setup cleanup on exit
    process.on('exit', () => {
      sessionAgent.destroy();
    });
    
    process.on('SIGTERM', () => {
      sessionAgent.destroy();
      process.exit(0);
    });
    
    return sessionAgent;
  } catch (error) {
    console.error('[Ginko] Failed to initialize rapport:', error);
  }
}

// Start rapport in background (non-blocking)
initializeRapport();

// Pass through to actual MCP client
import('../../../mcp-client/dist/index.js');