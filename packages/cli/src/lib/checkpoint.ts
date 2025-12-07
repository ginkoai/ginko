/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [checkpoint, resilience, rollback, epic-004-sprint5, task-1]
 * @related: [rollback.ts, event-logger.ts, orchestrator-state.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, uuid, simple-git]
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import { getGinkoDir, getProjectRoot, getUserEmail } from '../utils/helpers.js';
import { execSync } from 'child_process';

/**
 * Checkpoint interface (EPIC-004 Sprint 5 TASK-1)
 *
 * Checkpoints are lightweight references to work state, not full snapshots.
 * They capture git commit, modified files, and event stream position.
 * Actual rollback uses git operations, not stored copies.
 */
export interface Checkpoint {
  id: string;
  taskId: string;
  agentId: string;
  timestamp: Date;
  gitCommit: string;        // Current commit hash (git rev-parse HEAD)
  filesModified: string[];  // List of modified files since task start
  eventsSince: string;      // Last event ID from event stream
  metadata: Record<string, any>;
  message?: string;         // Optional description of checkpoint
}

/**
 * Checkpoint storage structure (local filesystem)
 */
interface CheckpointStorage {
  version: string;
  checkpoints: Record<string, Checkpoint>;
  last_updated: string;
}

/**
 * Generate checkpoint ID
 * Format: cp_<timestamp>_<random>
 */
function generateCheckpointId(): string {
  const timestamp = Date.now();
  const random = uuidv4().split('-')[0]; // Use first segment of UUID
  return `cp_${timestamp}_${random}`;
}

/**
 * Get path to checkpoint storage directory
 */
async function getCheckpointStorageDir(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const checkpointDir = path.join(ginkoDir, 'checkpoints');
  await fs.ensureDir(checkpointDir);
  return checkpointDir;
}

/**
 * Get path to checkpoint file for a specific checkpoint
 */
async function getCheckpointFilePath(checkpointId: string): Promise<string> {
  const checkpointDir = await getCheckpointStorageDir();
  return path.join(checkpointDir, `${checkpointId}.json`);
}

/**
 * Get current git commit hash
 */
async function getCurrentCommitHash(): Promise<string> {
  try {
    const projectRoot = await getProjectRoot();
    const git = simpleGit(projectRoot);
    const log = await git.log({ maxCount: 1 });
    return log.latest?.hash || 'unknown';
  } catch (error) {
    console.warn('[CHECKPOINT] Failed to get git commit hash:', error);
    return 'unknown';
  }
}

/**
 * Get modified files since task start
 * Uses git status --porcelain to capture all changes
 */
async function getModifiedFiles(): Promise<string[]> {
  try {
    const projectRoot = await getProjectRoot();
    const output = execSync('git status --porcelain', {
      encoding: 'utf8',
      cwd: projectRoot
    }).trim();

    if (!output) {
      return [];
    }

    // Parse git status output
    // Format: "XY filename" where XY is status code
    return output.split('\n').map(line => {
      // Remove leading status code (first 3 characters)
      return line.substring(3).trim();
    }).filter(Boolean);
  } catch (error) {
    console.warn('[CHECKPOINT] Failed to get modified files:', error);
    return [];
  }
}

/**
 * Get last event ID from event stream
 * Reads from current-events.jsonl to find most recent event
 */
async function getLastEventId(): Promise<string> {
  try {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const eventsFile = path.join(ginkoDir, 'sessions', userSlug, 'current-events.jsonl');

    if (!await fs.pathExists(eventsFile)) {
      return 'none';
    }

    // Read last line of JSONL file
    const content = await fs.readFile(eventsFile, 'utf8');
    const lines = content.trim().split('\n');

    if (lines.length === 0) {
      return 'none';
    }

    const lastLine = lines[lines.length - 1];
    const event = JSON.parse(lastLine);
    return event.id || 'none';
  } catch (error) {
    console.warn('[CHECKPOINT] Failed to get last event ID:', error);
    return 'none';
  }
}

/**
 * Get agent ID from environment or local config
 */
async function getAgentId(): Promise<string> {
  // Check environment variable first (for agent mode)
  if (process.env.GINKO_AGENT_ID) {
    return process.env.GINKO_AGENT_ID;
  }

  // Check local agent config
  try {
    const ginkoDir = await getGinkoDir();
    const agentConfigPath = path.join(ginkoDir, 'agent.json');

    if (await fs.pathExists(agentConfigPath)) {
      const config = await fs.readJson(agentConfigPath);
      if (config.agentId) {
        return config.agentId;
      }
    }
  } catch (error) {
    console.warn('[CHECKPOINT] Failed to get agent ID from config:', error);
  }

  // Fallback to user email for human users
  const userEmail = await getUserEmail();
  return `human_${userEmail}`;
}

/**
 * Create a checkpoint
 *
 * Captures current work state:
 * - Git commit hash
 * - Modified files since task start
 * - Last event ID from event stream
 * - Optional message and metadata
 *
 * @param taskId - Task ID this checkpoint belongs to
 * @param agentId - Agent creating checkpoint (optional, auto-detected)
 * @param message - Optional description
 * @param metadata - Optional additional data
 */
