/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, create, git-native, crud]
 * @related: [base.ts, index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, ora, inquirer, child_process]
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BacklogBase, ItemType, ItemPriority, ItemSize, BacklogItem } from './base.js';
import { getUserEmail } from '../../utils/helpers.js';

const execAsync = promisify(exec);

interface CreateOptions {
  type?: ItemType;
  priority?: ItemPriority;
  size?: ItemSize;
  assign?: string;
  parent?: string;
  edit?: boolean;
}

/**
 * Create a new backlog item
 */
export async function createCommand(description?: string, options: CreateOptions = {}) {
  const spinner = ora('Creating backlog item...').start();
  
  try {
    const backlog = new BacklogBase();
    await backlog.init();

    // Interactive mode if no description provided
    if (!description) {
      spinner.stop();
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'What would you like to add to the backlog?',
          validate: (input: string) => input.trim().length > 0 || 'Description is required'
        },
        {
          type: 'list',
          name: 'type',
          message: 'What type of item is this?',
          choices: [
            { name: '✨ Feature - New capability or enhancement', value: 'feature' },
            { name: '📖 Story - User-facing functionality', value: 'story' },
            { name: '✅ Task - Technical work item', value: 'task' }
          ],
          default: options.type || 'feature'
        },
        {
          type: 'list',
          name: 'priority',
          message: 'Priority:',
          choices: [
            { name: '🔴 Critical - Must have, blocking', value: 'critical' },
            { name: '🟠 High - Important, needed soon', value: 'high' },
            { name: '🟡 Medium - Nice to have', value: 'medium' },
            { name: '⚪ Low - Future consideration', value: 'low' }
          ],
          default: options.priority || 'medium'
        },
        {
          type: 'list',
          name: 'size',
          message: 'Estimated size:',
          choices: [
            { name: 'S - Small (< 1 day)', value: 'S' },
            { name: 'M - Medium (1-3 days)', value: 'M' },
            { name: 'L - Large (3-5 days)', value: 'L' },
            { name: 'XL - Extra Large (> 5 days)', value: 'XL' }
          ],
          default: options.size || 'M'
        }
      ]);

      description = answers.description;
      options.type = answers.type;
      options.priority = answers.priority;
      options.size = answers.size;
      spinner.start('Creating backlog item...');
    }

    // Get user email for author
    const userEmail = await getUserEmail();

    // Generate ID
    const type = options.type || 'feature';
    const id = await backlog.generateId(type);

    // Create item
    const item: BacklogItem = {
      id,
      type,
      title: description!,
      status: 'todo',
      priority: options.priority || 'medium',
      size: options.size || 'M',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      author: userEmail,
      assignee: options.assign,
      parent: options.parent,
      description: await backlog.getTemplate(type)
    };

    // Save item
    await backlog.saveItem(item);
    
    spinner.succeed(`Created ${chalk.green(id)}: ${description}`);

    // Show item details
    console.log(backlog.formatItem(item));

    // Open in editor if requested
    if (options.edit) {
      console.log(chalk.dim('\nOpening in editor...'));
      const filePath = `backlog/items/${id}.md`;
      
      // Try to open with default editor
      const editor = process.env.EDITOR || 'code';
      try {
        await execAsync(`${editor} ${filePath}`);
      } catch (error) {
        console.log(chalk.yellow(`Could not open with ${editor}. File created at: ${filePath}`));
      }
    }

    // Suggest next steps
    console.log(chalk.dim(`
Next steps:
  ${chalk.green('ginko backlog show')} ${id}     ${chalk.gray('# View details')}
  ${chalk.green('ginko backlog update')} ${id}   ${chalk.gray('# Edit item')}
  ${chalk.green('ginko backlog list')}          ${chalk.gray('# See all items')}
`));

  } catch (error) {
    spinner.fail('Failed to create backlog item');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}