/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-19
 * @tags: [offline, queue, sync, EPIC-015]
 * @related: [state-cache.ts, api-client.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

/**
 * Pending Updates Queue (EPIC-015 Sprint 2 Task 6)
 *
 * Provides offline queueing for status updates when API is unavailable:
 * - Queue status updates when offline
 * - Process queued updates when back online
 * - "Local wins" conflict resolution (queued update takes precedence)
 * - Max 3 retry attempts before permanent failure
 *
 * Queue location: .ginko/pending-updates.json
 * Uses atomic writes (temp file + rename) to prevent partial writes.
 */

import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import { getGinkoDir } from '../utils/helpers.js';
import { GraphApiClient, TaskStatus, SprintStatus, EpicStatus } from '../commands/graph/api-client.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Types of status updates that can be queued
 */
export type UpdateType = 'task_status' | 'sprint_status' | 'epic_status';

/**
 * A pending status update waiting to be synced
 */
export interface PendingUpdate {
  id: string;              // UUID for this update
  type: UpdateType;
  entity_id: string;       // e.g., "e015_s02_t01"
  new_status: string;      // e.g., "complete"
  reason?: string;         // For blocked status
  queued_at: string;       // ISO timestamp
  attempts: number;        // Retry count
}

/**
 * Queue file structure
 */
export interface PendingUpdatesQueue {
  version: 1;
  updates: PendingUpdate[];
}

/**
 * Result of processing pending updates
 */
export interface ProcessResult {
  succeeded: number;
  failed: number;
}

// =============================================================================
// Constants
// =============================================================================

const QUEUE_FILE = 'pending-updates.json';
const QUEUE_VERSION = 1;
const MAX_ATTEMPTS = 3;

// =============================================================================
// Queue Management
// =============================================================================

/**
 * Load pending updates from disk
 *
 * @returns Array of pending updates, empty array if no queue file exists
 *
 * @example
 * ```typescript
 * const updates = await loadPendingUpdates();
 * console.log(`${updates.length} updates pending`);
 * ```
 */
export async function loadPendingUpdates(): Promise<PendingUpdate[]> {
  try {
    const queuePath = await getQueuePath();

    if (!await fs.pathExists(queuePath)) {
      return [];
    }

    const data = await fs.readJSON(queuePath);

    // Validate queue structure
    if (!isValidQueue(data)) {
      return [];
    }

    return data.updates || [];
  } catch (error) {
    // File doesn't exist, is invalid JSON, or other read error
    return [];
  }
}

/**
 * Queue a status update for later sync
 * Used when API call fails due to network error
 *
 * @param update - Update to queue (id, queued_at, attempts added automatically)
 *
 * @example
 * ```typescript
 * await queueUpdate({
 *   type: 'task_status',
 *   entity_id: 'e015_s02_t01',
 *   new_status: 'complete'
 * });
 * ```
 */
export async function queueUpdate(
  update: Omit<PendingUpdate, 'id' | 'queued_at' | 'attempts'>
): Promise<void> {
  const updates = await loadPendingUpdates();

  // Check if there's already a pending update for this entity
  // If so, replace it (latest update wins)
  const existingIndex = updates.findIndex(
    u => u.entity_id === update.entity_id && u.type === update.type
  );

  const newUpdate: PendingUpdate = {
    id: randomUUID(),
    ...update,
    queued_at: new Date().toISOString(),
    attempts: 0,
  };

  if (existingIndex >= 0) {
    // Replace existing update for same entity
    updates[existingIndex] = newUpdate;
  } else {
    // Add new update
    updates.push(newUpdate);
  }

  await saveQueue(updates);
}

/**
 * Remove a specific update from the queue
 *
 * @param updateId - UUID of the update to remove
 *
 * @example
 * ```typescript
 * await removeUpdate('abc-123-def');
 * ```
 */
export async function removeUpdate(updateId: string): Promise<void> {
  const updates = await loadPendingUpdates();
  const filtered = updates.filter(u => u.id !== updateId);

  if (filtered.length !== updates.length) {
    await saveQueue(filtered);
  }
}

/**
 * Clear all pending updates from the queue
 *
 * @example
 * ```typescript
 * await clearPendingUpdates();
 * ```
 */
export async function clearPendingUpdates(): Promise<void> {
  try {
    const queuePath = await getQueuePath();

    if (await fs.pathExists(queuePath)) {
      await fs.remove(queuePath);
    }
  } catch (error) {
    // Ignore errors when clearing queue
  }
}

/**
 * Check if there are pending updates
 *
 * @returns true if queue has at least one update
 *
 * @example
 * ```typescript
 * if (await hasPendingUpdates()) {
 *   console.log('Pending updates need to sync');
 * }
 * ```
 */
export async function hasPendingUpdates(): Promise<boolean> {
  const updates = await loadPendingUpdates();
  return updates.length > 0;
}

// =============================================================================
// Sync Processing
// =============================================================================

/**
 * Process all pending updates, syncing them to the API
 *
 * Processing logic:
 * - Iterates oldest-first (FIFO order)
 * - On success: removes update from queue
 * - On failure: increments attempts, keeps in queue (max 3 attempts)
 * - Conflict resolution: "local wins" (queued update takes precedence)
 *
 * @param client - Authenticated GraphApiClient instance
 * @returns Counts of succeeded and failed updates
 *
 * @example
 * ```typescript
 * const client = new GraphApiClient();
 * const result = await processPendingUpdates(client);
 * console.log(`Synced ${result.succeeded}, failed ${result.failed}`);
 * ```
 */
export async function processPendingUpdates(
  client: GraphApiClient
): Promise<ProcessResult> {
  const updates = await loadPendingUpdates();

  if (updates.length === 0) {
    return { succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  const remaining: PendingUpdate[] = [];

  // Get graph ID from environment
  const graphId = process.env.GINKO_GRAPH_ID || '';
  if (!graphId) {
    // Can't process without graph ID, keep all updates
    return { succeeded: 0, failed: updates.length };
  }

  // Sort by queued_at to process oldest first
  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(a.queued_at).getTime() - new Date(b.queued_at).getTime()
  );

  for (const update of sortedUpdates) {
    try {
      await processUpdate(client, graphId, update);
      succeeded++;
      // Don't add to remaining - it was successful
    } catch (error) {
      // Increment attempts
      update.attempts++;

      if (update.attempts >= MAX_ATTEMPTS) {
        // Max attempts reached, count as failed and don't keep
        failed++;
      } else {
        // Keep in queue for retry
        remaining.push(update);
        failed++;
      }
    }
  }

  // Save remaining updates (excluding succeeded and permanently failed)
  await saveQueue(remaining);

  return { succeeded, failed };
}

/**
 * Process a single update by calling the appropriate API method
 */
async function processUpdate(
  client: GraphApiClient,
  graphId: string,
  update: PendingUpdate
): Promise<void> {
  switch (update.type) {
    case 'task_status':
      await client.updateTaskStatus(
        graphId,
        update.entity_id,
        update.new_status as TaskStatus,
        update.reason
      );
      break;

    case 'sprint_status':
      await client.updateSprintStatus(
        graphId,
        update.entity_id,
        update.new_status as SprintStatus
      );
      break;

    case 'epic_status':
      await client.updateEpicStatus(
        graphId,
        update.entity_id,
        update.new_status as EpicStatus
      );
      break;

    default:
      throw new Error(`Unknown update type: ${update.type}`);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the full path to the queue file
 */
async function getQueuePath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  return path.join(ginkoDir, QUEUE_FILE);
}

/**
 * Save updates to queue file using atomic write
 */
async function saveQueue(updates: PendingUpdate[]): Promise<void> {
  const queuePath = await getQueuePath();
  const queueDir = path.dirname(queuePath);
  const tempPath = `${queuePath}.tmp.${Date.now()}`;

  // Ensure .ginko directory exists
  await fs.ensureDir(queueDir);

  const queue: PendingUpdatesQueue = {
    version: QUEUE_VERSION,
    updates,
  };

  // Atomic write: write to temp file, then rename
  try {
    await fs.writeJSON(tempPath, queue, { spaces: 2 });
    await fs.rename(tempPath, queuePath);
  } catch (error) {
    // Clean up temp file if rename failed
    try {
      await fs.remove(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Validate that queue data has correct structure and version
 */
function isValidQueue(data: unknown): data is PendingUpdatesQueue {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const queue = data as Partial<PendingUpdatesQueue>;

  // Check version
  if (queue.version !== QUEUE_VERSION) {
    return false;
  }

  // Check updates array exists
  if (!Array.isArray(queue.updates)) {
    return false;
  }

  return true;
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const _internal = {
  getQueuePath,
  saveQueue,
  isValidQueue,
  processUpdate,
  QUEUE_VERSION,
  MAX_ATTEMPTS,
};
