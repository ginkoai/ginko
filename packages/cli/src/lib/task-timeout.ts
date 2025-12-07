/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [timeout, orchestrator, checkpoint, escalation, epic-004-sprint5, task-6]
 * @related: [checkpoint.ts, event-logger.ts, orchestrator-state.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, uuid]
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getGinkoDir } from '../utils/helpers.js';
import { createCheckpoint } from './checkpoint.js';
import { logEvent } from './event-logger.js';

/**
 * Task Timeout Management (EPIC-004 Sprint 5 TASK-6)
 *
 * Handles:
 * - Configurable per-task timeout monitoring
 * - Warning at 80% threshold
 * - Automatic checkpoint creation at timeout
 * - Escalation event logging
 *
 * Pattern:
 * - Timeouts stored in .ginko/timeouts/
 * - Background check via interval (30s default)
 * - Creates checkpoint + escalation event on timeout
 * - Integrates with checkpoint.ts and event-logger.ts
 */

// ============================================================
// Constants
// ============================================================

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_WARNING_THRESHOLD = 0.8; // 80%
const DEFAULT_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds
const TIMEOUTS_DIR = 'timeouts';

// ============================================================
// Types
// ============================================================

/**
 * Timeout status
 */
export type TimeoutStatus = 'active' | 'warning' | 'timed_out' | 'completed';

/**
 * Task timeout tracking
 */
export interface TaskTimeout {
  taskId: string;
  agentId: string;
  maxDuration: number; // milliseconds
  startedAt: Date;
  warningAt?: Date; // 80% threshold
  timeoutAt: Date;
  status: TimeoutStatus;
  checkpointId?: string; // Created on timeout
  escalationEventId?: string; // Created on timeout
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  defaultTimeout?: number; // default 30 minutes
  warningThreshold?: number; // default 0.8 (80%)
  checkInterval?: number; // default 30 seconds
}

/**
 * Timed out task information
 */
export interface TimedOutTask {
  taskId: string;
  agentId: string;
  duration: number; // milliseconds elapsed
  checkpointId: string;
  escalationEventId: string;
}

/**
 * Timeout storage structure (local filesystem)
 */
interface TimeoutStorage {
  version: string;
  timeouts: Record<string, TaskTimeout>;
  last_updated: string;
}

// ============================================================
// Storage Helpers
// ============================================================

/**
 * Get path to timeout storage directory
 */
async function getTimeoutStorageDir(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const timeoutDir = path.join(ginkoDir, TIMEOUTS_DIR);
  await fs.ensureDir(timeoutDir);
  return timeoutDir;
}

/**
 * Get path to timeout file for a specific task
 */
async function getTimeoutFilePath(taskId: string): Promise<string> {
  const timeoutDir = await getTimeoutStorageDir();
  return path.join(timeoutDir, `${taskId}.json`);
}

/**
 * Load timeout from file
 */
async function loadTimeout(taskId: string): Promise<TaskTimeout | null> {
  try {
    const filePath = await getTimeoutFilePath(taskId);

    if (!await fs.pathExists(filePath)) {
      return null;
    }

    const timeout = await fs.readJSON(filePath);

    // Convert date strings back to Date objects
    timeout.startedAt = new Date(timeout.startedAt);
    timeout.timeoutAt = new Date(timeout.timeoutAt);
    if (timeout.warningAt) {
      timeout.warningAt = new Date(timeout.warningAt);
    }

    return timeout;
  } catch (error) {
    console.warn(`[TIMEOUT] Failed to load timeout for task ${taskId}:`, error);
    return null;
  }
}

/**
 * Save timeout to file
 */
async function saveTimeout(timeout: TaskTimeout): Promise<void> {
  try {
    const filePath = await getTimeoutFilePath(timeout.taskId);
    await fs.writeJSON(filePath, timeout, { spaces: 2 });
  } catch (error) {
    console.error(`[TIMEOUT] Failed to save timeout for task ${timeout.taskId}:`, error);
    throw error;
  }
}

/**
 * Delete timeout file
 */
async function deleteTimeoutFile(taskId: string): Promise<void> {
  try {
    const filePath = await getTimeoutFilePath(taskId);

    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  } catch (error) {
    console.warn(`[TIMEOUT] Failed to delete timeout for task ${taskId}:`, error);
  }
}

