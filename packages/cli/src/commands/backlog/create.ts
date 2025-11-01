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
import prompts from 'prompts';
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
      const answers = await prompts([
        {
          type: 'text',
          name: 'description',
          message: 'What would you like to add to the backlog?',
          validate: (input: string) => input.trim().length > 0 || 'Description is required'
        },
        {
          type: 'select',
          name: 'type',
          message: 'What type of item is this?',
          choices: [
            { title: '✨ Feature - New capability or enhancement', value: 'feature' },
            { title: '📖 Story - User-facing functionality', value: 'story' },
            { title: '✅ Task - Technical work item', value: 'task' }
          ],
          initial: options.type === 'story' ? 1 : options.type === 'task' ? 2 : 0
        },
        {
          type: 'select',
          name: 'priority',
          message: 'Priority:',
          choices: [
            { title: '🔴 Critical - Must have, blocking', value: 'critical' },
            { title: '🟠 High - Important, needed soon', value: 'high' },
            { title: '🟡 Medium - Nice to have', value: 'medium' },
            { title: '⚪ Low - Future consideration', value: 'low' }
          ],
          initial: options.priority === 'critical' ? 0 : options.priority === 'high' ? 1 : options.priority === 'low' ? 3 : 2
        },
        {
          type: 'select',
          name: 'size',
          message: 'Estimated size:',
          choices: [
            { title: 'S - Small (< 1 day)', value: 'S' },
            { title: 'M - Medium (1-3 days)', value: 'M' },
            { title: 'L - Large (3-5 days)', value: 'L' },
            { title: 'XL - Extra Large (> 5 days)', value: 'XL' }
          ],
          initial: options.size === 'S' ? 0 : options.size === 'L' ? 2 : options.size === 'XL' ? 3 : 1
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