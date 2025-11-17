/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-04
 * @tags: [session, cursor, event-stream, adr-043, multi-context]
 * @related: [commands/start/index.ts, utils/helpers.ts, lib/write-dispatcher/write-dispatcher.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra, simple-git]
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import { getGinkoDir, getUserEmail, getProjectInfo, getProjectRoot } from '../utils/helpers.js';

/**
 * Session cursor interface (ADR-043)
 * Cursors point into the event stream, scoped to user + project + branch
 */
export interface SessionCursor {
  id: string;
  user_id: string;
  organization_id: string;
  project_id: string;
  branch: string;
  current_event_id: string;
  last_loaded_event_id?: string;
  started: Date;
  last_active: Date;
  status: 'active' | 'paused';
  context_snapshot?: any;
}

/**
 * Local cursor storage structure
 * Used as fallback when Neo4j is offline
 */
interface CursorStorage {
  version: string;
  cursors: Record<string, SessionCursor>;
  last_updated: string;
}

/**
 * Get path to local cursor storage file
 */
async function getCursorStoragePath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const userEmail = await getUserEmail();
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
  await fs.ensureDir(sessionDir);
  return path.join(sessionDir, 'cursors.json');
}

/**
 * Load cursor storage from disk
 */
async function loadCursorStorage(): Promise<CursorStorage> {
  const storagePath = await getCursorStoragePath();

  if (await fs.pathExists(storagePath)) {
    try {
      const data = await fs.readJSON(storagePath);
      // Convert date strings back to Date objects
      Object.values(data.cursors).forEach((cursor: any) => {
        cursor.started = new Date(cursor.started);
        cursor.last_active = new Date(cursor.last_active);
      });
      return data;
    } catch (error) {
      console.warn('[CURSOR] Failed to load cursor storage:', error);
    }
  }

  return {
    version: '1.0',
    cursors: {},
    last_updated: new Date().toISOString()
  };
}

/**
 * Save cursor storage to disk
 */
async function saveCursorStorage(storage: CursorStorage): Promise<void> {
  const storagePath = await getCursorStoragePath();
  storage.last_updated = new Date().toISOString();
  await fs.writeJSON(storagePath, storage, { spaces: 2 });
}

/**
 * Generate event ID for cursor position
 * Format: evt_<timestamp>_<random>
 */
function generateEventId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `evt_${timestamp}_${random}`;
}

/**
 * Get current git branch
 */
async function getCurrentBranch(): Promise<string> {
  try {
    const projectRoot = await getProjectRoot();
    const git = simpleGit(projectRoot);
    const status = await git.status();
    return status.current || 'main';
  } catch (error) {
    console.warn('[CURSOR] Failed to get git branch:', error);
    return 'main';
  }
}

/**
 * Get organization ID from project info or config
 */
async function getOrganizationId(): Promise<string> {
  try {
    const ginkoDir = await getGinkoDir();
    const configPath = path.join(ginkoDir, 'config.json');

    if (await fs.pathExists(configPath)) {
      const config = await fs.readJSON(configPath);
      if (config.organization?.id) {
        return config.organization.id;
      }
    }
  } catch (error) {
    console.warn('[CURSOR] Failed to load organization ID:', error);
  }

  // Fallback to user-based organization
  const userEmail = await getUserEmail();
  return `org_${userEmail.split('@')[0]}`;
}

/**
 * Create a new session cursor
 */
export async function createCursor(params: {
  branch: string;
  projectId: string;
  organizationId: string;
  contextSnapshot?: any;
}): Promise<SessionCursor> {
  const storage = await loadCursorStorage();
  const userEmail = await getUserEmail();

  const cursor: SessionCursor = {
    id: uuidv4(),
    user_id: userEmail,
    organization_id: params.organizationId,
    project_id: params.projectId,
    branch: params.branch,
    current_event_id: generateEventId(),
    started: new Date(),
    last_active: new Date(),
    status: 'active',
    context_snapshot: params.contextSnapshot
  };

  storage.cursors[cursor.id] = cursor;
  await saveCursorStorage(storage);

  return cursor;
}

