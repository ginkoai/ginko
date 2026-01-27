/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-14
 * @tags: [sprint, user, session, assignment]
 * @related: [sprint-loader.ts, start-reflection.ts, ginko-root.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [fs-extra, path]
 */

/**
 * Per-User Sprint Management
 *
 * Manages user-specific sprint assignments stored in:
 * .ginko/sessions/{user}/current-sprint.json
 *
 * Enables multiple users to work on different sprints simultaneously
 * while maintaining a global CURRENT-SPRINT.md for team coordination.
 */

import fs from 'fs-extra';
import path from 'path';
import { getUserEmail, getGinkoDir } from '../utils/helpers.js';
import { getUserSessionPath, requireGinkoRoot } from '../utils/ginko-root.js';

/**
 * User's current sprint assignment
 */
export interface UserSprintAssignment {
  sprintId: string;        // e.g., "e011_s01"
  epicId: string;          // e.g., "e011"
  sprintFile: string;      // Relative path to sprint markdown
  sprintName: string;      // Human-readable sprint name
  assignedAt: string;      // ISO timestamp
  assignedBy: 'auto' | 'manual';

  // EPIC-016 Sprint 4: Ad-hoc tracking (t01)
  isAdhoc?: boolean;                  // True if working without sprint structure
  consecutiveAdhocSessions?: number;  // Count of sessions without structured work
  lastAdhocSessionAt?: string;        // ISO timestamp of last ad-hoc session
}

/**
 * Result of checking user's work structure status (EPIC-016 Sprint 4 t01)
 * Used by start command to determine if planning menu should be shown
 */
export interface WorkStructureStatus {
  hasStructuredWork: boolean;        // User has active sprint with incomplete tasks
  sprintId: string | null;           // Current sprint ID if any
  incompleteTasks: number;           // Count of remaining tasks (-1 if unknown)
  consecutiveAdhocSessions: number;  // Sessions without structured work
  shouldShowPlanningMenu: boolean;   // Final decision
  reason: 'has_sprint' | 'no_sprint' | 'all_tasks_complete' | 'adhoc_pattern';
}

const CURRENT_SPRINT_FILE = 'current-sprint.json';

/**
 * Get the path to user's current-sprint.json
 */
async function getUserSprintFilePath(): Promise<string> {
  const userEmail = await getUserEmail();
  const sessionPath = await getUserSessionPath(userEmail);
  return path.join(sessionPath, CURRENT_SPRINT_FILE);
}

/**
 * Get user's current sprint assignment
 * Returns null if no sprint is assigned
 */
export async function getUserCurrentSprint(): Promise<UserSprintAssignment | null> {
  try {
    const filePath = await getUserSprintFilePath();

    if (!await fs.pathExists(filePath)) {
      return null;
    }

    const data = await fs.readJSON(filePath);

    // Validate required fields (sprintFile can be empty for graph-based sprints)
    if (!data.sprintId) {
      return null;
    }

    return data as UserSprintAssignment;
  } catch (error) {
    // File doesn't exist or is invalid
    return null;
  }
}

/**
 * Set user's current sprint assignment
 */
export async function setUserCurrentSprint(
  assignment: UserSprintAssignment
): Promise<void> {
  const filePath = await getUserSprintFilePath();

  // Ensure session directory exists
  await fs.ensureDir(path.dirname(filePath));

  await fs.writeJSON(filePath, assignment, { spaces: 2 });
}

/**
 * Clear user's current sprint assignment
 * Used when sprint is complete and no next sprint is available
 */
export async function clearUserCurrentSprint(): Promise<void> {
  const filePath = await getUserSprintFilePath();

  if (await fs.pathExists(filePath)) {
    await fs.remove(filePath);
  }
}

/**
 * Extract sprint ID from sprint filename
 * Handles patterns like:
 * - SPRINT-2026-01-e011-s01-feature-name.md → e011_s01
 * - e011-s01-something.md → e011_s01
 * - epic011-sprint2.md → e011_s02
 */
export function extractSprintIdFromFilename(filename: string): { sprintId: string; epicId: string } | null {
  const basename = path.basename(filename, '.md');

  // Pattern 1: e{NNN}-s{NN} or e{NNN}_s{NN}
  const modernPattern = /e(\d{3})[-_]s(\d{2})/i;
  const modernMatch = basename.match(modernPattern);
  if (modernMatch) {
    const epicNum = modernMatch[1];
    const sprintNum = modernMatch[2];
    return {
      sprintId: `e${epicNum}_s${sprintNum}`,
      epicId: `e${epicNum}`
    };
  }

  // Pattern 2: epic{NNN}-sprint{N} (legacy)
  const legacyPattern = /epic(\d+)-sprint(\d+)/i;
  const legacyMatch = basename.match(legacyPattern);
  if (legacyMatch) {
    const epicNum = legacyMatch[1].padStart(3, '0');
    const sprintNum = legacyMatch[2].padStart(2, '0');
    return {
      sprintId: `e${epicNum}_s${sprintNum}`,
      epicId: `e${epicNum}`
    };
  }

  return null;
}

/**
 * Create sprint assignment from a sprint file path
 */
export async function createAssignmentFromFile(
  sprintFilePath: string,
  sprintName: string,
  assignedBy: 'auto' | 'manual' = 'auto'
): Promise<UserSprintAssignment | null> {
  const projectRoot = await requireGinkoRoot();
  const relativePath = path.relative(projectRoot, sprintFilePath);

  const ids = extractSprintIdFromFilename(sprintFilePath);
  if (!ids) {
    // Can't extract sprint ID from filename
    return null;
  }

  return {
    sprintId: ids.sprintId,
    epicId: ids.epicId,
    sprintFile: relativePath,
    sprintName,
    assignedAt: new Date().toISOString(),
    assignedBy
  };
}

/**
 * Check if user's assigned sprint file still exists and is valid
 */
export async function validateUserSprint(
  assignment: UserSprintAssignment
): Promise<boolean> {
  try {
    const projectRoot = await requireGinkoRoot();
    const fullPath = path.join(projectRoot, assignment.sprintFile);
    return await fs.pathExists(fullPath);
  } catch {
    return false;
  }
}

/**
 * Get sprint file path from user assignment
 */
export async function getSprintFileFromAssignment(
  assignment: UserSprintAssignment
): Promise<string> {
  // Graph-based sprints have no local file
  if (!assignment.sprintFile) {
    return '';
  }
  const projectRoot = await requireGinkoRoot();
  return path.join(projectRoot, assignment.sprintFile);
}

// =============================================================================
// EPIC-016 Sprint 4: Work Structure Detection (t01)
// =============================================================================

/**
 * Check if user has structured work (sprint with incomplete tasks)
 *
 * Decision matrix:
 * | Has Sprint | Has Tasks | Consecutive Adhoc | Result |
 * |------------|-----------|-------------------|--------|
 * | Yes        | Yes       | Any               | Has structured work |
 * | Yes        | No (100%) | Any               | No structure (complete) |
 * | No         | N/A       | <= 1              | No structure (new) |
 * | No         | N/A       | > 1               | No structure (adhoc pattern) |
 *
 * @param userSprint - User's current sprint assignment
 * @param sprintChecklist - Sprint task data from graph/file (with progress info)
 * @returns WorkStructureStatus with decision
 */
export function checkWorkStructure(
  userSprint: UserSprintAssignment | null,
  sprintChecklist: { progress?: { total: number; complete: number }; tasks?: Array<{ state: string }> } | null
): WorkStructureStatus {
  // Case 1: No sprint assignment
  if (!userSprint || !userSprint.sprintId) {
    return {
      hasStructuredWork: false,
      sprintId: null,
      incompleteTasks: 0,
      consecutiveAdhocSessions: userSprint?.consecutiveAdhocSessions || 0,
      shouldShowPlanningMenu: true,
      reason: 'no_sprint'
    };
  }

  // Case 2: Sprint assigned but no checklist data (graph unavailable)
  if (!sprintChecklist) {
    // Trust the sprint assignment, assume structured
    return {
      hasStructuredWork: true,
      sprintId: userSprint.sprintId,
      incompleteTasks: -1, // Unknown
      consecutiveAdhocSessions: 0,
      shouldShowPlanningMenu: false,
      reason: 'has_sprint'
    };
  }

  // Calculate incomplete tasks
  let incompleteTasks: number;
  if (sprintChecklist.progress) {
    incompleteTasks = sprintChecklist.progress.total - sprintChecklist.progress.complete;
  } else if (sprintChecklist.tasks) {
    incompleteTasks = sprintChecklist.tasks.filter(
      t => t.state === 'todo' || t.state === 'in_progress'
    ).length;
  } else {
    incompleteTasks = -1; // Unknown
  }

  // Case 3: Sprint with incomplete tasks
  if (incompleteTasks > 0 || incompleteTasks === -1) {
    return {
      hasStructuredWork: true,
      sprintId: userSprint.sprintId,
      incompleteTasks,
      consecutiveAdhocSessions: 0,
      shouldShowPlanningMenu: false,
      reason: 'has_sprint'
    };
  }

  // Case 4: Sprint 100% complete
  return {
    hasStructuredWork: false,
    sprintId: userSprint.sprintId,
    incompleteTasks: 0,
    consecutiveAdhocSessions: userSprint.consecutiveAdhocSessions || 0,
    shouldShowPlanningMenu: true,
    reason: 'all_tasks_complete'
  };
}

/**
 * Increment ad-hoc session counter
 * Called when user chooses ad-hoc work in planning menu
 */
export async function incrementAdhocSessionCount(): Promise<number> {
  const filePath = await getUserSprintFilePath();
  let data: Partial<UserSprintAssignment> = {};

  try {
    if (await fs.pathExists(filePath)) {
      data = await fs.readJSON(filePath);
    }
  } catch {
    // Start fresh if file is corrupted
  }

  const newCount = (data.consecutiveAdhocSessions || 0) + 1;
  data.isAdhoc = true;
  data.consecutiveAdhocSessions = newCount;
  data.lastAdhocSessionAt = new Date().toISOString();

  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJSON(filePath, data, { spaces: 2 });

  return newCount;
}

/**
 * Reset ad-hoc session counter
 * Called when user starts structured work (creates/selects epic/sprint)
 */
export async function resetAdhocSessionCount(): Promise<void> {
  const filePath = await getUserSprintFilePath();

  try {
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJSON(filePath);
      data.isAdhoc = false;
      data.consecutiveAdhocSessions = 0;
      await fs.writeJSON(filePath, data, { spaces: 2 });
    }
  } catch {
    // Ignore errors - non-critical
  }
}

/**
 * Create sprint assignment from sprint ID (for graph-based sprints)
 */
export function createAssignmentFromSprintId(
  sprintId: string,
  sprintName: string,
  assignedBy: 'auto' | 'manual' = 'auto'
): UserSprintAssignment {
  // Extract epic ID from sprint ID (e.g., e016_s04 -> e016, adhoc_260126_s01 -> adhoc_260126)
  const parts = sprintId.split('_s');
  const epicId = parts[0] || sprintId;

  return {
    sprintId,
    epicId,
    sprintFile: '', // Graph-based, no local file
    sprintName,
    assignedAt: new Date().toISOString(),
    assignedBy
  };
}
