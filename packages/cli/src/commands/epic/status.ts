/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-19
 * @tags: [cli, epic, status, graph-authoritative, epic-015]
 * @related: [../graph/api-client.ts, index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, commander]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { GraphApiClient, EpicStatus } from '../graph/api-client.js';
import { getGraphId } from '../graph/config.js';
import { requireCloud } from '../../utils/cloud-guard.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get graph ID from config
 */
async function requireGraphId(): Promise<string> {
  const graphId = process.env.GINKO_GRAPH_ID || await getGraphId();
  if (!graphId) {
    console.error(chalk.red('✗ Graph not initialized'));
    console.error(chalk.dim('  Run `ginko graph init` first'));
    process.exit(1);
  }
  return graphId;
}

/**
 * Normalize epic ID
 * Supports: EPIC-015, e015, E015
 */
function normalizeEpicId(epicId: string): string {
  // Already in e format
  if (/^e\d+$/i.test(epicId)) {
    return epicId.toLowerCase();
  }
  // EPIC-NNN format
  const match = epicId.match(/^EPIC-?(\d+)$/i);
  if (match) {
    return `e${match[1].padStart(3, '0')}`;
  }
  // Return as-is
  return epicId;
}

function formatStatus(status: EpicStatus): string {
  switch (status) {
    case 'complete':
      return chalk.green('✓ complete');
    case 'active':
      return chalk.cyan('▶ active');
    case 'paused':
      return chalk.yellow('⏸ paused');
    case 'proposed':
    default:
      return chalk.dim('○ proposed');
  }
}

function handleError(action: string, epicId: string, error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes('EPIC_NOT_FOUND') || error.message.includes('not found')) {
      console.error(chalk.red(`✗ Epic not found: ${epicId}`));
      console.error(chalk.dim('  Make sure the epic ID is correct and exists in the graph'));
    } else if (error.message.includes('AUTH_REQUIRED')) {
      console.error(chalk.red('✗ Authentication required'));
      console.error(chalk.dim('  Run `ginko login` first'));
    } else if (error.message.includes('SERVICE_UNAVAILABLE')) {
      console.error(chalk.red('✗ Graph database unavailable'));
      console.error(chalk.dim('  Please try again later'));
    } else {
      console.error(chalk.red(`✗ Failed to ${action} epic: ${error.message}`));
    }
  } else {
    console.error(chalk.red(`✗ Failed to ${action} epic`));
  }
  process.exit(1);
}

// =============================================================================
// Commands
// =============================================================================

interface EpicStatusOptions {
  verbose?: boolean;
}

/**
 * Start epic (proposed -> active)
 */
async function startEpicCommand(
  epicId: string,
  options: EpicStatusOptions = {}
): Promise<void> {
  await requireCloud('epic start');
  const graphId = await requireGraphId();
  const client = new GraphApiClient();
  const normalizedId = normalizeEpicId(epicId);

  try {
    const current = await client.getEpicStatus(graphId, normalizedId);
    if (current.status === 'active') {
      console.log(chalk.yellow(`Epic ${epicId} is already active (no change)`));
      return;
    }

    const response = await client.updateEpicStatus(graphId, normalizedId, 'active');
    console.log(chalk.cyan(`▶ Epic ${epicId} started`));
    if (response.epic.title) {
      console.log(chalk.dim(`  "${response.epic.title}"`));
    }
  } catch (error) {
    handleError('start', epicId, error);
  }
}

/**
 * Complete epic (active -> complete)
 */
async function completeEpicCommand(
  epicId: string,
  options: EpicStatusOptions = {}
): Promise<void> {
  await requireCloud('epic complete');
  const graphId = await requireGraphId();
  const client = new GraphApiClient();
  const normalizedId = normalizeEpicId(epicId);

  try {
    const current = await client.getEpicStatus(graphId, normalizedId);
    if (current.status === 'complete') {
      console.log(chalk.yellow(`Epic ${epicId} is already complete (no change)`));
      return;
    }

    const response = await client.updateEpicStatus(graphId, normalizedId, 'complete');
    console.log(chalk.green(`✓ Epic ${epicId} marked complete`));
    if (response.epic.title) {
      console.log(chalk.dim(`  "${response.epic.title}"`));
    }
  } catch (error) {
    handleError('complete', epicId, error);
  }
}

/**
 * Pause epic (active -> paused)
 */
