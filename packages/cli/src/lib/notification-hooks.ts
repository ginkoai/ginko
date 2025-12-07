/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, hooks, epic-004, resilience, alerts]
 * @related: [notifications/index.ts, event-logger.ts, orchestrator-state.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, minimatch]
 */

import fs from 'fs-extra';
import path from 'path';
import minimatch from 'minimatch';
import { getProjectRoot } from '../utils/config-loader.js';

/**
 * Notification event types
 */
export type NotificationEvent =
  | 'escalation'      // Agent creates escalation
  | 'blocker'         // Blocker event logged
  | 'failure'         // Verification fails, agent crashes
  | 'milestone'       // Sprint % threshold (25/50/75/100)
  | 'completion'      // Epic/sprint complete
  | 'stale_agent'     // Agent goes offline unexpectedly
  | 'human_required'; // Agent explicitly requests human

/**
 * Severity levels for filtering
 */
export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Notification destination configuration
 */
export interface NotificationDestination {
  type: 'slack' | 'discord' | 'teams' | 'webhook' | 'email';
  config: Record<string, string>;
}

/**
 * Notification filter configuration
 */
export interface NotificationFilter {
  severity?: NotificationSeverity[];
  epicId?: string;
  taskPattern?: string;  // glob pattern like "TASK-*"
}

/**
 * Notification hook configuration
 */
export interface NotificationHook {
  id: string;
  events: NotificationEvent[];
  destination: NotificationDestination;
  filter?: NotificationFilter;
  enabled?: boolean;  // Default: true
}

/**
 * Notification payload structure
 */
