/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [rollback, resilience, checkpoint, git, epic-004-sprint5, task-3]
 * @related: [checkpoint.ts, event-logger.ts, orchestrator-state.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs-extra, simple-git, checkpoint.ts]
 */

import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { getGinkoDir, getProjectRoot, getUserEmail } from '../utils/helpers.js';
import { getCheckpoint, Checkpoint } from './checkpoint.js';
import { logEvent } from './event-logger.js';

/**
 * Rollback result interface (EPIC-004 Sprint 5 TASK-3)
 *
 * Captures outcome of rollback operation including git operations,
 * stash reference for potential undo, and audit information.
 */
export interface RollbackResult {
  success: boolean;
  checkpointId: string;
  stashRef?: string;       // Git stash reference (e.g., "stash@{0}")
  previousCommit: string;  // Commit hash before rollback
  rolledBackTo: string;    // Target commit hash
  filesRestored: number;   // Number of files changed
  error?: string;
}

/**
 * Rollback entry for history tracking
 */
export interface RollbackEntry {
  id: string;
  checkpointId: string;
  taskId: string;
  agentId: string;
  timestamp: Date;
  previousCommit: string;
  rolledBackTo: string;
  stashRef?: string;
  filesRestored: number;
  reason?: string;
  undone?: boolean;      // True if rollback was undone
  undoneAt?: Date;
}

/**
 * Rollback history storage structure
 */
interface RollbackHistory {
  version: string;
  rollbacks: Record<string, RollbackEntry>;
  last_updated: string;
}

/**
 * Get path to rollback history directory
 */
async function getRollbackHistoryDir(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const rollbackDir = path.join(ginkoDir, 'rollbacks');
  await fs.ensureDir(rollbackDir);
  return rollbackDir;
}

/**
 * Get path to rollback history file
 */
async function getRollbackHistoryPath(): Promise<string> {
  const rollbackDir = await getRollbackHistoryDir();
  return path.join(rollbackDir, 'history.json');
}

/**
 * Load rollback history from disk
 */
async function loadRollbackHistory(): Promise<RollbackHistory> {
  try {
    const historyPath = await getRollbackHistoryPath();

    if (!await fs.pathExists(historyPath)) {
      return {
        version: '1.0',
        rollbacks: {},
        last_updated: new Date().toISOString()
      };
    }

    const history = await fs.readJSON(historyPath);

    // Convert date strings back to Date objects
    Object.values(history.rollbacks).forEach((entry: any) => {
      entry.timestamp = new Date(entry.timestamp);
      if (entry.undoneAt) {
        entry.undoneAt = new Date(entry.undoneAt);
      }
    });

    return history;
  } catch (error) {
    console.warn('[ROLLBACK] Failed to load history:', error);
    return {
      version: '1.0',
      rollbacks: {},
      last_updated: new Date().toISOString()
    };
  }
}

/**
 * Save rollback history to disk
 */
async function saveRollbackHistory(history: RollbackHistory): Promise<void> {
  try {
    const historyPath = await getRollbackHistoryPath();
    history.last_updated = new Date().toISOString();
    await fs.writeJSON(historyPath, history, { spaces: 2 });
  } catch (error) {
    console.error('[ROLLBACK] Failed to save history:', error);
    throw error;
  }
}

/**
 * Add rollback entry to history
 */
async function addToHistory(entry: RollbackEntry): Promise<void> {
  const history = await loadRollbackHistory();
  history.rollbacks[entry.id] = entry;
  await saveRollbackHistory(history);
}

/**
 * Generate rollback ID
 * Format: rb_<timestamp>_<checkpointId>
 */
function generateRollbackId(checkpointId: string): string {
  const timestamp = Date.now();
  return `rb_${timestamp}_${checkpointId}`;
}

/**
 * Get current git commit hash
 */
async function getCurrentCommit(): Promise<string> {
  const projectRoot = await getProjectRoot();
  const git = simpleGit(projectRoot);
  const log = await git.log({ maxCount: 1 });
  return log.latest?.hash || 'unknown';
}

/**
 * Check if working directory is clean
 */
async function isWorkingDirectoryClean(): Promise<boolean> {
  const projectRoot = await getProjectRoot();
  const git = simpleGit(projectRoot);
  const status = await git.status();
  return status.isClean();
}

/**
 * Count changed files between two commits
 */
async function countChangedFiles(fromCommit: string, toCommit: string): Promise<number> {
  const projectRoot = await getProjectRoot();
  const git = simpleGit(projectRoot);
  const diff = await git.diff(['--name-only', `${fromCommit}...${toCommit}`]);
  return diff.split('\n').filter(line => line.trim().length > 0).length;
}

