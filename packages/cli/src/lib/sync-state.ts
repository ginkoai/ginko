/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-30
 * @tags: [sync, state, push, pull, ADR-077]
 * @related: [git-change-detector.ts, ../commands/push/push-command.ts, ../commands/pull/pull-command.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [fs-extra]
 */

/**
 * Sync State Module (ADR-077)
 *
 * Manages `.ginko/sync-state.json` which tracks:
 * - lastPushCommit: git commit SHA at last push (for change detection)
 * - lastPullTimestamp: ISO timestamp of last pull (for staleness)
 * - lastPushTimestamp: ISO timestamp of last push
 * - pushedFiles: record of files pushed with their hashes
 */

import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

export interface SyncState {
  /** Git commit SHA at last push (null = never pushed, push all) */
  lastPushCommit: string | null;
  /** ISO timestamp of last push */
  lastPushTimestamp: string | null;
  /** ISO timestamp of last pull */
  lastPullTimestamp: string | null;
  /** Record of file paths to their last-pushed content hashes */
  pushedFiles: Record<string, string>;
  /** Record of file paths to graph-side hashes at push time (BUG-018) */
  graphHashes: Record<string, string>;
}

const DEFAULT_STATE: SyncState = {
  lastPushCommit: null,
  lastPushTimestamp: null,
  lastPullTimestamp: null,
  pushedFiles: {},
  graphHashes: {},
};

/**
 * Get path to sync state file
 */
async function getSyncStatePath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  return path.join(ginkoDir, 'sync-state.json');
}

/**
 * Read current sync state from disk
 * Returns default state if file doesn't exist
 */
export async function readSyncState(): Promise<SyncState> {
  const statePath = await getSyncStatePath();

  if (!await fs.pathExists(statePath)) {
    return { ...DEFAULT_STATE };
  }

  try {
    const data = await fs.readJson(statePath);
    return {
      lastPushCommit: data.lastPushCommit ?? null,
      lastPushTimestamp: data.lastPushTimestamp ?? null,
      lastPullTimestamp: data.lastPullTimestamp ?? null,
      pushedFiles: data.pushedFiles ?? {},
      graphHashes: data.graphHashes ?? {},
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/**
 * Write sync state to disk
 */
export async function writeSyncState(state: SyncState): Promise<void> {
  const statePath = await getSyncStatePath();
  await fs.ensureDir(path.dirname(statePath));
  await fs.writeJson(statePath, state, { spaces: 2 });
}

/**
 * Update lastPushCommit and timestamp after a successful push
 */
export async function recordPush(commitSha: string, files?: Record<string, string>): Promise<void> {
  const state = await readSyncState();
  state.lastPushCommit = commitSha;
  state.lastPushTimestamp = new Date().toISOString();
  if (files) {
    state.pushedFiles = { ...state.pushedFiles, ...files };
  }
  await writeSyncState(state);
}

/**
 * Record graph-side hashes after a successful push (BUG-018).
 * Stores the graph's version so next push can detect graph-side changes.
 */
export async function recordGraphHashes(hashes: Record<string, string>): Promise<void> {
  const state = await readSyncState();
  state.graphHashes = { ...state.graphHashes, ...hashes };
  await writeSyncState(state);
}

/**
 * Update lastPullTimestamp after a successful pull
 */
export async function recordPull(): Promise<void> {
  const state = await readSyncState();
  state.lastPullTimestamp = new Date().toISOString();
  await writeSyncState(state);
}
