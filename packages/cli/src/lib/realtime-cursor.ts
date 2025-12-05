/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: [cursor, realtime, epic-004, multi-agent, event-stream]
 * @related: [event-logger.ts, event-queue.ts, ../commands/graph/api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [auth-storage]
 *
 * Real-time cursor updates for EPIC-004 multi-agent coordination.
 *
 * Purpose: Push cursor position to cloud immediately after significant actions,
 * enabling other agents to see work in near-real-time (< 5 seconds).
 *
 * When to update:
 * - After task claim
 * - After each logged event
 * - After task completion
 * - On session start/resume
 *
 * Configuration:
 * - Flag: --realtime-cursor (default: true)
 * - Env: GINKO_REALTIME_CURSOR=true|false
 */

import { getAccessToken, isAuthenticated } from '../utils/auth-storage.js';
import { getUserEmail, getProjectRoot } from '../utils/helpers.js';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Cursor position update payload
 */
export interface CursorUpdate {
  userId: string;
  projectId: string;
  branch: string;
  lastEventId?: string;
  currentTask?: string;
  status: 'active' | 'idle' | 'busy';
  timestamp: string;
  action?: 'session_start' | 'event_logged' | 'task_claimed' | 'task_completed' | 'handoff';
}

/**
 * Cursor update response from API
 */
export interface CursorUpdateResponse {
  success: boolean;
  cursor: {
    userId: string;
    projectId: string;
    lastEventId?: string;
    updatedAt: string;
  };
}

/**
 * Real-time cursor configuration
 */
interface RealtimeCursorConfig {
  enabled: boolean;
  apiUrl: string;
  debounceMs: number;
}

/**
 * Runtime override for realtime cursor (set by CLI options)
 */
let runtimeOverride: boolean | undefined;

/**
 * Set runtime override for realtime cursor
 * Called by CLI when --no-realtime-cursor is passed
 */
export function setRealtimeCursorEnabled(enabled: boolean): void {
  runtimeOverride = enabled;
}

/**
 * Get configuration for realtime cursor updates
 */
export function getRealtimeCursorConfig(): RealtimeCursorConfig {
  // Check runtime override first (from CLI options)
  if (runtimeOverride !== undefined) {
    return {
      enabled: runtimeOverride,
      apiUrl: process.env.GINKO_API_URL || 'https://app.ginkoai.com',
      debounceMs: 100,
    };
  }

  // Default to enabled for EPIC-004 multi-agent coordination
  // Can be disabled via GINKO_REALTIME_CURSOR=false
  const enabled = process.env.GINKO_REALTIME_CURSOR !== 'false';

  return {
    enabled,
    apiUrl: process.env.GINKO_API_URL || 'https://app.ginkoai.com',
    debounceMs: 100, // Debounce rapid updates
  };
}

/**
 * Check if realtime cursor updates are enabled
 */
export function isRealtimeCursorEnabled(): boolean {
  return getRealtimeCursorConfig().enabled;
}

/**
 * Last update timestamp for debouncing
 */
let lastUpdateTime = 0;
let pendingUpdate: CursorUpdate | null = null;
let updateTimer: NodeJS.Timeout | null = null;

/**
 * Push cursor update to cloud immediately
 *
 * Uses debouncing to prevent rapid-fire updates (e.g., multiple events logged in quick succession).
 * Guarantees update within config.debounceMs after last call.
 *
 * @param update - Cursor update payload
 * @returns Promise resolving when update is sent (or debounced)
 */
export async function pushCursorUpdate(update: CursorUpdate): Promise<void> {
  const config = getRealtimeCursorConfig();

  if (!config.enabled) {
    return;
  }

  const now = Date.now();
  pendingUpdate = update;

  // Clear existing timer
  if (updateTimer) {
    clearTimeout(updateTimer);
  }

  // Debounce: wait for config.debounceMs after last call
  const timeSinceLastUpdate = now - lastUpdateTime;
  if (timeSinceLastUpdate < config.debounceMs) {
    // Schedule update after debounce period
    updateTimer = setTimeout(async () => {
      if (pendingUpdate) {
        await sendCursorUpdate(pendingUpdate);
        pendingUpdate = null;
      }
    }, config.debounceMs - timeSinceLastUpdate);
    return;
  }

  // Send immediately if outside debounce window
  await sendCursorUpdate(update);
  lastUpdateTime = now;
  pendingUpdate = null;
}

/**
 * Send cursor update to API
 */
async function sendCursorUpdate(update: CursorUpdate): Promise<CursorUpdateResponse | null> {
  try {
    // Check authentication
    if (!await isAuthenticated()) {
      // Silently skip if not authenticated - don't block local-only usage
      return null;
    }

    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    const config = getRealtimeCursorConfig();
    const url = `${config.apiUrl}/api/v1/cursor/update`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Client-Version': 'ginko-cli@1.2.0',
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      // Log but don't throw - cursor update failure shouldn't block user
      console.warn(`[RealtimeCursor] Update failed: ${response.status}`);
      return null;
    }

    return await response.json() as CursorUpdateResponse;
  } catch (error) {
    // Network errors shouldn't block user operations
    console.warn('[RealtimeCursor] Update error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Get current context for cursor update
 */
async function getCurrentContext(): Promise<{
  userId: string;
  projectId: string;
  branch: string;
}> {
  const userEmail = await getUserEmail();
  const projectRoot = await getProjectRoot();
  const projectId = path.basename(projectRoot);

  // Get current git branch
  let branch = 'main';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      cwd: projectRoot,
    }).trim();
  } catch {
    // Not in git repo or git not available
  }

  return {
    userId: userEmail,
    projectId,
    branch,
  };
}

