/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agent, register, cli, epic-004, multi-agent]
 * @related: [index.ts, agent-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Register Agent Command (EPIC-004 Sprint 1 TASK-6)
 *
 * Register a new agent with capabilities and store ID locally
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { AgentClient } from './agent-client.js';
import { requireGinkoRoot } from '../../utils/ginko-root.js';

interface RegisterOptions {
  name: string;
  capabilities: string;
  status?: 'active' | 'idle' | 'busy' | 'offline';
}

interface AgentConfig {
  agentId: string;
  name: string;
  capabilities: string[];
  status: string;
  organizationId: string;
  registeredAt: string;
}

/**
 * Register a new agent
 */
export async function registerAgentCommand(options: RegisterOptions): Promise<void> {
  const spinner = ora('Registering agent...').start();

  try {
    // Parse capabilities (comma-separated)
    const capabilities = options.capabilities
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (capabilities.length === 0) {
      spinner.fail(chalk.red('Failed to register agent'));
      console.error(chalk.red('  At least one capability is required'));
      process.exit(1);
    }

    // Register agent via API
    const response = await AgentClient.register({
      name: options.name,
      capabilities,
      status: options.status || 'active',
    });

    if (!response.agentId) {
      spinner.fail(chalk.red('Failed to register agent'));
      console.error(chalk.red('  No agent ID returned from API'));
      process.exit(1);
    }

    // Store agent config locally in .ginko/agent.json
    const projectRoot = await requireGinkoRoot();
    const ginkoDir = path.join(projectRoot, '.ginko');
    const agentConfigPath = path.join(ginkoDir, 'agent.json');

    const agentConfig: AgentConfig = {
      agentId: response.agentId,
      name: response.name,
      capabilities: response.capabilities,
      status: response.status,
      organizationId: response.organizationId,
      registeredAt: response.createdAt,
    };

    // Ensure .ginko directory exists
    await fs.mkdir(ginkoDir, { recursive: true });

    // Write agent config
    await fs.writeFile(
      agentConfigPath,
      JSON.stringify(agentConfig, null, 2),
      'utf-8'
    );

    spinner.succeed(chalk.green('Agent registered successfully'));
    console.log('');
    console.log(chalk.bold(`  ${response.name}`));
    console.log(chalk.dim(`  ID: ${response.agentId}`));
    console.log(chalk.dim(`  Organization: ${response.organizationId}`));
    console.log(chalk.dim(`  Status: ${response.status}`));
    console.log(chalk.dim(`  Capabilities: ${response.capabilities.join(', ')}`));
    console.log('');
    console.log(chalk.dim('  Config stored at: .ginko/agent.json'));
    console.log('');
    console.log(chalk.dim('💡 Next steps:'));
    console.log(chalk.dim('  ginko agent list              # List all agents'));
    console.log(chalk.dim('  ginko agent status            # View current agent'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to register agent'));

    // Handle specific error codes
    if (error.message.includes('Not authenticated')) {
      console.error(chalk.red('  Not authenticated. Run `ginko login` first.'));
    } else if (error.message.includes('MISSING_NAME')) {
      console.error(chalk.red('  Agent name is required'));
    } else if (error.message.includes('MISSING_CAPABILITIES')) {
      console.error(chalk.red('  At least one capability is required'));
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }

    process.exit(1);
  }
}
