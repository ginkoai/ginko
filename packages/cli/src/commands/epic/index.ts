/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-19
 * @tags: [cli, epic, status, graph-authoritative, epic-015]
 * @related: [status.ts, ../graph/api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { epicCommand as legacyEpicCommand, epicExamples } from '../epic.js';
import { createEpicStatusCommands, addEpicStatusShortcuts } from './status.js';
import { autoPush } from '../../lib/auto-push.js';

/**
 * Epic command with status management and legacy functionality
 * EPIC-015 Sprint 1: CLI Status Commands
 *
 * Usage:
 *   ginko epic                     Create new epic (default)
 *   ginko epic --list              List existing epics
 *   ginko epic --view              View epic details
 *   ginko epic --sync              Sync epic to graph
 *   ginko epic start <id>          Start epic
 *   ginko epic complete <id>       Complete epic
 *   ginko epic pause <id>          Pause epic
 *   ginko epic status show <id>    Show epic status
 */
export function epicStatusCommand() {
  const epic = new Command('epic')
    .description('Create and manage epics with status tracking (EPIC-015)')
    .option('--list', 'List existing epics')
    .option('--view', 'View epic details')
    .option('--sync', 'REMOVED: Use `ginko push epic` instead')
    .option('--no-ai', 'Run interactive mode instead of AI-mediated')
    .option('--examples', 'Show epic command examples')
    .addHelpText('after', `
${chalk.gray('Creation & Management:')}
  ${chalk.green('ginko epic')}              ${chalk.dim('Create new epic via AI conversation')}
  ${chalk.green('ginko epic list')}         ${chalk.dim('List existing epics')}
  ${chalk.green('ginko epic --view')}       ${chalk.dim('View epic details with sprints')}
  ${chalk.green('ginko push epic')}        ${chalk.dim('Push epic to graph (ADR-077)')}

${chalk.gray('Status Commands:')}
  ${chalk.green('ginko epic start')} <id>     ${chalk.dim('Start epic (proposed -> active)')}
  ${chalk.green('ginko epic complete')} <id>  ${chalk.dim('Complete epic (active -> complete)')}
  ${chalk.green('ginko epic pause')} <id>     ${chalk.dim('Pause epic (active -> paused)')}
  ${chalk.green('ginko epic status show')} <id> ${chalk.dim('Show current epic status')}

${chalk.gray('ID Formats:')}
  ${chalk.dim('EPIC-015, e015, E015 - all accepted')}

${chalk.gray('Valid Epic Statuses:')}
  ${chalk.dim('proposed  - Epic under consideration (default)')}
  ${chalk.dim('active    - Epic in progress')}
  ${chalk.dim('paused    - Epic temporarily on hold')}
  ${chalk.dim('complete  - Epic finished')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko epic')}
  ${chalk.green('ginko epic start EPIC-015')}
  ${chalk.green('ginko epic complete e015')}
`)
    .action(async (options) => {
      // Handle --examples flag
      if (options.examples) {
        console.log(chalk.green('\n📋 Epic Command Examples:\n'));
        epicExamples.forEach((example: string) => {
          console.log(chalk.dim(`  ${example}`));
        });
        // Add status examples
        console.log(chalk.dim('  ginko epic start EPIC-015     # Start epic'));
        console.log(chalk.dim('  ginko epic complete e015      # Complete epic'));
        console.log(chalk.dim('  ginko epic pause EPIC-015     # Pause epic'));
        console.log('');
        return;
      }

      // ADR-077: --sync has been removed
      if (options.sync) {
        console.log(chalk.red('\u2717 `ginko epic --sync` has been removed.'));
        console.log(chalk.dim('  Use `ginko push epic` instead (ADR-077).\n'));
        process.exit(1);
      }

      // Delegate to legacy command for create/list/view
      await legacyEpicCommand({
        view: options.view,
        list: options.list,
        noAi: !options.ai, // Commander handles --no-ai as options.ai = false
      });

      // ADR-077: Auto-push after epic creation (if not --list or --view)
      if (!options.list && !options.view && !options.sync) {
        await autoPush({ entityType: 'epic' });
      }
    });

  // Add status commands (EPIC-015 Sprint 1)
  epic.addCommand(createEpicStatusCommands());
  addEpicStatusShortcuts(epic);

  // Add 'list' subcommand for convenience (UAT-007)
  epic
    .command('list')
    .description('List all existing epics')
    .action(async () => {
      await legacyEpicCommand({ list: true });
    });

  return epic;
}

// Re-export for compatibility
export { epicExamples } from '../epic.js';
export default epicStatusCommand;
