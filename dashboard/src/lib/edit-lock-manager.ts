/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-03
 * @tags: [edit-locking, concurrency, collaboration, epic-008]
 * @related: [app/api/v1/graph/lock/route.ts, components/graph/NodeEditor.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [supabase]
 */

/**
 * EditLockManager - Manages edit locks to prevent concurrent edit conflicts
 *
 * EPIC-008 Sprint 2: Team Collaboration - Edit Locking System
 *
 * Features:
 * - 15-minute auto-expiring locks
 * - Automatic expired lock cleanup on acquire attempt
 * - Lock extension when same user re-acquires
 * - Clear "held by" information for conflict resolution
 */

export interface EditLock {
  nodeId: string;
  graphId: string;
  userId: string;
  userEmail: string;
  acquiredAt: string;
  expiresAt: string;
}

export interface LockHolder {
  userId: string;
  email: string;
  since: string;
}

export interface LockResult {
  success: boolean;
  lock?: EditLock;
  error?: string;
  heldBy?: LockHolder;
}

export interface CheckLockResult {
  locked: boolean;
  lock?: EditLock;
  isOwnLock?: boolean;
}

/**
 * Default lock duration in minutes
 */
const DEFAULT_LOCK_DURATION_MINUTES = 15;

/**
 * EditLockManager class for client-side lock operations
 *
 * Usage:
 * ```typescript
 * const lockManager = new EditLockManager(getAuthToken);
 *
 * // Acquire lock before editing
 * const result = await lockManager.acquireLock('node_123', 'graph_456');
 * if (!result.success) {
 *   console.log(`Locked by ${result.heldBy?.email} since ${result.heldBy?.since}`);
 * }
 *
 * // Release lock when done
 * await lockManager.releaseLock('node_123', 'graph_456');
 * ```
 */
export class EditLockManager {
  private getAuthToken: () => Promise<string>;
  private baseUrl: string;

  constructor(getAuthToken: () => Promise<string>, baseUrl: string = '') {
    this.getAuthToken = getAuthToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Acquire a lock on a node for editing
   *
   * @param nodeId - The ID of the node to lock
   * @param graphId - The graph containing the node
   * @returns LockResult indicating success or failure with lock holder info
   */
  async acquireLock(nodeId: string, graphId: string): Promise<LockResult> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/api/v1/graph/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nodeId, graphId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if this is a lock conflict (409)
        if (response.status === 409 && data.heldBy) {
          return {
            success: false,
            error: data.error || 'Node is locked by another user',
            heldBy: data.heldBy,
          };
        }

        return {
          success: false,
          error: data.error || 'Failed to acquire lock',
        };
      }

      return {
        success: true,
        lock: data.lock,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to acquire lock',
      };
    }
  }

  /**
   * Release a lock on a node
   *
   * @param nodeId - The ID of the node to unlock
   * @param graphId - The graph containing the node
   * @returns boolean indicating success
   */
  async releaseLock(nodeId: string, graphId: string): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/api/v1/graph/lock`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nodeId, graphId }),
      });

      return response.ok;
    } catch (error) {
      console.error('[EditLockManager] Failed to release lock:', error);
      return false;
    }
  }

  /**
   * Check if a node is locked
   *
   * @param nodeId - The ID of the node to check
   * @param graphId - The graph containing the node
   * @returns CheckLockResult with lock status and details
   */
  async checkLock(nodeId: string, graphId: string): Promise<CheckLockResult> {
    try {
      const token = await this.getAuthToken();
      const params = new URLSearchParams({ nodeId, graphId });
      const response = await fetch(`${this.baseUrl}/api/v1/graph/lock?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { locked: false };
      }

      const data = await response.json();
      return {
        locked: data.locked,
        lock: data.lock,
        isOwnLock: data.isOwnLock,
      };
    } catch (error) {
      console.error('[EditLockManager] Failed to check lock:', error);
      return { locked: false };
    }
  }

  /**
   * Extend an existing lock (useful for long editing sessions)
   *
   * This is effectively the same as acquireLock - if the user already
   * holds the lock, it will be extended.
   *
   * @param nodeId - The ID of the node
   * @param graphId - The graph containing the node
   * @returns LockResult with the extended lock
   */
  async extendLock(nodeId: string, graphId: string): Promise<LockResult> {
    return this.acquireLock(nodeId, graphId);
  }
}

/**
 * React hook for using EditLockManager in components
 *
 * Usage:
 * ```typescript
 * const { acquireLock, releaseLock, checkLock } = useEditLock();
 *
 * useEffect(() => {
 *   const lockResult = await acquireLock(nodeId, graphId);
 *   if (!lockResult.success) {
 *     setLockedBy(lockResult.heldBy);
 *   }
 *
 *   return () => {
 *     releaseLock(nodeId, graphId);
 *   };
 * }, [nodeId, graphId]);
 * ```
 */
export function createEditLockHook(getAuthToken: () => Promise<string>) {
  const manager = new EditLockManager(getAuthToken);

  return {
    acquireLock: (nodeId: string, graphId: string) => manager.acquireLock(nodeId, graphId),
    releaseLock: (nodeId: string, graphId: string) => manager.releaseLock(nodeId, graphId),
    checkLock: (nodeId: string, graphId: string) => manager.checkLock(nodeId, graphId),
    extendLock: (nodeId: string, graphId: string) => manager.extendLock(nodeId, graphId),
  };
}

/**
 * Calculate lock expiry time from now
 */
export function calculateLockExpiry(durationMinutes: number = DEFAULT_LOCK_DURATION_MINUTES): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + durationMinutes);
  return expiry;
}

/**
 * Check if a lock is expired
 */
export function isLockExpired(expiresAt: string | Date): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry < new Date();
}

/**
 * Format lock holder info for display
 */
export function formatLockHolder(heldBy: LockHolder): string {
  const since = new Date(heldBy.since);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - since.getTime()) / 60000);

  if (diffMinutes < 1) {
    return `${heldBy.email} (just now)`;
  } else if (diffMinutes < 60) {
    return `${heldBy.email} (${diffMinutes} min ago)`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    return `${heldBy.email} (${hours}h ago)`;
  }
}
