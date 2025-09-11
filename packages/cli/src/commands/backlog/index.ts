/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [cli, backlog, git-native, crud]
 * @related: [create.ts, list.ts, update.ts, show.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, fs-extra]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createCommand } from './create.js';
import { listCommand } from './list.js';
import { showCommand } from './show.js';
import { updateCommand } from './update.js';
import { completeCommand } from './complete.js';
import { aiCommand } from './ai.js';

/**
 * Main backlog command with subcommands for CRUD operations
 */
export function backlogCommand() {
  const backlog = new Command('backlog')
    .description('Manage git-native backlog items (features, stories, tasks)')
    .addHelpText('after', `
${chalk.gray('Examples:')}
  ${chalk.green('ginko backlog create')} "Add user authentication"  ${chalk.gray('# Create new feature')}
  ${chalk.green('ginko backlog list')}                              ${chalk.gray('# List all items')}
  ${chalk.green('ginko backlog show')} FEATURE-001                  ${chalk.gray('# View details')}
  ${chalk.green('ginko backlog update')} TASK-003 --status done     ${chalk.gray('# Update status')}
  ${chalk.green('ginko')} "Create a new login feature"               ${chalk.gray('# AI magic mode')}
`);

  // Subcommands
  backlog
    .command('create [description]')
    .description('Create a new backlog item')
    .option('-t, --type <type>', 'Item type: feature, story, or task', 'feature')
    .option('-p, --priority <priority>', 'Priority: critical, high, medium, low', 'medium')
    .option('-s, --size <size>', 'Size estimate: S, M, L, XL', 'M')
    .option('-a, --assign <email>', 'Assign to team member')
    .option('--parent <id>', 'Parent item ID for hierarchical structure')
    .option('-e, --edit', 'Open in editor after creation')
    .action(createCommand);

  backlog
    .command('list')
    .alias('ls')
    .description('List backlog items')
    .option('-t, --type <type>', 'Filter by type: feature, story, task')
    .option('-s, --status <status>', 'Filter by status: todo, in-progress, done')
    .option('-p, --priority <priority>', 'Filter by priority')
    .option('-a, --assigned <email>', 'Filter by assignee')
    .option('--tree', 'Show hierarchical tree view')
    .option('--json', 'Output as JSON')
    .action(listCommand);

  backlog
    .command('show <id>')
    .description('Show details of a backlog item')
    .option('-v, --verbose', 'Show full content and metadata')
    .option('--json', 'Output as JSON')
    .action(showCommand);

  backlog
    .command('update <id>')
    .description('Update a backlog item')
    .option('-s, --status <status>', 'Update status: todo, in-progress, done')
    .option('-p, --priority <priority>', 'Update priority')
    .option('-a, --assign <email>', 'Update assignee')
    .option('--size <size>', 'Update size estimate')
    .option('-m, --message <message>', 'Add progress note')
    .option('-e, --edit', 'Open in editor for full edit')
    .action(updateCommand);

  backlog
    .command('complete <id>')
    .alias('done')
    .description('Mark item as complete and archive')
    .option('-m, --message <message>', 'Completion note')
    .option('--no-archive', 'Complete without archiving')
    .action(completeCommand);

  // AI-powered natural language interface
  backlog
    .command('ai <request>')
    .alias('magic')
    .description('Natural language backlog management - outputs prompts for ambient AI')
    .option('-v, --verbose', 'Show additional context')
    .option('--raw', 'Output raw prompt without formatting')
    .action(aiCommand);

  return backlog;
}

// Export for use in main CLI
export default backlogCommand;