/**
 * @fileType: utility
 * @status: deprecated
 * @updated: 2026-01-30
 * @tags: [dead-letter-queue, dlq, resilience, event-retry, epic-004, deprecated-by-adr-077]
 * @deprecated Replaced by ginko push retry logic (ADR-077). DLQ no longer needed.
 * @related: [event-queue.ts, event-logger.ts, api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, uuid]
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getGinkoDir } from '../utils/helpers.js';
import { Event } from './event-logger.js';

/**
 * Dead Letter Queue Entry
 *
 * Captures failed sync attempts for later retry
 */
export interface DeadLetterEntry {
  id: string;
  originalEvent: Event;
  failureReason: string;
  failedAt: Date;
  retryCount: number;
  lastRetryAt?: Date;
  status: 'pending' | 'retrying' | 'resolved' | 'abandoned';
}

/**
 * DLQ Configuration
 */
interface DLQConfig {
  maxRetries: number;           // Maximum retry attempts (default 3)
  retryDelays: number[];        // Retry delays in ms: [1min, 5min, 30min]
  abandonedThreshold: number;   // Time in ms after which to abandon (default 24h)
}

const DEFAULT_CONFIG: DLQConfig = {
  maxRetries: 3,
  retryDelays: [
    60 * 1000,        // 1 minute
    5 * 60 * 1000,    // 5 minutes
    30 * 60 * 1000    // 30 minutes
  ],
  abandonedThreshold: 24 * 60 * 60 * 1000  // 24 hours
};

/**
 * Get path to DLQ directory
 */
async function getDLQDirectory(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const dlqDir = path.join(ginkoDir, 'dlq');
  await fs.ensureDir(dlqDir);
  return dlqDir;
}

/**
 * Get path to DLQ entry file
 */
async function getDLQEntryPath(entryId: string): Promise<string> {
  const dlqDir = await getDLQDirectory();
  return path.join(dlqDir, `${entryId}.json`);
}

/**
 * Generate unique DLQ entry ID
 */
function generateDLQEntryId(): string {
  const timestamp = Date.now();
  const random = uuidv4().split('-')[0];
  return `dlq_${timestamp}_${random}`;
}

/**
 * Add event to Dead Letter Queue
 *
 * Called when event sync fails after all retries in event-queue.ts
 *
 * @param event - Original event that failed to sync
 * @param reason - Failure reason description
 * @returns DLQ entry ID
 */
