/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [cli, sprint, dependencies, visualization, epic-004, sprint-4]
 * @related: [../../lib/sprint-loader.ts, ../../lib/task-dependencies.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [commander, chalk, fs-extra]
 */

/**
 * Sprint Dependencies Command (EPIC-004 Sprint 4 TASK-3)
 *
 * Visualizes task dependencies as a tree structure.
 * Shows which tasks are available, blocked, in progress, or complete.
 * Detects and warns about circular dependencies.
 *
 * Usage:
 *   ginko sprint deps                    # Auto-detect current sprint
 *   ginko sprint deps --sprint <file>    # Specify sprint file
 *   ginko sprint deps --format json      # JSON output for scripting
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { loadSprintChecklist, parseSprintChecklist, findActiveSprint } from '../../lib/sprint-loader.js';
import {
  detectCircularDependencies,
  getAvailableTasks,
  Task as DepTask
} from '../../lib/task-dependencies.js';

interface DepsOptions {
  sprint?: string;
  format?: 'tree' | 'json';
}

/**
 * Convert sprint task to dependency task format
 */
function toDepTask(task: {
  id: string;
  state: string;
  dependsOn?: string[];
  title?: string;
}): DepTask {
  const statusMap: Record<string, DepTask['status']> = {
    'todo': 'pending',
    'in_progress': 'in_progress',
    'complete': 'complete',
    'paused': 'blocked',
  };

  return {
    id: task.id,
    dependsOn: task.dependsOn || [],
    status: statusMap[task.state] || 'pending',
    title: task.title,
  };
}

/**
 * Determine display status for a task
 */
function getDisplayStatus(
  task: { id: string; state: string; dependsOn?: string[] },
  allTasks: Array<{ id: string; state: string; dependsOn?: string[] }>
): 'available' | 'blocked' | 'in_progress' | 'complete' | 'paused' {
  if (task.state === 'complete') return 'complete';
  if (task.state === 'in_progress') return 'in_progress';
  if (task.state === 'paused') return 'paused';

  // Check if blocked (has incomplete dependencies)
  if (task.dependsOn && task.dependsOn.length > 0) {
    const hasIncompleteDep = task.dependsOn.some(depId => {
      const dep = allTasks.find(t => t.id === depId);
      return !dep || dep.state !== 'complete';
    });
    if (hasIncompleteDep) return 'blocked';
  }

  return 'available';
}

/**
 * Color status for terminal output
 */
function colorStatus(status: string): string {
  switch (status) {
    case 'available':
      return chalk.green(status);
    case 'blocked':
      return chalk.red(status);
    case 'in_progress':
      return chalk.yellow(status);
    case 'complete':
      return chalk.gray(status);
    case 'paused':
      return chalk.blue(status);
    default:
      return status;
  }
}

/**
 * Build reverse dependency map (who depends on this task)
 */
function buildDependentsMap(
  tasks: Array<{ id: string; dependsOn?: string[] }>
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  // Initialize all tasks
  for (const task of tasks) {
    map.set(task.id, []);
  }

  // Build reverse relationships
  for (const task of tasks) {
    if (task.dependsOn) {
      for (const depId of task.dependsOn) {
        const dependents = map.get(depId);
        if (dependents) {
          dependents.push(task.id);
        }
      }
    }
  }

  return map;
}

/**
 * Print dependency tree recursively
 */
function printTree(
  taskId: string,
  tasks: Array<{ id: string; state: string; title: string; dependsOn?: string[] }>,
  dependentsMap: Map<string, string[]>,
  prefix: string = '',
  isLast: boolean = true,
  visited: Set<string> = new Set()
): string[] {
  const lines: string[] = [];
  const task = tasks.find(t => t.id === taskId);
  if (!task) return lines;

  // Detect cycle
  if (visited.has(taskId)) {
    lines.push(`${prefix}${isLast ? '└─>' : '├─>'} ${taskId} ${chalk.red('(CYCLE)')}`);
    return lines;
  }
  visited.add(taskId);

  const status = getDisplayStatus(task, tasks);
  const connector = prefix === '' ? '' : (isLast ? '└─> ' : '├─> ');
  lines.push(`${prefix}${connector}${task.id} (${colorStatus(status)})`);

  // Get dependents (tasks that depend on this one)
  const dependents = dependentsMap.get(taskId) || [];
  const childPrefix = prefix + (prefix === '' ? '' : (isLast ? '    ' : '│   '));

  for (let i = 0; i < dependents.length; i++) {
    const isLastChild = i === dependents.length - 1;
    const childLines = printTree(
      dependents[i],
      tasks,
      dependentsMap,
      childPrefix,
      isLastChild,
      new Set(visited)
    );
    lines.push(...childLines);
  }

  return lines;
}

/**
 * Main command action
 */
async function depsAction(options: DepsOptions): Promise<void> {
  try {
    let sprintFile: string | undefined = options.sprint;

    // Find sprint file if not specified
    if (!sprintFile) {
      const foundFile = await findActiveSprint();
      if (!foundFile) {
        console.error(chalk.red('No active sprint found. Use --sprint to specify a file.'));
        process.exit(1);
      }
      sprintFile = foundFile;
    }

    // Verify file exists
    if (!fs.existsSync(sprintFile)) {
      console.error(chalk.red(`Sprint file not found: ${sprintFile}`));
      process.exit(1);
    }

    // Load and parse sprint
    const content = await fs.readFile(sprintFile, 'utf-8');
    const checklist = parseSprintChecklist(content, sprintFile);

    const tasks = checklist.tasks.map(t => ({
      id: t.id,
      state: t.state,
      title: t.title,
      dependsOn: t.dependsOn || [],
    }));

    // JSON output mode
    if (options.format === 'json') {
      const depTasks = tasks.map(toDepTask);
      const cycles = detectCircularDependencies(depTasks);
      const available = getAvailableTasks(depTasks);

      const output = {
        sprint: checklist.name,
        file: sprintFile,
        tasks: tasks.map(t => ({
          ...t,
          displayStatus: getDisplayStatus(t, tasks),
        })),
        available: available.map(t => t.id),
        cycles: cycles,
        warnings: checklist.dependencyWarnings || [],
      };

      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Tree output mode
    console.log(chalk.bold(`\nTask Dependencies for ${checklist.name}\n`));

    // Check for circular dependencies
    const depTasks = tasks.map(toDepTask);
    const cycles = detectCircularDependencies(depTasks);

    // Build dependents map
    const dependentsMap = buildDependentsMap(tasks);

    // Find root tasks (no dependencies)
    const rootTasks = tasks.filter(t => !t.dependsOn || t.dependsOn.length === 0);

    if (rootTasks.length === 0) {
      console.log(chalk.yellow('No root tasks found (all tasks have dependencies)'));
      if (cycles.length > 0) {
        console.log(chalk.red('\nThis may be due to circular dependencies.'));
      }
    } else {
      // Print tree from each root
      const printed = new Set<string>();
      for (const root of rootTasks) {
        const lines = printTree(root.id, tasks, dependentsMap, '', true, new Set());
        for (const line of lines) {
          // Extract task ID from line to avoid duplicates
          const match = line.match(/TASK-\d+/);
          if (match && !printed.has(match[0])) {
            console.log(line);
            printed.add(match[0]);
          } else if (!match) {
            console.log(line);
          }
        }
      }

      // Show orphan tasks (have dependencies but aren't dependents of any root)
      const allPrinted = new Set(printed);
      const orphans = tasks.filter(t => !allPrinted.has(t.id));
      if (orphans.length > 0) {
        console.log(chalk.dim('\nOrphan tasks (not reachable from roots):'));
        for (const orphan of orphans) {
          const status = getDisplayStatus(orphan, tasks);
          console.log(`  ${orphan.id} (${colorStatus(status)}) - depends on: ${orphan.dependsOn.join(', ')}`);
        }
      }
    }

    // Legend
    console.log(chalk.dim('\nLegend: ') +
      chalk.green('available') + ' | ' +
      chalk.yellow('in_progress') + ' | ' +
      chalk.red('blocked') + ' | ' +
      chalk.blue('paused') + ' | ' +
      chalk.gray('complete')
    );

    // Circular dependency warnings
    if (cycles.length > 0) {
      console.log(chalk.red('\nCircular dependencies detected:'));
      for (const cycle of cycles) {
        console.log(chalk.red(`  ${cycle.join(' → ')}`));
      }
    } else {
      console.log(chalk.green('\nCircular dependencies: None detected'));
    }

    // Dependency warnings from sprint loader
    if (checklist.dependencyWarnings && checklist.dependencyWarnings.length > 0) {
      console.log(chalk.yellow('\nDependency warnings:'));
      for (const warning of checklist.dependencyWarnings) {
        console.log(chalk.yellow(`  - ${warning}`));
      }
    }

    // Summary
    const available = getAvailableTasks(depTasks);
    console.log(chalk.dim(`\nAvailable tasks: ${available.length}/${tasks.length}`));

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Create and configure the deps command
 */
export function createDepsCommand(): Command {
  return new Command('deps')
    .description('Visualize task dependencies as a tree')
    .option('-s, --sprint <file>', 'Sprint file to analyze')
    .option('-f, --format <format>', 'Output format: tree (default) or json', 'tree')
    .action(depsAction);
}

export default createDepsCommand;