/**
 * Resume an existing cursor
 */
export async function resumeCursor(cursorId: string): Promise<SessionCursor> {
  const storage = await loadCursorStorage();
  const cursor = storage.cursors[cursorId];

  if (!cursor) {
    throw new Error(`Cursor not found: ${cursorId}`);
  }

  cursor.status = 'active';
  cursor.last_active = new Date();

  storage.cursors[cursorId] = cursor;
  await saveCursorStorage(storage);

  return cursor;
}

/**
 * Update cursor properties
 */
export async function updateCursor(
  cursorId: string,
  updates: Partial<SessionCursor>
): Promise<SessionCursor> {
  const storage = await loadCursorStorage();
  const cursor = storage.cursors[cursorId];

  if (!cursor) {
    throw new Error(`Cursor not found: ${cursorId}`);
  }

  // Merge updates
  Object.assign(cursor, updates);
  cursor.last_active = new Date();

  storage.cursors[cursorId] = cursor;
  await saveCursorStorage(storage);

  return cursor;
}

/**
 * Find a cursor matching the given filters
 */
export async function findCursor(filters: {
  branch?: string;
  projectId?: string;
  status?: 'active' | 'paused';
}): Promise<SessionCursor | null> {
  const storage = await loadCursorStorage();
  const userEmail = await getUserEmail();

  const cursors = Object.values(storage.cursors).filter(
    cursor => cursor.user_id === userEmail
  );

  for (const cursor of cursors) {
    let matches = true;

    if (filters.branch && cursor.branch !== filters.branch) {
      matches = false;
    }

    if (filters.projectId && cursor.project_id !== filters.projectId) {
      matches = false;
    }

    if (filters.status && cursor.status !== filters.status) {
      matches = false;
    }

    if (matches) {
      return cursor;
    }
  }

  return null;
}

/**
 * List all cursors for a user
 */
export async function listCursors(userId?: string): Promise<SessionCursor[]> {
  const storage = await loadCursorStorage();
  const userEmail = userId || await getUserEmail();

  return Object.values(storage.cursors)
    .filter(cursor => cursor.user_id === userEmail)
    .sort((a, b) => b.last_active.getTime() - a.last_active.getTime());
}

/**
 * Delete a cursor
 */
export async function deleteCursor(cursorId: string): Promise<void> {
  const storage = await loadCursorStorage();
  delete storage.cursors[cursorId];
  await saveCursorStorage(storage);
}

/**
 * Create or resume cursor for current context
 * This is the main entry point for session management
 */
export async function getOrCreateCursor(options: {
  branch?: string;
  projectId?: string;
}): Promise<{ cursor: SessionCursor; isNew: boolean }> {
  const branch = options.branch || await getCurrentBranch();
  const projectInfo = await getProjectInfo();
  const projectId = options.projectId || projectInfo.name;
  const organizationId = await getOrganizationId();

  // Try to find existing paused cursor for this branch + project
  const existingCursor = await findCursor({
    branch,
    projectId,
    status: 'paused'
  });

  if (existingCursor) {
    // Resume existing cursor
    const cursor = await resumeCursor(existingCursor.id);
    return { cursor, isNew: false };
  }

  // Create new cursor
  const cursor = await createCursor({
    branch,
    projectId,
    organizationId
  });

  return { cursor, isNew: true };
}

/**
 * Pause current active cursor
 */
export async function pauseCurrentCursor(options: {
  branch?: string;
  projectId?: string;
  finalEventId?: string;
}): Promise<SessionCursor | null> {
  const branch = options.branch || await getCurrentBranch();
  const projectInfo = await getProjectInfo();
  const projectId = options.projectId || projectInfo.name;

  const cursor = await findCursor({
    branch,
    projectId,
    status: 'active'
  });

  if (!cursor) {
    return null;
  }

  const updates: Partial<SessionCursor> = {
    status: 'paused'
  };

  if (options.finalEventId) {
    updates.current_event_id = options.finalEventId;
  }

  return await updateCursor(cursor.id, updates);
}
