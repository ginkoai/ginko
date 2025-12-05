/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agent, status, cli, epic-004, multi-agent]
 * @related: [index.ts, agent-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Agent Status Command (EPIC-004 Sprint 1 TASK-6)
 *
 * Show current agent status from local config
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { requireGinkoRoot } from '../../utils/ginko-root.js';

interface AgentConfig {
  agentId: string;
  name: string;
  capabilities: string[];
  status: string;
  organizationId: string;
  registeredAt: string;
}

/**
 * Show current agent status
 */
export async function statusAgentCommand(): Promise<void> {
  const spinner = ora('Loading agent status...').start();

  try {
    // Load agent config from .ginko/agent.json
    const projectRoot = await requireGinkoRoot();
    const agentConfigPath = path.join(projectRoot, '.ginko', 'agent.json');

    let config: AgentConfig;
    try {
      const configData = await fs.readFile(agentConfigPath, 'utf-8');
      config = JSON.parse(configData);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        spinner.fail(chalk.yellow('No agent registered'));
        console.log('');
        console.log(chalk.dim('💡 Register an agent first:'));
        console.log(chalk.dim('  ginko agent register --name "Worker-1" --capabilities typescript,testing'));
        process.exit(1);
      }
      throw error;
    }

    spinner.succeed(chalk.green('Agent status'));
    console.log('');
    console.log(chalk.bold(`  ${config.name}`));
    console.log(chalk.dim(`  ID: ${config.agentId}`));
    console.log(chalk.dim(`  Organization: ${config.organizationId}`));
    console.log(chalk.dim(`  Status: ${getStatusBadge(config.status)}`));
    console.log(chalk.dim(`  Capabilities: ${config.capabilities.join(', ')}`));
    console.log(chalk.dim(`  Registered: ${formatDate(config.registeredAt)}`));
    console.log('');
    console.log(chalk.dim('  Config stored at: .ginko/agent.json'));
    console.log('');
    console.log(chalk.dim('💡 View all agents:'));
    console.log(chalk.dim('  ginko agent list'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load agent status'));
    console.error(chalk.red(`  ${error.message}`));
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
