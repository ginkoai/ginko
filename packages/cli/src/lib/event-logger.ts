/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-04
 * @tags: [event-logging, dual-write, adr-043, session-events]
 * @related: [event-queue.ts, ../commands/log.ts, ../utils/session-logger.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra, uuid]
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getGinkoDir, getUserEmail, getProjectRoot } from '../utils/helpers.js';
import { execSync } from 'child_process';

/**
 * Event entry structure (aligned with ADR-043)
 */
export interface EventEntry {
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
  description: string;
  files?: string[];
  impact?: 'high' | 'medium' | 'low';
  branch?: string;
  tags?: string[];
  shared?: boolean;
  commit_hash?: string;
}

/**
 * Internal event structure with metadata
 */
export interface Event extends EventEntry {
  id: string;
  user_id: string;
  organization_id: string;
  project_id: string;
  timestamp: string;
  pressure?: number;
  synced_to_graph?: boolean;
}

/**
 * Context information for multi-tenancy
 */
interface EventContext {
  user_id: string;
  organization_id: string;
  project_id: string;
  branch: string;
}

/**
 * Get current event context (user, org, project)
 */
async function getEventContext(): Promise<EventContext> {
  const userEmail = await getUserEmail();
  const projectRoot = await getProjectRoot();
  const projectName = path.basename(projectRoot);

  // Get current branch
  let branch = 'main';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      cwd: projectRoot
    }).trim();
  } catch (error) {
    // Not in a git repo or git not available
  }

  // Organization ID: extract from project path or use default
  // Example: /Users/cnorton/Development/ginko -> "watchhill-ai"
  const orgId = 'watchhill-ai'; // Can be enhanced to read from config

  return {
    user_id: userEmail,
    organization_id: orgId,
    project_id: projectName,
    branch
  };
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  const timestamp = Date.now();
  const random = uuidv4().split('-')[0]; // Use first segment of UUID
  return `event_${timestamp}_${random}`;
}

/**
 * Capture current context pressure (placeholder for future integration)
 */
function captureContextPressure(): number {
  // TODO: Integrate with actual context pressure tracking
  // For now, return a reasonable default
  return 0.5; // 50%
}

/**
 * Get path to current events file (JSONL)
 */
async function getEventsFilePath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const userEmail = await getUserEmail();
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  const sessionDir = path.join(ginkoDir, 'sessions', userSlug);

  // Ensure session directory exists
  await fs.ensureDir(sessionDir);

  return path.join(sessionDir, 'current-events.jsonl');
}

/**
 * Append event to local file (JSONL format)
 *
 * CRITICAL: This MUST succeed even if Neo4j is offline.
 * Never block user on network issues.
 */
async function appendToLocalFile(event: Event): Promise<void> {
  try {
    const filePath = await getEventsFilePath();
    const eventLine = JSON.stringify(event) + '\n';

    // Atomic append operation
    await fs.appendFile(filePath, eventLine, 'utf8');
  } catch (error) {
    // Log error but don't propagate - we need to be resilient
    console.error('[EventLogger] Failed to write to local file:', error instanceof Error ? error.message : String(error));
    throw error; // Re-throw because local write MUST succeed
  }
}

/**
 * Log an event with cloud-first pattern (TASK-012)
 *
 * Pattern evolution:
 * - LEGACY (ADR-043): Dual-write (local file + async graph sync)
 * - NEW (TASK-012): Cloud-first with optional local backup
 *
 * Modes:
 * - Cloud-only: GINKO_CLOUD_ONLY=true - Graph only, no local files
 * - Dual-write: (default) - Local file + graph sync for backward compat
 *
 * @param entry - Event entry data
 * @returns Promise<Event> - The logged event with metadata
 */
export async function logEvent(entry: EventEntry): Promise<Event> {
  // 1. Gather context
  const context = await getEventContext();
  const pressure = captureContextPressure();

  // 2. Create event with metadata
  const event: Event = {
    id: generateEventId(),
    user_id: context.user_id,
    organization_id: context.organization_id,
    project_id: context.project_id,
    timestamp: new Date().toISOString(),
    pressure,
    branch: entry.branch || context.branch,
    category: entry.category,
    description: entry.description,
    files: entry.files,
    impact: entry.impact || 'medium',
    tags: entry.tags,
    shared: entry.shared || false,
    commit_hash: entry.commit_hash,
    synced_to_graph: false
  };

  // TASK-012: Check cloud-only mode
  const cloudOnly = process.env.GINKO_CLOUD_ONLY === 'true';

  if (cloudOnly) {
    // CLOUD-ONLY MODE: Write to graph synchronously, fail loudly if it fails
    try {
      const { addToQueue } = await import('./event-queue.js');
      await addToQueue(event);
      console.log('[EventLogger] ☁️  Cloud-only: Event synced to graph');
    } catch (error) {
      console.error('[EventLogger] ❌ Cloud-only mode: Graph write failed!');
      console.error('[EventLogger]    Event NOT persisted (no local fallback)');
      throw new Error(`Cloud-only mode: Graph write failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // DUAL-WRITE MODE (legacy): Local file first, then async graph sync
    // 3. Write to local file immediately (MUST succeed)
    await appendToLocalFile(event);

    // 4. Add to async queue (import lazily to avoid circular deps)
    try {
      const { addToQueue } = await import('./event-queue.js');
      await addToQueue(event);
    } catch (error) {
      // Queue failure is non-critical - event is persisted locally
      console.warn('[EventLogger] Failed to add to sync queue:', error instanceof Error ? error.message : String(error));
    }
  }

  return event;
}

/**
 * Load all events from local file
 */
export async function loadEvents(): Promise<Event[]> {
  try {
    const filePath = await getEventsFilePath();

    if (!await fs.pathExists(filePath)) {
      return [];
    }

    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    return lines.map(line => JSON.parse(line) as Event);
  } catch (error) {
    console.error('[EventLogger] Failed to load events:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Mark events as synced to graph
 */
export async function markEventsSynced(eventIds: string[]): Promise<void> {
  try {
    const events = await loadEvents();
    const eventIdSet = new Set(eventIds);

    // Update synced status
    const updatedEvents = events.map(event => {
      if (eventIdSet.has(event.id)) {
        return { ...event, synced_to_graph: true };
      }
      return event;
    });

    // Rewrite file with updated events
    const filePath = await getEventsFilePath();
    const content = updatedEvents.map(e => JSON.stringify(e)).join('\n') + '\n';
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    console.error('[EventLogger] Failed to mark events as synced:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get events that need syncing (not yet synced to graph)
 */
export async function getUnsyncedEvents(): Promise<Event[]> {
  const events = await loadEvents();
  return events.filter(event => !event.synced_to_graph);
}

/**
 * Clear events file (for testing)
 */
export async function clearEvents(): Promise<void> {
  try {
    const filePath = await getEventsFilePath();
    await fs.writeFile(filePath, '', 'utf8');
  } catch (error) {
    console.error('[EventLogger] Failed to clear events:', error instanceof Error ? error.message : String(error));
  }
}
