/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-19
 * @tags: [cache, offline, state, EPIC-015]
 * @related: [staleness-detector.ts, user-sprint.ts, start-reflection.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

/**
 * Local State Cache (EPIC-015 Sprint 2)
 *
 * Provides local caching for API state data to enable:
 * - Offline operation when API is unavailable
 * - Faster startup by avoiding API calls for fresh data
 * - Graceful degradation with staleness indicators
 *
 * Cache location: .ginko/state-cache.json
 * Uses atomic writes (temp file + rename) to prevent partial writes.
 */

import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Data about the active sprint for display
 */
export interface ActiveSprintData {
  sprintId: string;
  sprintName: string;
  epicId: string;
  epicName?: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentTask?: {
    taskId: string;
    taskName: string;
    status: 'pending' | 'in_progress' | 'completed';
  };
  nextTask?: {
    taskId: string;
    taskName: string;
  };
}

/**
 * Cached state structure
 */
export interface StateCache {
  version: 1;
  fetched_at: string;  // ISO timestamp
  graph_id: string;
  active_sprint: ActiveSprintData;
}

/**
 * Result of checking cache staleness
 */
export interface CacheStalenessResult {
  level: 'fresh' | 'stale' | 'expired';
  age: number;         // ms since fetch
  ageHuman: string;    // "15 min ago"
  isFresh: boolean;
  showWarning: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const CACHE_FILE = 'state-cache.json';
const CACHE_VERSION = 1;

// Staleness thresholds in milliseconds
const FRESH_THRESHOLD_MS = 5 * 60 * 1000;      // 5 minutes
const EXPIRED_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// Main API
// =============================================================================

/**
 * Load cached state from disk
 *
 * @returns StateCache if valid cache exists, null otherwise
 *
 * @example
 * ```typescript
 * const cache = await loadStateCache();
 * if (cache) {
 *   console.log(`Sprint: ${cache.active_sprint.sprintName}`);
 * }
 * ```
 */
export async function loadStateCache(): Promise<StateCache | null> {
  try {
    const cachePath = await getCachePath();

    if (!await fs.pathExists(cachePath)) {
      return null;
    }

    const data = await fs.readJSON(cachePath);

    // Validate cache version and required fields
    if (!isValidCache(data)) {
      return null;
    }

    return data as StateCache;
  } catch (error) {
    // File doesn't exist, is invalid JSON, or other read error
    return null;
  }
}

/**
 * Save state data to cache
 * Uses atomic write (temp file + rename) to prevent partial writes
 *
 * @param data - Active sprint data to cache
 * @param graphId - The graph ID this data belongs to
 *
 * @example
 * ```typescript
 * await saveStateCache(sprintData, 'graph-123');
 * ```
 */
export async function saveStateCache(
  data: ActiveSprintData,
  graphId: string
): Promise<void> {
  const cachePath = await getCachePath();
  const cacheDir = path.dirname(cachePath);
  const tempPath = `${cachePath}.tmp.${Date.now()}`;

  // Ensure .ginko directory exists
  await fs.ensureDir(cacheDir);

  const cache: StateCache = {
    version: CACHE_VERSION,
    fetched_at: new Date().toISOString(),
    graph_id: graphId,
    active_sprint: data,
  };

  // Atomic write: write to temp file, then rename
  try {
    await fs.writeJSON(tempPath, cache, { spaces: 2 });
    await fs.rename(tempPath, cachePath);
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
 * Clear the state cache
 * Called when cache should be invalidated (e.g., logout, graph switch)
 *
 * @example
 * ```typescript
 * await clearStateCache();
 * ```
 */
export async function clearStateCache(): Promise<void> {
  try {
    const cachePath = await getCachePath();

    if (await fs.pathExists(cachePath)) {
      await fs.remove(cachePath);
    }
  } catch (error) {
    // Ignore errors when clearing cache
  }
}

/**
 * Check staleness of cached state
 *
 * Staleness levels:
 * - fresh: < 5 minutes old
 * - stale: 5 minutes to 24 hours old
 * - expired: > 24 hours old
 *
 * @param cache - The cached state to check
 * @returns Staleness result with level, age, and display info
 *
 * @example
 * ```typescript
 * const cache = await loadStateCache();
 * if (cache) {
 *   const staleness = checkCacheStaleness(cache);
 *   if (staleness.showWarning) {
 *     console.log(`Cache is ${staleness.level}: ${staleness.ageHuman}`);
 *   }
 * }
 * ```
 */
export function checkCacheStaleness(cache: StateCache): CacheStalenessResult {
  const fetchedAt = new Date(cache.fetched_at);
  const now = new Date();
  const ageMs = now.getTime() - fetchedAt.getTime();

  let level: 'fresh' | 'stale' | 'expired';

  if (ageMs < FRESH_THRESHOLD_MS) {
    level = 'fresh';
  } else if (ageMs < EXPIRED_THRESHOLD_MS) {
    level = 'stale';
  } else {
    level = 'expired';
  }

  return {
    level,
    age: ageMs,
    ageHuman: formatCacheAge(cache.fetched_at),
    isFresh: level === 'fresh',
    showWarning: level !== 'fresh',
  };
}

/**
 * Format cache age for human-readable display
 *
 * @param fetchedAt - ISO timestamp string
 * @returns Human-readable age string (e.g., "15 min ago", "2 hours ago")
 *
 * @example
 * ```typescript
 * const age = formatCacheAge('2026-01-19T10:00:00.000Z');
 * // Returns something like "15 min ago"
 * ```
 */
export function formatCacheAge(fetchedAt: string): string {
  const date = new Date(fetchedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffSecs < 60) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins} min ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return date.toLocaleDateString();
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the full path to the cache file
 */
async function getCachePath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  return path.join(ginkoDir, CACHE_FILE);
}

/**
 * Validate that cache data has correct structure and version
 */
function isValidCache(data: unknown): data is StateCache {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const cache = data as Partial<StateCache>;

  // Check version
  if (cache.version !== CACHE_VERSION) {
    return false;
  }

  // Check required fields
  if (!cache.fetched_at || typeof cache.fetched_at !== 'string') {
    return false;
  }

  if (!cache.graph_id || typeof cache.graph_id !== 'string') {
    return false;
  }

  if (!cache.active_sprint || typeof cache.active_sprint !== 'object') {
    return false;
  }

  // Validate active_sprint structure
  const sprint = cache.active_sprint;
  if (!sprint.sprintId || !sprint.sprintName || !sprint.epicId) {
    return false;
  }

  if (!sprint.progress || typeof sprint.progress.completed !== 'number' ||
      typeof sprint.progress.total !== 'number' ||
      typeof sprint.progress.percentage !== 'number') {
    return false;
  }

  return true;
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const _internal = {
  getCachePath,
  isValidCache,
  FRESH_THRESHOLD_MS,
  EXPIRED_THRESHOLD_MS,
  CACHE_VERSION,
};
