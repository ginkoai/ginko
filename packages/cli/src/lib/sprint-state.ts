/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-03-15
 * @tags: [sprint-state, cache, materialization, epic-025]
 * @related: [task-parser.ts, sprint-loader.ts, ../commands/task/status.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

/**
 * Sprint State Materialization (EPIC-025 Sprint 2)
 *
 * Materializes graph state as `.ginko/sprint-state.json` — a read-only
 * local cache the AI partner can access with zero friction.
 *
 * Write path: AI partner → `ginko task complete` → CLI → graph → local cache
 * Read path: AI partner → `Read .ginko/sprint-state.json` (one tool call)
 *
 * The AI partner never writes to the cache directly. The CLI is the only writer.
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

// =============================================================================
// Schema
// =============================================================================

export interface SprintStateTask {
  title: string;
  status: string;
  knownIssues?: string[];
  blockers?: string[];
  modifiedFiles?: string[];
}

export interface SprintStateProgress {
  complete: number;
  total: number;
  percentage: number;
}

export interface SprintState {
  sprint: string;
  epicId: string;
  epicTitle: string;
  sprintTitle: string;
  progress: SprintStateProgress;
  tasks: Record<string, SprintStateTask>;
  knownIssues: string[];
  blockers: string[];
  lastDeployed: string | null;
  lastUpdated: string;
  lastUpdatedBy: string | null;
  stale: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function getProjectRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

function getCachePath(projectRoot?: string): string {
  const root = projectRoot || getProjectRoot();
  return path.join(root, '.ginko', 'sprint-state.json');
}

// =============================================================================
// Materialization
// =============================================================================

/**
 * Materialize sprint state from graph to local cache.
 *
 * Uses getActiveSprint API to fetch current sprint data,
 * then writes structured JSON to .ginko/sprint-state.json.
 *
 * @param projectRoot - Optional project root override
 * @returns The materialized SprintState, or null if no active sprint
 */
export async function materializeSprintState(
  projectRoot?: string
): Promise<SprintState | null> {
  const root = projectRoot || getProjectRoot();
  const cachePath = getCachePath(root);

  try {
    // Dynamic import to avoid circular dependencies
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const { getGraphId } = await import('../commands/graph/config.js');

    const graphId = process.env.GINKO_GRAPH_ID || await getGraphId();
    if (!graphId) return null;

    const client = new GraphApiClient();
    const activeSprint = await client.getActiveSprint(graphId);

    if (!activeSprint?.sprint?.id) return null;

    // Build task map
    const tasks: Record<string, SprintStateTask> = {};
    const allKnownIssues: string[] = [];
    const allBlockers: string[] = [];
    let completedCount = 0;

    for (const task of activeSprint.tasks || []) {
      const taskEntry: SprintStateTask = {
        title: task.title || 'Untitled',
        status: task.status || 'not_started',
      };

      // Try to get extended properties (knownIssues, blockers) from graph node
      try {
        const nodeResponse = await client.request<{
          node: { properties: Record<string, unknown> };
        }>('GET', `/api/v1/graph/nodes/${encodeURIComponent(task.id)}?graphId=${encodeURIComponent(graphId)}`);

        const props = nodeResponse.node?.properties;
        if (props) {
          if (props.knownIssues) {
            const issues = Array.isArray(props.knownIssues)
              ? props.knownIssues as string[]
              : typeof props.knownIssues === 'string'
                ? JSON.parse(props.knownIssues as string)
                : [];
            taskEntry.knownIssues = issues;
            allKnownIssues.push(...issues);
          }
          if (props.blockers) {
            const blockers = Array.isArray(props.blockers)
              ? props.blockers as string[]
              : typeof props.blockers === 'string'
                ? JSON.parse(props.blockers as string)
                : [];
            taskEntry.blockers = blockers;
            allBlockers.push(...blockers);
          }
          if (props.modifiedFiles) {
            taskEntry.modifiedFiles = Array.isArray(props.modifiedFiles)
              ? props.modifiedFiles as string[]
              : typeof props.modifiedFiles === 'string'
                ? JSON.parse(props.modifiedFiles as string)
                : [];
          }
        }
      } catch {
        // Individual task property fetch failures are non-fatal
      }

      if (task.status === 'complete') completedCount++;
      tasks[task.id] = taskEntry;
    }

    const totalTasks = activeSprint.tasks?.length || 0;

    const state: SprintState = {
      sprint: activeSprint.sprint.id,
      epicId: activeSprint.sprint.id.split('_')[0] || 'unknown',
      epicTitle: '',
      sprintTitle: activeSprint.sprint.name || activeSprint.sprint.id,
      progress: {
        complete: completedCount,
        total: totalTasks,
        percentage: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0,
      },
      tasks,
      knownIssues: [...new Set(allKnownIssues)],
      blockers: [...new Set(allBlockers)],
      lastDeployed: null,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: null,
      stale: false,
    };

    // Write cache
    await fs.ensureDir(path.dirname(cachePath));
    await fs.writeJson(cachePath, state, { spaces: 2 });

    return state;
  } catch {
    // Graph unavailable — try to keep existing cache, mark as stale
    return markCacheStale(cachePath);
  }
}

/**
 * Mark existing cache as stale (graph was unavailable).
 * Never deletes the cache — stale data is better than no data.
 */
async function markCacheStale(cachePath: string): Promise<SprintState | null> {
  try {
    if (await fs.pathExists(cachePath)) {
      const existing = await fs.readJson(cachePath) as SprintState;
      existing.stale = true;
      await fs.writeJson(cachePath, existing, { spaces: 2 });
      return existing;
    }
  } catch {
    // Can't even read the cache — nothing to do
  }
  return null;
}

// =============================================================================
// Cache Reading
// =============================================================================

/**
 * Read sprint state from local cache.
 *
 * @param projectRoot - Optional project root override
 * @returns SprintState or null if cache doesn't exist
 */
export async function readSprintState(
  projectRoot?: string
): Promise<SprintState | null> {
  const cachePath = getCachePath(projectRoot);
  try {
    if (!await fs.pathExists(cachePath)) return null;
    return await fs.readJson(cachePath) as SprintState;
  } catch {
    return null;
  }
}

/**
 * Check if cache is stale (>1 hour old).
 */
export function isCacheStale(state: SprintState, thresholdMs: number = 3600000): boolean {
  if (state.stale) return true;
  const age = Date.now() - new Date(state.lastUpdated).getTime();
  return age > thresholdMs;
}

// =============================================================================
// Checkpoint Updates
// =============================================================================

/**
 * Push checkpoint data to a task node in the graph.
 *
 * @param taskId - Task ID
 * @param checkpoint - Checkpoint data (knownIssues, blockers, modifiedFiles)
 */
export async function pushCheckpointToGraph(
  taskId: string,
  checkpoint: {
    knownIssues?: string[];
    blockers?: string[];
    modifiedFiles?: string[];
    lastDeployed?: string;
  }
): Promise<void> {
  try {
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const { getGraphId } = await import('../commands/graph/config.js');

    const graphId = process.env.GINKO_GRAPH_ID || await getGraphId();
    if (!graphId) return;

    const client = new GraphApiClient();

    // Update task node with checkpoint properties
    const props: Record<string, unknown> = {};
    if (checkpoint.knownIssues?.length) {
      props.knownIssues = JSON.stringify(checkpoint.knownIssues);
    }
    if (checkpoint.blockers?.length) {
      props.blockers = JSON.stringify(checkpoint.blockers);
    }
    if (checkpoint.modifiedFiles?.length) {
      props.modifiedFiles = JSON.stringify(checkpoint.modifiedFiles);
    }
    if (checkpoint.lastDeployed) {
      props.lastDeployed = checkpoint.lastDeployed;
    }

    if (Object.keys(props).length > 0) {
      await client.request(
        'PATCH',
        `/api/v1/graph/nodes/${encodeURIComponent(taskId)}?graphId=${encodeURIComponent(graphId)}`,
        props
      );
    }
  } catch {
    // Checkpoint push failure is non-fatal — log but don't block
  }
}

/**
 * Get modified files from git since last task complete.
 */
export function getModifiedFiles(): string[] {
  try {
    const diff = execSync('git diff --name-only HEAD', { encoding: 'utf-8' }).trim();
    const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8' }).trim();

    const files = new Set<string>();
    if (diff) diff.split('\n').forEach(f => files.add(f));
    if (untracked) untracked.split('\n').forEach(f => files.add(f));

    return Array.from(files).filter(f => f.length > 0).sort();
  } catch {
    return [];
  }
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format sprint state for CLI display.
 */
export function formatSprintState(state: SprintState): string {
  const lines: string[] = [];

  lines.push(`Sprint: ${state.sprint} — ${state.sprintTitle}`);
  lines.push(`Progress: ${state.progress.percentage}% (${state.progress.complete}/${state.progress.total} tasks complete)`);
  lines.push('');

  // Tasks
  lines.push('Tasks:');
  for (const [id, task] of Object.entries(state.tasks)) {
    const shortId = id.split('_').pop() || id;
    let icon: string;
    switch (task.status) {
      case 'complete': icon = '✅'; break;
      case 'in_progress': icon = '🔄'; break;
      case 'blocked': icon = '⛔'; break;
      default: icon = '⬜'; break;
    }
    lines.push(`  ${icon} ${shortId}: ${task.title}`);
  }

  // Known Issues
  if (state.knownIssues.length > 0) {
    lines.push('');
    lines.push('Known Issues:');
    for (const issue of state.knownIssues) {
      lines.push(`  - ${issue}`);
    }
  }

  // Blockers
  if (state.blockers.length > 0) {
    lines.push('');
    lines.push('Blockers:');
    for (const blocker of state.blockers) {
      lines.push(`  - ${blocker}`);
    }
  } else {
    lines.push('');
    lines.push('Blockers: none');
  }

  if (state.lastDeployed) {
    lines.push(`Last deployed: ${state.lastDeployed}`);
  }

  lines.push(`Last updated: ${state.lastUpdated}${state.lastUpdatedBy ? ` (after ${state.lastUpdatedBy})` : ''}`);

  if (state.stale) {
    lines.push('⚠ Cache may be stale — run `ginko pull` to refresh');
  }

  return lines.join('\n');
}

/**
 * Format a compact sprint checkpoint for ginko start readiness message.
 */
export function formatCheckpointSummary(state: SprintState): string {
  const lines: string[] = [];

  lines.push(`Sprint: ${state.sprint} — ${state.sprintTitle} (${state.progress.percentage}%)`);

  // Find last completed and next task
  let lastCompleted: string | null = null;
  let nextTask: string | null = null;
  const taskEntries = Object.entries(state.tasks);

  for (const [id, task] of taskEntries) {
    if (task.status === 'complete') lastCompleted = `${id.split('_').pop()}: ${task.title}`;
    if (!nextTask && (task.status === 'not_started' || task.status === 'in_progress')) {
      const verb = task.status === 'in_progress' ? 'continue' : 'start';
      nextTask = `${id.split('_').pop()}: ${task.title} (${verb})`;
    }
  }

  if (lastCompleted) lines.push(`  Last: ${lastCompleted}`);
  if (state.knownIssues.length > 0) {
    lines.push(`  Issues: ${state.knownIssues.join('; ')}`);
  }
  if (nextTask) lines.push(`  Next: ${nextTask}`);
  if (state.stale) lines.push('  ⚠ State may be stale — `ginko pull` to refresh');

  return lines.join('\n');
}
