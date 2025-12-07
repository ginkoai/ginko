/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agent, cli, epic-004, multi-agent, collaboration]
 * @related: [register.ts, list.ts, status.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

/**
 * Agent Commands (EPIC-004 Sprint 1 TASK-6)
 *
 * CLI commands for AI-to-AI collaboration agent management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { registerAgentCommand } from './register.js';
import { listAgentsCommand } from './list.js';
import { statusAgentCommand } from './status.js';
import { workAgentCommand } from './work.js';

/**
 * Main agent command with subcommands
 */
export function agentCommand() {
  const agent = new Command('agent')
    .description('Manage AI agents for multi-agent collaboration (EPIC-004)')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText(
      'after',
      `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko login')}                                     ${chalk.gray('# Authenticate first')}
  ${chalk.green('ginko agent register')} --name "Worker-1" \\
                            --capabilities typescript,testing  ${chalk.gray('# Register agent')}
  ${chalk.green('ginko agent list')}                                ${chalk.gray('# List all agents')}
  ${chalk.green('ginko agent status')}                              ${chalk.gray('# Show current agent')}

${chalk.gray('Usage Examples:')}
  ${chalk.green('ginko agent register')} --name "Backend-Agent" --capabilities typescript,nodejs,api
  ${chalk.green('ginko agent list')} --status active
  ${chalk.green('ginko agent list')} --capability typescript
  ${chalk.green('ginko agent status')}

${chalk.gray('Features:')}
  ${chalk.cyan('🤖 Agent Registration')}   - Register agents with capabilities
  ${chalk.cyan('📋 Agent Discovery')}      - List and filter available agents
  ${chalk.cyan('📊 Agent Status')}         - View current agent details
  ${chalk.cyan('🔄 Multi-Agent Collab')}   - Enable AI-to-AI collaboration

${chalk.gray('Learn More:')}
  ${chalk.dim('https://docs.ginko.ai/multi-agent')}
`
    )
    .action(() => {
      // When called without subcommand, show help
      agent.help({ error: false });
    });

  // Register command
  agent
    .command('register')
    .description('Register a new agent with capabilities')
    .requiredOption('--name <name>', 'Agent name (e.g., "Worker-1", "Backend-Agent")')
    .requiredOption('--capabilities <capabilities>', 'Comma-separated capabilities (e.g., "typescript,testing,api")')
    .option('--status <status>', 'Initial status (active|idle|busy|offline)', 'active')
    .action(async (options) => {
      await registerAgentCommand(options);
    });

  // List command
  agent
    .command('list')
    .description('List agents with optional filtering')
    .option('--status <status>', 'Filter by status (active|idle|busy|offline)')
    .option('--capability <capability>', 'Filter by capability')
    .option('--limit <limit>', 'Max results (default 20, max 100)', '20')
    .option('--offset <offset>', 'Pagination offset (default 0)', '0')
    .action(async (options) => {
      await listAgentsCommand(options);
    });

  // Status command
  agent
    .command('status')
    .description('Show current agent status and details')
    .action(async () => {
      await statusAgentCommand();
    });

  // Work command (EPIC-004 Sprint 4 TASK-8)
  agent
    .command('work')
    .description('Start worker agent that loads context and polls for task assignments')
    .option('--name <name>', 'Agent name (required if not already registered)')
    .option('--capabilities <capabilities>', 'Comma-separated capabilities (required if not already registered)')
    .option('--poll-interval <seconds>', 'Task polling interval in seconds (default: 5)', '5')
    .option('--max-tasks <count>', 'Max tasks to process before exiting (0 = unlimited)', '0')
    .addHelpText('after', `
${chalk.gray('Worker Agent Flow:')}
  ${chalk.dim('1. Register as worker agent (or use existing from .ginko/agent.json)')}
  ${chalk.dim('2. Call ginko start to load project context (events, patterns, ADRs)')}
  ${chalk.dim('3. Start heartbeat to maintain online status')}
  ${chalk.dim('4. Enter polling loop for task assignments')}
  ${chalk.dim('5. On assignment: claim task atomically, load task-specific context')}
  ${chalk.dim('6. Execute task (AI does the work), log events, verify')}
  ${chalk.dim('7. Report completion/blocker via events')}
  ${chalk.dim('8. Return to polling')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko agent work --name "Worker-1" --capabilities typescript,testing')}
  ${chalk.green('ginko agent work')} ${chalk.dim('# Uses existing agent from .ginko/agent.json')}
  ${chalk.green('ginko agent work --poll-interval 10')} ${chalk.dim('# Poll every 10 seconds')}
  ${chalk.green('ginko agent work --max-tasks 5')} ${chalk.dim('# Process 5 tasks then exit')}
`)
    .action(async (options) => {
      await workAgentCommand({
        name: options.name,
        capabilities: options.capabilities,
        pollInterval: parseInt(options.pollInterval, 10),
        maxTasks: parseInt(options.maxTasks, 10),
      });
    });

  return agent;
}

// Export for use in main CLI
export default agentCommand;
