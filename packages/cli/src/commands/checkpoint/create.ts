/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [checkpoint, create, cli, epic-004-sprint5, task-1]
 * @related: [checkpoint.ts, list.ts, show.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, ora, checkpoint]
 */

import chalk from 'chalk';
import ora from 'ora';
import { createCheckpoint } from '../../lib/checkpoint.js';

interface CreateCheckpointOptions {
  task: string;
  message?: string;
  agent?: string;
}

/**
 * Create a checkpoint for current work state
 *
 * Captures:
 * - Current git commit hash
 * - Modified files since task start
 * - Last event ID from event stream
 * - Optional message and metadata
 */
export async function createCheckpointCommand(options: CreateCheckpointOptions): Promise<void> {
  const spinner = ora('Creating checkpoint...').start();

  try {
    // Validate task ID format
    if (!options.task) {
      spinner.fail(chalk.red('Task ID is required'));
      console.log(chalk.dim('Usage: ginko checkpoint create --task TASK-1'));
      process.exit(1);
    }

    // Create checkpoint
    const checkpoint = await createCheckpoint(
      options.task,
      options.agent,
      options.message
    );

    spinner.succeed(chalk.green('Checkpoint created successfully'));

    // Display checkpoint details
    console.log(chalk.gray('\n' + '─'.repeat(50)));
    console.log(chalk.bold('Checkpoint Details:'));
    console.log(`  ${chalk.dim('ID:')} ${chalk.cyan(checkpoint.id)}`);
    console.log(`  ${chalk.dim('Task:')} ${chalk.cyan(checkpoint.taskId)}`);
    console.log(`  ${chalk.dim('Agent:')} ${chalk.dim(checkpoint.agentId)}`);
    console.log(`  ${chalk.dim('Timestamp:')} ${chalk.dim(checkpoint.timestamp.toLocaleString())}`);

    if (checkpoint.message) {
      console.log(`  ${chalk.dim('Message:')} ${checkpoint.message}`);
    }

    console.log(chalk.gray('\n' + '─'.repeat(50)));
    console.log(chalk.bold('Captured State:'));
    console.log(`  ${chalk.dim('Git commit:')} ${chalk.cyan(checkpoint.gitCommit.substring(0, 7))} ${chalk.dim(`(full: ${checkpoint.gitCommit})`)}`);
    console.log(`  ${chalk.dim('Modified files:')} ${chalk.yellow(checkpoint.filesModified.length)} files`);

    if (checkpoint.filesModified.length > 0 && checkpoint.filesModified.length <= 5) {
      checkpoint.filesModified.forEach(file => {
        console.log(`    ${chalk.dim('•')} ${file}`);
      });
    } else if (checkpoint.filesModified.length > 5) {
      checkpoint.filesModified.slice(0, 5).forEach(file => {
        console.log(`    ${chalk.dim('•')} ${file}`);
      });
      console.log(`    ${chalk.dim(`... and ${checkpoint.filesModified.length - 5} more files`)}`);
    }

    console.log(`  ${chalk.dim('Event stream position:')} ${chalk.dim(checkpoint.eventsSince)}`);

    console.log(chalk.gray('\n' + '─'.repeat(50)));
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.dim(`  • View checkpoint: ${chalk.cyan(`ginko checkpoint show ${checkpoint.id}`)}`));
    console.log(chalk.dim(`  • List checkpoints: ${chalk.cyan(`ginko checkpoint list --task ${checkpoint.taskId}`)}`));
    console.log(chalk.dim(`  • Rollback (future): ${chalk.cyan(`ginko rollback ${checkpoint.id}`)}`));
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to create checkpoint'));

    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));

      if (error.message.includes('git')) {
        console.log(chalk.dim('\nMake sure you are in a git repository'));
      }
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }

    process.exit(1);
  }
}