/**
 * List all timeout files
 */
async function listTimeoutFiles(): Promise<string[]> {
  try {
    const timeoutDir = await getTimeoutStorageDir();
    const files = await fs.readdir(timeoutDir);

    // Filter for .json files and extract task IDs
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
    console.warn('[TIMEOUT] Failed to list timeout files:', error);
    return [];
  }
}

// ============================================================
// Core Functions
// ============================================================

/**
 * Start task timeout monitoring
 *
 * Creates a timeout tracker for a task with the specified max duration.
 * Automatically calculates warning threshold and timeout.
 *
 * @param taskId - Task ID to monitor
 * @param maxDuration - Max duration in milliseconds
 * @param agentId - Agent ID assigned to task
 * @param config - Optional timeout configuration
 * @returns TaskTimeout object
 */
export async function startTaskTimeout(
  taskId: string,
  maxDuration: number,
  agentId: string,
  config?: TimeoutConfig
): Promise<TaskTimeout> {
  const warningThreshold = config?.warningThreshold ?? DEFAULT_WARNING_THRESHOLD;
  const startedAt = new Date();
  const warningDuration = maxDuration * warningThreshold;
  const warningAt = new Date(startedAt.getTime() + warningDuration);
  const timeoutAt = new Date(startedAt.getTime() + maxDuration);

  const timeout: TaskTimeout = {
    taskId,
    agentId,
    maxDuration,
    startedAt,
    warningAt,
    timeoutAt,
    status: 'active'
  };

  // Save to file
  await saveTimeout(timeout);

  console.log(`[TIMEOUT] Started timeout for task ${taskId}`);
  console.log(`[TIMEOUT]   Max duration: ${maxDuration / 1000}s`);
  console.log(`[TIMEOUT]   Warning at: ${warningAt.toISOString()}`);
  console.log(`[TIMEOUT]   Timeout at: ${timeoutAt.toISOString()}`);

  return timeout;
}

/**
 * Check all active timeouts for warnings or expiration
 *
 * Scans all timeout files and identifies:
 * - Tasks that have reached warning threshold
 * - Tasks that have timed out
 *
 * @returns Array of timed out tasks
 */
