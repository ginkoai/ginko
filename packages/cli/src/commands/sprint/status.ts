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
import { setUserCurrentSprint } from '../../lib/user-sprint.js';
import { findSprintFileById } from '../../lib/sprint-loader.js';
import { parseSprintFile, assessTaskContentQuality, type ParsedTask } from '../../lib/task-parser.js';
import { getProjectRoot } from '../../utils/helpers.js';
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

/**
 * Display investigation phase prompt for thin tasks (EPIC-018 Sprint 3)
 *
 * Shows thin tasks and offers user choice to enrich or proceed.
 * Philosophy: Questions at sprint start = thoughtfulness, not weakness.
 */
async function showInvestigationPhase(
  thinTasks: ParsedTask[],
  sprintId: string
): Promise<'enrich' | 'proceed' | 'review'> {
  console.log(chalk.yellow(`\n📋 INVESTIGATION PHASE`));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(chalk.cyan(`Sprint ${sprintId} has ${thinTasks.length} task(s) that may need clarification:\n`));

  for (const task of thinTasks) {
    const quality = assessTaskContentQuality(task);
    const icon = quality === 'thin' ? chalk.red('○') : chalk.yellow('◐');
    console.log(`  ${icon} ${chalk.bold(task.id)}: ${task.title}`);
    if (!task.problem && !task.goal) {
      console.log(chalk.dim('      Missing: problem statement'));
    }
    if (task.acceptance_criteria.length === 0) {
      console.log(chalk.dim('      Missing: acceptance criteria'));
    }
  }

  console.log(chalk.dim('\n─'.repeat(50)));
  console.log(chalk.cyan.bold('\nThis is the time to clarify ambiguities and make choices.'));
  console.log(chalk.dim('Questions now = thoughtfulness, not weakness.\n'));

  console.log('How would you like to proceed?');
  console.log(chalk.green('  [1]') + ' Enrich tasks now ' + chalk.dim('(recommended)'));
  console.log(chalk.yellow('  [2]') + ' Proceed anyway ' + chalk.dim('(will need clarification later)'));
  console.log(chalk.dim('  [3]') + ' Review sprint goals first');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\nChoice [1/2/3]: ', (answer) => {
      rl.close();
      const choice = answer.trim();
      if (choice === '2') {
        console.log(chalk.yellow('\n⚡ Proceeding with thin tasks. You may need to clarify as you go.\n'));
        resolve('proceed');
      } else if (choice === '3') {
        console.log(chalk.dim('\nReview the sprint file and goals, then run `ginko sprint start` again.\n'));
        resolve('review');
      } else {
        console.log(chalk.green('\n✓ Great choice! Use `ginko task show <id>` to view tasks and enrich them.\n'));
        resolve('enrich');
      }
    });
  });
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
 *
 * EPIC-018 Sprint 3: Includes investigation phase for thin tasks.
 * If thin tasks are detected, prompts user to enrich or proceed.
 */
async function startSprintCommand(
  sprintId: string,
  options: SprintStatusOptions = {}
): Promise<void> {
  await requireCloud('sprint start');
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    const current = await client.getSprintStatus(graphId, sprintId);
    const epicId = extractEpicId(sprintId) || sprintId.split('_')[0];

    // EPIC-018 Sprint 3: Investigation phase for thin tasks
    // Check local sprint file for task quality before starting
    let projectRoot: string;
    try {
      projectRoot = await getProjectRoot();
    } catch {
      projectRoot = process.cwd();
    }

    const sprintFile = await findSprintFileById(sprintId, projectRoot);
    if (sprintFile) {
      const sprintData = await parseSprintFile(sprintFile);
      if (sprintData && sprintData.tasks.length > 0) {
        const thinTasks = sprintData.tasks.filter(
          task => assessTaskContentQuality(task) === 'thin'
        );

        if (thinTasks.length > 0 && !options.yes) {
          const choice = await showInvestigationPhase(thinTasks, sprintId);
          if (choice === 'review') {
            // User wants to review first - don't start sprint
            return;
          }
          // 'enrich' or 'proceed' both continue to start the sprint
        }
      }
    }

    if (current.status === 'active') {
      console.log(chalk.yellow(`Sprint ${sprintId} is already active`));
      // Still set as user's focus sprint (they want to work on this)
      await setUserCurrentSprint({
        sprintId,
        epicId,
        sprintFile: sprintFile || '', // Use found file if available
        sprintName: sprintId,
        assignedAt: new Date().toISOString(),
        assignedBy: 'manual',
      });
      return;
    }

    const response = await client.updateSprintStatus(graphId, sprintId, 'active');
    console.log(chalk.cyan(`▶ Sprint ${sprintId} started`));
    if (response.sprint.name) {
      console.log(chalk.dim(`  "${response.sprint.name}"`));
    }

    // Also set as user's focus sprint for continuity in `ginko start`
    await setUserCurrentSprint({
      sprintId,
      epicId,
      sprintFile: sprintFile || '', // Use found file if available
      sprintName: response.sprint.name || sprintId,
      assignedAt: new Date().toISOString(),
      assignedBy: 'manual',
    });
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
  await requireCloud('sprint complete');
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
  await requireCloud('sprint pause');
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
  await requireCloud('sprint show');
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
