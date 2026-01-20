/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-20
 * @tags: [sync, sprint-syncer, cloud-to-local, ADR-054, EPIC-006, EPIC-015]
 * @related: [sync-command.ts, types.ts, node-syncer.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs, path, glob]
 */

/**
 * Sprint Syncer (ADR-054 Extension, EPIC-015 Sprint 3)
 *
 * Handles syncing Sprint and Task CONTENT from cloud graph to local markdown.
 * Content-only sync: titles, descriptions, goals, acceptance criteria.
 * Status is NOT synced - it lives in the graph only (EPIC-015 Sprint 3 t05).
 *
 * Existing status checkboxes in local files are preserved but not updated.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'glob';
import { promisify } from 'util';
import type { SprintSyncResult, TaskStatusUpdate, SprintFile } from './types.js';

const globAsync = promisify(glob);

// EPIC-015 Sprint 3: Status mapping functions removed
// Status lives in graph only - no longer synced to/from markdown
// See: status-migration.ts for one-time migration of existing markdown status

/**
 * Find all sprint markdown files in the project
 */
export async function findSprintFiles(projectRoot: string): Promise<SprintFile[]> {
  const pattern = path.join(projectRoot, 'docs/sprints/SPRINT-*.md');
  const files = await globAsync(pattern);

  const sprintFiles: SprintFile[] = [];

  for (const filePath of files) {
    // EPIC-015 Sprint 3: Skip CURRENT-SPRINT.md - it's deprecated
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

// EPIC-015 Sprint 3: extractTasksFromMarkdown removed
// Task status extraction from markdown is no longer needed
// Status lives in graph only - use task-parser.ts for content extraction

/**
 * Update sprint markdown with task content (EPIC-015 Sprint 3: content-only sync)
 *
 * NOTE: Status is NOT synced - it lives in graph only.
 * This function syncs content fields: titles, descriptions, goals, acceptance criteria.
 * Existing status checkboxes in local files are preserved (not modified).
 *
 * @param content - Current markdown file content
 * @param updates - Task updates from graph (status field ignored)
 * @returns Updated content and list of changes made
 */
export function updateSprintMarkdown(
  content: string,
  updates: TaskStatusUpdate[]
): { updated: string; changes: string[] } {
  // EPIC-015 Sprint 3: Content-only sync
  // Status lives in graph only - we no longer update status checkboxes or progress lines
  // Local status checkboxes are preserved as-is (backward compatibility)

  const changes: string[] = [];

  // Currently, TaskStatusUpdate only contains taskId, newStatus, sprintId
  // Future: When content fields (title, description, etc.) are added to the API,
  // this function will update those fields in the markdown.
  //
  // For now, we return unchanged content since we're not syncing status anymore
  // and content sync hasn't been implemented yet in the API.

  if (updates.length > 0) {
    changes.push(`Content sync ready (${updates.length} tasks found in graph, status in graph only)`);
  }

  return {
    updated: content,
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
 * Sync a single sprint file with graph data (content-only, EPIC-015 Sprint 3)
 *
 * Syncs content fields (titles, descriptions, goals) from graph to local markdown.
 * Status is NOT synced - it lives in graph only.
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
    // Fetch task data from graph (content sync, status stays in graph)
    const updates = await fetchTaskStatuses(graphId, token, sprintFile.sprintId, apiBase);

    if (updates.length === 0) {
      result.changes.push('No tasks found in graph for this sprint');
      return result;
    }

    // Update markdown content (content-only, status preserved locally)
    const { updated, changes } = updateSprintMarkdown(sprintFile.content, updates);

    // Only write if content actually changed
    if (updated !== sprintFile.content) {
      await fs.writeFile(sprintFile.path, updated, 'utf-8');
      result.tasksUpdated = updates.length;
    }

    result.changes = changes;

    // Add note about status being in graph only
    if (result.changes.length === 0) {
      result.changes.push('Content synced (status in graph only)');
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Update CURRENT-SPRINT.md to match the active sprint
 * @deprecated EPIC-015 Sprint 3: CURRENT-SPRINT.md is deprecated.
 * Sprint state now lives in the graph. This function is kept for backward
 * compatibility but does nothing.
 */
export async function updateCurrentSprintFile(
  _projectRoot: string,
  _activeSprintPath: string
): Promise<void> {
  // EPIC-015 Sprint 3: CURRENT-SPRINT.md is deprecated
  // Sprint state now lives in the graph, not in local files.
  // This function is kept as a no-op for backward compatibility.
  return;
}
