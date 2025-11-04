/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-31
 * @tags: [graph, status, cli]
 * @related: [api-client.ts, config.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [chalk, api-client, config]
 */

import chalk from 'chalk';
import { GraphApiClient } from './api-client.js';
import { loadGraphConfig, isGraphInitialized } from './config.js';

/**
 * Show graph status and statistics
 */
export async function statusCommand(): Promise<void> {
  try {
    // Check if graph is initialized
    if (!await isGraphInitialized()) {
      console.log(chalk.yellow('⚠️  Graph not initialized'));
      console.log(chalk.dim('Run "ginko graph init" to create your knowledge graph'));
      return;
    }

    const config = await loadGraphConfig();
    if (!config) {
      console.log(chalk.red('✗ Failed to load graph configuration'));
      return;
    }

    console.log(chalk.green('\n🌿 Knowledge Graph Status'));
    console.log(chalk.gray('─'.repeat(50)));

    // Get status from API
    const client = new GraphApiClient(config.apiEndpoint);

    console.log(chalk.dim('Fetching graph statistics...'));
    const status = await client.getGraphStatus(config.graphId);

    // Display connection info
    console.log(`\n${chalk.bold('Connection')}: ${chalk.green('✓')} Connected to ${config.apiEndpoint}`);
    console.log(`${chalk.bold('Namespace')}: ${status.namespace}`);
    console.log(`${chalk.bold('Visibility')}: ${status.visibility}`);

    // Display document counts
    console.log(`\n${chalk.bold('Documents')}:`);
    for (const [type, count] of Object.entries(status.nodes.byType)) {
      const emoji = type === 'ADR' ? '📄' :
                    type === 'PRD' ? '📋' :
                    type === 'Pattern' ? '🎨' :
                    type === 'Gotcha' ? '⚠️' :
                    type === 'Session' ? '📝' : '📁';
      console.log(`  ${emoji} ${type}: ${chalk.cyan(count)} nodes ${chalk.dim(`(${count} with embeddings)`)}`);
    }
    console.log(`  ${chalk.bold('TOTAL')}: ${chalk.green(status.nodes.total)} nodes`);

    // Display relationship counts
    console.log(`\n${chalk.bold('Relationships')}:`);
    for (const [type, count] of Object.entries(status.relationships.byType)) {
      const description =
        type === 'SIMILAR_TO' ? 'vector similarity' :
        type === 'APPLIES_TO' ? 'patterns/modules apply to docs' :
        type === 'REFERENCES' ? 'explicit mentions' :
        type === 'IMPLEMENTS' ? 'ADRs implement PRDs' :
        type === 'LEARNED_FROM' ? 'patterns from sessions' :
        type === 'SUPERSEDES' ? 'ADR replaces another' :
        type === 'MITIGATED_BY' ? 'gotcha mitigation' : '';
      console.log(`  ${type}: ${chalk.cyan(count)} ${chalk.dim(`(${description})`)}`);
    }
    console.log(`  ${chalk.bold('TOTAL')}: ${chalk.green(status.relationships.total)} relationships`);

    // Display health and sync info
    console.log(`\n${chalk.bold('Health')}: ${status.health === 'healthy' ? chalk.green('✓ Healthy') : chalk.yellow('⚠ Issues detected')}`);
    console.log(`${chalk.bold('Last sync')}: ${chalk.dim(new Date(status.lastSync).toLocaleString())}`);

    // Display statistics if available
    if (status.stats) {
      console.log(`\n${chalk.bold('Statistics')}:`);
      console.log(`  Average connections: ${chalk.cyan(status.stats.averageConnections.toFixed(1))}`);
      console.log(`  Most connected: ${chalk.cyan(status.stats.mostConnected.id)} (${status.stats.mostConnected.connections} connections)`);
    }

    console.log(chalk.gray('\n─'.repeat(50)));

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));

      if (error.message.includes('Not authenticated')) {
        console.log(chalk.dim('\nRun "ginko login" to authenticate with Ginko Cloud'));
      }
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }
    process.exit(1);
  }
}
