/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-21
 * @tags: [sprint, task-checklist, epic-001, session-context]
 * @related: [charter-loader.ts, start-reflection.ts, context-loader-events.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

/**
 * Sprint Loader (EPIC-001 TASK-5)
 *
 * Loads active sprint from filesystem (docs/sprints/SPRINT-*.md)
 * and parses into task checklist with [@] symbol support.
 *
 * Provides AI partners with:
 * - Clear task progress ([ ] / [@] / [x] states)
 * - Current task identification (first [@] or [ ])
 * - Progress visibility (N/M complete, X in progress)
 * - Eliminates task priority ambiguity
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Task state enumeration
 */
export type TaskState = 'todo' | 'in_progress' | 'complete';

/**
 * Individual task from sprint checklist
 */
export interface Task {
  id: string;           // e.g., "TASK-5"
  title: string;        // Task description
  state: TaskState;     // [ ], [@], or [x]
  files?: string[];     // Files mentioned in task
  pattern?: string;     // Pattern reference (e.g., "log.ts:45-67")
  effort?: string;      // Time estimate (e.g., "4-6h")
  priority?: string;    // Priority level
}

/**
 * Sprint checklist with task states and progress
 */
export interface SprintChecklist {
  name: string;                    // Sprint name
  file: string;                    // Sprint file path
  progress: {
    complete: number;              // Count of [x] tasks
    inProgress: number;            // Count of [@] tasks
    todo: number;                  // Count of [ ] tasks
    total: number;                 // Total tasks
  };
  tasks: Task[];                   // All tasks in order
  currentTask?: Task;              // First [@] or first [ ] task
  recentCompletions: Task[];       // Last 3 completed tasks
}

/**
 * Find git root directory
 */
async function findGitRoot(): Promise<string> {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return root;
  } catch {
    return process.cwd();
  }
}

/**
 * Find active sprint file
 *
 * Looks for most recent SPRINT-*.md file in docs/sprints/
 * that is not marked as "Complete" in its status
 *
 * @param projectRoot - Project root directory
 * @returns Path to active sprint file or null
 */
