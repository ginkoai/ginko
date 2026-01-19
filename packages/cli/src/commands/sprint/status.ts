/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-19
 * @tags: [cli, sprint, status, graph-authoritative, epic-015]
 * @related: [../graph/api-client.ts, index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, commander]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import { GraphApiClient, SprintStatus } from '../graph/api-client.js';
import { getGraphId } from '../graph/config.js';

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
 * Prompt user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} [Y/n] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() !== 'n');
    });
  });
}

/**
 * Extract epic ID from sprint ID
 * e.g., e015_s01 -> e015
 */
function extractEpicId(sprintId: string): string | null {
  const match = sprintId.match(/^(e\d+)_s\d+$/);
  return match ? match[1] : null;
}

/**
 * Check if all sprints in epic are complete and offer to complete epic
 */
async function checkEpicCompletion(
  client: GraphApiClient,
  graphId: string,
  epicId: string,
  skipPrompt: boolean
): Promise<void> {
  try {
    const sprints = await client.getEpicSprints(graphId, epicId);
    const allComplete = sprints.every(s => s.status === 'complete');

    if (allComplete && sprints.length > 0) {
      console.log(chalk.cyan(`\nAll sprints in ${epicId} are complete.`));

      const shouldComplete = skipPrompt || await confirm('Mark epic complete?');
      if (shouldComplete) {
        await client.updateEpicStatus(graphId, epicId, 'complete');
        console.log(chalk.green(`✓ Epic ${epicId} marked complete`));
      }
    }
  } catch (error) {
    // Silently ignore cascade errors
    if (process.env.GINKO_DEBUG_API === 'true') {
      console.log(chalk.dim(`  Epic cascade check failed: ${error}`));
    }
  }
}

function formatStatus(status: SprintStatus): string {
  switch (status) {
    case 'complete':
      return chalk.green('✓ complete');
    case 'active':
      return chalk.cyan('▶ active');
    case 'paused':
      return chalk.yellow('⏸ paused');
    case 'planned':
    default:
      return chalk.dim('○ planned');
  }
}

function handleError(action: string, sprintId: string, error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes('SPRINT_NOT_FOUND') || error.message.includes('not found')) {
      console.error(chalk.red(`✗ Sprint not found: ${sprintId}`));
      console.error(chalk.dim('  Make sure the sprint ID is correct and exists in the graph'));
    } else if (error.message.includes('AUTH_REQUIRED')) {
      console.error(chalk.red('✗ Authentication required'));
      console.error(chalk.dim('  Run `ginko login` first'));
    } else if (error.message.includes('SERVICE_UNAVAILABLE')) {
      console.error(chalk.red('✗ Graph database unavailable'));
      console.error(chalk.dim('  Please try again later'));
    } else {
      console.error(chalk.red(`✗ Failed to ${action} sprint: ${error.message}`));
    }
  } else {
    console.error(chalk.red(`✗ Failed to ${action} sprint`));
  }
  process.exit(1);
}

// =============================================================================
// Commands
// =============================================================================

interface SprintStatusOptions {
  cascade?: boolean;
  yes?: boolean;
  verbose?: boolean;
}

/**
 * Start sprint (planned -> active)
 */
async function startSprintCommand(
  sprintId: string,
  options: SprintStatusOptions = {}
): Promise<void> {
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    const current = await client.getSprintStatus(graphId, sprintId);
    if (current.status === 'active') {
      console.log(chalk.yellow(`Sprint ${sprintId} is already active (no change)`));
      return;
    }

    const response = await client.updateSprintStatus(graphId, sprintId, 'active');
    console.log(chalk.cyan(`▶ Sprint ${sprintId} started`));
    if (response.sprint.name) {
      console.log(chalk.dim(`  "${response.sprint.name}"`));
    }
  } catch (error) {
    handleError('start', sprintId, error);
  }
}

/**
 * Complete sprint (active -> complete)
 */
async function completeSprintCommand(
  sprintId: string,
  options: SprintStatusOptions = {}
): Promise<void> {
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    const current = await client.getSprintStatus(graphId, sprintId);
    if (current.status === 'complete') {
      console.log(chalk.yellow(`Sprint ${sprintId} is already complete (no change)`));
      return;
    }

    const response = await client.updateSprintStatus(graphId, sprintId, 'complete');
    console.log(chalk.green(`✓ Sprint ${sprintId} marked complete`));
    if (response.sprint.name) {
      console.log(chalk.dim(`  "${response.sprint.name}"`));
    }

    // Cascade completion check
    if (options.cascade) {
      const epicId = extractEpicId(sprintId);
      if (epicId) {
        await checkEpicCompletion(client, graphId, epicId, !!options.yes);
      }
    }
  } catch (error) {
    handleError('complete', sprintId, error);
  }
}

