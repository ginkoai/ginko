/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-19
 * @tags: [cli, task, status, graph-authoritative, epic-015]
 * @related: [../graph/api-client.ts, ../../index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, commander]
 */

import chalk from 'chalk';
import readline from 'readline';
import { GraphApiClient, TaskStatus } from '../graph/api-client.js';
import { getGraphId } from '../graph/config.js';
import { getCurrentUser } from '../../utils/auth-storage.js';
import { autoPush } from '../../lib/auto-push.js';

// =============================================================================
// Types
// =============================================================================

interface StatusCommandOptions {
  cascade?: boolean;
  yes?: boolean;
  note?: string;
  verbose?: boolean;
}

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
 * Auto-returns true in non-TTY environments to prevent hanging.
 */
async function confirm(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return true;
  }

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
 * Prompt user for input
 */
async function prompt(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Validate task ID is non-empty and matches expected patterns.
 * Exits with clear error message if invalid.
 *
 * Valid formats:
 *   e001_s01_t01         (standard)
 *   adhoc_260202_s01_t01 (ad-hoc)
 */
function validateTaskId(taskId: string): void {
  if (!taskId || taskId.trim().length === 0) {
    console.error(chalk.red('✗ Task ID is required and cannot be empty'));
    console.error(chalk.dim('  Usage: ginko task <command> <taskId>'));
    console.error(chalk.dim('  Example: ginko task start e015_s01_t01'));
    process.exit(1);
  }

  const trimmed = taskId.trim();
  const validPattern = /^(e\d+_s\d+_t\d+|adhoc_\d{6}_s\d+_t\d+)$/;
  if (!validPattern.test(trimmed)) {
    console.error(chalk.red(`✗ Invalid task ID: "${taskId}"`));
    console.error(chalk.dim('  Expected format: e001_s01_t01 or adhoc_260202_s01_t01'));
    process.exit(1);
  }
}

/**
 * Extract sprint ID from task ID
 * e.g., e015_s01_t01 -> e015_s01
 */
function extractSprintId(taskId: string): string | null {
  // Match pattern: e{NNN}_s{NN}_t{NN}
  const match = taskId.match(/^(e\d+_s\d+)_t\d+$/);
  return match ? match[1] : null;
}

/**
 * Check if all tasks in sprint are complete and offer to complete sprint
 */
async function checkSprintCompletion(
  client: GraphApiClient,
  graphId: string,
  sprintId: string,
  skipPrompt: boolean
): Promise<void> {
  try {
    const tasks = await client.getSprintTasks(graphId, sprintId);
    const allComplete = tasks.every(t => t.status === 'complete');

    if (allComplete && tasks.length > 0) {
      console.log(chalk.cyan(`\nAll tasks in ${sprintId} are complete.`));

      const shouldComplete = skipPrompt || await confirm('Mark sprint complete?');
      if (shouldComplete) {
        const response = await client.updateSprintStatus(graphId, sprintId, 'complete');
        console.log(chalk.green(`✓ Sprint ${sprintId} marked complete`));

        // Check epic completion
        const epicId = sprintId.split('_')[0]; // e.g., e015_s01 -> e015
        if (epicId) {
          await checkEpicCompletion(client, graphId, epicId, skipPrompt);
        }
      }
    }
  } catch (error) {
    // Silently ignore cascade errors - main operation succeeded
    if (process.env.GINKO_DEBUG_API === 'true') {
      console.log(chalk.dim(`  Cascade check failed: ${error}`));
    }
  }
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

// =============================================================================
// Commands
// =============================================================================

/**
 * Mark task as complete
 * Usage: ginko task complete <taskId> [--cascade] [--yes]
 */
export async function completeCommand(
  taskId: string,
  options: StatusCommandOptions = {}
): Promise<void> {
  validateTaskId(taskId);
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    // Check current status
    const current = await client.getTaskStatus(graphId, taskId);
    if (current.status === 'complete') {
      console.log(chalk.yellow(`Task ${taskId} is already complete (no change)`));
      return;
    }

    // Update status
    const response = await client.updateTaskStatus(graphId, taskId, 'complete');
    console.log(chalk.green(`✓ Task ${taskId} marked complete`));
    if (response.task.title) {
      console.log(chalk.dim(`  "${response.task.title}"`));
    }

    // Cascade completion check
    if (options.cascade) {
      const sprintId = extractSprintId(taskId);
      if (sprintId) {
        await checkSprintCompletion(client, graphId, sprintId, !!options.yes);
      }
    }

    // ADR-077: Auto-push after status change
    await autoPush();
  } catch (error) {
    handleError('complete', taskId, error);
  }
}

/**
 * Get task details from graph including assignee
 * Uses the graph nodes API to fetch full task properties
 */
async function getTaskDetails(
  client: GraphApiClient,
  graphId: string,
  taskId: string
): Promise<{ assignee: string | null; title: string | null }> {
  try {
    // Use the graph nodes API to get full task details
    const response = await client.request<{
      node: { properties: { assignee?: string; title?: string } };
    }>('GET', `/api/v1/graph/nodes/${encodeURIComponent(taskId)}?graphId=${encodeURIComponent(graphId)}`);

    return {
      assignee: response.node?.properties?.assignee || null,
      title: response.node?.properties?.title || null,
    };
  } catch {
    // If we can't get details, assume no assignee
    return { assignee: null, title: null };
  }
}

/**
 * Update task assignee in graph
 */
async function updateTaskAssignee(
  client: GraphApiClient,
  graphId: string,
  taskId: string,
  assignee: string
): Promise<void> {
  await client.request<{ node: { id: string } }>(
    'PATCH',
    `/api/v1/graph/nodes/${encodeURIComponent(taskId)}?graphId=${encodeURIComponent(graphId)}`,
    { assignee }
  );
}

/**
 * Mark task as in progress
 * Usage: ginko task start <taskId>
 *
 * Per ADR-061: Starting work on a task requires assignment.
 * If task is unassigned, prompts user to assign to themselves.
 */
export async function startCommand(
  taskId: string,
  options: StatusCommandOptions = {}
): Promise<void> {
  validateTaskId(taskId);
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    // Check current status
    const current = await client.getTaskStatus(graphId, taskId);
    if (current.status === 'in_progress') {
      console.log(chalk.yellow(`Task ${taskId} is already in progress (no change)`));
      return;
    }

    // ADR-061: Check assignment before starting (work cannot be anonymous)
    const taskDetails = await getTaskDetails(client, graphId, taskId);
    const currentUser = await getCurrentUser();

    if (!taskDetails.assignee && currentUser?.email) {
      // Task is unassigned - prompt for assignment per ADR-061
      console.log(chalk.yellow(`\nTask ${taskId} is unassigned.`));
      if (taskDetails.title) {
        console.log(chalk.dim(`  "${taskDetails.title}"`));
      }

      const shouldAssign = options.yes || await confirm(`Assign to you (${currentUser.email})?`);

      if (shouldAssign) {
        await updateTaskAssignee(client, graphId, taskId, currentUser.email);
        console.log(chalk.green(`✓ Assigned to ${currentUser.email}`));
      } else {
        // User declined assignment - warn but allow per ADR-061
        console.log(chalk.yellow('⚠ Working without assignment. Work may not be traceable.'));
      }
    }

    // Update status to in_progress
    const response = await client.updateTaskStatus(graphId, taskId, 'in_progress');
    console.log(chalk.cyan(`▶ Task ${taskId} started`));
    if (response.task.title) {
      console.log(chalk.dim(`  "${response.task.title}"`));
    }

    // ADR-077: Auto-push after status change
    await autoPush();
  } catch (error) {
    handleError('start', taskId, error);
  }
}

