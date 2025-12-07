/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [checkpoint, list, cli, epic-004-sprint5, task-1]
 * @related: [checkpoint.ts, create.ts, show.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, cli-table3, checkpoint]
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { listCheckpoints, getLatestCheckpoint } from '../../lib/checkpoint.js';

interface ListCheckpointsOptions {
  task?: string;
}

/**
 * List checkpoints with optional task filtering
 *
 * Displays:
 * - Checkpoint ID
 * - Timestamp
 * - Git commit (short hash)
 * - Modified file count
 * - Message (if provided)
 * - Latest marker
 */
export async function listCheckpointsCommand(options: ListCheckpointsOptions): Promise<void> {
  try {
    // Get checkpoints (optionally filtered by task)
    const checkpoints = await listCheckpoints(options.task);

    if (checkpoints.length === 0) {
      if (options.task) {
        console.log(chalk.yellow(`\n⚠️  No checkpoints found for task ${chalk.bold(options.task)}`));
        console.log(chalk.dim('Create one with: ginko checkpoint create --task ' + options.task));
      } else {
        console.log(chalk.yellow('\n⚠️  No checkpoints found'));
        console.log(chalk.dim('Create one with: ginko checkpoint create --task TASK-1'));
      }
      return;
    }

    // Get latest checkpoint for marking
    const latestCheckpoint = options.task
      ? await getLatestCheckpoint(options.task)
      : checkpoints[0]; // Already sorted by timestamp desc

    // Display header
    console.log(chalk.green(`\n📸 Checkpoints ${options.task ? `for ${chalk.bold(options.task)}` : ''}`));
    console.log(chalk.gray('─'.repeat(80)));

    // Create table
    const table = new Table({
      head: ['ID', 'Timestamp', 'Commit', 'Files', 'Message'],
      style: {
        head: ['cyan'],
        border: ['gray']
      },
      colWidths: [25, 20, 10, 8, 35],
      wordWrap: true
    });

    // Add checkpoint rows
    checkpoints.forEach((checkpoint) => {
      const isLatest = latestCheckpoint?.id === checkpoint.id;

      // Format ID with latest marker
      const idText = isLatest
        ? chalk.cyan(checkpoint.id) + chalk.yellow(' (latest)')
        : chalk.dim(checkpoint.id);

      // Format timestamp
      const timestamp = checkpoint.timestamp.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Format commit hash (short)
      const commitShort = checkpoint.gitCommit.substring(0, 7);
      const commitText = isLatest ? chalk.cyan(commitShort) : chalk.dim(commitShort);

      // Format file count
      const fileCount = checkpoint.filesModified.length;
      const fileCountText = fileCount > 0
        ? chalk.yellow(fileCount.toString())
        : chalk.dim('0');

      // Format message
      const message = checkpoint.message || chalk.dim('(no message)');
      const messageText = isLatest ? message : chalk.dim(message);

      table.push([
        idText,
        chalk.dim(timestamp),
        commitText,
        fileCountText,
        messageText
      ]);
    });

    console.log(table.toString());

    // Display summary
    console.log(chalk.gray('\n' + '─'.repeat(80)));
    console.log(chalk.dim(`Total: ${chalk.cyan(checkpoints.length)} checkpoint${checkpoints.length === 1 ? '' : 's'}`));

    if (options.task) {
      console.log(chalk.dim(`Task: ${chalk.cyan(options.task)}`));
    }

    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim(`  • View details: ${chalk.cyan('ginko checkpoint show <id>')}`));
    console.log(chalk.dim(`  • Create new: ${chalk.cyan('ginko checkpoint create --task ' + (options.task || 'TASK-ID'))}`));

    if (latestCheckpoint) {
      console.log(chalk.dim(`  • Rollback to latest: ${chalk.cyan(`ginko rollback ${latestCheckpoint.id}`)} ${chalk.yellow('(future)')}`));
    }

    console.log();

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }
    process.exit(1);
  }
}
