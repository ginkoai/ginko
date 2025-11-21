/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-21
 * @tags: [monitoring, health-check, graph, task-013]
 * @related: [../../utils/graph-health-monitor.ts, api-client.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [chalk]
 */

import chalk from 'chalk';
import { graphHealthMonitor } from '../../utils/graph-health-monitor.js';

/**
 * Display graph health metrics (TASK-013)
 *
 * Shows:
 * - Success/failure rates
 * - Average latency
 * - Retry count
 * - Last error (if any)
 * - Health status vs. target (99.9%)
 */
export async function healthCommand(): Promise<void> {
  console.log(chalk.bold('\n📊 Graph Health Monitoring (TASK-013)\n'));

  const summary = graphHealthMonitor.getHealthSummary();
  console.log(summary);

  const metrics = graphHealthMonitor.getMetrics();

  if (metrics.lastError) {
    console.log(chalk.red('\n⚠️  Last Error:'));
    console.log(chalk.dim(`   Operation: ${metrics.lastError.operation}`));
    console.log(chalk.dim(`   Message:   ${metrics.lastError.message}`));
    console.log(chalk.dim(`   Time:      ${metrics.lastError.timestamp.toISOString()}`));
  }

  console.log(chalk.dim('\n💡 Tip: Health metrics are tracked in-memory during CLI runtime'));
  console.log(chalk.dim('   Run ginko commands to see metrics update in real-time\n'));
}