/**
 * Update cursor on session start/resume
 */
export async function onSessionStart(): Promise<void> {
  if (!isRealtimeCursorEnabled()) return;

  const context = await getCurrentContext();
  await pushCursorUpdate({
    ...context,
    status: 'active',
    timestamp: new Date().toISOString(),
    action: 'session_start',
  });
}

/**
 * Update cursor after event is logged
 */
export async function onEventLogged(eventId: string): Promise<void> {
  if (!isRealtimeCursorEnabled()) return;

  const context = await getCurrentContext();
  await pushCursorUpdate({
    ...context,
    lastEventId: eventId,
    status: 'busy',
    timestamp: new Date().toISOString(),
    action: 'event_logged',
  });
}

/**
 * Update cursor when task is claimed
 */
export async function onTaskClaimed(taskId: string): Promise<void> {
  if (!isRealtimeCursorEnabled()) return;

  const context = await getCurrentContext();
  await pushCursorUpdate({
    ...context,
    currentTask: taskId,
    status: 'busy',
    timestamp: new Date().toISOString(),
    action: 'task_claimed',
  });
}

/**
 * Update cursor when task is completed
 */
export async function onTaskCompleted(taskId: string): Promise<void> {
  if (!isRealtimeCursorEnabled()) return;

  const context = await getCurrentContext();
  await pushCursorUpdate({
    ...context,
    currentTask: taskId,
    status: 'active',
    timestamp: new Date().toISOString(),
    action: 'task_completed',
  });
}

/**
 * Update cursor on handoff
 */
export async function onHandoff(finalEventId?: string): Promise<void> {
  if (!isRealtimeCursorEnabled()) return;

  const context = await getCurrentContext();
  await pushCursorUpdate({
    ...context,
    lastEventId: finalEventId,
    status: 'idle',
    timestamp: new Date().toISOString(),
    action: 'handoff',
  });
}

/**
 * Flush any pending cursor update (for shutdown)
 */
export async function flushPendingCursorUpdate(): Promise<void> {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }

  if (pendingUpdate) {
    await sendCursorUpdate(pendingUpdate);
    pendingUpdate = null;
  }
}
