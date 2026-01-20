/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-20
 * @tags: [migrate, status, sprint-to-graph, epic-015, sprint-3]
 * @related: [../sync/sprint-syncer.ts, ../graph/api-client.ts, ../task/status.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [glob, chalk, fs]
 */

/**
 * Status Migration (EPIC-015 Sprint 3 Task 1)
 *
 * Migrates task status from sprint markdown files to the knowledge graph.
 * This is a one-way migration: markdown -> graph.
 *
 * Checkbox mapping:
 *   [x] -> complete
 *   [@] -> in_progress
 *   [Z] -> not_started (paused)
 *   [ ] -> not_started
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'glob';
import { promisify } from 'util';
import chalk from 'chalk';
import { GraphApiClient, TaskStatus } from '../graph/api-client.js';
import { getGraphId } from '../graph/config.js';

const globAsync = promisify(glob);

// =============================================================================
// Types
// =============================================================================

export interface MigrationTask {
  id: string;
  currentStatus: string;
  targetStatus: TaskStatus;
  sprintId: string;
  sprintFile: string;
  lineNumber: number;
}

export interface MigrationReport {
  totalTasks: number;
  toUpdate: MigrationTask[];
  noChange: MigrationTask[];
  errors: Array<{ task: MigrationTask; error: string }>;
  updated: MigrationTask[];
  skipped: MigrationTask[];
}

export interface StatusMigrationOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

// =============================================================================
// Checkbox Parsing
// =============================================================================

/**
 * Map markdown checkbox to graph task status
 */
function checkboxToStatus(checkbox: string): TaskStatus {
  switch (checkbox.toLowerCase()) {
    case 'x':
      return 'complete';
    case '@':
      return 'in_progress';
    case 'z':
      // [Z] is "paused" in markdown, maps to not_started in graph
      return 'not_started';
    case ' ':
    default:
      return 'not_started';
  }
}

/**
 * Get display name for checkbox character
 */
function checkboxDisplay(checkbox: string): string {
  switch (checkbox.toLowerCase()) {
    case 'x':
      return '[x] complete';
    case '@':
      return '[@] in_progress';
    case 'z':
      return '[Z] paused';
    case ' ':
    default:
      return '[ ] not_started';
  }
}

// =============================================================================
// Sprint File Parsing
// =============================================================================

/**
 * Find all sprint files in the project
 */
export async function findSprintFiles(projectRoot: string): Promise<string[]> {
  const pattern = path.join(projectRoot, 'docs/sprints/SPRINT-*.md');
  const files = await globAsync(pattern);

  // Filter out CURRENT-SPRINT.md as it's a symlink/copy
  return files.filter(f => !f.includes('CURRENT-SPRINT.md'));
}

/**
 * Extract sprint ID from file content
 * Looks for patterns like e006_s02 or adhoc_251209_s01 in task IDs or sprint declarations
 */
function extractSprintIdFromContent(content: string): string | null {
  // Try to find sprint ID from task IDs in content
  // Pattern: **ID:** e015_s03_t01 -> extract e015_s03
  const taskIdMatch = content.match(/\*\*ID:\*\*\s*`?(e\d{3}_s\d{2}|adhoc_\d{6}_s\d{2})_t\d{2}/);
  if (taskIdMatch) {
    return taskIdMatch[1];
  }

  // Try to find sprint ID directly declared
  // Pattern: **ID:** `adhoc_260117_s01` or **ID:** e015_s03
  const sprintIdMatch = content.match(/\*\*ID:\*\*\s*`?(e\d{3}_s\d{2}|adhoc_\d{6}_s\d{2})`?/);
  if (sprintIdMatch) {
    return sprintIdMatch[1];
  }

  // Fallback: look for standalone sprint reference
  const sprintMatch = content.match(/Sprint[:\s]+`?(e\d{3}_s\d{2}|adhoc_\d{6}_s\d{2})`?/i);
  if (sprintMatch) {
    return sprintMatch[1];
  }

  return null;
}

/**
 * Extract sprint ID from filename as fallback
 * e.g., SPRINT-2025-12-epic006-sprint2.md -> e006_s02
 */
function extractSprintIdFromFilename(filePath: string): string | null {
  const filename = path.basename(filePath);

  // Pattern: e015-s03 format
  const directMatch = filename.match(/e(\d{3})-s(\d{2})/i);
  if (directMatch) {
    return `e${directMatch[1]}_s${directMatch[2]}`;
  }

  // Pattern: epic006-sprint2 format
  const legacyMatch = filename.match(/epic(\d{1,3})-sprint(\d+)/i);
  if (legacyMatch) {
    const epicNum = legacyMatch[1].padStart(3, '0');
    const sprintNum = legacyMatch[2].padStart(2, '0');
    return `e${epicNum}_s${sprintNum}`;
  }

  return null;
}

/**
 * Parse tasks from sprint markdown content
 * Supports two formats:
 * 1. Block format with **ID:** and **Status:** lines
 * 2. Simple list format: - [x] e015_s03_t01 - Description
 */
export function parseTasksFromMarkdown(
  content: string,
  sprintFile: string,
  sprintId: string
): MigrationTask[] {
  const tasks: MigrationTask[] = [];
  const lines = content.split('\n');

  let currentTaskId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Format 1: Block format with **ID:** line
    const idMatch = line.match(/\*\*ID:\*\*\s*(\w+)/);
    if (idMatch) {
      currentTaskId = idMatch[1];
      continue;
    }

    // Format 1: Block format **Status:** line
    const blockStatusMatch = line.match(/\*\*Status:\*\*\s*\[([ xX@Z])\]/);
    if (blockStatusMatch && currentTaskId) {
      const checkbox = blockStatusMatch[1];
      tasks.push({
        id: currentTaskId,
        currentStatus: checkboxDisplay(checkbox),
        targetStatus: checkboxToStatus(checkbox),
        sprintId,
        sprintFile,
        lineNumber: i + 1,
      });
      currentTaskId = null;
      continue;
    }

    // Format 2: Simple list format - [x] task_id - Description
    // Matches: - [x] e015_s03_t01 - Description
    // Also matches: - [x] TASK-1 - Description
    const listMatch = line.match(/^[-*]\s*\[([ xX@Z])\]\s*(e\d{3}_s\d{2}_t\d{2}|TASK-\d+)/);
    if (listMatch) {
      const checkbox = listMatch[1];
      const taskId = listMatch[2];
      tasks.push({
        id: taskId,
        currentStatus: checkboxDisplay(checkbox),
        targetStatus: checkboxToStatus(checkbox),
        sprintId,
        sprintFile,
        lineNumber: i + 1,
      });
    }
  }

  return tasks;
}

// =============================================================================
// Migration Logic
// =============================================================================

/**
 * Scan all sprint files and build migration plan
 */
export async function buildMigrationPlan(projectRoot: string): Promise<MigrationTask[]> {
  const sprintFiles = await findSprintFiles(projectRoot);
  const allTasks: MigrationTask[] = [];

  for (const filePath of sprintFiles) {
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract sprint ID
    const sprintId =
      extractSprintIdFromContent(content) || extractSprintIdFromFilename(filePath);

    if (!sprintId) {
      console.warn(chalk.yellow(`  Warning: Could not determine sprint ID for ${path.basename(filePath)}`));
      continue;
    }

    const tasks = parseTasksFromMarkdown(content, filePath, sprintId);
    allTasks.push(...tasks);
  }

  return allTasks;
}

/**
 * Execute the migration
 */
export async function executeMigration(
  tasks: MigrationTask[],
  options: StatusMigrationOptions = {}
): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalTasks: tasks.length,
    toUpdate: [],
    noChange: [],
    errors: [],
    updated: [],
    skipped: [],
  };

  // Get graph ID
  const graphId = process.env.GINKO_GRAPH_ID || (await getGraphId());
  if (!graphId) {
    console.error(chalk.red('Error: Graph not initialized. Run `ginko graph init` first.'));
    process.exit(1);
  }

  const client = new GraphApiClient();

  // Check current status for each task and categorize
  console.log(chalk.dim('Checking current graph status...'));

  for (const task of tasks) {
    try {
      const currentGraphStatus = await client.getTaskStatus(graphId, task.id);

      if (currentGraphStatus.status === task.targetStatus) {
        report.noChange.push(task);
      } else {
        report.toUpdate.push(task);
      }
    } catch (error) {
      // Task might not exist in graph - treat as needing update
      if (error instanceof Error && error.message.includes('not found')) {
        report.toUpdate.push(task);
      } else {
        // Other errors - still try to update
        report.toUpdate.push(task);
      }
    }
  }

  // If dry run, just return the plan
  if (options.dryRun) {
    return report;
  }

  // Execute updates
  console.log(chalk.cyan('\nMigrating task statuses...'));

  for (const task of report.toUpdate) {
    try {
      await client.updateTaskStatus(graphId, task.id, task.targetStatus);
      report.updated.push(task);

      if (options.verbose) {
        console.log(chalk.green(`  ✓ ${task.id}: ${task.currentStatus} -> ${task.targetStatus}`));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      report.errors.push({ task, error: errorMsg });

      if (options.verbose) {
        console.log(chalk.red(`  ✗ ${task.id}: ${errorMsg}`));
      }
    }
  }

  return report;
}

/**
 * Main migration command entry point
 */
export async function runStatusMigration(options: StatusMigrationOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const { dryRun = false, verbose = false } = options;

  console.log(chalk.bold('\nStatus Migration: Markdown -> Graph\n'));

  // Build migration plan
  console.log(chalk.dim('Scanning sprint files...'));
  const tasks = await buildMigrationPlan(projectRoot);

  if (tasks.length === 0) {
    console.log(chalk.yellow('No tasks found in sprint files.'));
    console.log(chalk.dim('  Expected files in: docs/sprints/SPRINT-*.md'));
    return;
  }

  console.log(chalk.dim(`Found ${tasks.length} tasks in sprint files.\n`));

  // Execute migration
  const report = await executeMigration(tasks, { dryRun, verbose });

  // Display report
  console.log(chalk.bold('\n--- Migration Report ---\n'));

  if (dryRun) {
    console.log(chalk.cyan('DRY RUN - No changes made\n'));

    console.log(chalk.bold('Migration Plan:'));
    console.log(`  Tasks to update: ${chalk.cyan(report.toUpdate.length)}`);
    console.log(`  Already in sync: ${chalk.dim(report.noChange.length)}`);
    console.log(`  Total tasks:     ${report.totalTasks}`);

    // Show tasks to update in verbose mode
    if (verbose) {
      if (report.toUpdate.length > 0) {
        console.log(chalk.bold('\nTasks to update:'));
        for (const task of report.toUpdate) {
          console.log(
            `  ${chalk.cyan(task.id)}: ${chalk.yellow(task.currentStatus)} -> ${chalk.green(task.targetStatus)}`
          );
        }
      } else {
        console.log(chalk.dim('\nAll tasks already in sync with graph.'));
      }
    }

    console.log(chalk.dim('\nRun without --dry-run to apply changes.'));
  } else {
    console.log(chalk.bold('Results:'));
    console.log(`  Updated:    ${chalk.green(report.updated.length)}`);
    console.log(`  No change:  ${chalk.dim(report.noChange.length)}`);
    console.log(`  Errors:     ${report.errors.length > 0 ? chalk.red(report.errors.length) : chalk.dim('0')}`);
    console.log(`  Total:      ${report.totalTasks}`);

    if (report.errors.length > 0) {
      console.log(chalk.bold('\nErrors:'));
      for (const { task, error } of report.errors) {
        console.log(chalk.red(`  ${task.id}: ${error}`));
      }
    }

    if (report.updated.length > 0) {
      console.log(chalk.green('\n✓ Migration complete'));
    } else if (report.errors.length === 0) {
      console.log(chalk.dim('\nNo updates needed - already in sync'));
    }
  }
}
