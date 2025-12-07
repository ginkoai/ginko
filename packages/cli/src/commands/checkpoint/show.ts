/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [checkpoint, show, cli, epic-004-sprint5, task-1]
 * @related: [checkpoint.ts, create.ts, list.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk, checkpoint]
 */

import chalk from 'chalk';
import { getCheckpoint } from '../../lib/checkpoint.js';

/**
 * Show detailed checkpoint information
 *
 * Displays all checkpoint fields:
 * - ID, task ID, agent ID
 * - Timestamp
 * - Git commit hash
 * - Modified files list
 * - Event stream position
 * - Message and metadata
 */
export async function showCheckpointCommand(checkpointId: string): Promise<void> {
  try {
    // Validate checkpoint ID
    if (!checkpointId) {
      console.log(chalk.red('\n✗ Checkpoint ID is required'));
      console.log(chalk.dim('Usage: ginko checkpoint show <checkpointId>'));
      process.exit(1);
    }

    // Get checkpoint
    const checkpoint = await getCheckpoint(checkpointId);

    if (!checkpoint) {
      console.log(chalk.yellow(`\n⚠️  Checkpoint ${chalk.bold(checkpointId)} not found`));
      console.log(chalk.dim('List checkpoints with: ginko checkpoint list'));
      return;
    }

    // Display checkpoint details
    console.log(chalk.green(`\n📸 Checkpoint Details`));
    console.log(chalk.gray('═'.repeat(60)));

    // Basic info
    console.log(chalk.bold('\nIdentification:'));
    console.log(`  ${chalk.dim('ID:')} ${chalk.cyan(checkpoint.id)}`);
    console.log(`  ${chalk.dim('Task:')} ${chalk.cyan(checkpoint.taskId)}`);
    console.log(`  ${chalk.dim('Agent:')} ${chalk.dim(checkpoint.agentId)}`);
    console.log(`  ${chalk.dim('Created:')} ${chalk.dim(checkpoint.timestamp.toLocaleString())}`);

    // Message
    if (checkpoint.message) {
      console.log(chalk.bold('\nMessage:'));
      console.log(`  ${checkpoint.message}`);
    }

    // Git state
    console.log(chalk.bold('\nGit State:'));
    console.log(`  ${chalk.dim('Commit:')} ${chalk.cyan(checkpoint.gitCommit)}`);
    console.log(`  ${chalk.dim('Short:')} ${chalk.cyan(checkpoint.gitCommit.substring(0, 7))}`);

    // Modified files
    console.log(chalk.bold('\nModified Files:'));
    if (checkpoint.filesModified.length === 0) {
      console.log(chalk.dim('  (no modified files)'));
    } else {
      console.log(`  ${chalk.yellow(checkpoint.filesModified.length)} file${checkpoint.filesModified.length === 1 ? '' : 's'} modified:`);
      checkpoint.filesModified.forEach((file, index) => {
        // Show first 20 files, then truncate
        if (index < 20) {
          console.log(`    ${chalk.dim(`${index + 1}.`)} ${file}`);
        } else if (index === 20) {
          console.log(chalk.dim(`    ... and ${checkpoint.filesModified.length - 20} more files`));
        }
      });
    }

    // Event stream position
    console.log(chalk.bold('\nEvent Stream:'));
    console.log(`  ${chalk.dim('Last event:')} ${chalk.dim(checkpoint.eventsSince)}`);

    // Metadata
    if (checkpoint.metadata && Object.keys(checkpoint.metadata).length > 0) {
      console.log(chalk.bold('\nMetadata:'));
      Object.entries(checkpoint.metadata).forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${JSON.stringify(value)}`);
      });
    }

    // Next steps
    console.log(chalk.gray('\n' + '═'.repeat(60)));
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.dim(`  • View commit: ${chalk.cyan(`git show ${checkpoint.gitCommit.substring(0, 7)}`)}`));
    console.log(chalk.dim(`  • List task checkpoints: ${chalk.cyan(`ginko checkpoint list --task ${checkpoint.taskId}`)}`));
    console.log(chalk.dim(`  • Rollback to this checkpoint: ${chalk.cyan(`ginko rollback ${checkpoint.id}`)} ${chalk.yellow('(future)')}`));
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
