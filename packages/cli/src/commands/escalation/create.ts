/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [escalation, create, cli, epic-004, human-intervention]
 * @related: [index.ts, escalation-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Create Escalation Command (EPIC-004 Sprint 5 TASK-7)
 *
 * Create a new escalation requesting human intervention
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { EscalationClient } from './escalation-client.js';
import { requireGinkoRoot } from '../../utils/ginko-root.js';

interface CreateOptions {
  task: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  agent?: string;
}

interface AgentConfig {
  agentId: string;
  name: string;
}

/**
 * Load agent config from .ginko/agent.json
 */
async function loadAgentConfig(): Promise<AgentConfig | null> {
  try {
    const projectRoot = await requireGinkoRoot();
    const agentConfigPath = path.join(projectRoot, '.ginko', 'agent.json');

    const content = await fs.readFile(agentConfigPath, 'utf-8');
    const config = JSON.parse(content);

    if (!config.agentId) {
      return null;
    }

    return config;
  } catch (error) {
    return null;
  }
}

/**
 * Create a new escalation
 */
export async function createEscalationCommand(options: CreateOptions): Promise<void> {
  const spinner = ora('Creating escalation...').start();

  try {
    // Validate severity
    if (!['low', 'medium', 'high', 'critical'].includes(options.severity)) {
      spinner.fail(chalk.red('Failed to create escalation'));
      console.error(chalk.red('  Severity must be one of: low, medium, high, critical'));
      process.exit(1);
    }

    // Get agent ID
    let agentId = options.agent;
    if (!agentId) {
      const agentConfig = await loadAgentConfig();
      if (!agentConfig) {
        spinner.fail(chalk.red('Failed to create escalation'));
        console.error(chalk.red('  No agent found. Either:'));
        console.error(chalk.red('    - Use --agent <agentId> to specify agent'));
        console.error(chalk.red('    - Run "ginko agent register" to register current agent'));
        process.exit(1);
      }
      agentId = agentConfig.agentId;
    }

    // Create escalation via API
    const response = await EscalationClient.create({
      taskId: options.task,
      agentId,
      reason: options.reason,
      severity: options.severity,
    });

    if (!response.escalationId) {
      spinner.fail(chalk.red('Failed to create escalation'));
      console.error(chalk.red('  No escalation ID returned from API'));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Escalation created successfully'));
    console.log('');
    console.log(chalk.bold(`  ${response.reason}`));
    console.log(chalk.dim(`  ID: ${response.escalationId}`));
    console.log(chalk.dim(`  Task: ${response.taskId}`));
    console.log(chalk.dim(`  Severity: ${response.severity}`));
    console.log(chalk.dim(`  Status: ${response.status}`));
    console.log(chalk.dim(`  Created: ${new Date(response.createdAt).toLocaleString()}`));
    console.log('');

    // Show severity-based guidance
    if (response.severity === 'critical') {
      console.log(chalk.red('⚠️  CRITICAL escalation - immediate attention required'));
    } else if (response.severity === 'high') {
      console.log(chalk.yellow('⚠️  HIGH priority - requires prompt attention'));
    }

    console.log('');
    console.log(chalk.dim('💡 Next steps:'));
    console.log(chalk.dim('  ginko escalation list --status open    # View all open escalations'));
    console.log(chalk.dim(`  ginko escalation resolve ${response.escalationId.substring(0, 20)}... --resolution "..."  # Resolve when ready`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to create escalation'));

    // Handle specific error codes
    if (error.message.includes('Not authenticated')) {
      console.error(chalk.red('  Not authenticated. Run `ginko login` first.'));
    } else if (error.message.includes('MISSING_TASK_ID')) {
      console.error(chalk.red('  Task ID is required'));
    } else if (error.message.includes('MISSING_AGENT_ID')) {
      console.error(chalk.red('  Agent ID is required'));
    } else if (error.message.includes('MISSING_REASON')) {
      console.error(chalk.red('  Reason is required'));
    } else if (error.message.includes('INVALID_SEVERITY')) {
      console.error(chalk.red('  Invalid severity. Must be: low, medium, high, critical'));
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }

    process.exit(1);
  }
}