export async function addToDeadLetter(
  event: Event,
  reason: string
): Promise<string> {
  const entryId = generateDLQEntryId();

  const entry: DeadLetterEntry = {
    id: entryId,
    originalEvent: event,
    failureReason: reason,
    failedAt: new Date(),
    retryCount: 0,
    status: 'pending'
  };

  try {
    const filePath = await getDLQEntryPath(entryId);
    await fs.writeJson(filePath, entry, { spaces: 2 });

    console.log(`[DLQ] Added event ${event.id} to dead letter queue: ${entryId}`);
    return entryId;
  } catch (error) {
    console.error('[DLQ] Failed to write DLQ entry:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get all DLQ entries, optionally filtered by status
 *
 * @param status - Optional status filter
 * @returns Array of DLQ entries
 */
export async function getDeadLetterEntries(
  status?: 'pending' | 'retrying' | 'resolved' | 'abandoned'
): Promise<DeadLetterEntry[]> {
  try {
    const dlqDir = await getDLQDirectory();
    const files = await fs.readdir(dlqDir);

    const entries: DeadLetterEntry[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(dlqDir, file);
        const entry = await fs.readJson(filePath) as DeadLetterEntry;

        // Convert date strings back to Date objects
        entry.failedAt = new Date(entry.failedAt);
        if (entry.lastRetryAt) {
          entry.lastRetryAt = new Date(entry.lastRetryAt);
        }

        // Apply status filter if provided
        if (!status || entry.status === status) {
          entries.push(entry);
        }
      } catch (error) {
        console.warn(`[DLQ] Failed to read entry ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Sort by failedAt timestamp (oldest first)
    entries.sort((a, b) => a.failedAt.getTime() - b.failedAt.getTime());

    return entries;
  } catch (error) {
    console.error('[DLQ] Failed to list DLQ entries:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Get a specific DLQ entry by ID
 *
 * @param entryId - DLQ entry ID
 * @returns DLQ entry or null if not found
 */
export async function getDeadLetterEntry(entryId: string): Promise<DeadLetterEntry | null> {
  try {
    const filePath = await getDLQEntryPath(entryId);

    if (!await fs.pathExists(filePath)) {
      return null;
    }

    const entry = await fs.readJson(filePath) as DeadLetterEntry;

    // Convert date strings back to Date objects
    entry.failedAt = new Date(entry.failedAt);
    if (entry.lastRetryAt) {
      entry.lastRetryAt = new Date(entry.lastRetryAt);
    }

    return entry;
  } catch (error) {
    console.error(`[DLQ] Failed to get entry ${entryId}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Update DLQ entry status and metadata
 *
 * @param entryId - DLQ entry ID
 * @param updates - Partial entry updates
 */
async function updateDeadLetterEntry(
  entryId: string,
  updates: Partial<DeadLetterEntry>
): Promise<void> {
  const entry = await getDeadLetterEntry(entryId);
  if (!entry) {
    throw new Error(`DLQ entry not found: ${entryId}`);
  }

  const updatedEntry = { ...entry, ...updates };

  const filePath = await getDLQEntryPath(entryId);
  await fs.writeJson(filePath, updatedEntry, { spaces: 2 });
}

/**
 * Retry a specific DLQ entry
 *
 * Attempts to sync the event again, respecting retry count and delays
 *
 * @param entryId - DLQ entry ID to retry
 * @param config - Optional DLQ configuration
 * @returns Success status and updated entry
 */
export async function retryDeadLetter(
  entryId: string,
  config: Partial<DLQConfig> = {}
): Promise<{ success: boolean; entry: DeadLetterEntry; error?: string }> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const entry = await getDeadLetterEntry(entryId);
  if (!entry) {
    throw new Error(`DLQ entry not found: ${entryId}`);
  }

  // Check if entry has exceeded max retries
  if (entry.retryCount >= fullConfig.maxRetries) {
    console.warn(`[DLQ] Entry ${entryId} has exceeded max retries (${fullConfig.maxRetries})`);

    await updateDeadLetterEntry(entryId, {
      status: 'abandoned',
      lastRetryAt: new Date()
    });

    const updatedEntry = await getDeadLetterEntry(entryId);
    return {
      success: false,
      entry: updatedEntry!,
      error: 'Max retry attempts exceeded'
    };
  }

  // Check retry delay
  if (entry.lastRetryAt) {
    const delayIndex = Math.min(entry.retryCount, fullConfig.retryDelays.length - 1);
    const requiredDelay = fullConfig.retryDelays[delayIndex];
    const timeSinceLastRetry = Date.now() - entry.lastRetryAt.getTime();

    if (timeSinceLastRetry < requiredDelay) {
      const remainingDelay = requiredDelay - timeSinceLastRetry;
      console.warn(`[DLQ] Entry ${entryId} cannot retry yet. ${Math.ceil(remainingDelay / 1000)}s remaining.`);

      return {
        success: false,
        entry,
        error: `Retry delay not met. Wait ${Math.ceil(remainingDelay / 1000)}s`
      };
    }
  }

  // Update status to retrying
  await updateDeadLetterEntry(entryId, {
    status: 'retrying',
    retryCount: entry.retryCount + 1,
    lastRetryAt: new Date()
  });

  console.log(`[DLQ] Retrying entry ${entryId} (attempt ${entry.retryCount + 1}/${fullConfig.maxRetries})`);

  try {
    // Attempt to sync event to graph
    const { createGraphEvents } = await import('../commands/graph/api-client.js');

    const graphEvent = {
      id: entry.originalEvent.id,
      user_id: entry.originalEvent.user_id,
      organization_id: entry.originalEvent.organization_id,
      project_id: entry.originalEvent.project_id,
      category: entry.originalEvent.category,
      description: entry.originalEvent.description,
      timestamp: entry.originalEvent.timestamp,
      impact: entry.originalEvent.impact,
      files: entry.originalEvent.files,
      branch: entry.originalEvent.branch,
      tags: entry.originalEvent.tags,
      shared: entry.originalEvent.shared,
      commit_hash: entry.originalEvent.commit_hash,
      pressure: entry.originalEvent.pressure,
      blocked_by: entry.originalEvent.blocked_by,
      blocking_tasks: entry.originalEvent.blocking_tasks,
      blocker_severity: entry.originalEvent.blocker_severity,
      agent_id: entry.originalEvent.agent_id
    };

    await createGraphEvents([graphEvent]);

    // Success - mark as resolved
    await updateDeadLetterEntry(entryId, {
      status: 'resolved'
    });

    console.log(`[DLQ] ✓ Entry ${entryId} successfully retried and resolved`);

    const resolvedEntry = await getDeadLetterEntry(entryId);
    return {
      success: true,
      entry: resolvedEntry!
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DLQ] Retry attempt failed for ${entryId}:`, errorMessage);

    // Update status back to pending (unless max retries reached)
    const newRetryCount = entry.retryCount + 1;
    const newStatus = newRetryCount >= fullConfig.maxRetries ? 'abandoned' : 'pending';

    await updateDeadLetterEntry(entryId, {
      status: newStatus,
      failureReason: `${entry.failureReason}\nRetry ${newRetryCount} failed: ${errorMessage}`
    });

    const failedEntry = await getDeadLetterEntry(entryId);
    return {
      success: false,
      entry: failedEntry!,
      error: errorMessage
    };
  }
}

/**
 * Auto-retry eligible DLQ entries
 *
 * Called periodically to retry pending entries that meet delay requirements
 *
 * @param config - Optional DLQ configuration
 * @returns Number of entries retried
 */
export async function autoRetryDeadLetters(
  config: Partial<DLQConfig> = {}
): Promise<number> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const pendingEntries = await getDeadLetterEntries('pending');

  let retriedCount = 0;

  for (const entry of pendingEntries) {
    // Skip if max retries exceeded
    if (entry.retryCount >= fullConfig.maxRetries) {
      await updateDeadLetterEntry(entry.id, { status: 'abandoned' });
      continue;
    }

    // Check if entry is old enough to abandon
    const age = Date.now() - entry.failedAt.getTime();
    if (age > fullConfig.abandonedThreshold) {
      console.log(`[DLQ] Abandoning old entry ${entry.id} (age: ${Math.floor(age / 1000 / 60 / 60)}h)`);
      await updateDeadLetterEntry(entry.id, { status: 'abandoned' });
      continue;
    }

    // Check if retry delay has passed
    if (entry.lastRetryAt) {
      const delayIndex = Math.min(entry.retryCount, fullConfig.retryDelays.length - 1);
      const requiredDelay = fullConfig.retryDelays[delayIndex];
      const timeSinceLastRetry = Date.now() - entry.lastRetryAt.getTime();

      if (timeSinceLastRetry < requiredDelay) {
        continue; // Not ready to retry yet
      }
    }

    // Attempt retry
    const result = await retryDeadLetter(entry.id, fullConfig);
    if (result.success) {
      retriedCount++;
    }
  }

  if (retriedCount > 0) {
    console.log(`[DLQ] Auto-retry completed: ${retriedCount} entries retried`);
  }

  return retriedCount;
}

/**
 * Delete a resolved or abandoned DLQ entry
 *
 * @param entryId - DLQ entry ID to delete
 */
export async function deleteDeadLetterEntry(entryId: string): Promise<void> {
  const entry = await getDeadLetterEntry(entryId);
  if (!entry) {
    throw new Error(`DLQ entry not found: ${entryId}`);
  }

  // Only allow deletion of resolved or abandoned entries
  if (entry.status !== 'resolved' && entry.status !== 'abandoned') {
    throw new Error(`Cannot delete entry with status: ${entry.status}`);
  }

  const filePath = await getDLQEntryPath(entryId);
  await fs.remove(filePath);

  console.log(`[DLQ] Deleted entry ${entryId}`);
}

/**
 * Clean up old resolved/abandoned entries
 *
 * @param olderThanDays - Delete entries older than N days (default 30)
 * @returns Number of entries deleted
 */
export async function cleanupDeadLetters(olderThanDays: number = 30): Promise<number> {
  const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

  const resolvedEntries = await getDeadLetterEntries('resolved');
  const abandonedEntries = await getDeadLetterEntries('abandoned');

  let deletedCount = 0;

  for (const entry of [...resolvedEntries, ...abandonedEntries]) {
    const entryTime = entry.lastRetryAt?.getTime() || entry.failedAt.getTime();

    if (entryTime < cutoffTime) {
      try {
        await deleteDeadLetterEntry(entry.id);
        deletedCount++;
      } catch (error) {
        console.warn(`[DLQ] Failed to delete entry ${entry.id}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (deletedCount > 0) {
    console.log(`[DLQ] Cleanup completed: ${deletedCount} old entries deleted`);
  }

  return deletedCount;
}

/**
 * Get DLQ statistics
 *
 * @returns Summary of DLQ state
 */
export async function getDeadLetterStats(): Promise<{
  pending: number;
  retrying: number;
  resolved: number;
  abandoned: number;
  total: number;
  oldestPending?: Date;
}> {
  const allEntries = await getDeadLetterEntries();

  const stats = {
    pending: 0,
    retrying: 0,
    resolved: 0,
    abandoned: 0,
    total: allEntries.length,
    oldestPending: undefined as Date | undefined
  };

  let oldestPendingTime = Infinity;

  for (const entry of allEntries) {
    stats[entry.status]++;

    if (entry.status === 'pending' && entry.failedAt.getTime() < oldestPendingTime) {
      oldestPendingTime = entry.failedAt.getTime();
      stats.oldestPending = entry.failedAt;
    }
  }

  return stats;
}