export interface NotificationPayload {
  event: NotificationEvent;
  severity: NotificationSeverity;
  timestamp: string;
  title: string;
  description: string;
  taskId?: string;
  epicId?: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

/**
 * Notification configuration (from ginko.config.json)
 */
export interface NotificationConfig {
  hooks: NotificationHook[];
}

/**
 * Load notification hooks from ginko.config.json
 *
 * @returns Array of notification hooks
 */
export async function loadNotificationHooks(): Promise<NotificationHook[]> {
  try {
    const projectRoot = await getProjectRoot();
    const configPath = path.join(projectRoot, 'ginko.config.json');

    // Check if config file exists
    if (!await fs.pathExists(configPath)) {
      console.log('[NotificationHooks] No ginko.config.json found, no hooks configured');
      return [];
    }

    // Load config
    const config = await fs.readJSON(configPath);

    // Extract notification hooks
    if (!config.notifications?.hooks) {
      console.log('[NotificationHooks] No notification hooks configured');
      return [];
    }

    const hooks = config.notifications.hooks as NotificationHook[];

    // Validate hooks
    const validHooks = hooks.filter(hook => {
      if (!hook.id || !hook.events || !hook.destination) {
        console.warn(`[NotificationHooks] Invalid hook configuration (missing id, events, or destination)`);
        return false;
      }

      if (!Array.isArray(hook.events) || hook.events.length === 0) {
        console.warn(`[NotificationHooks] Invalid hook ${hook.id}: events must be non-empty array`);
        return false;
      }

      if (!hook.destination.type || !hook.destination.config) {
        console.warn(`[NotificationHooks] Invalid hook ${hook.id}: destination must have type and config`);
        return false;
      }

      return true;
    });

    // Filter enabled hooks (default: true)
    const enabledHooks = validHooks.filter(hook => hook.enabled !== false);

    console.log(`[NotificationHooks] Loaded ${enabledHooks.length} notification hooks`);
    return enabledHooks;
  } catch (error) {
    console.error('[NotificationHooks] Failed to load notification hooks:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Check if a hook matches the given payload based on filters
 *
 * @param hook - Notification hook to check
 * @param payload - Notification payload to match against
 * @returns True if hook matches filters
 */
export function matchesFilter(hook: NotificationHook, payload: NotificationPayload): boolean {
  const filter = hook.filter;

  // No filter means match all
  if (!filter) {
    return true;
  }

  // Check severity filter
  if (filter.severity && filter.severity.length > 0) {
    if (!filter.severity.includes(payload.severity)) {
      return false;
    }
  }

  // Check epic ID filter
  if (filter.epicId && payload.epicId) {
    if (filter.epicId !== payload.epicId) {
      return false;
    }
  }

  // Check task pattern filter (glob)
  if (filter.taskPattern && payload.taskId) {
    if (!minimatch(payload.taskId, filter.taskPattern)) {
      return false;
    }
  }

  return true;
}

/**
 * Trigger a notification to all matching hooks
 *
 * @param event - Notification event type
 * @param payload - Notification payload
 */
export async function triggerNotification(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
  try {
    // Load hooks
    const hooks = await loadNotificationHooks();

    if (hooks.length === 0) {
      console.log(`[NotificationHooks] No hooks configured for event: ${event}`);
      return;
    }

    // Filter hooks that match this event
    const matchingHooks = hooks.filter(hook => {
      // Check if hook listens for this event type
      if (!hook.events.includes(event)) {
        return false;
      }

      // Check if hook matches filters
      return matchesFilter(hook, payload);
    });

    if (matchingHooks.length === 0) {
      console.log(`[NotificationHooks] No matching hooks for event: ${event}`);
      return;
    }

    console.log(`[NotificationHooks] Triggering ${matchingHooks.length} hooks for event: ${event}`);

    // Dispatch to each matching hook (in parallel, non-blocking)
    const dispatchPromises = matchingHooks.map(async hook => {
      try {
        const success = await dispatchToDestination(hook.destination, payload);
        if (success) {
          console.log(`[NotificationHooks] ✓ Notification sent to ${hook.id} (${hook.destination.type})`);
        } else {
          console.warn(`[NotificationHooks] ✗ Notification failed for ${hook.id} (${hook.destination.type})`);
        }
      } catch (error) {
        // Log error but don't propagate - notification failures shouldn't block workflow
        console.error(`[NotificationHooks] Error dispatching to ${hook.id}:`, error instanceof Error ? error.message : String(error));
      }
    });

    // Wait for all dispatches to complete (but don't block on errors)
    await Promise.allSettled(dispatchPromises);
  } catch (error) {
    // Top-level error handling - log but don't propagate
    console.error('[NotificationHooks] Failed to trigger notifications:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Dispatch a notification to a specific destination
 *
 * @param destination - Notification destination config
 * @param payload - Notification payload
 * @returns Promise<boolean> - True if dispatch succeeded
 */
export async function dispatchToDestination(destination: NotificationDestination, payload: NotificationPayload): Promise<boolean> {
  try {
    // Dynamically import the appropriate adapter
    const { sendNotification } = await import(`./notifications/${destination.type}.js`);

    // Call adapter's sendNotification function
    const result = await sendNotification(destination.config, payload);
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error(`[NotificationHooks] Unsupported destination type: ${destination.type}`);
      return false;
    }

    console.error(`[NotificationHooks] Dispatch error for ${destination.type}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Validate notification hook configuration
 *
 * @param hook - Hook configuration to validate
 * @returns Validation result with errors
 */
export function validateHook(hook: NotificationHook): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!hook.id) {
    errors.push('Hook must have an id');
  }

  if (!hook.events || !Array.isArray(hook.events) || hook.events.length === 0) {
    errors.push('Hook must have a non-empty events array');
  }

  if (!hook.destination) {
    errors.push('Hook must have a destination');
  } else {
    if (!hook.destination.type) {
      errors.push('Destination must have a type');
    }

    if (!hook.destination.config || typeof hook.destination.config !== 'object') {
      errors.push('Destination must have a config object');
    }
  }

  // Validate event types
  const validEvents: NotificationEvent[] = [
    'escalation',
    'blocker',
    'failure',
    'milestone',
    'completion',
    'stale_agent',
    'human_required'
  ];

  if (hook.events) {
    const invalidEvents = hook.events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      errors.push(`Invalid event types: ${invalidEvents.join(', ')}`);
    }
  }

  // Validate destination type
  const validDestinations = ['slack', 'discord', 'teams', 'webhook', 'email'];
  if (hook.destination?.type && !validDestinations.includes(hook.destination.type)) {
    errors.push(`Invalid destination type: ${hook.destination.type}. Must be one of: ${validDestinations.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
