/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, show, view, details]
 * @related: [base.ts, index.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [chalk, marked, marked-terminal]
 */

import chalk from 'chalk';
import { marked } from 'marked';
// @ts-ignore - marked-terminal doesn't have types
import TerminalRenderer from 'marked-terminal';
import { BacklogBase } from './base.js';

// Configure marked for terminal output
marked.setOptions({
  renderer: new TerminalRenderer()
});

interface ShowOptions {
  verbose?: boolean;
  json?: boolean;
}

/**
 * Show details of a backlog item
 */
export async function showCommand(id: string, options: ShowOptions = {}) {
  try {
    const backlog = new BacklogBase();
    await backlog.init();

    // Load item
    const item = await backlog.loadItem(id.toUpperCase());
    
    if (!item) {
      console.error(chalk.red(`Item not found: ${id}`));
      console.log(chalk.dim(`Try: ${chalk.green('ginko backlog list')} to see available items`));
      process.exit(1);
    }

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    // Display header
    console.log(backlog.formatItem(item, true));
    console.log(chalk.gray('─'.repeat(60)));

    // Metadata
    console.log(chalk.cyan('Metadata:'));
    console.log(`  Created: ${chalk.dim(new Date(item.created).toLocaleString())}`);
    console.log(`  Updated: ${chalk.dim(new Date(item.updated).toLocaleString())}`);
    if (item.author) {
      console.log(`  Author: ${chalk.cyan(`@${item.author.split('@')[0]}`)}`);
    }
    if (item.parent) {
      console.log(`  Parent: ${chalk.magenta(item.parent)}`);
    }
    if (item.children && item.children.length > 0) {
      console.log(`  Children: ${item.children.map(c => chalk.magenta(c)).join(', ')}`);
    }
    if (item.tags && item.tags.length > 0) {
      console.log(`  Tags: ${item.tags.map(t => chalk.blue(`#${t}`)).join(' ')}`);
    }
    if (item.dependencies && item.dependencies.length > 0) {
      console.log(`  Dependencies: ${item.dependencies.map(d => chalk.yellow(d)).join(', ')}`);
    }

    // Content
    if (item.description) {
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.cyan('Description:'));
      console.log(marked(item.description));
    }

    // Acceptance criteria
    if (item.acceptance_criteria && item.acceptance_criteria.length > 0) {
      console.log(chalk.cyan('Acceptance Criteria:'));
      item.acceptance_criteria.forEach(ac => {
        console.log(`  ${chalk.green('✓')} ${ac}`);
      });
    }

    // Technical notes
    if (item.technical_notes) {
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.cyan('Technical Notes:'));
      console.log(chalk.dim(item.technical_notes));
    }

    // Actions
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.dim(`
Actions:
  ${chalk.green('ginko backlog update')} ${id} -s in-progress  ${chalk.gray('# Start working')}
  ${chalk.green('ginko backlog update')} ${id} -e              ${chalk.gray('# Edit in editor')}
  ${chalk.green('ginko backlog complete')} ${id}               ${chalk.gray('# Mark as done')}
`));

  } catch (error) {
    console.error(chalk.red('Failed to show backlog item'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}