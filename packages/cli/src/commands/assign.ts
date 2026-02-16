/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-17
 * @tags: [cli, task, assign, sprint, graph]
 * @related: [graph/config.ts, api-client.ts, sprint/index.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [chalk, commander, fs-extra]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { api } from '../utils/api-client.js';
import { getGraphId } from './graph/config.js';
import { getGinkoDir } from '../utils/helpers.js';
import { requireCloud } from '../utils/cloud-guard.js';

// =============================================================================
// Types
// =============================================================================

interface AssignOptions {
  sprint?: string;
  all?: boolean;
  updateMarkdown?: boolean;
  verbose?: boolean;
}

interface TaskNode {
  id: string;
  title: string;
  assignee?: string;
  status: string;
  sprintId?: string;
}

interface ListNodesResponse {
  nodes: Array<{
    id: string;
    label: string;
    properties: TaskNode;
  }>;
  total: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find current sprint file
 */
async function findCurrentSprintFile(): Promise<string | null> {
  const ginkoDir = await getGinkoDir();
  const projectRoot = path.dirname(ginkoDir);
  const currentSprintPath = path.join(projectRoot, 'docs/sprints/CURRENT-SPRINT.md');

  if (await fs.pathExists(currentSprintPath)) {
    return currentSprintPath;
  }

  return null;
}

/**
 * Parse task IDs from sprint markdown file
 */
async function parseTasksFromSprint(sprintPath: string): Promise<string[]> {
  const content = await fs.readFile(sprintPath, 'utf-8');
  const taskIds: string[] = [];

  // Match task IDs in format: e006_s02_t01 or TASK-1, etc.
  const idPattern = /\*\*ID:\*\*\s*([\w_-]+)/g;
  let match;

  while ((match = idPattern.exec(content)) !== null) {
    taskIds.push(match[1]);
  }

  return taskIds;
}

/**
 * Update assignee in sprint markdown file
 */
async function updateSprintMarkdown(sprintPath: string, taskId: string, email: string): Promise<boolean> {
  try {
    let content = await fs.readFile(sprintPath, 'utf-8');

    // Find the task section and update assignee
    // Look for pattern: **ID:** task_id followed by **Assignee:** line
    const taskSectionRegex = new RegExp(
      `(\\*\\*ID:\\*\\*\\s*${taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?\\*\\*Assignee:\\*\\*)\\s*[^\\n]*`,
      'i'
    );

    if (taskSectionRegex.test(content)) {
      content = content.replace(taskSectionRegex, `$1 ${email}`);
      await fs.writeFile(sprintPath, content, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch tasks from graph by sprint ID
 */
async function fetchTasksBySprint(graphId: string, sprintId: string): Promise<TaskNode[]> {
  // List all tasks and filter by sprint prefix
  const response = await api.get<ListNodesResponse>(
    `/api/v1/graph/nodes?graphId=${graphId}&labels=Task&limit=100`
  );

  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to fetch tasks');
  }

  // Filter tasks that belong to the sprint
  // Check sprintId property first, then fall back to ID prefix matching
  // e.g., sprint e006_s02 includes tasks e006_s02_t01, e006_s02_t02, etc.
  return response.data.nodes
    .map(node => node.properties)
    .filter(task => task.sprintId === sprintId || task.id?.startsWith(sprintId));
}

/**
 * Update task assignee in graph
 */
async function updateTaskAssignee(graphId: string, taskId: string, email: string): Promise<boolean> {
  const response = await api.patch(
    `/api/v1/graph/nodes/${taskId}?graphId=${encodeURIComponent(graphId)}`,
    {
      properties: { assignee: email }
    }
  );

  return !response.error;
}

// =============================================================================
// Main Command
// =============================================================================

export async function assignCommand(
  taskIdOrEmail: string,
  emailArg?: string,
  options: AssignOptions = {}
): Promise<void> {
  await requireCloud('assign');
  const { sprint, all, updateMarkdown = true, verbose } = options;

  // Determine if we're in bulk mode (--sprint --all) or single task mode
  const isBulkMode = sprint && all;

  // In bulk mode: taskIdOrEmail is the email
  // In single mode: taskIdOrEmail is task_id, emailArg is email
  const email = isBulkMode ? taskIdOrEmail : emailArg;
  const taskId = isBulkMode ? undefined : taskIdOrEmail;

  if (!email) {
    console.error(chalk.red('✗ Email is required'));
    console.error(chalk.dim('  Usage: ginko assign <task-id> <email>'));
    console.error(chalk.dim('  Usage: ginko assign --sprint <sprint-id> --all <email>'));
    process.exit(1);
  }

  // Validate email format
  if (!email.includes('@')) {
    console.error(chalk.red('✗ Invalid email format'));
    process.exit(1);
  }

  // Get graph ID
  const graphId = process.env.GINKO_GRAPH_ID || await getGraphId();

  if (!graphId) {
    console.error(chalk.red('✗ Graph not initialized'));
    console.error(chalk.dim('  Run `ginko graph init` first'));
    process.exit(1);
  }

  if (verbose) {
    console.log(chalk.dim(`Using graph: ${graphId}`));
  }

  try {
    if (isBulkMode && sprint) {
      // Bulk assignment mode
      console.log(chalk.cyan(`\nAssigning all tasks in sprint ${sprint} to ${email}...`));

      const tasks = await fetchTasksBySprint(graphId, sprint);

      if (tasks.length === 0) {
        console.log(chalk.yellow(`No tasks found for sprint ${sprint}`));
        return;
      }

      console.log(chalk.dim(`Found ${tasks.length} tasks\n`));

      let successCount = 0;
      let failCount = 0;

      for (const task of tasks) {
        const success = await updateTaskAssignee(graphId, task.id, email);

        if (success) {
          successCount++;
          console.log(chalk.green(`  ✓ ${task.id}`), chalk.dim(task.title));
        } else {
          failCount++;
          console.log(chalk.red(`  ✗ ${task.id}`), chalk.dim(task.title));
        }
      }

      // Update sprint markdown if requested
      if (updateMarkdown) {
        const sprintFile = await findCurrentSprintFile();
        if (sprintFile) {
          let mdUpdated = 0;
          for (const task of tasks) {
            if (await updateSprintMarkdown(sprintFile, task.id, email)) {
              mdUpdated++;
            }
          }
          if (mdUpdated > 0) {
            console.log(chalk.dim(`\nUpdated ${mdUpdated} assignees in sprint markdown`));
          }
        }
      }

      console.log(chalk.green(`\n✓ Assigned ${successCount} tasks to ${email}`));
      if (failCount > 0) {
        console.log(chalk.yellow(`  ${failCount} tasks failed to update`));
      }

    } else if (taskId) {
      // Single task assignment mode
      console.log(chalk.cyan(`\nAssigning ${taskId} to ${email}...`));

      const success = await updateTaskAssignee(graphId, taskId, email);

      if (success) {
        console.log(chalk.green(`✓ Assigned ${taskId} to ${email}`));

        // Update sprint markdown if requested
        if (updateMarkdown) {
          const sprintFile = await findCurrentSprintFile();
          if (sprintFile && await updateSprintMarkdown(sprintFile, taskId, email)) {
            console.log(chalk.dim('  Updated sprint markdown'));
          }
        }
      } else {
        console.error(chalk.red(`✗ Failed to assign ${taskId}`));
        console.error(chalk.dim('  Task may not exist in the graph'));
        process.exit(1);
      }

    } else {
      console.error(chalk.red('✗ Task ID is required'));
      console.error(chalk.dim('  Usage: ginko assign <task-id> <email>'));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n✗ Assignment failed'));
    if (error instanceof Error) {
      console.error(chalk.dim(`  ${error.message}`));
    }
    process.exit(1);
  }
}
