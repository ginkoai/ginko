/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-03-15
 * @tags: [integration-warnings, overlap, dependencies, epic-025]
 * @related: [task-parser.ts, sprint-state.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [task-parser]
 */

/**
 * Integration Warnings & Dependency Detection (EPIC-025 Sprint 3)
 *
 * Parses task Scope/Files sections from sprint files to detect
 * file overlaps and infer task dependencies. Generates advisory
 * warnings for sprint planning and task execution.
 */

import { type ParsedTask, type SprintParseResult } from './task-parser.js';

// =============================================================================
// Types
// =============================================================================

export type OverlapClassification = 'dependent' | 'independent' | 'unknown';

export interface FileOverlap {
  /** The file path that is shared */
  filePath: string;
  /** Task IDs that reference this file */
  taskIds: string[];
  /** Classification of the overlap */
  classification: OverlapClassification;
  /** Reason for classification */
  reason: string;
}

export interface TaskDependency {
  /** Task that must complete first */
  from: string;
  /** Task that depends on it */
  to: string;
  /** Why this dependency exists */
  reason: string;
}

export interface IntegrationAnalysis {
  /** File overlap warnings */
  overlaps: FileOverlap[];
  /** Inferred task dependencies */
  dependencies: TaskDependency[];
  /** Tasks with no dependencies (safe to parallelize) */
  independentTasks: string[];
  /** All task IDs analyzed */
  allTasks: string[];
}

// =============================================================================
// Overlap Detection
// =============================================================================

/**
 * Build a file-to-task map from parsed tasks.
 */
function buildFileMap(tasks: ParsedTask[]): Map<string, string[]> {
  const fileMap = new Map<string, string[]>();

  for (const task of tasks) {
    for (const file of task.files) {
      const normalized = file.toLowerCase();
      const existing = fileMap.get(normalized) || [];
      existing.push(task.id);
      fileMap.set(normalized, existing);
    }
  }

  return fileMap;
}

/**
 * Classify an overlap between tasks sharing a file.
 *
 * Uses heuristics from task descriptions to determine if the
 * overlap is dependent (sequential), independent (parallel-safe),
 * or unknown (needs human review).
 */
function classifyOverlap(
  filePath: string,
  taskIds: string[],
  tasks: ParsedTask[]
): { classification: OverlapClassification; reason: string } {
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Check for explicit dependency signals in task descriptions
  for (let i = 0; i < taskIds.length; i++) {
    for (let j = i + 1; j < taskIds.length; j++) {
      const taskA = taskMap.get(taskIds[i]);
      const taskB = taskMap.get(taskIds[j]);
      if (!taskA || !taskB) continue;

      // Check if taskB references taskA (or vice versa)
      const bText = [taskB.problem, taskB.solution, taskB.approach, taskB.scope]
        .filter(Boolean).join(' ').toLowerCase();
      const aText = [taskA.problem, taskA.solution, taskA.approach, taskA.scope]
        .filter(Boolean).join(' ').toLowerCase();

      const aShortId = taskIds[i].split('_').pop() || taskIds[i];
      const bShortId = taskIds[j].split('_').pop() || taskIds[j];

      if (bText.includes(aShortId) || bText.includes(taskIds[i])) {
        return {
          classification: 'dependent',
          reason: `${taskIds[j]} references ${taskIds[i]}`,
        };
      }
      if (aText.includes(bShortId) || aText.includes(taskIds[j])) {
        return {
          classification: 'dependent',
          reason: `${taskIds[i]} references ${taskIds[j]}`,
        };
      }

      // Check for dependency keywords
      const depKeywords = ['depends on', 'needs', 'requires', 'after', 'builds on', 'uses.*from'];
      for (const keyword of depKeywords) {
        const pattern = new RegExp(`${keyword}.*${aShortId}|${keyword}.*${taskIds[i]}`, 'i');
        if (pattern.test(bText)) {
          return {
            classification: 'dependent',
            reason: `${taskIds[j]} ${keyword} ${taskIds[i]}`,
          };
        }
      }
    }
  }

  // If tasks modify the same file but no dependency signal found
  return {
    classification: 'unknown',
    reason: 'No dependency signal detected — review recommended',
  };
}

/**
 * Detect file overlaps across tasks in a sprint.
 */
export function detectOverlaps(tasks: ParsedTask[]): FileOverlap[] {
  const fileMap = buildFileMap(tasks);
  const overlaps: FileOverlap[] = [];

  for (const [filePath, taskIds] of fileMap) {
    if (taskIds.length >= 2) {
      const { classification, reason } = classifyOverlap(filePath, taskIds, tasks);
      overlaps.push({
        filePath,
        taskIds,
        classification,
        reason,
      });
    }
  }

  return overlaps.sort((a, b) => {
    // Sort: dependent first, then unknown, then independent
    const order = { dependent: 0, unknown: 1, independent: 2 };
    return order[a.classification] - order[b.classification];
  });
}

// =============================================================================
// Dependency Inference
// =============================================================================

/**
 * Infer task dependencies from overlaps and task descriptions.
 */
export function inferDependencies(
  tasks: ParsedTask[],
  overlaps: FileOverlap[]
): TaskDependency[] {
  const deps: TaskDependency[] = [];
  const seen = new Set<string>();

  for (const overlap of overlaps) {
    if (overlap.classification !== 'dependent') continue;

    // The referenced task comes first
    for (let i = 0; i < overlap.taskIds.length; i++) {
      for (let j = i + 1; j < overlap.taskIds.length; j++) {
        const key = `${overlap.taskIds[i]}->${overlap.taskIds[j]}`;
        const reverseKey = `${overlap.taskIds[j]}->${overlap.taskIds[i]}`;

        if (!seen.has(key) && !seen.has(reverseKey)) {
          // Determine order from reason
          const reason = overlap.reason;
          if (reason.includes(overlap.taskIds[j]) && reason.includes('references')) {
            deps.push({
              from: overlap.taskIds[i],
              to: overlap.taskIds[j],
              reason: `${overlap.filePath}: ${reason}`,
            });
          } else {
            deps.push({
              from: overlap.taskIds[i],
              to: overlap.taskIds[j],
              reason: `${overlap.filePath}: ${reason}`,
            });
          }
          seen.add(key);
        }
      }
    }
  }

  return deps;
}

/**
 * Find tasks with no dependencies (safe to parallelize).
 */
function findIndependentTasks(
  allTaskIds: string[],
  dependencies: TaskDependency[]
): string[] {
  const involved = new Set<string>();
  for (const dep of dependencies) {
    involved.add(dep.from);
    involved.add(dep.to);
  }
  return allTaskIds.filter(id => !involved.has(id));
}

// =============================================================================
// Full Analysis
// =============================================================================

/**
 * Run full integration analysis on a sprint's tasks.
 */
export function analyzeIntegration(sprintResult: SprintParseResult): IntegrationAnalysis {
  const tasks = sprintResult.tasks;
  const allTaskIds = tasks.map(t => t.id);
  const overlaps = detectOverlaps(tasks);
  const dependencies = inferDependencies(tasks, overlaps);
  const independentTasks = findIndependentTasks(allTaskIds, dependencies);

  return {
    overlaps,
    dependencies,
    independentTasks,
    allTasks: allTaskIds,
  };
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format Integration Warnings section for sprint markdown.
 */
export function formatIntegrationWarnings(analysis: IntegrationAnalysis): string {
  if (analysis.overlaps.length === 0) return '';

  const lines: string[] = [];
  lines.push('## Integration Warnings');
  lines.push('');

  for (const overlap of analysis.overlaps) {
    const shortIds = overlap.taskIds.map(id => id.split('_').pop() || id).join(', ');
    const icon = overlap.classification === 'independent' ? '✅' : '⚠️';
    const suffix = overlap.classification === 'independent'
      ? ' — independent changes, safe to parallelize'
      : overlap.classification === 'dependent'
        ? ` — ${overlap.reason}`
        : ' — review recommended';

    lines.push(`${icon} ${shortIds} modify \`${overlap.filePath}\`${suffix}`);
  }

  return lines.join('\n');
}

/**
 * Format Task Dependencies section as ASCII tree for sprint markdown.
 */
export function formatDependencyTree(analysis: IntegrationAnalysis): string {
  if (analysis.dependencies.length === 0 && analysis.independentTasks.length === analysis.allTasks.length) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Task Dependencies');
  lines.push('');

  // Build adjacency list (from → [to])
  const adj = new Map<string, { to: string; reason: string }[]>();
  const hasIncoming = new Set<string>();

  for (const dep of analysis.dependencies) {
    const existing = adj.get(dep.from) || [];
    existing.push({ to: dep.to, reason: dep.reason });
    adj.set(dep.from, existing);
    hasIncoming.add(dep.to);
  }

  // Root tasks: have outgoing deps but no incoming
  const roots = [...adj.keys()].filter(k => !hasIncoming.has(k));

  // Render roots and their children
  for (const root of roots) {
    const shortRoot = root.split('_').pop() || root;
    const children = adj.get(root) || [];

    if (children.length === 0) {
      lines.push(`${shortRoot} ──── (independent)`);
    } else {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const shortChild = child.to.split('_').pop() || child.to;
        const shortReason = child.reason.split(': ').pop() || child.reason;
        if (i === 0) {
          lines.push(`${shortRoot} ─── ${shortChild} (${shortReason})`);
        } else {
          lines.push(`${'  '.repeat(shortRoot.length / 2)}  └──── ${shortChild} (${shortReason})`);
        }
      }
    }
  }

  // Independent tasks
  for (const taskId of analysis.independentTasks) {
    const shortId = taskId.split('_').pop() || taskId;
    lines.push(`${shortId} ──── (independent)`);
  }

  return lines.join('\n');
}

/**
 * Format a compact warning for `ginko task start` advisory.
 */
export function formatTaskStartWarning(
  taskId: string,
  overlaps: FileOverlap[],
  inProgressTasks: string[]
): string | null {
  const relevant = overlaps.filter(o =>
    o.taskIds.includes(taskId) &&
    o.taskIds.some(id => id !== taskId && inProgressTasks.includes(id))
  );

  if (relevant.length === 0) return null;

  const conflictingTasks = new Set<string>();
  const conflictingFiles = new Set<string>();

  for (const overlap of relevant) {
    for (const id of overlap.taskIds) {
      if (id !== taskId && inProgressTasks.includes(id)) {
        conflictingTasks.add(id.split('_').pop() || id);
        conflictingFiles.add(overlap.filePath);
      }
    }
  }

  const taskList = [...conflictingTasks].join(', ');
  const fileList = [...conflictingFiles].slice(0, 3).join(', ');
  const extra = conflictingFiles.size > 3 ? ` +${conflictingFiles.size - 3} more` : '';

  return `⚠️ This task shares files with in-progress task(s): ${taskList} (${fileList}${extra}). Coordinate carefully.`;
}
