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
    .description('Manage git-native backlog items (features, stories, tasks) with AI enhancement by default')
    .addHelpText('after', `
${chalk.gray('Examples (AI-enhanced by default):')}
  ${chalk.green('ginko backlog create')} "Add user authentication"  ${chalk.gray('# AI-enhanced creation')}
  ${chalk.green('ginko backlog list')}                              ${chalk.gray('# Smart AI filtering')}
  ${chalk.green('ginko backlog show')} FEATURE-001                  ${chalk.gray('# AI insights')}
  ${chalk.green('ginko backlog update')} TASK-003 --status done     ${chalk.gray('# AI suggestions')}

${chalk.gray('Disable AI enhancement:')}
  ${chalk.green('ginko backlog create')} "task" --noai              ${chalk.gray('# Use templates')}
  ${chalk.green('ginko backlog list')} --noai                       ${chalk.gray('# Simple listing')}

${chalk.gray('Universal AI mode:')}
  ${chalk.green('ginko')} "Create a new login feature"               ${chalk.gray('# Natural language')}
`);

  // Subcommands
  backlog
    .command('create [description]')
    .description('Create a new backlog item with AI enhancement by default')
    .option('-t, --type <type>', 'Item type: feature, story, or task', 'feature')
    .option('-p, --priority <priority>', 'Priority: critical, high, medium, low', 'medium')
    .option('-s, --size <size>', 'Size estimate: S, M, L, XL', 'M')
    .option('-a, --assign <email>', 'Assign to team member')
    .option('--parent <id>', 'Parent item ID for hierarchical structure')
    .option('-e, --edit', 'Open in editor after creation')
    .option('--noai', 'Disable AI enhancement and use procedural templates')
    .option('--verbose', 'Show AI reasoning and context')
    .action(async (description, options) => {
      if (options.noai) {
        // Use procedural template approach
        return createCommand(description, options);
      } else {
        // Use AI enhancement by default
        const { aiEnhancedCommand } = await import('./ai-enhanced.js');
        const request = description ? `create ${options.type || 'feature'} "${description}"` : 'create a new backlog item';
        return aiEnhancedCommand(request, options);
      }
    });

  backlog
    .command('list')
    .alias('ls')
    .description('List backlog items with smart AI filtering by default')
    .option('-t, --type <type>', 'Filter by type: feature, story, task')
    .option('-s, --status <status>', 'Filter by status: todo, in-progress, done')
    .option('-p, --priority <priority>', 'Filter by priority')
    .option('-a, --assigned <email>', 'Filter by assignee')
    .option('--tree', 'Show hierarchical tree view')
    .option('--json', 'Output as JSON')
    .option('--noai', 'Disable AI enhancement and use simple listing')
    .option('--verbose', 'Show AI context and reasoning')
    .action(async (options) => {
      if (options.noai) {
        // Use simple listing approach
        return listCommand(options);
      } else {
        // Use AI-enhanced listing by default
        const { aiEnhancedCommand } = await import('./ai-enhanced.js');
        const request = 'list backlog items';
        return aiEnhancedCommand(request, options);
      }
    });

  backlog
    .command('show <id>')
    .description('Show details of a backlog item with AI-enhanced insights by default')
    .option('-v, --verbose', 'Show full content and metadata')
    .option('--json', 'Output as JSON')
    .option('--noai', 'Disable AI enhancement and show simple details')
    .action(async (id, options) => {
      if (options.noai) {
        // Use simple show approach
        return showCommand(id, options);
      } else {
        // Use AI-enhanced show by default
        const { aiEnhancedCommand } = await import('./ai-enhanced.js');
        const request = `show ${id}`;
        return aiEnhancedCommand(request, options);
      }
    });

  backlog
    .command('update <id>')
    .description('Update a backlog item with AI-enhanced suggestions by default')
    .option('-s, --status <status>', 'Update status: todo, in-progress, done')
    .option('-p, --priority <priority>', 'Update priority')
    .option('-a, --assign <email>', 'Update assignee')
    .option('--size <size>', 'Update size estimate')
    .option('-m, --message <message>', 'Add progress note')
    .option('-e, --edit', 'Open in editor for full edit')
    .option('--noai', 'Disable AI enhancement and use simple update')
    .option('--verbose', 'Show AI reasoning for updates')
    .action(async (id, options) => {
      if (options.noai) {
        // Use simple update approach
        return updateCommand(id, options);
      } else {
        // Use AI-enhanced update by default
        const { aiEnhancedCommand } = await import('./ai-enhanced.js');
        const updates = [];
        if (options.status) updates.push(`status to ${options.status}`);
        if (options.priority) updates.push(`priority to ${options.priority}`);
        if (options.assign) updates.push(`assignee to ${options.assign}`);
        if (options.size) updates.push(`size to ${options.size}`);
        if (options.message) updates.push(`add note: ${options.message}`);
        const request = `update ${id}${updates.length > 0 ? ' - ' + updates.join(', ') : ''}`;
        return aiEnhancedCommand(request, options);
      }
    });

  backlog
    .command('complete <id>')
    .alias('done')
    .description('Mark item as complete with AI-enhanced completion notes by default')
    .option('-m, --message <message>', 'Completion note')
    .option('--no-archive', 'Complete without archiving')
    .option('--noai', 'Disable AI enhancement and use simple completion')
    .option('--verbose', 'Show AI-generated completion analysis')
    .action(async (id, options) => {
      if (options.noai) {
        // Use simple completion approach
        return completeCommand(id, options);
      } else {
        // Use AI-enhanced completion by default
        const { aiEnhancedCommand } = await import('./ai-enhanced.js');
        const request = `complete ${id}${options.message ? ` with message: ${options.message}` : ''}`;
        return aiEnhancedCommand(request, options);
      }
    });

  // Deprecated: AI is now the default for all commands
  // Use --noai flag to disable AI enhancement
  backlog
    .command('ai <request>')
    .alias('magic')
    .description('[DEPRECATED] Natural language interface - AI is now default for all commands')
    .option('-v, --verbose', 'Show additional context')
    .option('--raw', 'Output raw prompt without formatting')
    .action((request, options) => {
      console.log(chalk.yellow('⚠️  The "ai" command is deprecated. AI enhancement is now the default for all backlog commands.'));
      console.log(chalk.dim('Try: ginko backlog create "your request" or ginko "your natural language request"'));
      console.log(chalk.dim('Use --noai flag to disable AI enhancement if needed.'));
      return aiCommand(request, options);
    });

  return backlog;
}

// Export for use in main CLI
export default backlogCommand;