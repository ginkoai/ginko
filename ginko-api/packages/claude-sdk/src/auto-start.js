#!/usr/bin/env node

/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-15
 * @tags: [auto-start, session, rapport, mcp]
 * @related: [agents/session-agent.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [session-agent]
 */

import { SessionAgent } from './agents/session-agent.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auto-start wrapper for Claude Code
 * Launches SessionAgent alongside MCP client for rapport-enabled sessions
 */
class GinkoAutoStart {
  constructor() {
    this.sessionAgent = null;
    this.mcpProcess = null;
  }

  /**
   * Initialize the auto-start sequence
   */
  async initialize() {
    console.log('[Ginko] Initializing rapport-enabled session...');
    
    try {
      // Start SessionAgent for rapport and statusline updates
      await this.startSessionAgent();
      
      // Start the MCP client process
      await this.startMCPClient();
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
      
      console.log('[Ginko] ✨ Session initialized with rapport support');
    } catch (error) {
      console.error('[Ginko] Failed to initialize:', error);
      process.exit(1);
    }
  }

  /**
   * Start the SessionAgent for rapport features
   */
  async startSessionAgent() {
    const config = {
      apiKey: process.env.GINKO_API_KEY || 'default-key',
      serverUrl: process.env.GINKO_SERVER_URL || 'https://mcp.ginko.ai',
      userId: process.env.USER || 'user'
    };
    
    this.sessionAgent = new SessionAgent(config);
    
    // Try to resume from previous session
    try {
      const lastSessionId = await this.getLastSessionId();
      if (lastSessionId) {
        await this.sessionAgent.resumeFromHandoff(lastSessionId);
        console.log('[Ginko] Resumed previous session:', lastSessionId);
      }
    } catch (error) {
      console.log('[Ginko] Starting fresh session');
    }
    
    // The agent will automatically start statusline updates
    console.log('[Ginko] SessionAgent started with statusline updates');
  }

  /**
   * Start the MCP client process
   */
  async startMCPClient() {
    // Find the MCP client executable
    const mcpClientPath = path.join(__dirname, '../../mcp-client/dist/index.js');
    
    // Spawn the MCP client process
    this.mcpProcess = spawn('node', [mcpClientPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        GINKO_SESSION_AGENT_ACTIVE: 'true'
      }
    });
    
    this.mcpProcess.on('error', (error) => {
      console.error('[Ginko] MCP client error:', error);
    });
    
    this.mcpProcess.on('exit', (code) => {
      console.log(`[Ginko] MCP client exited with code ${code}`);
      this.shutdown();
    });
  }

  /**
   * Get the last session ID from cache
   */
  async getLastSessionId() {
    // This would read from a cache file or database
    // For now, return null to start fresh
    return null;
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`\n[Ginko] Received ${signal}, shutting down gracefully...`);
        this.shutdown();
      });
    });
    
    process.on('exit', () => {
      console.log('[Ginko] 👋 Session ended');
    });
  }

  /**
   * Shutdown all components cleanly
   */
  async shutdown() {
    // Generate final handoff
    if (this.sessionAgent) {
      try {
        await this.sessionAgent.generateHandoff();
        console.log('[Ginko] Session handoff saved');
      } catch (error) {
        console.error('[Ginko] Failed to save handoff:', error);
      }
      
      // Destroy the agent (cleans up statusline)
      this.sessionAgent.destroy();
    }
    
    // Kill MCP process if running
    if (this.mcpProcess && !this.mcpProcess.killed) {
      this.mcpProcess.kill();
    }
    
    process.exit(0);
  }
}

// Auto-start when script is run
const autoStart = new GinkoAutoStart();
autoStart.initialize().catch(console.error);