/**
 * Pause task (return to not_started)
 * Usage: ginko task pause <taskId>
 */
export async function pauseCommand(
  taskId: string,
  options: StatusCommandOptions = {}
): Promise<void> {
  validateTaskId(taskId);
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    // Check current status
    const current = await client.getTaskStatus(graphId, taskId);
    if (current.status === 'not_started') {
      console.log(chalk.yellow(`Task ${taskId} is already not started (no change)`));
      return;
    }

    // Update status
    const response = await client.updateTaskStatus(graphId, taskId, 'not_started');
    console.log(chalk.yellow(`⏸ Task ${taskId} paused`));
    if (response.task.title) {
      console.log(chalk.dim(`  "${response.task.title}"`));
    }

    // ADR-077: Auto-push after status change
    await autoPush();
  } catch (error) {
    handleError('pause', taskId, error);
  }
}

/**
 * Block task with reason
 * Usage: ginko task block <taskId> [reason]
 */
export async function blockCommand(
  taskId: string,
  reason?: string,
  options: StatusCommandOptions = {}
): Promise<void> {
  validateTaskId(taskId);
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    // Check current status
    const current = await client.getTaskStatus(graphId, taskId);
    if (current.status === 'blocked') {
      console.log(chalk.yellow(`Task ${taskId} is already blocked`));
      if (current.blocked_reason) {
        console.log(chalk.dim(`  Reason: ${current.blocked_reason}`));
      }
      return;
    }

    // Get reason if not provided
    let blockReason = reason;
    if (!blockReason) {
      blockReason = await prompt('Reason for blocking');
      if (!blockReason) {
        console.error(chalk.red('✗ Reason is required for blocking a task'));
        process.exit(1);
      }
    }

    // Update status
    const response = await client.updateTaskStatus(graphId, taskId, 'blocked', blockReason);
    console.log(chalk.red(`⊘ Task ${taskId} blocked`));
    if (response.task.title) {
      console.log(chalk.dim(`  "${response.task.title}"`));
    }
    console.log(chalk.dim(`  Reason: ${blockReason}`));

    // ADR-077: Auto-push after status change
    await autoPush();
  } catch (error) {
    handleError('block', taskId, error);
  }
}

