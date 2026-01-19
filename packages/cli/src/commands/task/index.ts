/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-19
 * @tags: [cli, task, status, graph-authoritative, epic-015]
 * @related: [status.ts, ../graph/api-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander, chalk]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  completeCommand,
  startCommand,
  pauseCommand,
  blockCommand,
  showCommand,
} from './status.js';

/**
 * Task command with status management subcommands
 * EPIC-015 Sprint 1: CLI Status Commands
 *
 * Usage:
 *   ginko task complete <id>     Mark task as complete
 *   ginko task start <id>        Mark task as in progress
 *   ginko task pause <id>        Pause task (return to not_started)
 *   ginko task block <id> [why]  Block task with reason
 *   ginko task show <id>         Show task status
 */
export function taskStatusCommand() {
  const task = new Command('task')
    .description('Manage task status in the knowledge graph (EPIC-015)')
    .addHelpText('after', `
${chalk.gray('Status Commands:')}
  ${chalk.green('ginko task complete')} <id>        ${chalk.dim('Mark task as complete')}
  ${chalk.green('ginko task start')} <id>           ${chalk.dim('Mark task as in progress')}
  ${chalk.green('ginko task pause')} <id>           ${chalk.dim('Pause task (return to not_started)')}
  ${chalk.green('ginko task block')} <id> [reason]  ${chalk.dim('Block task with reason')}
  ${chalk.green('ginko task show')} <id>            ${chalk.dim('Show current task status')}

${chalk.gray('Options:')}
  ${chalk.dim('--cascade    Auto-complete parent sprint/epic if all children complete')}
  ${chalk.dim('--yes        Skip confirmation prompts (use with --cascade)')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko task complete e015_s01_t01')}
  ${chalk.green('ginko task start e015_s01_t02')}
  ${chalk.green('ginko task block e015_s01_t03 "Waiting for API review"')}
  ${chalk.green('ginko task complete e015_s01_t08 --cascade')}

${chalk.gray('Valid Task Statuses:')}
  ${chalk.dim('not_started  - Task pending (default)')}
  ${chalk.dim('in_progress  - Task actively being worked on')}
  ${chalk.dim('blocked      - Task blocked (requires reason)')}
  ${chalk.dim('complete     - Task finished')}
`)
    .action(() => {
      task.help({ error: false });
    });

  // Complete command
  task
    .command('complete <taskId>')
    .description('Mark task as complete')
    .option('--cascade', 'Auto-complete parent sprint/epic if all children complete')
    .option('--yes', 'Skip confirmation prompts (use with --cascade)')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (taskId, options) => {
      await completeCommand(taskId, options);
    });

  // Start command
  task
    .command('start <taskId>')
    .description('Mark task as in progress')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (taskId, options) => {
      await startCommand(taskId, options);
    });

  // Pause command
  task
    .command('pause <taskId>')
    .description('Pause task (return to not_started)')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (taskId, options) => {
      await pauseCommand(taskId, options);
    });

  // Block command
  task
    .command('block <taskId> [reason]')
    .description('Block task with reason (prompts if reason not provided)')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (taskId, reason, options) => {
      await blockCommand(taskId, reason, options);
    });

  // Show command
  task
    .command('show <taskId>')
    .description('Show current task status')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (taskId, options) => {
      await showCommand(taskId, options);
    });

  return task;
}

export default taskStatusCommand;
