/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [escalation, cli, epic-004, human-intervention, multi-agent]
 * @related: [create.ts, list.ts, resolve.ts, escalation-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

/**
 * Escalation Commands (EPIC-004 Sprint 5 TASK-7)
 *
 * CLI commands for human escalation management in multi-agent collaboration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createEscalationCommand } from './create.js';
import { listEscalationsCommand } from './list.js';
import { resolveEscalationCommand } from './resolve.js';

/**
 * Main escalation command with subcommands
 */
export function escalationCommand() {
  const escalation = new Command('escalation')
    .description('Manage human escalations for multi-agent collaboration (EPIC-004)')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText(
      'after',
      `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko login')}                                     ${chalk.gray('# Authenticate first')}
  ${chalk.green('ginko escalation create')} --task TASK-1 \\
                               --reason "..." \\
                               --severity high              ${chalk.gray('# Create escalation')}
  ${chalk.green('ginko escalation list')} --status open             ${chalk.gray('# List open escalations')}
  ${chalk.green('ginko escalation resolve')} <id> \\
                                 --resolution "..."  ${chalk.gray('# Resolve escalation')}

${chalk.gray('Usage Examples:')}
  ${chalk.green('ginko escalation create')} --task TASK-5 --reason "Ambiguous requirements" --severity medium
  ${chalk.green('ginko escalation list')} --status open --severity critical
  ${chalk.green('ginko escalation list')} --task TASK-1
  ${chalk.green('ginko escalation resolve')} escalation_123 --resolution "Clarified in ADR-050"

${chalk.gray('Features:')}
  ${chalk.cyan('🚨 Escalation Creation')}  - Request human intervention
  ${chalk.cyan('📋 Escalation Discovery')} - List and filter escalations
  ${chalk.cyan('✅ Resolution Tracking')}  - Record human decisions
  ${chalk.cyan('🔄 Task Unblocking')}      - Resume work after resolution

${chalk.gray('Learn More:')}
  ${chalk.dim('https://docs.ginko.ai/escalations')}
`
    )
    .action(() => {
      // When called without subcommand, show help
      escalation.help({ error: false });
    });

  // Create command
  escalation
    .command('create')
    .description('Create a new escalation for human intervention')
    .requiredOption('--task <taskId>', 'Task ID requiring escalation (e.g., "TASK-1")')
    .requiredOption('--reason <reason>', 'Reason for escalation')
    .requiredOption('--severity <severity>', 'Severity level (low|medium|high|critical)')
    .option('--agent <agentId>', 'Agent ID (defaults to current agent from .ginko/agent.json)')
    .action(async (options) => {
      await createEscalationCommand(options);
    });

  // List command
  escalation
    .command('list')
    .description('List escalations with optional filtering')
    .option('--status <status>', 'Filter by status (open|acknowledged|resolved)')
    .option('--severity <severity>', 'Filter by severity (low|medium|high|critical)')
    .option('--task <taskId>', 'Filter by task ID')
    .option('--agent <agentId>', 'Filter by agent ID')
    .option('--limit <limit>', 'Max results (default 20, max 100)', '20')
    .option('--offset <offset>', 'Pagination offset (default 0)', '0')
    .action(async (options) => {
      await listEscalationsCommand(options);
    });

  // Resolve command
  escalation
    .command('resolve <id>')
    .description('Resolve an escalation with human decision')
    .requiredOption('--resolution <resolution>', 'Resolution details')
    .option('--resolved-by <email>', 'Email of person resolving (defaults to git user.email)')
    .action(async (id, options) => {
      await resolveEscalationCommand(id, options);
    });

  return escalation;
}

// Export for use in main CLI
export default escalationCommand;