/**
 * Get full task details from graph (EPIC-018)
 */
async function getFullTaskDetails(
  client: GraphApiClient,
  graphId: string,
  taskId: string
): Promise<{
  id: string;
  title: string | null;
  status: TaskStatus;
  priority: string | null;
  estimate: string | null;
  assignee: string | null;
  problem: string | null;
  solution: string | null;
  approach: string | null;
  scope: string | null;
  goal: string | null;
  acceptance_criteria: string[];
  confidence: number | null;
  content_quality: string | null;
  blocked_reason?: string;
} | null> {
  try {
    const response = await client.request<{
      node: {
        properties: {
          id: string;
          title?: string;
          status?: string;
          priority?: string;
          estimate?: string;
          assignee?: string;
          problem?: string;
          solution?: string;
          approach?: string;
          scope?: string;
          goal?: string;
          acceptance_criteria?: string[];
          confidence?: number;
          content_quality?: string;
          blocked_reason?: string;
        };
      };
    }>('GET', `/api/v1/graph/nodes/${encodeURIComponent(taskId)}?graphId=${encodeURIComponent(graphId)}`);

    const props = response.node?.properties;
    if (!props) return null;

    return {
      id: props.id || taskId,
      title: props.title || null,
      status: (props.status as TaskStatus) || 'not_started',
      priority: props.priority || null,
      estimate: props.estimate || null,
      assignee: props.assignee || null,
      problem: props.problem || null,
      solution: props.solution || null,
      approach: props.approach || null,
      scope: props.scope || null,
      goal: props.goal || null,
      acceptance_criteria: props.acceptance_criteria || [],
      confidence: props.confidence ?? null,
      content_quality: props.content_quality || null,
      blocked_reason: props.blocked_reason,
    };
  } catch {
    return null;
  }
}

/**
 * Assess content quality (EPIC-018)
 */
function assessContentQuality(task: {
  problem: string | null;
  solution: string | null;
  approach: string | null;
  scope: string | null;
  goal: string | null;
  acceptance_criteria: string[];
}): 'thin' | 'adequate' | 'rich' {
  const hasContent = (s: string | null) => s && s.length >= 20;

  // Thin: Missing problem statement or acceptance criteria
  if (!hasContent(task.problem) && !hasContent(task.goal)) return 'thin';
  if (task.acceptance_criteria.length === 0) return 'thin';

  // Adequate: Has basics but missing approach or scope
  if (!hasContent(task.approach)) return 'adequate';
  if (!hasContent(task.scope) && !hasContent(task.solution)) return 'adequate';

  return 'rich';
}

/**
 * Format content quality badge
 */
function formatContentQuality(quality: string | null): string {
  switch (quality) {
    case 'rich':
      return chalk.green('● rich');
    case 'adequate':
      return chalk.yellow('◐ adequate');
    case 'thin':
    default:
      return chalk.red('○ thin');
  }
}

/**
 * Show task status and full 3x5 card content (EPIC-018)
 * Usage: ginko task show <taskId>
 */
