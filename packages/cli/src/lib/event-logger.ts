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
 * Blocker severity levels for multi-agent coordination
 */
export type BlockerSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Event entry structure (aligned with ADR-043)
 */
export interface EventEntry {
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement' | 'gotcha' | 'blocker';
  description: string;
  files?: string[];
  impact?: 'high' | 'medium' | 'low';
  branch?: string;
  tags?: string[];
  shared?: boolean;
  commit_hash?: string;
  // Blocker-specific fields (EPIC-004 Sprint 2 TASK-4)
  blocked_by?: string;        // What's blocking (task ID, resource, etc.)
  blocking_tasks?: string[];  // Tasks that can't proceed
  blocker_severity?: BlockerSeverity;
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
  // EPIC-004 Sprint 2 TASK-7: Agent attribution
  agent_id?: string;  // ID of agent that created event (undefined for human users)
}

/**
 * Context information for multi-tenancy
 */
interface EventContext {
  user_id: string;
  organization_id: string;
  project_id: string;
  branch: string;
  // EPIC-004 Sprint 2 TASK-7: Agent attribution
  agent_id?: string;  // ID of registered agent (undefined for human users)
}

/**
 * Get agent ID from local config if registered (EPIC-004 Sprint 2 TASK-7)
 * Returns undefined for human users (no agent registered)
 */
async function getAgentId(): Promise<string | undefined> {
  try {
    const ginkoDir = await getGinkoDir();
    const agentConfigPath = path.join(ginkoDir, 'agent.json');

    if (await fs.pathExists(agentConfigPath)) {
      const config = await fs.readJson(agentConfigPath);
      return config.agentId;
    }
  } catch {
    // No agent registered or config unreadable - this is expected for human users
  }
  return undefined;
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

  // Organization ID: read from config or use default
  const orgId = 'local';

  // EPIC-004 Sprint 2 TASK-7: Get agent ID if registered
  const agentId = await getAgentId();

  return {
    user_id: userEmail,
    organization_id: orgId,
    project_id: projectName,
    branch,
    agent_id: agentId
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
    synced_to_graph: false,
    // Blocker-specific fields (EPIC-004 Sprint 2 TASK-4)
    blocked_by: entry.blocked_by,
    blocking_tasks: entry.blocking_tasks,
    blocker_severity: entry.blocker_severity,
    // Agent attribution (EPIC-004 Sprint 2 TASK-7)
    agent_id: context.agent_id
  };

  // TASK-012: Check cloud-only mode
  const cloudOnly = process.env.GINKO_CLOUD_ONLY === 'true';

  if (cloudOnly) {
    // CLOUD-ONLY MODE: Write directly to graph API, bypassing queue
    // (Queue depends on local files which don't exist in cloud-only mode)
    try {
      const { createGraphEvents } = await import('../commands/graph/api-client.js');

      // Convert to graph API format
      const graphEvent = {
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
        pressure: event.pressure,
        // Blocker-specific fields (EPIC-004 Sprint 2 TASK-4)
        blocked_by: event.blocked_by,
        blocking_tasks: event.blocking_tasks,
        blocker_severity: event.blocker_severity,
        // Agent attribution (EPIC-004 Sprint 2 TASK-7)
        agent_id: event.agent_id
      };

      // Synchronous write to graph (fail loudly if it fails)
      await createGraphEvents([graphEvent]);
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

  // EPIC-004: Real-time cursor update for multi-agent coordination
  // Push cursor position to cloud so other agents see our progress
  try {
    const { onEventLogged } = await import('./realtime-cursor.js');
    await onEventLogged(event.id);
  } catch {
    // Cursor update is non-critical - don't block event logging
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

// =============================================================================
// EPIC-016 Sprint 5 Task 5: Coaching Feedback Loop
// =============================================================================

/**
 * Coaching event types for tracking interactions
 */
export type CoachingEventType =
  | 'planning_menu_shown'
  | 'planning_menu_selection'
  | 'coaching_level_auto'
  | 'coaching_level_override'
  | 'targeted_tip_shown'
  | 'session_with_structure'
  | 'session_without_structure';

/**
 * Coaching event data for analytics
 */
export interface CoachingEventData {
  type: CoachingEventType;
  coachingLevel?: 'minimal' | 'standard' | 'supportive';
  overallScore?: number;
  selection?: string; // For planning menu selections
  tipId?: string;     // For targeted tips
  metric?: string;    // For metric-specific tips
  sessionHadStructure?: boolean;
  override?: boolean;
  previousLevel?: string;
}

/**
 * Log a coaching interaction event (EPIC-016 Sprint 5 Task 5)
 *
 * Tracks coaching interactions for future analysis:
 * - Planning menu selections over time
 * - Time from "no structure" to "structured work"
 * - User override patterns
 * - Correlation between coaching level and adoption
 *
 * @param data - Coaching event data
 */
export async function logCoachingEvent(data: CoachingEventData): Promise<void> {
  const description = formatCoachingDescription(data);

  await logEvent({
    category: 'insight',
    description,
    tags: ['coaching-data', `coaching-${data.type}`, `level-${data.coachingLevel || 'unknown'}`],
    impact: 'low',
  });
}

/**
 * Format coaching event description for logging
 */
function formatCoachingDescription(data: CoachingEventData): string {
  switch (data.type) {
    case 'planning_menu_shown':
      return `Planning menu shown (coaching level: ${data.coachingLevel}, score: ${data.overallScore})`;

    case 'planning_menu_selection':
      return `Planning menu selection: ${data.selection} (coaching level: ${data.coachingLevel})`;

    case 'coaching_level_auto':
      return `Coaching level auto-adjusted to ${data.coachingLevel} (score: ${data.overallScore})`;

    case 'coaching_level_override':
      return `Coaching level manually set to ${data.coachingLevel} (previous: ${data.previousLevel})`;

    case 'targeted_tip_shown':
      return `Targeted coaching tip shown: ${data.tipId} (metric: ${data.metric}, level: ${data.coachingLevel})`;

    case 'session_with_structure':
      return `Session started with structured work (coaching level: ${data.coachingLevel})`;

    case 'session_without_structure':
      return `Session started without structure, menu shown (coaching level: ${data.coachingLevel})`;

    default:
      return `Coaching event: ${data.type}`;
  }
}

/**
 * Log planning menu interaction
 */
export async function logPlanningMenuEvent(
  selection: string,
  coachingLevel: 'minimal' | 'standard' | 'supportive',
  overallScore?: number
): Promise<void> {
  await logCoachingEvent({
    type: 'planning_menu_selection',
    selection,
    coachingLevel,
    overallScore,
  });
}

/**
 * Log coaching level change
 */
export async function logCoachingLevelChange(
  newLevel: 'minimal' | 'standard' | 'supportive',
  isOverride: boolean,
  overallScore?: number,
  previousLevel?: string
): Promise<void> {
  await logCoachingEvent({
    type: isOverride ? 'coaching_level_override' : 'coaching_level_auto',
    coachingLevel: newLevel,
    overallScore,
    override: isOverride,
    previousLevel,
  });
}

/**
 * Log targeted tip shown
 */
export async function logTargetedTipShown(
  tipId: string,
  metric: string,
  coachingLevel: 'minimal' | 'standard' | 'supportive'
): Promise<void> {
  await logCoachingEvent({
    type: 'targeted_tip_shown',
    tipId,
    metric,
    coachingLevel,
  });
}
