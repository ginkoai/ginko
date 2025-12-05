/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agent, heartbeat, epic-004, multi-agent]
 * @related: [event-queue.ts, ../commands/graph/api-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Agent Heartbeat Manager
 *
 * Sends periodic heartbeat signals to dashboard API to maintain agent online status.
 *
 * Pattern:
 * - Sends heartbeat every 30 seconds when active
 * - Uses .unref() on timer to allow process to exit if no other work pending
 * - Stale agents (no heartbeat for 5 min) marked offline by dashboard
 * - Offline agents excluded from task assignment
 *
 * Usage:
 * ```typescript
 * const { startHeartbeat, stopHeartbeat } = require('./agent-heartbeat');
 *
 * // Start heartbeat when agent becomes active
 * startHeartbeat('agent_123456_abc');
 *
 * // Stop heartbeat when agent deactivates
 * stopHeartbeat();
 * ```
 */

/**
 * Heartbeat configuration
 */
interface HeartbeatConfig {
  intervalMs: number;      // 30 seconds default
  dashboardUrl: string;    // Dashboard API base URL
}

const DEFAULT_CONFIG: HeartbeatConfig = {
  intervalMs: 30 * 1000,  // 30 seconds
  dashboardUrl: process.env.GINKO_DASHBOARD_URL || 'https://app.ginkoai.com',
};

/**
 * Global heartbeat state
 */
let heartbeatTimer: NodeJS.Timeout | null = null;
let currentAgentId: string | null = null;
let isShuttingDown = false;

/**
 * Send heartbeat to dashboard API
 *
 * @param agentId - Agent ID to send heartbeat for
 * @returns Promise that resolves when heartbeat is sent
 */
async function sendHeartbeat(agentId: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  try {
    // Import graph API client lazily
    const { sendAgentHeartbeat } = await import('../commands/graph/api-client.js');

    // Send heartbeat via API client
    await sendAgentHeartbeat(agentId);
  } catch (error) {
    // Log but don't throw - heartbeat failures shouldn't crash the CLI
    console.warn('[AgentHeartbeat] Failed to send heartbeat:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Start sending periodic heartbeats
 *
 * @param agentId - Agent ID to send heartbeats for
 * @param config - Optional configuration overrides
 */
export function startHeartbeat(agentId: string, config?: Partial<HeartbeatConfig>): void {
  if (heartbeatTimer) {
    console.warn('[AgentHeartbeat] Heartbeat already running, stopping previous instance');
    stopHeartbeat();
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  currentAgentId = agentId;

  console.log(`[AgentHeartbeat] Starting heartbeat for agent ${agentId} (interval: ${finalConfig.intervalMs / 1000}s)`);

  // Send initial heartbeat immediately
  sendHeartbeat(agentId).catch(error => {
    console.warn('[AgentHeartbeat] Initial heartbeat failed:', error instanceof Error ? error.message : String(error));
  });

  // Schedule periodic heartbeats
  // Use unref() to allow process to exit if no other work pending
  heartbeatTimer = setInterval(() => {
    sendHeartbeat(agentId).catch(error => {
      console.warn('[AgentHeartbeat] Scheduled heartbeat failed:', error instanceof Error ? error.message : String(error));
    });
  }, finalConfig.intervalMs);

  // Don't keep process alive just for this timer
  heartbeatTimer.unref();
}

/**
 * Stop sending heartbeats
 */
export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('[AgentHeartbeat] Heartbeat stopped');
  }
  currentAgentId = null;
}

/**
 * Graceful shutdown - send final heartbeat and stop
 */
export async function shutdownHeartbeat(): Promise<void> {
  console.log('[AgentHeartbeat] Initiating graceful shutdown...');
  isShuttingDown = true;

  // Send final heartbeat if we have an agent ID
  if (currentAgentId) {
    try {
      await sendHeartbeat(currentAgentId);
      console.log('[AgentHeartbeat] Final heartbeat sent');
    } catch (error) {
      console.warn('[AgentHeartbeat] Final heartbeat failed:', error instanceof Error ? error.message : String(error));
    }
  }

  // Stop timer
  stopHeartbeat();
  console.log('[AgentHeartbeat] Shutdown complete');
}

/**
 * Check if heartbeat is currently running
 *
 * @returns True if heartbeat is active
 */
export function isHeartbeatRunning(): boolean {
  return heartbeatTimer !== null;
}

/**
 * Get current agent ID (if heartbeat is running)
 *
 * @returns Current agent ID or null
 */
export function getCurrentAgentId(): string | null {
  return currentAgentId;
}
