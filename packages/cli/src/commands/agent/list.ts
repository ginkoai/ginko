/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agent, list, cli, epic-004, multi-agent]
 * @related: [index.ts, agent-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander, chalk, ora]
 */

/**
 * List Agents Command (EPIC-004 Sprint 1 TASK-6)
 *
 * List agents with optional filtering by status or capability
 */

import chalk from 'chalk';
import ora from 'ora';
import { AgentClient } from './agent-client.js';

interface ListOptions {
  status?: string;
  capability?: string;
  limit?: string;
  offset?: string;
}

/**
 * List agents with optional filtering
 */
export async function listAgentsCommand(options: ListOptions): Promise<void> {
  const spinner = ora('Fetching agents...').start();

  try {
    const limit = parseInt(options.limit || '20', 10);
    const offset = parseInt(options.offset || '0', 10);

    const response = await AgentClient.list({
      status: options.status,
      capability: options.capability,
      limit,
      offset,
    });

    spinner.succeed(chalk.green(`Found ${response.total} agent${response.total === 1 ? '' : 's'}`));
    console.log('');

    if (response.agents.length === 0) {
      console.log(chalk.dim('  No agents found'));

      if (options.status || options.capability) {
        console.log('');
        console.log(chalk.dim('💡 Try removing filters to see all agents:'));
        console.log(chalk.dim('  ginko agent list'));
      } else {
        console.log('');
        console.log(chalk.dim('💡 Register your first agent:'));
        console.log(chalk.dim('  ginko agent register --name "Worker-1" --capabilities typescript,testing'));
      }
      return;
    }

    // Display agents in a table-like format
    response.agents.forEach((agent, index) => {
      console.log(chalk.bold(`  ${agent.name}`));
      console.log(chalk.dim(`  ├─ ID: ${agent.id}`));
      console.log(chalk.dim(`  ├─ Status: ${getStatusBadge(agent.status)}`));
      console.log(chalk.dim(`  ├─ Capabilities: ${agent.capabilities.join(', ')}`));
      console.log(chalk.dim(`  ├─ Organization: ${agent.organizationId}`));
      console.log(chalk.dim(`  ├─ Created: ${formatDate(agent.createdAt)}`));
      console.log(chalk.dim(`  └─ Updated: ${formatDate(agent.updatedAt)}`));

      // Add spacing between agents (except last one)
      if (index < response.agents.length - 1) {
        console.log('');
      }
    });

    // Pagination info
    if (response.total > response.limit) {
      console.log('');
      console.log(chalk.dim(`  Showing ${response.offset + 1}-${Math.min(response.offset + response.limit, response.total)} of ${response.total} agents`));

      if (response.offset + response.limit < response.total) {
        const nextOffset = response.offset + response.limit;
        console.log('');
        console.log(chalk.dim('💡 View more:'));
        console.log(chalk.dim(`  ginko agent list --offset ${nextOffset}`));
      }
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to list agents'));

    // Handle specific error codes
    if (error.message.includes('Not authenticated')) {
      console.error(chalk.red('  Not authenticated. Run `ginko login` first.'));
    } else if (error.message.includes('INVALID_STATUS')) {
      console.error(chalk.red('  Invalid status. Must be one of: active, idle, busy, offline'));
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }

    process.exit(1);
  }
}

/**
 * Get colored status badge
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case 'active':
      return chalk.green('● active');
    case 'idle':
      return chalk.yellow('● idle');
    case 'busy':
      return chalk.blue('● busy');
    case 'offline':
      return chalk.gray('● offline');
    default:
      return status;
  }
}

/**
 * Format ISO date string to readable format
 */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return isoString;
  }
}
