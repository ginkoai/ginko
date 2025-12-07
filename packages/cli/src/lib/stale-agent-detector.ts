/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [agent, stale-detection, epic-004, multi-agent, resilience]
 * @related: [agent-heartbeat.ts, ../commands/graph/api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Stale Agent Detector
 *
 * Detects agents that have stopped sending heartbeats and releases their claimed tasks.
 *
 * Pattern:
 * - Agents stale if no heartbeat for grace period (default 5 minutes)
 * - Stale agents marked offline
 * - Tasks claimed by stale agents released for re-claiming
 * - Events logged for audit trail
 *
 * Usage:
 * ```typescript
 * const { detectStaleAgents, releaseStaleAgentTasks } = require('./stale-agent-detector');
 *
 * // Detect and handle stale agents (typically in periodic job)
 * const staleAgents = await detectStaleAgents();
 * for (const agent of staleAgents) {
 *   await releaseStaleAgentTasks(agent.agentId);
 * }
 *
 * // Check specific agent heartbeat
 * const lastHeartbeat = await getAgentLastHeartbeat('agent_123456_abc');
 * ```
 */

/**
 * Stale agent information
 */
export interface StaleAgent {
  agentId: string;
  lastHeartbeat: Date;
  staleSince: Date;
  claimedTasks: string[];
}

/**
 * Released task information
 */
export interface ReleasedTask {
  taskId: string;
  previousAgent: string;
  releasedAt: Date;
}

/**
 * Configuration for stale detection
 */
export interface StaleDetectionConfig {
  gracePeriodMinutes?: number;  // Default 5 minutes
  graphId?: string;             // Graph ID (from config)
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<StaleDetectionConfig> = {
  gracePeriodMinutes: 5,
  graphId: process.env.GINKO_GRAPH_ID || '',
};

/**
 * Detect stale agents
 *
 * Identifies agents that haven't sent a heartbeat within the grace period
 * and are not already marked as offline.
 *
 * @param config - Optional configuration overrides
 * @returns Array of stale agents with their claimed tasks
 */
export async function detectStaleAgents(
  config?: StaleDetectionConfig
): Promise<StaleAgent[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.graphId) {
    throw new Error('Graph ID not configured. Set GINKO_GRAPH_ID environment variable.');
  }

  try {
    // Import graph API client lazily
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    // Call stale detection API
    const response = await client.request<{
      staleAgents: Array<{
        agentId: string;
        lastHeartbeat: string;
        staleSince: string;
        claimedTasks: string[];
      }>;
      gracePeriodMinutes: number;
    }>(
      'GET',
      `/api/v1/agent/stale?graphId=${finalConfig.graphId}&gracePeriod=${finalConfig.gracePeriodMinutes}`
    );

    // Convert to StaleAgent objects
    return response.staleAgents.map((agent) => ({
      agentId: agent.agentId,
      lastHeartbeat: new Date(agent.lastHeartbeat),
      staleSince: new Date(agent.staleSince),
      claimedTasks: agent.claimedTasks,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[StaleAgentDetector] Failed to detect stale agents:', errorMessage);
    throw error;
  }
}

/**
 * Release tasks claimed by a stale agent
 *
 * Marks agent as offline and releases all tasks it has claimed,
 * making them available for other agents to claim.
 *
 * @param agentId - Agent ID to release tasks for
 * @param config - Optional configuration overrides
 * @returns Array of released tasks
 */
export async function releaseStaleAgentTasks(
  agentId: string,
  config?: StaleDetectionConfig
): Promise<ReleasedTask[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.graphId) {
    throw new Error('Graph ID not configured. Set GINKO_GRAPH_ID environment variable.');
  }

  try {
    // Import graph API client lazily
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    // Call release API
    const response = await client.request<{
      success: boolean;
      agentId: string;
      releasedTasks: Array<{
        taskId: string;
        previousAgent: string;
        releasedAt: string;
      }>;
    }>(
      'POST',
      `/api/v1/agent/stale/release?graphId=${finalConfig.graphId}`,
      { agentId }
    );

    if (!response.success) {
      throw new Error(`Failed to release tasks for agent ${agentId}`);
    }

    // Convert to ReleasedTask objects
    return response.releasedTasks.map((task) => ({
      taskId: task.taskId,
      previousAgent: task.previousAgent,
      releasedAt: new Date(task.releasedAt),
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[StaleAgentDetector] Failed to release stale agent tasks:', errorMessage);
    throw error;
  }
}

/**
 * Get last heartbeat timestamp for an agent
 *
 * @param agentId - Agent ID to check
 * @param config - Optional configuration overrides
 * @returns Last heartbeat timestamp or null if not found
 */
export async function getAgentLastHeartbeat(
  agentId: string,
  config?: StaleDetectionConfig
): Promise<Date | null> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.graphId) {
    throw new Error('Graph ID not configured. Set GINKO_GRAPH_ID environment variable.');
  }

  try {
    // Import graph API client lazily
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    // Call agent details API
    const response = await client.request<{
      agent: {
        id: string;
        lastHeartbeat: string | null;
        status: string;
      };
    }>(
      'GET',
      `/api/v1/agent/${agentId}?graphId=${finalConfig.graphId}`
    );

    if (!response.agent.lastHeartbeat) {
      return null;
    }

    return new Date(response.agent.lastHeartbeat);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[StaleAgentDetector] Failed to get agent heartbeat:', errorMessage);

    // If agent not found, return null instead of throwing
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return null;
    }

    throw error;
  }
}

/**
 * Detect and release all stale agents
 *
 * Convenience method that detects stale agents and releases their tasks.
 * Typically used in periodic cleanup jobs.
 *
 * @param config - Optional configuration overrides
 * @returns Summary of stale agents and released tasks
 */
export async function detectAndReleaseStaleAgents(
  config?: StaleDetectionConfig
): Promise<{
  staleAgents: StaleAgent[];
  releasedTasks: ReleasedTask[];
}> {
  console.log('[StaleAgentDetector] Starting stale agent detection...');

  const staleAgents = await detectStaleAgents(config);

  if (staleAgents.length === 0) {
    console.log('[StaleAgentDetector] No stale agents detected');
    return { staleAgents: [], releasedTasks: [] };
  }

  console.log(`[StaleAgentDetector] Found ${staleAgents.length} stale agent(s)`);

  const allReleasedTasks: ReleasedTask[] = [];

  for (const agent of staleAgents) {
    console.log(`[StaleAgentDetector] Releasing tasks for stale agent ${agent.agentId}...`);

    try {
      const releasedTasks = await releaseStaleAgentTasks(agent.agentId, config);
      allReleasedTasks.push(...releasedTasks);

      console.log(`[StaleAgentDetector] Released ${releasedTasks.length} task(s) from ${agent.agentId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[StaleAgentDetector] Failed to release tasks for ${agent.agentId}:`, errorMessage);
      // Continue with other agents even if one fails
    }
  }

  console.log(`[StaleAgentDetector] Complete: ${staleAgents.length} stale agent(s), ${allReleasedTasks.length} task(s) released`);

  return { staleAgents, releasedTasks: allReleasedTasks };
}
