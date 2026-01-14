/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-22
 * @tags: [sync, sprint-syncer, cloud-to-local, ADR-054, EPIC-006]
 * @related: [sync-command.ts, types.ts, node-syncer.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs, path, glob]
 */

/**
 * Sprint Syncer (ADR-054 Extension)
 *
 * Handles syncing Sprint and Task status from cloud graph to local markdown.
 * Unlike knowledge nodes which replace entire files, sprint sync updates
 * specific task status checkboxes within existing markdown files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'glob';
import { promisify } from 'util';
import type { SprintSyncResult, TaskStatusUpdate, SprintFile } from './types.js';

const globAsync = promisify(glob);

/**
 * Task status values from graph
 */
type TaskStatus = 'todo' | 'in_progress' | 'complete' | 'blocked';

/**
 * Map graph status to markdown checkbox format
 */
function statusToCheckbox(status: TaskStatus): string {
  switch (status) {
    case 'complete':
      return '[x]';
    case 'in_progress':
      return '[@]';
    case 'blocked':
      return '[Z]';
    case 'todo':
    default:
      return '[ ]';
  }
}

/**
 * Map graph status to display text
 */
function statusToText(status: TaskStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'in_progress':
      return 'In Progress';
    case 'blocked':
      return 'Blocked';
    case 'todo':
    default:
      return 'Pending';
  }
}

/**
 * Find all sprint markdown files in the project
 */
export async function findSprintFiles(projectRoot: string): Promise<SprintFile[]> {
  const pattern = path.join(projectRoot, 'docs/sprints/SPRINT-*.md');
  const files = await globAsync(pattern);

  const sprintFiles: SprintFile[] = [];

  for (const filePath of files) {
    // Skip CURRENT-SPRINT.md as it's a copy
    if (filePath.includes('CURRENT-SPRINT.md')) continue;

    const content = await fs.readFile(filePath, 'utf-8');
    const sprintId = extractSprintId(content, filePath);

    if (sprintId) {
      sprintFiles.push({
        path: filePath,
        sprintId,
        content,
      });
    }
  }

  return sprintFiles;
}

/**
 * Extract sprint ID from file content or filename
 * Looks for patterns like e006_s02 or adhoc_251209_s01
 */
function extractSprintId(content: string, filePath: string): string | null {
  // Try to find sprint ID in content (from task IDs)
  const taskIdMatch = content.match(/\*\*ID:\*\*\s*(e\d{3}_s\d{2}|adhoc_\d{6}_s\d{2})_t\d{2}/);
  if (taskIdMatch) {
    // Extract sprint portion from task ID
    const fullId = taskIdMatch[1];
    return fullId;
  }

  // Try to extract from filename pattern
  // e.g., SPRINT-2025-12-epic006-sprint2.md -> e006_s02
  const filenameMatch = path.basename(filePath).match(/epic(\d{3})-sprint(\d+)/i);
  if (filenameMatch) {
    const epicNum = filenameMatch[1].padStart(3, '0');
    const sprintNum = filenameMatch[2].padStart(2, '0');
    return `e${epicNum}_s${sprintNum}`;
  }

  // Try alternate filename pattern: e009-s01 format
  // e.g., SPRINT-2026-01-e009-s01-schema-migration.md -> e009_s01
  const altFilenameMatch = path.basename(filePath).match(/e(\d{3})-s(\d{2})/i);
  if (altFilenameMatch) {
    const epicNum = altFilenameMatch[1].padStart(3, '0');
    const sprintNum = altFilenameMatch[2].padStart(2, '0');
    return `e${epicNum}_s${sprintNum}`;
  }

  return null;
}

/**
 * Extract task IDs and their current status from sprint markdown
 */
export function extractTasksFromMarkdown(content: string): Map<string, { status: string; lineNum: number }> {
  const tasks = new Map<string, { status: string; lineNum: number }>();
  const lines = content.split('\n');

  let currentTaskId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for task ID line: **ID:** e006_s02_t01
    const idMatch = line.match(/\*\*ID:\*\*\s*(\w+)/);
    if (idMatch) {
      currentTaskId = idMatch[1];
    }

    // Look for status line: **Status:** [ ] Pending
    const statusMatch = line.match(/\*\*Status:\*\*\s*\[([ xX@Z])\]/);
    if (statusMatch && currentTaskId) {
      tasks.set(currentTaskId, {
        status: statusMatch[1],
        lineNum: i,
      });
      currentTaskId = null;
    }
  }

  return tasks;
}

/**
 * Update sprint markdown with new task statuses
 */