export async function checkTimeouts(): Promise<TimedOutTask[]> {
  const timedOutTasks: TimedOutTask[] = [];
  const now = new Date();

  try {
    const taskIds = await listTimeoutFiles();

    for (const taskId of taskIds) {
      const timeout = await loadTimeout(taskId);

      if (!timeout) {
        continue;
      }

      // Skip if already completed or timed out
      if (timeout.status === 'completed' || timeout.status === 'timed_out') {
        continue;
      }

      // Check for timeout
      if (now >= timeout.timeoutAt) {
        console.log(`[TIMEOUT] Task ${taskId} has timed out`);

        // Handle timeout
        const result = await handleTimeout(taskId);

        if (result) {
          timedOutTasks.push(result);
        }
        continue;
      }

      // Check for warning threshold
      if (timeout.warningAt && now >= timeout.warningAt && timeout.status === 'active') {
        console.log(`[TIMEOUT] Task ${taskId} has reached warning threshold (${DEFAULT_WARNING_THRESHOLD * 100}%)`);

        // Update status to warning
        timeout.status = 'warning';
        await saveTimeout(timeout);

        // Log warning event
        try {
          await logEvent({
            category: 'insight',
            description: `Task ${taskId} approaching timeout (${DEFAULT_WARNING_THRESHOLD * 100}% elapsed). Max duration: ${timeout.maxDuration / 1000}s`,
            tags: ['timeout-warning', taskId],
            impact: 'medium'
          });
        } catch (error) {
          console.warn(`[TIMEOUT] Failed to log warning event for task ${taskId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[TIMEOUT] Failed to check timeouts:', error);
  }

  return timedOutTasks;
}

/**
 * Handle timeout for a specific task
 *
 * Creates checkpoint and escalation event when task times out.
 *
 * @param taskId - Task ID that timed out
 * @returns TimedOutTask information or null if handling failed
 */
export async function handleTimeout(taskId: string): Promise<TimedOutTask | null> {
  try {
    const timeout = await loadTimeout(taskId);

    if (!timeout) {
      console.warn(`[TIMEOUT] Cannot handle timeout for task ${taskId}: timeout not found`);
      return null;
    }

    // Skip if already handled
    if (timeout.status === 'timed_out') {
      console.log(`[TIMEOUT] Task ${taskId} timeout already handled`);
      return null;
    }

    console.log(`[TIMEOUT] Handling timeout for task ${taskId}`);

    const now = new Date();
    const duration = now.getTime() - timeout.startedAt.getTime();

    // Create checkpoint
    let checkpointId: string;
    try {
      const checkpoint = await createCheckpoint(
        taskId,
        timeout.agentId,
        `Automatic checkpoint: task timeout after ${duration / 1000}s`,
        {
          reason: 'timeout',
          maxDuration: timeout.maxDuration,
          actualDuration: duration
        }
      );
      checkpointId = checkpoint.id;
      console.log(`[TIMEOUT] Created checkpoint ${checkpointId} for task ${taskId}`);
    } catch (error) {
      console.error(`[TIMEOUT] Failed to create checkpoint for task ${taskId}:`, error);
      // Continue with escalation even if checkpoint fails
      checkpointId = 'failed';
    }

    // Create escalation event
    let escalationEventId: string;
    try {
      const event = await logEvent({
        category: 'blocker',
        description: `Task ${taskId} timed out after ${duration / 1000}s (max: ${timeout.maxDuration / 1000}s). Agent: ${timeout.agentId}. Checkpoint: ${checkpointId}`,
        tags: ['timeout', 'escalation', taskId, timeout.agentId],
        impact: 'high',
        blocked_by: 'timeout',
        blocking_tasks: [taskId],
        blocker_severity: 'high'
      });
      escalationEventId = event.id;
      console.log(`[TIMEOUT] Created escalation event ${escalationEventId} for task ${taskId}`);
    } catch (error) {
      console.error(`[TIMEOUT] Failed to create escalation event for task ${taskId}:`, error);
      escalationEventId = 'failed';
    }

    // Update timeout status
    timeout.status = 'timed_out';
    timeout.checkpointId = checkpointId;
    timeout.escalationEventId = escalationEventId;
    await saveTimeout(timeout);

    return {
      taskId,
      agentId: timeout.agentId,
      duration,
      checkpointId,
      escalationEventId
    };
  } catch (error) {
    console.error(`[TIMEOUT] Failed to handle timeout for task ${taskId}:`, error);
    return null;
  }
}

/**
 * Clear task timeout on completion
 *
 * Marks timeout as completed and removes from active monitoring.
 *
 * @param taskId - Task ID to clear
 */
export async function clearTaskTimeout(taskId: string): Promise<void> {
  try {
    const timeout = await loadTimeout(taskId);

    if (!timeout) {
      console.log(`[TIMEOUT] No timeout found for task ${taskId}`);
      return;
    }

    // Update status to completed
    timeout.status = 'completed';
    await saveTimeout(timeout);

    console.log(`[TIMEOUT] Cleared timeout for task ${taskId}`);

    // Optionally delete file after completion (cleanup)
    // Keeping it for now for audit trail
    // await deleteTimeoutFile(taskId);
  } catch (error) {
    console.error(`[TIMEOUT] Failed to clear timeout for task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Get all active timeouts
 *
 * Returns all timeouts that are currently being monitored (not completed or timed out).
 *
 * @returns Array of active TaskTimeout objects
 */
export async function getActiveTimeouts(): Promise<TaskTimeout[]> {
  const activeTimeouts: TaskTimeout[] = [];

  try {
    const taskIds = await listTimeoutFiles();

    for (const taskId of taskIds) {
      const timeout = await loadTimeout(taskId);

      if (!timeout) {
        continue;
      }

      // Include active and warning status
      if (timeout.status === 'active' || timeout.status === 'warning') {
        activeTimeouts.push(timeout);
      }
    }
  } catch (error) {
    console.error('[TIMEOUT] Failed to get active timeouts:', error);
  }

  return activeTimeouts;
}

/**
 * Get timeout for a specific task
 *
 * @param taskId - Task ID
 * @returns TaskTimeout object or null if not found
 */
export async function getTaskTimeout(taskId: string): Promise<TaskTimeout | null> {
  return loadTimeout(taskId);
}

/**
 * Get all timeouts (including completed and timed out)
 *
 * @returns Array of all TaskTimeout objects
 */
export async function getAllTimeouts(): Promise<TaskTimeout[]> {
  const allTimeouts: TaskTimeout[] = [];

  try {
    const taskIds = await listTimeoutFiles();

    for (const taskId of taskIds) {
      const timeout = await loadTimeout(taskId);

      if (timeout) {
        allTimeouts.push(timeout);
      }
    }
  } catch (error) {
    console.error('[TIMEOUT] Failed to get all timeouts:', error);
  }

  return allTimeouts;
}

/**
 * Clean up old completed/timed out timeouts
 *
 * Removes timeout files older than specified age.
 *
 * @param maxAgeMs - Maximum age in milliseconds (default 7 days)
 * @returns Number of timeouts cleaned up
 */
export async function cleanupOldTimeouts(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  let cleanedCount = 0;
  const now = new Date();

  try {
    const taskIds = await listTimeoutFiles();

    for (const taskId of taskIds) {
      const timeout = await loadTimeout(taskId);

      if (!timeout) {
        continue;
      }

      // Only clean up completed or timed out timeouts
      if (timeout.status !== 'completed' && timeout.status !== 'timed_out') {
        continue;
      }

      // Check age
      const age = now.getTime() - timeout.startedAt.getTime();
      if (age > maxAgeMs) {
        await deleteTimeoutFile(taskId);
        cleanedCount++;
        console.log(`[TIMEOUT] Cleaned up old timeout for task ${taskId}`);
      }
    }
  } catch (error) {
    console.error('[TIMEOUT] Failed to clean up old timeouts:', error);
  }

  return cleanedCount;
}

// ============================================================
// Background Monitor
// ============================================================

/**
 * Timeout monitor for background checking
 */
export class TimeoutMonitor {
  private checkInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config?: TimeoutConfig) {
    this.checkInterval = config?.checkInterval ?? DEFAULT_CHECK_INTERVAL_MS;
  }

  /**
   * Start background timeout monitoring
   */
  start(): void {
    if (this.timer) {
      console.warn('[TIMEOUT] Monitor already started');
      return;
    }

    console.log(`[TIMEOUT] Starting timeout monitor (interval: ${this.checkInterval / 1000}s)`);

    this.isRunning = true;

    // Schedule periodic checks
    this.timer = setInterval(() => {
      checkTimeouts().catch(error => {
        console.error('[TIMEOUT] Background check failed:', error instanceof Error ? error.message : String(error));
      });
    }, this.checkInterval);

    // Don't keep process alive just for this timer
    this.timer.unref();

    // Initial check
    checkTimeouts().catch(error => {
      console.warn('[TIMEOUT] Initial check failed:', error instanceof Error ? error.message : String(error));
    });
  }

  /**
   * Stop background timeout monitoring
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.isRunning = false;
      console.log('[TIMEOUT] Timeout monitor stopped');
    }
  }

  /**
   * Check if monitor is running
   */
  getStatus(): { isRunning: boolean; checkInterval: number } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval
    };
  }
}

// ============================================================
// Global Monitor Instance
// ============================================================

let globalMonitor: TimeoutMonitor | null = null;

/**
 * Initialize global timeout monitor
 */
export function initializeMonitor(config?: TimeoutConfig): TimeoutMonitor {
  if (globalMonitor) {
    console.warn('[TIMEOUT] Monitor already initialized');
    return globalMonitor;
  }

  globalMonitor = new TimeoutMonitor(config);
  globalMonitor.start();

  return globalMonitor;
}

/**
 * Get global monitor instance
 */
export function getMonitor(): TimeoutMonitor {
  if (!globalMonitor) {
    throw new Error('TimeoutMonitor not initialized. Call initializeMonitor() first.');
  }
  return globalMonitor;
}

/**
 * Check if monitor is initialized
 */
export function isMonitorInitialized(): boolean {
  return globalMonitor !== null;
}