/**
 * Pause sprint (active -> paused)
 */
async function pauseSprintCommand(
  sprintId: string,
  options: SprintStatusOptions = {}
): Promise<void> {
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    const current = await client.getSprintStatus(graphId, sprintId);
    if (current.status === 'paused') {
      console.log(chalk.yellow(`Sprint ${sprintId} is already paused (no change)`));
      return;
    }

    const response = await client.updateSprintStatus(graphId, sprintId, 'paused');
    console.log(chalk.yellow(`⏸ Sprint ${sprintId} paused`));
    if (response.sprint.name) {
      console.log(chalk.dim(`  "${response.sprint.name}"`));
    }
  } catch (error) {
    handleError('pause', sprintId, error);
  }
}

/**
 * Show sprint status
 */
async function showSprintCommand(
  sprintId: string,
  options: SprintStatusOptions = {}
): Promise<void> {
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    const status = await client.getSprintStatus(graphId, sprintId);
    console.log(chalk.bold(`Sprint: ${status.id}`));
    console.log(`Status: ${formatStatus(status.status)}`);
  } catch (error) {
    handleError('show', sprintId, error);
  }
}

// =============================================================================
// Command Factory
// =============================================================================

/**
 * Create sprint status subcommand group
 */
export function createSprintStatusCommands(): Command {
  const status = new Command('status')
    .description('Sprint status management (EPIC-015)')
    .addHelpText('after', `
${chalk.gray('Commands:')}
  ${chalk.green('ginko sprint status start')} <id>     ${chalk.dim('Start sprint (planned -> active)')}
  ${chalk.green('ginko sprint status complete')} <id>  ${chalk.dim('Complete sprint (active -> complete)')}
  ${chalk.green('ginko sprint status pause')} <id>     ${chalk.dim('Pause sprint (active -> paused)')}
  ${chalk.green('ginko sprint status show')} <id>      ${chalk.dim('Show current sprint status')}

${chalk.gray('Shortcuts (without "status"):')}
  ${chalk.green('ginko sprint start')} <id>
  ${chalk.green('ginko sprint complete')} <id>
  ${chalk.green('ginko sprint pause')} <id>

${chalk.gray('Valid Sprint Statuses:')}
  ${chalk.dim('planned   - Sprint not yet started (default)')}
  ${chalk.dim('active    - Sprint in progress')}
  ${chalk.dim('paused    - Sprint temporarily on hold')}
  ${chalk.dim('complete  - Sprint finished')}
`)
    .action(() => {
      status.help({ error: false });
    });

  status
    .command('start <sprintId>')
    .description('Start sprint (planned -> active)')
    .option('-v, --verbose', 'Show detailed output')
    .action(startSprintCommand);

  status
    .command('complete <sprintId>')
    .description('Complete sprint')
    .option('--cascade', 'Auto-complete parent epic if all sprints complete')
    .option('--yes', 'Skip confirmation prompts')
    .option('-v, --verbose', 'Show detailed output')
    .action(completeSprintCommand);

  status
    .command('pause <sprintId>')
    .description('Pause sprint (active -> paused)')
    .option('-v, --verbose', 'Show detailed output')
    .action(pauseSprintCommand);

  status
    .command('show <sprintId>')
    .description('Show sprint status')
    .option('-v, --verbose', 'Show detailed output')
    .action(showSprintCommand);

  return status;
}

/**
 * Create shortcut commands for sprint status (without "status" prefix)
 */
export function addSprintStatusShortcuts(sprint: Command): void {
  sprint
    .command('start <sprintId>')
    .description('Start sprint (shortcut for status start)')
    .option('-v, --verbose', 'Show detailed output')
    .action(startSprintCommand);

  sprint
    .command('complete <sprintId>')
    .description('Complete sprint (shortcut for status complete)')
    .option('--cascade', 'Auto-complete parent epic if all sprints complete')
    .option('--yes', 'Skip confirmation prompts')
    .option('-v, --verbose', 'Show detailed output')
    .action(completeSprintCommand);

  sprint
    .command('pause <sprintId>')
    .description('Pause sprint (shortcut for status pause)')
    .option('-v, --verbose', 'Show detailed output')
    .action(pauseSprintCommand);
}

export {
  startSprintCommand,
  completeSprintCommand,
  pauseSprintCommand,
  showSprintCommand,
};