export function updateSprintMarkdown(
  content: string,
  updates: TaskStatusUpdate[]
): { updated: string; changes: string[] } {
  const lines = content.split('\n');
  const changes: string[] = [];

  let currentTaskId: string | null = null;
  let totalTasks = 0;
  let completedTasks = 0;

  // First pass: update task statuses
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track task ID
    const idMatch = line.match(/\*\*ID:\*\*\s*(\w+)/);
    if (idMatch) {
      currentTaskId = idMatch[1];
    }

    // Update status line if we have an update for this task
    const statusMatch = line.match(/(\*\*Status:\*\*\s*)\[([ xX@Z])\](\s*\w+)?/);
    if (statusMatch && currentTaskId) {
      totalTasks++;

      const update = updates.find(u => u.taskId === currentTaskId);
      if (update) {
        const newCheckbox = statusToCheckbox(update.newStatus as TaskStatus);
        const newText = statusToText(update.newStatus as TaskStatus);
        const newLine = `${statusMatch[1]}${newCheckbox} ${newText}`;

        if (lines[i] !== newLine) {
          changes.push(`${currentTaskId}: ${statusMatch[2]} -> ${newCheckbox}`);
          lines[i] = newLine;
        }

        if (update.newStatus === 'complete') {
          completedTasks++;
        }
      } else {
        // Count existing complete tasks
        if (statusMatch[2].toLowerCase() === 'x') {
          completedTasks++;
        }
      }

      currentTaskId = null;
    }
  }

  // Second pass: update progress line
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const progressComplete = progressPercent === 100 ? ' \u2713' : '';

  for (let i = 0; i < lines.length; i++) {
    const progressMatch = lines[i].match(/(\*\*Progress:\*\*\s*)\d+%\s*\(\d+\/\d+\s*tasks?\s*complete\)(\s*[✓✔])?/i);
    if (progressMatch) {
      const newProgress = `${progressMatch[1]}${progressPercent}% (${completedTasks}/${totalTasks} tasks complete)${progressComplete}`;
      if (lines[i] !== newProgress) {
        changes.push(`Progress: ${progressPercent}% (${completedTasks}/${totalTasks})`);
        lines[i] = newProgress;
      }
      break;
    }
  }

  // Third pass: update success criteria checkboxes if all tasks complete
  if (progressPercent === 100) {
    for (let i = 0; i < lines.length; i++) {
      // Update unchecked success criteria to checked
      if (lines[i].match(/^- \[ \]/)) {
        lines[i] = lines[i].replace(/^- \[ \]/, '- [x]');
      }
    }
  }

  return {
    updated: lines.join('\n'),
    changes,
  };
}

/**
 * Fetch task statuses from graph API
 */
export async function fetchTaskStatuses(
  graphId: string,
  token: string,
  sprintId: string,
  apiBase: string
): Promise<TaskStatusUpdate[]> {
  const url = new URL(`${apiBase}/api/v1/graph/nodes`);
  url.searchParams.set('graphId', graphId);
  url.searchParams.set('labels', 'Task');
  url.searchParams.set('limit', '100');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.status}`);
  }

  interface TaskNodesResponse {
    nodes?: Array<{
      properties?: {
        id?: string;
        status?: string;
      };
    }>;
  }

  const data = (await response.json()) as TaskNodesResponse;
  const updates: TaskStatusUpdate[] = [];

  // Filter tasks belonging to this sprint
  for (const node of data.nodes || []) {
    const taskId = node.properties?.id;
    const status = node.properties?.status;

    // Check if task belongs to this sprint (starts with sprint ID)
    if (taskId && taskId.startsWith(sprintId) && status) {
      updates.push({
        taskId,
        newStatus: status,
        sprintId,
      });
    }
  }

  return updates;
}

/**
 * Sync a single sprint file with graph data
 */
export async function syncSprintFile(
  sprintFile: SprintFile,
  graphId: string,
  token: string,
  apiBase: string
): Promise<SprintSyncResult> {
  const result: SprintSyncResult = {
    sprintId: sprintFile.sprintId,
    filePath: sprintFile.path,
    tasksUpdated: 0,
    changes: [],
    error: null,
  };

  try {
    // Fetch task statuses from graph
    const updates = await fetchTaskStatuses(graphId, token, sprintFile.sprintId, apiBase);

    if (updates.length === 0) {
      result.changes.push('No tasks found in graph for this sprint');
      return result;
    }

    // Update markdown content
    const { updated, changes } = updateSprintMarkdown(sprintFile.content, updates);

    if (changes.length === 0) {
      result.changes.push('Already in sync');
      return result;
    }

    // Write updated content
    await fs.writeFile(sprintFile.path, updated, 'utf-8');

    result.tasksUpdated = changes.filter(c => c.includes('->')).length;
    result.changes = changes;

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Update CURRENT-SPRINT.md to match the active sprint
 */
export async function updateCurrentSprintFile(
  projectRoot: string,
  activeSprintPath: string
): Promise<void> {
  const currentSprintPath = path.join(projectRoot, 'docs/sprints/CURRENT-SPRINT.md');
  const content = await fs.readFile(activeSprintPath, 'utf-8');
  await fs.writeFile(currentSprintPath, content, 'utf-8');
}