export async function findActiveSprint(projectRoot?: string): Promise<string | null> {
  try {
    const root = projectRoot || await findGitRoot();
    const sprintsDir = path.join(root, 'docs', 'sprints');

    if (!fs.existsSync(sprintsDir)) {
      return null;
    }

    // Get all sprint files sorted by date (newest first)
    const sprintFiles = (await fs.readdir(sprintsDir))
      .filter(f => f.startsWith('SPRINT-') && f.endsWith('.md'))
      .sort()
      .reverse();

    // Find first sprint that's not complete
    for (const file of sprintFiles) {
      const filePath = path.join(sprintsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Check if sprint is marked complete
      const statusMatch = content.match(/\*\*Sprint Status\*\*:\s*(.+)/);
      const progressMatch = content.match(/\*\*Progress\*\*:\s*(\d+)%/);

      // Skip if explicitly marked complete or 100% progress
      if (statusMatch && statusMatch[1].toLowerCase().includes('complete') &&
          !statusMatch[1].includes('[@]')) {
        continue;
      }

      if (progressMatch && parseInt(progressMatch[1]) === 100) {
        continue;
      }

      return filePath;
    }

    // If no active sprint found, return most recent
    return sprintFiles.length > 0
      ? path.join(sprintsDir, sprintFiles[0])
      : null;

  } catch (error) {
    console.error('Failed to find active sprint:', (error as Error).message);
    return null;
  }
}

/**
 * Parse task state from checkbox symbol
 *
 * @param symbol - Checkbox content: ' ', '@', or 'x'
 * @returns Task state enum
 */
function parseTaskState(symbol: string): TaskState {
  const trimmed = symbol.trim();
  if (trimmed === 'x' || trimmed === 'X') return 'complete';
  if (trimmed === '@') return 'in_progress';
  return 'todo';
}

/**
 * Parse sprint markdown into task checklist
 *
 * Looks for:
 * - Sprint name from title (# SPRINT: ...)
 * - Tasks from ## Sprint Tasks or ### TASK-N sections
 * - Checkbox states: [ ], [@], [x]
 * - Task metadata (files, priority, effort)
 *
 * @param markdown - Sprint markdown content
 * @param filePath - Path to sprint file
 * @returns Parsed sprint checklist
 */
export function parseSprintChecklist(markdown: string, filePath: string): SprintChecklist {
  const lines = markdown.split('\n');
  const tasks: Task[] = [];

  // Extract sprint name from title
  const titleMatch = markdown.match(/^#\s+SPRINT:\s*(.+?)$/m);
  const sprintName = titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md');

  let parsingTask: Partial<Task> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match task headers: ### TASK-N: Title
    const taskHeaderMatch = line.match(/^###\s+(TASK-\d+):\s*(.+?)(?:\s*\((.+?)\))?$/);
    if (taskHeaderMatch) {
      // Save previous task if exists
      if (parsingTask?.id && parsingTask?.title) {
        tasks.push(parsingTask as Task);
      }

      // Start new task
      parsingTask = {
        id: taskHeaderMatch[1],
        title: taskHeaderMatch[2].trim(),
        effort: taskHeaderMatch[3]?.trim(),
        state: 'todo', // Default, will update from Status line
        files: [],
      };
      continue;
    }

    // Match task status: **Status:** [@] In Progress
    const statusMatch = line.match(/\*\*Status:\*\*\s*\[([x@\s])\]\s*(.+)/i);
    if (statusMatch && parsingTask) {
      parsingTask.state = parseTaskState(statusMatch[1]);
      continue;
    }

    // Match task priority: **Priority:** HIGH
    const priorityMatch = line.match(/\*\*Priority:\*\*\s*(.+)/i);
    if (priorityMatch && parsingTask) {
      parsingTask.priority = priorityMatch[1].trim();
      continue;
    }

    // Match files section
    if (line.match(/^\*\*Files:\*\*/) && parsingTask) {
      // Look ahead for file list
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^-\s+(Create|Modify):/)) {
        const fileMatch = lines[j].match(/^-\s+(?:Create|Modify):\s+`([^`]+)`/);
        if (fileMatch) {
          parsingTask.files = parsingTask.files || [];
          parsingTask.files.push(fileMatch[1]);
        }
        j++;
      }
      continue;
    }
  }

  // Save last task
  if (parsingTask?.id && parsingTask?.title) {
    tasks.push(parsingTask as Task);
  }

  // Calculate progress
  const complete = tasks.filter(t => t.state === 'complete').length;
  const inProgress = tasks.filter(t => t.state === 'in_progress').length;
  const todo = tasks.filter(t => t.state === 'todo').length;

  // Find current task: first [@], or first [ ] if no [@] exists
  const firstInProgress = tasks.find(t => t.state === 'in_progress');
  const firstTodo = tasks.find(t => t.state === 'todo');
  const currentTask = firstInProgress || firstTodo;

  // Recent completions: last 3 completed tasks
  const completedTasks = tasks.filter(t => t.state === 'complete');
  const recentCompletions = completedTasks.slice(-3).reverse();

  return {
    name: sprintName,
    file: filePath,
    progress: {
      complete,
      inProgress,
      todo,
      total: tasks.length,
    },
    tasks,
    currentTask,
    recentCompletions,
  };
}

/**
 * Load active sprint checklist
 *
 * Finds active sprint file and parses into structured checklist
 *
 * @param projectRoot - Project root directory (defaults to git root)
 * @returns Parsed sprint checklist or null if no sprint found
 */
export async function loadSprintChecklist(projectRoot?: string): Promise<SprintChecklist | null> {
  try {
    const sprintFile = await findActiveSprint(projectRoot);

    if (!sprintFile) {
      return null;
    }

    const content = await fs.readFile(sprintFile, 'utf-8');
    return parseSprintChecklist(content, sprintFile);

  } catch (error) {
    console.error('Failed to load sprint checklist:', (error as Error).message);
    return null;
  }
}

/**
 * Format sprint checklist for display in ginko start
 *
 * @param checklist - Parsed sprint checklist
 * @param maxTasks - Maximum tasks to display before truncating
 * @returns Formatted string for terminal display
 */
export function formatSprintChecklist(checklist: SprintChecklist, maxTasks: number = 7): string {
  const { name, progress, tasks, currentTask } = checklist;

  let output = '';

  // Header with progress
  output += `📋 Active Sprint: ${name}\n`;

  const progressPercent = progress.total > 0
    ? Math.round((progress.complete / progress.total) * 100)
    : 0;

  let progressLine = `Progress: ${progress.complete}/${progress.total} complete`;
  if (progress.inProgress > 0) {
    progressLine += `, ${progress.inProgress} in progress`;
  }
  progressLine += ` (${progressPercent}%)`;
  output += progressLine + '\n\n';

  // Sprint complete celebration
  if (progress.complete === progress.total && progress.total > 0) {
    output += '🎉 Sprint Complete! All tasks done.\n';
    return output;
  }

  // Task list
  output += 'Tasks:\n';
  const displayTasks = tasks.slice(0, maxTasks);

  for (const task of displayTasks) {
    const symbol = task.state === 'complete' ? '[x]' :
                   task.state === 'in_progress' ? '[@]' : '[ ]';

    const marker = currentTask && task.id === currentTask.id ? ' ← RESUME HERE' : '';

    output += `  ${symbol} ${task.id}: ${task.title}${marker}\n`;
  }

  // Truncation indicator
  if (tasks.length > maxTasks) {
    const remaining = tasks.length - maxTasks;
    output += `  ... (${remaining} more tasks)\n`;
  }

  // Multiple in-progress warning
  if (progress.inProgress > 1) {
    const inProgressTasks = tasks.filter(t => t.state === 'in_progress');
    output += `\n⚠️  Multiple tasks in progress (${progress.inProgress})\n`;
    output += `Primary: ${inProgressTasks[0].id}\n`;
    output += `Also active: ${inProgressTasks.slice(1).map(t => t.id).join(', ')}\n`;
  }

  return output;
}

/**
 * Format current task details for display
 *
 * @param task - Current task
 * @returns Formatted task details
 */
export function formatCurrentTaskDetails(task: Task): string {
  let output = `🎯 Current Task (${task.id}):\n`;
  output += `  Status: ${task.state === 'in_progress' ? 'In progress' : 'Ready to start'}\n`;

  if (task.files && task.files.length > 0) {
    output += `  Files: ${task.files.slice(0, 3).join(', ')}`;
    if (task.files.length > 3) {
      output += ` (+${task.files.length - 3} more)`;
    }
    output += '\n';
  }

  if (task.pattern) {
    output += `  Pattern: ${task.pattern}\n`;
  }

  if (task.priority) {
    output += `  Priority: ${task.priority}\n`;
  }

  if (task.effort) {
    output += `  Effort: ${task.effort}\n`;
  }

  return output;
}