async function pauseEpicCommand(
  epicId: string,
  options: EpicStatusOptions = {}
): Promise<void> {
  await requireCloud('epic pause');
  const graphId = await requireGraphId();
  const client = new GraphApiClient();
  const normalizedId = normalizeEpicId(epicId);

  try {
    const current = await client.getEpicStatus(graphId, normalizedId);
    if (current.status === 'paused') {
      console.log(chalk.yellow(`Epic ${epicId} is already paused (no change)`));
      return;
    }

    const response = await client.updateEpicStatus(graphId, normalizedId, 'paused');
    console.log(chalk.yellow(`⏸ Epic ${epicId} paused`));
    if (response.epic.title) {
      console.log(chalk.dim(`  "${response.epic.title}"`));
    }
  } catch (error) {
    handleError('pause', epicId, error);
  }
}

/**
 * Show epic status
 */
async function showEpicCommand(
  epicId: string,
  options: EpicStatusOptions = {}
): Promise<void> {
  await requireCloud('epic show');
  const graphId = await requireGraphId();
  const client = new GraphApiClient();
  const normalizedId = normalizeEpicId(epicId);

  try {
    const status = await client.getEpicStatus(graphId, normalizedId);
    console.log(chalk.bold(`Epic: ${epicId}`));
    console.log(`Status: ${formatStatus(status.status)}`);
  } catch (error) {
    handleError('show', epicId, error);
  }
}

// =============================================================================
// Command Factory
// =============================================================================

/**
 * Create epic status subcommand group
 */
export function createEpicStatusCommands(): Command {
  const status = new Command('status')
    .description('Epic status management (EPIC-015)')
    .addHelpText('after', `
${chalk.gray('Commands:')}
  ${chalk.green('ginko epic status start')} <id>     ${chalk.dim('Start epic (proposed -> active)')}
  ${chalk.green('ginko epic status complete')} <id>  ${chalk.dim('Complete epic (active -> complete)')}
  ${chalk.green('ginko epic status pause')} <id>     ${chalk.dim('Pause epic (active -> paused)')}
  ${chalk.green('ginko epic status show')} <id>      ${chalk.dim('Show current epic status')}

${chalk.gray('Shortcuts (without "status"):')}
  ${chalk.green('ginko epic start')} <id>
  ${chalk.green('ginko epic complete')} <id>
  ${chalk.green('ginko epic pause')} <id>

${chalk.gray('ID Formats:')}
  ${chalk.dim('EPIC-015, e015, E015 - all accepted')}

${chalk.gray('Valid Epic Statuses:')}
  ${chalk.dim('proposed  - Epic under consideration (default)')}
  ${chalk.dim('active    - Epic in progress')}
  ${chalk.dim('paused    - Epic temporarily on hold')}
  ${chalk.dim('complete  - Epic finished')}
`)
    .action(() => {
      status.help({ error: false });
    });

  status
    .command('start <epicId>')
    .description('Start epic (proposed -> active)')
    .option('-v, --verbose', 'Show detailed output')
    .action(startEpicCommand);

  status
    .command('complete <epicId>')
    .description('Complete epic')
    .option('-v, --verbose', 'Show detailed output')
    .action(completeEpicCommand);

  status
    .command('pause <epicId>')
    .description('Pause epic (active -> paused)')
    .option('-v, --verbose', 'Show detailed output')
    .action(pauseEpicCommand);

  status
    .command('show <epicId>')
    .description('Show epic status')
    .option('-v, --verbose', 'Show detailed output')
    .action(showEpicCommand);

  return status;
}

/**
 * Create shortcut commands for epic status (without "status" prefix)
 */
export function addEpicStatusShortcuts(epic: Command): void {
  epic
    .command('start <epicId>')
    .description('Start epic (shortcut for status start)')
    .option('-v, --verbose', 'Show detailed output')
    .action(startEpicCommand);

  epic
    .command('complete <epicId>')
    .description('Complete epic (shortcut for status complete)')
    .option('-v, --verbose', 'Show detailed output')
    .action(completeEpicCommand);

  epic
    .command('pause <epicId>')
    .description('Pause epic (shortcut for status pause)')
    .option('-v, --verbose', 'Show detailed output')
    .action(pauseEpicCommand);
}

export {
  startEpicCommand,
  completeEpicCommand,
  pauseEpicCommand,
  showEpicCommand,
};
