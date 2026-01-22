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
