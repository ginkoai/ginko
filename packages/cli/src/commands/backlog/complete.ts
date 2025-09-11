/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, complete, archive, crud]
 * @related: [base.ts, index.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [chalk, ora]
 */

import chalk from 'chalk';
import ora from 'ora';
import { BacklogBase } from './base.js';

interface CompleteOptions {
  message?: string;
  archive?: boolean;
}

/**
 * Mark a backlog item as complete and optionally archive it
 */
export async function completeCommand(id: string, options: CompleteOptions = { archive: true }) {
  const spinner = ora('Completing backlog item...').start();
  
  try {
    const backlog = new BacklogBase();
    await backlog.init();

    // Load item
    const item = await backlog.loadItem(id.toUpperCase());
    
    if (!item) {
      spinner.fail(`Item not found: ${id}`);
      console.log(chalk.dim(`Try: ${chalk.green('ginko backlog list')} to see available items`));
      process.exit(1);
    }

    // Update status to done
    item.status = 'done';
    item.updated = new Date().toISOString();

    // Add completion note if provided
    if (options.message) {
      const timestamp = new Date().toISOString().split('T')[0];
      const note = `\n\n---\n_Completed (${timestamp}):_ ${options.message}`;
      item.description = (item.description || '') + note;
    }

    // Save updated item
    await backlog.saveItem(item);

    // Archive if requested (default)
    if (options.archive) {
      await backlog.archiveItem(item.id);
      spinner.succeed(`Completed and archived ${chalk.green(item.id)}: ${item.title}`);
      console.log(chalk.dim(`Item moved to: backlog/archive/${item.id}.md`));
    } else {
      spinner.succeed(`Completed ${chalk.green(item.id)}: ${item.title}`);
    }

    // Check for child items
    if (item.children && item.children.length > 0) {
      console.log(chalk.yellow(`\n⚠️  This item has ${item.children.length} child item(s) that may also need attention:`));
      for (const childId of item.children) {
        const child = await backlog.loadItem(childId);
        if (child && child.status !== 'done') {
          console.log(`  - ${chalk.magenta(childId)}: ${child.title} [${chalk.yellow(child.status)}]`);
        }
      }
    }

    // Show completion stats
    const allItems = await backlog.listItems();
    const doneCount = allItems.filter(i => i.status === 'done').length;
    const totalCount = allItems.length;
    const percentage = Math.round((doneCount / totalCount) * 100);

    console.log(chalk.dim(`\n📊 Progress: ${doneCount}/${totalCount} items complete (${percentage}%)`));

    // Suggest next item to work on
    const todoItems = allItems
      .filter(i => i.status === 'todo')
      .filter(i => i.priority === 'critical' || i.priority === 'high')
      .slice(0, 3);

    if (todoItems.length > 0) {
      console.log(chalk.cyan('\n🎯 Next priorities:'));
      todoItems.forEach(next => {
        console.log(`  ${chalk.green('ginko backlog show')} ${next.id}  ${chalk.gray(`# ${next.title.slice(0, 40)}...`)}`);
      });
    }

  } catch (error) {
    spinner.fail('Failed to complete backlog item');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}