export async function createCheckpoint(
  taskId: string,
  agentId?: string,
  message?: string,
  metadata?: Record<string, any>
): Promise<Checkpoint> {
  // Generate checkpoint ID
  const checkpointId = generateCheckpointId();

  // Detect agent ID if not provided
  const resolvedAgentId = agentId || await getAgentId();

  // Capture current state
  const [gitCommit, filesModified, eventsSince] = await Promise.all([
    getCurrentCommitHash(),
    getModifiedFiles(),
    getLastEventId()
  ]);

  // Create checkpoint object
  const checkpoint: Checkpoint = {
    id: checkpointId,
    taskId,
    agentId: resolvedAgentId,
    timestamp: new Date(),
    gitCommit,
    filesModified,
    eventsSince,
    metadata: metadata || {},
    message
  };

  // Save checkpoint to file
  const checkpointPath = await getCheckpointFilePath(checkpointId);
  await fs.writeJSON(checkpointPath, checkpoint, { spaces: 2 });

  console.log(`[CHECKPOINT] Created checkpoint ${checkpointId} for task ${taskId}`);
  console.log(`[CHECKPOINT]   Commit: ${gitCommit.substring(0, 7)}`);
  console.log(`[CHECKPOINT]   Files: ${filesModified.length} modified`);
  console.log(`[CHECKPOINT]   Events: ${eventsSince}`);

  return checkpoint;
}

/**
 * Get a specific checkpoint by ID
 *
 * @param checkpointId - Checkpoint ID
 * @returns Checkpoint object or null if not found
 */
export async function getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
  try {
    const checkpointPath = await getCheckpointFilePath(checkpointId);

    if (!await fs.pathExists(checkpointPath)) {
      return null;
    }

    const checkpoint = await fs.readJSON(checkpointPath);

    // Convert date strings back to Date objects
    checkpoint.timestamp = new Date(checkpoint.timestamp);

    return checkpoint;
  } catch (error) {
    console.warn(`[CHECKPOINT] Failed to load checkpoint ${checkpointId}:`, error);
    return null;
  }
}

/**
 * List checkpoints, optionally filtered by task ID
 *
 * @param taskId - Optional task ID to filter by
 * @returns Array of checkpoints, sorted by timestamp (newest first)
 */
export async function listCheckpoints(taskId?: string): Promise<Checkpoint[]> {
  try {
    const checkpointDir = await getCheckpointStorageDir();
    const files = await fs.readdir(checkpointDir);

    // Filter for .json files
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Load all checkpoints
    const checkpoints: Checkpoint[] = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(checkpointDir, file);
        const checkpoint = await fs.readJSON(filePath);

        // Convert date strings back to Date objects
        checkpoint.timestamp = new Date(checkpoint.timestamp);

        // Filter by task ID if provided
        if (!taskId || checkpoint.taskId === taskId) {
          checkpoints.push(checkpoint);
        }
      } catch (error) {
        console.warn(`[CHECKPOINT] Failed to load checkpoint from ${file}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    checkpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return checkpoints;
  } catch (error) {
    console.warn('[CHECKPOINT] Failed to list checkpoints:', error);
    return [];
  }
}

/**
 * Delete a checkpoint
 *
 * @param checkpointId - Checkpoint ID to delete
 */
export async function deleteCheckpoint(checkpointId: string): Promise<void> {
  try {
    const checkpointPath = await getCheckpointFilePath(checkpointId);

    if (await fs.pathExists(checkpointPath)) {
      await fs.remove(checkpointPath);
      console.log(`[CHECKPOINT] Deleted checkpoint ${checkpointId}`);
    } else {
      console.warn(`[CHECKPOINT] Checkpoint ${checkpointId} not found`);
    }
  } catch (error) {
    console.error(`[CHECKPOINT] Failed to delete checkpoint ${checkpointId}:`, error);
    throw error;
  }
}

/**
 * Get checkpoints for a specific task, grouped by day
 * Useful for displaying checkpoint history
 */
export async function getCheckpointsByTask(taskId: string): Promise<Map<string, Checkpoint[]>> {
  const checkpoints = await listCheckpoints(taskId);
  const grouped = new Map<string, Checkpoint[]>();

  for (const checkpoint of checkpoints) {
    const dateKey = checkpoint.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }

    grouped.get(dateKey)!.push(checkpoint);
  }

  return grouped;
}

/**
 * Get the most recent checkpoint for a task
 */
export async function getLatestCheckpoint(taskId: string): Promise<Checkpoint | null> {
  const checkpoints = await listCheckpoints(taskId);
  return checkpoints.length > 0 ? checkpoints[0] : null;
}

/**
 * Check if a checkpoint exists
 */
export async function checkpointExists(checkpointId: string): Promise<boolean> {
  const checkpointPath = await getCheckpointFilePath(checkpointId);
  return await fs.pathExists(checkpointPath);
}

/**
 * Export checkpoint data for backup or transfer
 */
export async function exportCheckpoint(checkpointId: string): Promise<string> {
  const checkpoint = await getCheckpoint(checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  return JSON.stringify(checkpoint, null, 2);
}

/**
 * Import checkpoint data from backup
 */
export async function importCheckpoint(checkpointData: string): Promise<Checkpoint> {
  const checkpoint = JSON.parse(checkpointData);

  // Validate required fields
  if (!checkpoint.id || !checkpoint.taskId || !checkpoint.agentId) {
    throw new Error('Invalid checkpoint data: missing required fields');
  }

  // Convert timestamp to Date if it's a string
  if (typeof checkpoint.timestamp === 'string') {
    checkpoint.timestamp = new Date(checkpoint.timestamp);
  }

  // Save checkpoint
  const checkpointPath = await getCheckpointFilePath(checkpoint.id);
  await fs.writeJSON(checkpointPath, checkpoint, { spaces: 2 });

  console.log(`[CHECKPOINT] Imported checkpoint ${checkpoint.id}`);
  return checkpoint;
}
