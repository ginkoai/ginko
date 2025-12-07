/**
 * Example: Stale Agent Monitoring Service
 *
 * Demonstrates how to implement a periodic stale agent detection
 * and cleanup service for multi-agent orchestration.
 *
 * Usage:
 *   node dist/examples/stale-agent-monitor.example.js
 *
 * Environment Variables Required:
 *   GINKO_GRAPH_ID - Graph ID for agent tracking
 *   GINKO_BEARER_TOKEN - Authentication token
 */

import {
  detectAndReleaseStaleAgents,
  detectStaleAgents,
  releaseStaleAgentTasks,
  type StaleAgent,
  type ReleasedTask
} from '../packages/cli/src/lib/stale-agent-detector.js';

/**
 * Configuration
 */
const CONFIG = {
  // How often to check for stale agents (2 minutes)
  checkIntervalMs: 2 * 60 * 1000,

  // Grace period before marking agent as stale (5 minutes)
  gracePeriodMinutes: 5,

  // Graph ID from environment
  graphId: process.env.GINKO_GRAPH_ID,
};

/**
 * Main monitoring loop
 */
async function monitorStaleAgents() {
  console.log('[StaleAgentMonitor] Starting stale agent monitoring...');
  console.log(`[StaleAgentMonitor] Check interval: ${CONFIG.checkIntervalMs / 1000}s`);
  console.log(`[StaleAgentMonitor] Grace period: ${CONFIG.gracePeriodMinutes} minutes`);

  // Verify configuration
  if (!CONFIG.graphId) {
    throw new Error('GINKO_GRAPH_ID environment variable is required');
  }

  // Run checks periodically
  const timer = setInterval(async () => {
    await checkAndCleanup();
  }, CONFIG.checkIntervalMs);

  // Allow process to exit if no other work
  timer.unref();

  // Run initial check immediately
  await checkAndCleanup();

  console.log('[StaleAgentMonitor] Monitoring active. Press Ctrl+C to stop.');
}

/**
 * Check for stale agents and cleanup
 */
async function checkAndCleanup() {
  try {
    console.log('\n[StaleAgentMonitor] Running stale agent check...');

    // Detect and release in one call
    const result = await detectAndReleaseStaleAgents({
      gracePeriodMinutes: CONFIG.gracePeriodMinutes,
      graphId: CONFIG.graphId,
    });

    if (result.staleAgents.length === 0) {
      console.log('[StaleAgentMonitor] ✓ No stale agents detected');
      return;
    }

    // Log results
    console.log(`[StaleAgentMonitor] ⚠️  Found ${result.staleAgents.length} stale agent(s)`);
    console.log(`[StaleAgentMonitor] ✓ Released ${result.releasedTasks.length} task(s)`);

    // Log details for each stale agent
    for (const agent of result.staleAgents) {
      console.log(`[StaleAgentMonitor]   - ${agent.agentId}`);
      console.log(`[StaleAgentMonitor]     Last heartbeat: ${agent.lastHeartbeat.toISOString()}`);
      console.log(`[StaleAgentMonitor]     Tasks released: ${agent.claimedTasks.length}`);
    }

    // Log details for each released task
    if (result.releasedTasks.length > 0) {
      console.log('[StaleAgentMonitor] Released tasks:');
      for (const task of result.releasedTasks) {
        console.log(`[StaleAgentMonitor]   - ${task.taskId} (from ${task.previousAgent})`);
      }
    }
  } catch (error) {
    console.error('[StaleAgentMonitor] Error during check:', error);
    // Don't crash - continue monitoring
  }
}

/**
 * Alternative: Manual two-step detection and release
 *
 * Useful when you want to inspect stale agents before releasing
 */
async function manualDetectionExample() {
  console.log('[Example] Manual detection and release...\n');

  // Step 1: Detect stale agents (read-only)
  const staleAgents = await detectStaleAgents({
    gracePeriodMinutes: 5,
    graphId: CONFIG.graphId,
  });

  if (staleAgents.length === 0) {
    console.log('No stale agents found');
    return;
  }

  console.log(`Found ${staleAgents.length} stale agent(s):`);
  for (const agent of staleAgents) {
    console.log(`  - ${agent.agentId}`);
    console.log(`    Last heartbeat: ${agent.lastHeartbeat.toISOString()}`);
    console.log(`    Claimed tasks: ${agent.claimedTasks.join(', ')}`);
  }

  // Step 2: Decide which agents to release (could involve human approval)
  console.log('\nReleasing tasks from stale agents...');

  for (const agent of staleAgents) {
    const releasedTasks = await releaseStaleAgentTasks(agent.agentId, {
      graphId: CONFIG.graphId,
    });

    console.log(`  Released ${releasedTasks.length} task(s) from ${agent.agentId}`);
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', () => {
  console.log('\n[StaleAgentMonitor] Shutting down...');
  process.exit(0);
});

/**
 * Error handler
 */
process.on('unhandledRejection', (error) => {
  console.error('[StaleAgentMonitor] Unhandled error:', error);
  process.exit(1);
});

/**
 * Start monitoring
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  monitorStaleAgents().catch((error) => {
    console.error('[StaleAgentMonitor] Fatal error:', error);
    process.exit(1);
  });
}

export { monitorStaleAgents, checkAndCleanup, manualDetectionExample };
