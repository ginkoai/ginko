/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-04
 * @tags: [event-queue, async-sync, neo4j, adr-043]
 * @related: [event-logger.ts, ../commands/graph/api-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

import { Event, getUnsyncedEvents, markEventsSynced } from './event-logger.js';

/**
 * Event queue configuration
 */
interface QueueConfig {
  syncIntervalMs: number;      // 5 minutes default
  syncThreshold: number;         // 5 events default
  maxBatchSize: number;         // 20 events max per sync
  retryAttempts: number;        // 3 retry attempts
  retryDelayMs: number;         // 5 seconds between retries
}

const DEFAULT_CONFIG: QueueConfig = {
  syncIntervalMs: 5 * 60 * 1000,  // 5 minutes
  syncThreshold: 5,                // 5 events
  maxBatchSize: 20,                // 20 events max
  retryAttempts: 3,                // 3 retries
  retryDelayMs: 5000               // 5 seconds
};

/**
 * Sync status tracking
 */
interface SyncStatus {
  lastSyncTime: Date | null;
  pendingCount: number;
  totalSynced: number;
  lastError: string | null;
  isRunning: boolean;
}

/**
 * Event Queue for async Neo4j synchronization
 *
 * Pattern (ADR-043):
 * - Batches events for efficient sync
 * - Triggers sync on 5-minute timer OR 5 events (whichever first)
 * - Retries on failure with exponential backoff
 * - Preserves events in local file on failure
 */
export class EventQueue {
  private config: QueueConfig;
  private syncTimer: NodeJS.Timeout | null = null;
  private status: SyncStatus = {
    lastSyncTime: null,
    pendingCount: 0,
    totalSynced: 0,
    lastError: null,
    isRunning: false
  };
  private isShuttingDown = false;

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the sync queue
   */
  start(): void {
    if (this.syncTimer) {
      console.warn('[EventQueue] Queue already started');
      return;
    }

    console.log(`[EventQueue] Starting sync queue (interval: ${this.config.syncIntervalMs / 1000}s, threshold: ${this.config.syncThreshold} events)`);

    // Schedule periodic sync
    this.syncTimer = setInterval(() => {
      this.syncToGraph().catch(error => {
        console.error('[EventQueue] Scheduled sync failed:', error instanceof Error ? error.message : String(error));
      });
    }, this.config.syncIntervalMs);

    // Initial sync on start
    this.syncToGraph().catch(error => {
      console.warn('[EventQueue] Initial sync failed:', error instanceof Error ? error.message : String(error));
    });
  }

  /**
   * Stop the sync queue
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[EventQueue] Sync queue stopped');
    }
  }

  /**
   * Add event to queue and trigger sync if threshold reached
   */
  async addToQueue(event: Event): Promise<void> {
    // Update pending count
    const unsyncedEvents = await getUnsyncedEvents();
    this.status.pendingCount = unsyncedEvents.length;

    // Check if we should trigger sync based on threshold
    if (this.status.pendingCount >= this.config.syncThreshold) {
      console.log(`[EventQueue] Threshold reached (${this.status.pendingCount} events), triggering sync`);
      // Fire and forget - don't block
      this.syncToGraph().catch(error => {
        console.warn('[EventQueue] Threshold sync failed:', error instanceof Error ? error.message : String(error));
      });
    }
  }

  /**
   * Sync queued events to Neo4j
   *
   * Batch syncs up to maxBatchSize events per call.
   * Retries on failure with exponential backoff.
   */
  async syncToGraph(): Promise<void> {
    if (this.status.isRunning) {
      console.log('[EventQueue] Sync already in progress, skipping');
      return;
    }

    if (this.isShuttingDown) {
      console.log('[EventQueue] Shutting down, skipping sync');
      return;
    }

    this.status.isRunning = true;
    this.status.lastError = null;

    try {
      // Get unsynced events
      const unsyncedEvents = await getUnsyncedEvents();

      if (unsyncedEvents.length === 0) {
        console.log('[EventQueue] No events to sync');
        return;
      }

      // Batch events
      const batch = unsyncedEvents.slice(0, this.config.maxBatchSize);
      console.log(`[EventQueue] Syncing ${batch.length} events to graph`);

      // Attempt sync with retries
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        try {
          await this.syncBatchToGraph(batch);

          // Success - mark events as synced
          const eventIds = batch.map(e => e.id);
          await markEventsSynced(eventIds);

          this.status.totalSynced += batch.length;
          this.status.lastSyncTime = new Date();
          this.status.pendingCount = unsyncedEvents.length - batch.length;

          console.log(`[EventQueue] ✓ Synced ${batch.length} events to graph`);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`[EventQueue] Sync attempt ${attempt}/${this.config.retryAttempts} failed:`, lastError.message);

          if (attempt < this.config.retryAttempts) {
            // Wait before retry with exponential backoff
            const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
            console.log(`[EventQueue] Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      this.status.lastError = lastError?.message || 'Unknown error';
      console.error('[EventQueue] ⚠ Graph sync failed after all retries, events remain in local log');
    } finally {
      this.status.isRunning = false;
    }
  }

  /**
   * Sync a batch of events to Neo4j graph
   */
  private async syncBatchToGraph(events: Event[]): Promise<void> {
    try {
      // Import graph API client lazily
      const { createGraphEvents } = await import('../commands/graph/api-client.js');

      // Convert events to graph API format
      const graphEvents = events.map(event => ({
        id: event.id,
        user_id: event.user_id,
        organization_id: event.organization_id,
        project_id: event.project_id,
        category: event.category,
        description: event.description,
        timestamp: event.timestamp,
        impact: event.impact,
        files: event.files,
        branch: event.branch,
        tags: event.tags,
        shared: event.shared,
        commit_hash: event.commit_hash,
        pressure: event.pressure
      }));

      // Call graph API to create events
      await createGraphEvents(graphEvents);
    } catch (error) {
      // Re-throw to trigger retry logic
      throw new Error(`Graph API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Flush queue immediately (for handoff/shutdown)
   */
  async flush(): Promise<void> {
    console.log('[EventQueue] Flushing queue...');
    this.stop(); // Stop scheduled syncs
    await this.syncToGraph(); // Final sync
  }

  /**
   * Graceful shutdown with pending sync wait
   */
  async shutdown(): Promise<void> {
    console.log('[EventQueue] Initiating graceful shutdown...');
    this.isShuttingDown = true;

    // Stop scheduled syncs
    this.stop();

    // Wait for current sync to complete
    const maxWaitMs = 30000; // 30 seconds max
    const startTime = Date.now();
    while (this.status.isRunning && (Date.now() - startTime) < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final flush
    await this.flush();
    console.log('[EventQueue] Shutdown complete');
  }

  /**
   * Get current queue status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Schedule sync if needed (called after adding to queue)
   */
  scheduleSyncIfNeeded(): void {
    // Already handled in addToQueue
    // This method exists for API compatibility
  }
}

/**
 * Global queue instance (singleton)
 */
let globalQueue: EventQueue | null = null;

/**
 * Initialize global event queue
 */
export function initializeQueue(config?: Partial<QueueConfig>): EventQueue {
  if (globalQueue) {
    console.warn('[EventQueue] Queue already initialized');
    return globalQueue;
  }

  globalQueue = new EventQueue(config);
  globalQueue.start();

  // Register shutdown handlers
  const shutdownHandler = () => {
    if (globalQueue) {
      globalQueue.shutdown().catch(error => {
        console.error('[EventQueue] Shutdown error:', error);
      });
    }
  };

  process.on('SIGINT', shutdownHandler);
  process.on('SIGTERM', shutdownHandler);

  return globalQueue;
}

/**
 * Get global queue instance
 */
export function getQueue(): EventQueue {
  if (!globalQueue) {
    throw new Error('EventQueue not initialized. Call initializeQueue() first.');
  }
  return globalQueue;
}

/**
 * Add event to global queue
 */
export async function addToQueue(event: Event): Promise<void> {
  // Lazy initialization on first use
  if (!globalQueue) {
    initializeQueue();
  }

  await globalQueue!.addToQueue(event);
}

/**
 * Check if queue is initialized
 */
export function isQueueInitialized(): boolean {
  return globalQueue !== null;
}
