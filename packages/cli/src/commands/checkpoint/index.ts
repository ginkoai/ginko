/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [checkpoint, cli, epic-004-sprint5, task-1, resilience]
 * @related: [create.ts, list.ts, show.ts, checkpoint.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

/**
 * Checkpoint Commands (EPIC-004 Sprint 5 TASK-1)
 *
 * CLI commands for creating, listing, and inspecting checkpoints
 * Checkpoints enable rollback and recovery for multi-agent task execution
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createCheckpointCommand } from './create.js';
import { listCheckpointsCommand } from './list.js';
import { showCheckpointCommand } from './show.js';

/**
 * Main checkpoint command with subcommands
 */
export function checkpointCommand() {
  const checkpoint = new Command('checkpoint')
    .description('Manage checkpoints for task rollback and recovery (EPIC-004)')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText(
      'after',
      `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko checkpoint create')} --task TASK-1 --message "Before refactor"  ${chalk.gray('# Create checkpoint')}
  ${chalk.green('ginko checkpoint list')} --task TASK-1                               ${chalk.gray('# List task checkpoints')}
  ${chalk.green('ginko checkpoint show')} cp_xxx                                      ${chalk.gray('# Show checkpoint details')}

${chalk.gray('Usage Examples:')}
  ${chalk.green('ginko checkpoint create')} --task TASK-1 --message "Completed authentication"
  ${chalk.green('ginko checkpoint create')} --task TASK-2  ${chalk.dim('# Auto-generated message')}
  ${chalk.green('ginko checkpoint list')}  ${chalk.dim('# List all checkpoints')}
  ${chalk.green('ginko checkpoint list')} --task TASK-1  ${chalk.dim('# Filter by task')}
  ${chalk.green('ginko checkpoint show')} cp_1701234567_a1b2c3d4

${chalk.gray('Features:')}
  ${chalk.cyan('📸 Lightweight Snapshots')}  - Captures git commit, files, event stream position
  ${chalk.cyan('🔄 Quick Recovery')}         - Roll back to any checkpoint using git operations
  ${chalk.cyan('🔍 Task Filtering')}         - List checkpoints for specific tasks
  ${chalk.cyan('📊 Detailed Inspection')}    - View checkpoint metadata and state

${chalk.gray('Checkpoint Structure:')}
  ${chalk.dim('Checkpoints store references to work state:')}
  ${chalk.dim('- Git commit hash (current HEAD)')}
  ${chalk.dim('- Modified files since task start')}
  ${chalk.dim('- Event stream position (last event ID)')}
  ${chalk.dim('- Optional message and metadata')}

${chalk.gray('Learn More:')}
  ${chalk.dim('https://docs.ginko.ai/checkpoints')}
`
    )
    .action(() => {
      // When called without subcommand, show help
      checkpoint.help({ error: false });
    });

  // Create command
  checkpoint
    .command('create')
    .description('Create a checkpoint for current work state')
    .requiredOption('--task <taskId>', 'Task ID for this checkpoint (e.g., TASK-1)')
    .option('--message <message>', 'Optional description of checkpoint')
    .option('--agent <agentId>', 'Agent ID (auto-detected if not provided)')
    .action(async (options) => {
      await createCheckpointCommand(options);
    });

  // List command
  checkpoint
    .command('list')
    .description('List checkpoints with optional task filtering')
    .option('--task <taskId>', 'Filter by task ID')
    .action(async (options) => {
      await listCheckpointsCommand(options);
    });

  // Show command
  checkpoint
    .command('show <checkpointId>')
    .description('Show detailed checkpoint information')
    .action(async (checkpointId) => {
      await showCheckpointCommand(checkpointId);
    });

  return checkpoint;
}

// Export for use in main CLI
export default checkpointCommand;