export async function showCommand(
  taskId: string,
  options: StatusCommandOptions = {}
): Promise<void> {
  validateTaskId(taskId);
  const graphId = await requireGraphId();
  const client = new GraphApiClient();

  try {
    // Try to get full task details first
    const fullTask = await getFullTaskDetails(client, graphId, taskId);

    if (fullTask) {
      // Rich display with WHY-WHAT-HOW format (EPIC-018)
      const quality = fullTask.content_quality || assessContentQuality(fullTask);

      console.log('');
      console.log(chalk.bold(`### ${fullTask.id}: ${fullTask.title || 'Untitled'}`));
      if (fullTask.estimate) {
        console.log(chalk.dim(`Estimate: ${fullTask.estimate}`));
      }
      console.log('');

      // Status line
      console.log(`${chalk.dim('Status:')} ${formatStatus(fullTask.status)}  ${chalk.dim('Priority:')} ${fullTask.priority || 'MEDIUM'}  ${chalk.dim('Quality:')} ${formatContentQuality(quality)}`);
      if (fullTask.confidence !== null) {
        const confColor = fullTask.confidence >= 80 ? chalk.green : fullTask.confidence >= 60 ? chalk.yellow : chalk.red;
        console.log(`${chalk.dim('Confidence:')} ${confColor(`${fullTask.confidence}%`)}`);
      }
      if (fullTask.assignee) {
        console.log(`${chalk.dim('Assignee:')} ${fullTask.assignee}`);
      }
      if (fullTask.blocked_reason) {
        console.log(chalk.red(`Blocked: ${fullTask.blocked_reason}`));
      }
      console.log('');

      // WHY-WHAT-HOW content
      if (fullTask.problem) {
        console.log(chalk.cyan('**Problem:**'));
        console.log(`  ${fullTask.problem}`);
        console.log('');
      }

      if (fullTask.solution) {
        console.log(chalk.cyan('**Solution:**'));
        console.log(`  ${fullTask.solution}`);
        console.log('');
      } else if (fullTask.goal) {
        // Fallback to legacy goal field
        console.log(chalk.cyan('**Goal:**'));
        console.log(`  ${fullTask.goal}`);
        console.log('');
      }

      if (fullTask.approach) {
        console.log(chalk.cyan('**Approach:**'));
        console.log(`  ${fullTask.approach}`);
        console.log('');
      }

      if (fullTask.scope) {
        console.log(chalk.cyan('**Scope:**'));
        // Handle both inline and multi-line scope
        const scopeLines = fullTask.scope.split('\n');
        for (const line of scopeLines) {
          console.log(`  ${line}`);
        }
        console.log('');
      }

      if (fullTask.acceptance_criteria.length > 0) {
        console.log(chalk.cyan('**Acceptance Criteria:**'));
        for (const criterion of fullTask.acceptance_criteria) {
          console.log(`  - [ ] ${criterion}`);
        }
        console.log('');
      }

      // Quality warning for thin tasks
      if (quality === 'thin') {
        console.log(chalk.yellow('⚠️  This task has thin content. Consider enriching with:'));
        if (!fullTask.problem && !fullTask.goal) {
          console.log(chalk.dim('   - Problem statement (WHY this task exists)'));
        }
        if (!fullTask.solution && !fullTask.goal) {
          console.log(chalk.dim('   - Solution description (WHAT we\'re achieving)'));
        }
        if (!fullTask.approach) {
          console.log(chalk.dim('   - Approach (HOW to implement)'));
        }
        if (fullTask.acceptance_criteria.length === 0) {
          console.log(chalk.dim('   - Acceptance criteria (definition of done)'));
        }
      }

    } else {
      // Fallback to basic status display
      const status = await client.getTaskStatus(graphId, taskId);

      console.log(chalk.bold(`Task: ${status.id}`));
      console.log(`Status: ${formatStatus(status.status)}`);
      if (status.blocked_reason) {
        console.log(chalk.dim(`Blocked: ${status.blocked_reason}`));
      }
    }
  } catch (error) {
    handleError('show', taskId, error);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function formatStatus(status: TaskStatus): string {
  switch (status) {
    case 'complete':
      return chalk.green('✓ complete');
    case 'in_progress':
      return chalk.cyan('▶ in_progress');
    case 'blocked':
      return chalk.red('⊘ blocked');
    case 'not_started':
    default:
      return chalk.dim('○ not_started');
  }
}

function handleError(action: string, taskId: string, error: unknown): never {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('TASK_NOT_FOUND') || msg.includes('not found')) {
      console.error(chalk.red(`✗ Task not found: ${taskId}`));
      console.error(chalk.dim('  Make sure the task ID is correct and exists in the graph'));
    } else if (msg.includes('AUTH_REQUIRED')) {
      console.error(chalk.red('✗ Authentication required'));
      console.error(chalk.dim('  Run `ginko login` first'));
    } else if (msg.includes('SERVICE_UNAVAILABLE')) {
      console.error(chalk.red('✗ Graph database unavailable'));
      console.error(chalk.dim('  Please try again later'));
    } else if (msg.includes('<!DOCTYPE') || msg.includes('<html') || msg.includes('Unexpected token')) {
      console.error(chalk.red(`✗ Unexpected response from API while trying to ${action} task ${taskId}`));
      console.error(chalk.dim('  The server returned an HTML error page instead of JSON.'));
      console.error(chalk.dim('  This usually means the task ID or endpoint is invalid.'));
    } else {
      console.error(chalk.red(`✗ Failed to ${action} task: ${msg}`));
    }
  } else {
    console.error(chalk.red(`✗ Failed to ${action} task`));
  }
  process.exit(1);
}
