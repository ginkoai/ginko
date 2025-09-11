/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, update, edit, crud]
 * @related: [base.ts, index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, ora, child_process]
 */

import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { BacklogBase, ItemStatus, ItemPriority, ItemSize } from './base.js';

const execAsync = promisify(exec);

interface UpdateOptions {
  status?: ItemStatus;
  priority?: ItemPriority;
  assign?: string;
  size?: ItemSize;
  message?: string;
  edit?: boolean;
}

/**
 * Update a backlog item
 */
export async function updateCommand(id: string, options: UpdateOptions = {}) {
  const spinner = ora('Updating backlog item...').start();
  
  try {
    const backlog = new BacklogBase();
    await backlog.init();

    // Load existing item
    const item = await backlog.loadItem(id.toUpperCase());
    
    if (!item) {
      spinner.fail(`Item not found: ${id}`);
      console.log(chalk.dim(`Try: ${chalk.green('ginko backlog list')} to see available items`));
      process.exit(1);
    }

    // Open in editor if requested
    if (options.edit) {
      spinner.stop();
      console.log(chalk.dim('Opening in editor...'));
      const filePath = `backlog/items/${item.id}.md`;
      
      const editor = process.env.EDITOR || 'code';
      try {
        await execAsync(`${editor} ${filePath}`);
        console.log(chalk.green(`✓ Opened ${item.id} in editor`));
        console.log(chalk.dim('Changes will be saved when you save the file'));
      } catch (error) {
        console.log(chalk.yellow(`Could not open with ${editor}. Edit manually at: ${filePath}`));
      }
      return;
    }

    // Apply updates
    let updated = false;

    if (options.status) {
      item.status = options.status;
      updated = true;
    }

    if (options.priority) {
      item.priority = options.priority;
      updated = true;
    }

    if (options.assign !== undefined) {
      item.assignee = options.assign;
      updated = true;
    }

    if (options.size) {
      item.size = options.size;
      updated = true;
    }

    if (options.message) {
      // Add progress note to description
      const timestamp = new Date().toISOString().split('T')[0];
      const note = `\n\n---\n_Progress note (${timestamp}):_ ${options.message}`;
      item.description = (item.description || '') + note;
      updated = true;
    }

    if (!updated) {
      spinner.warn('No updates specified');
      console.log(chalk.dim(`
Options:
  -s, --status <status>    Update status
  -p, --priority <priority>  Update priority  
  -a, --assign <email>     Update assignee
  --size <size>            Update size estimate
  -m, --message <message>  Add progress note
  -e, --edit               Open in editor
`));
      return;
    }

    // Save updated item
    await backlog.saveItem(item);
    
    spinner.succeed(`Updated ${chalk.green(item.id)}`);

    // Show updated item
    console.log(backlog.formatItem(item, true));

    // Show what changed
    const changes: string[] = [];
    if (options.status) changes.push(`status → ${chalk.yellow(options.status)}`);
    if (options.priority) changes.push(`priority → ${chalk.magenta(options.priority)}`);
    if (options.assign !== undefined) changes.push(`assignee → ${options.assign ? chalk.cyan(`@${options.assign.split('@')[0]}`) : 'unassigned'}`);
    if (options.size) changes.push(`size → ${chalk.dim(options.size)}`);
    if (options.message) changes.push('added progress note');

    if (changes.length > 0) {
      console.log(chalk.dim(`\nChanges: ${changes.join(', ')}`));
    }

  } catch (error) {
    spinner.fail('Failed to update backlog item');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}