/**
 * Release task for re-claiming
 * Updates task status to 'available' by calling graph API
 */
async function releaseTask(taskId: string, agentId: string): Promise<void> {
  try {
    // Import agent client for task release
    const { AgentClient } = await import('../commands/agent/agent-client.js');

    // Call release endpoint
    await AgentClient.releaseTask(taskId, agentId);

    console.log(`[ROLLBACK] Released task ${taskId} for re-claiming`);
  } catch (error) {
    // Log warning but don't fail rollback if task release fails
    console.warn(`[ROLLBACK] Failed to release task ${taskId}:`, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Rollback to a specific checkpoint
 *
 * Process:
 * 1. Verify checkpoint exists
 * 2. Stash current work (if dirty) with reference
 * 3. Reset to checkpoint commit
 * 4. Create rollback event
 * 5. Release task for re-claiming
 *
 * @param checkpointId - Checkpoint ID to roll back to
 * @param options - Rollback options
 * @returns RollbackResult with success status and details
 */
export async function rollbackToCheckpoint(
  checkpointId: string,
  options?: { force?: boolean; reason?: string }
): Promise<RollbackResult> {
  console.log(`[ROLLBACK] Starting rollback to checkpoint ${checkpointId}`);

  try {
    // 1. Verify checkpoint exists
    const checkpoint = await getCheckpoint(checkpointId);
    if (!checkpoint) {
      return {
        success: false,
        checkpointId,
        previousCommit: 'unknown',
        rolledBackTo: 'unknown',
        filesRestored: 0,
        error: `Checkpoint ${checkpointId} not found`
      };
    }

    console.log(`[ROLLBACK] Found checkpoint for task ${checkpoint.taskId}`);
    console.log(`[ROLLBACK]   Target commit: ${checkpoint.gitCommit.substring(0, 7)}`);

    // Get current commit before rollback
    const previousCommit = await getCurrentCommit();
    console.log(`[ROLLBACK]   Current commit: ${previousCommit.substring(0, 7)}`);

    // Check if we're already at the target commit
    if (previousCommit === checkpoint.gitCommit) {
      console.log('[ROLLBACK] Already at target commit, no rollback needed');
      return {
        success: true,
        checkpointId,
        previousCommit,
        rolledBackTo: checkpoint.gitCommit,
        filesRestored: 0
      };
    }

    const projectRoot = await getProjectRoot();
    const git = simpleGit(projectRoot);

    // 2. Check for dirty working directory
    const isClean = await isWorkingDirectoryClean();
    let stashRef: string | undefined;

    if (!isClean) {
      if (!options?.force) {
        return {
          success: false,
          checkpointId,
          previousCommit,
          rolledBackTo: checkpoint.gitCommit,
          filesRestored: 0,
          error: 'Working directory has uncommitted changes. Use --force to stash and rollback.'
        };
      }

      // Stash current work
      console.log('[ROLLBACK] Stashing current work...');
      const stashMessage = `pre-rollback-${checkpointId}`;
      await git.stash(['push', '-m', stashMessage]);

      // Get stash reference
      const stashList = await git.stashList();
      if (stashList.latest) {
        stashRef = stashList.latest.hash; // Use the stash hash as reference
        console.log(`[ROLLBACK] Stashed as: ${stashRef}`);
      }
    }

    // 3. Verify target commit exists
    try {
      await git.revparse([checkpoint.gitCommit]);
    } catch (error) {
      return {
        success: false,
        checkpointId,
        previousCommit,
        rolledBackTo: checkpoint.gitCommit,
        filesRestored: 0,
        error: `Target commit ${checkpoint.gitCommit} not found in repository`
      };
    }

    // Count files that will change
    const filesRestored = await countChangedFiles(previousCommit, checkpoint.gitCommit);

    // 4. Reset to checkpoint commit
    console.log(`[ROLLBACK] Resetting to commit ${checkpoint.gitCommit.substring(0, 7)}...`);
    await git.checkout(checkpoint.gitCommit);

    console.log(`[ROLLBACK] Successfully rolled back ${filesRestored} files`);

    // 5. Create rollback event
    try {
      await logEvent({
        category: 'git',
        description: `Rolled back to checkpoint ${checkpointId} (commit ${checkpoint.gitCommit.substring(0, 7)}) from commit ${previousCommit.substring(0, 7)}. ${filesRestored} files restored.${options?.reason ? ` Reason: ${options.reason}` : ''}`,
        impact: 'high',
        files: checkpoint.filesModified,
        commit_hash: checkpoint.gitCommit,
        tags: ['rollback', 'checkpoint', checkpoint.taskId]
      });
    } catch (error) {
      console.warn('[ROLLBACK] Failed to create rollback event:', error);
    }

    // 6. Release task for re-claiming
    try {
      await releaseTask(checkpoint.taskId, checkpoint.agentId);
    } catch (error) {
      console.warn('[ROLLBACK] Failed to release task:', error);
    }

    // 7. Record in rollback history
    const rollbackId = generateRollbackId(checkpointId);
    const rollbackEntry: RollbackEntry = {
      id: rollbackId,
      checkpointId,
      taskId: checkpoint.taskId,
      agentId: checkpoint.agentId,
      timestamp: new Date(),
      previousCommit,
      rolledBackTo: checkpoint.gitCommit,
      stashRef,
      filesRestored,
      reason: options?.reason,
      undone: false
    };

    await addToHistory(rollbackEntry);

    return {
      success: true,
      checkpointId,
      stashRef,
      previousCommit,
      rolledBackTo: checkpoint.gitCommit,
      filesRestored
    };
  } catch (error) {
    console.error('[ROLLBACK] Rollback failed:', error);
    return {
      success: false,
      checkpointId,
      previousCommit: 'unknown',
      rolledBackTo: 'unknown',
      filesRestored: 0,
      error: error instanceof Error ? error.message : 'Unknown error during rollback'
    };
  }
}

/**
 * Undo a rollback by applying the stashed changes
 *
 * @param stashRef - Git stash reference to apply
 * @returns Success status and error message if failed
 */
export async function undoRollback(stashRef: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[ROLLBACK] Undoing rollback by applying stash ${stashRef}`);

  try {
    const projectRoot = await getProjectRoot();
    const git = simpleGit(projectRoot);

    // Verify stash exists
    const stashList = await git.stashList();
    const stashExists = stashList.all.some(stash => stash.hash === stashRef);

    if (!stashExists) {
      return {
        success: false,
        error: `Stash ${stashRef} not found`
      };
    }

    // Check for clean working directory
    const isClean = await isWorkingDirectoryClean();
    if (!isClean) {
      return {
        success: false,
        error: 'Working directory has uncommitted changes. Commit or stash changes before undoing rollback.'
      };
    }

    // Apply stash
    await git.stash(['apply', stashRef]);

    console.log(`[ROLLBACK] Successfully applied stash ${stashRef}`);

    // Log event
    try {
      await logEvent({
        category: 'git',
        description: `Undid rollback by applying stash ${stashRef}`,
        impact: 'medium',
        tags: ['rollback', 'undo']
      });
    } catch (error) {
      console.warn('[ROLLBACK] Failed to create undo event:', error);
    }

    // Update rollback history
    const history = await loadRollbackHistory();
    const rollbackEntry = Object.values(history.rollbacks).find(
      rb => rb.stashRef === stashRef && !rb.undone
    );

    if (rollbackEntry) {
      rollbackEntry.undone = true;
      rollbackEntry.undoneAt = new Date();
      await saveRollbackHistory(history);
    }

    return { success: true };
  } catch (error) {
    console.error('[ROLLBACK] Undo failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during undo'
    };
  }
}

/**
 * Get rollback history, optionally filtered by task ID
 *
 * @param taskId - Optional task ID to filter by
 * @returns Array of rollback entries, sorted by timestamp (newest first)
 */
export async function getRollbackHistory(taskId?: string): Promise<RollbackEntry[]> {
  try {
    const history = await loadRollbackHistory();
    let rollbacks = Object.values(history.rollbacks);

    // Filter by task ID if provided
    if (taskId) {
      rollbacks = rollbacks.filter(rb => rb.taskId === taskId);
    }

    // Sort by timestamp (newest first)
    rollbacks.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return rollbacks;
  } catch (error) {
    console.warn('[ROLLBACK] Failed to get rollback history:', error);
    return [];
  }
}

/**
 * Get rollback entry by ID
 */
export async function getRollbackById(rollbackId: string): Promise<RollbackEntry | null> {
  try {
    const history = await loadRollbackHistory();
    const rollback = history.rollbacks[rollbackId];
    return rollback || null;
  } catch (error) {
    console.warn(`[ROLLBACK] Failed to get rollback ${rollbackId}:`, error);
    return null;
  }
}

/**
 * Clear rollback history (for testing)
 */
export async function clearRollbackHistory(): Promise<void> {
  try {
    const historyPath = await getRollbackHistoryPath();
    const emptyHistory: RollbackHistory = {
      version: '1.0',
      rollbacks: {},
      last_updated: new Date().toISOString()
    };
    await fs.writeJSON(historyPath, emptyHistory, { spaces: 2 });
  } catch (error) {
    console.error('[ROLLBACK] Failed to clear history:', error);
    throw error;
  }
}
