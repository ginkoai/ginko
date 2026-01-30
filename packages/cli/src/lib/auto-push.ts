/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-30
 * @tags: [auto-push, sync, non-blocking, ADR-077]
 * @related: [sync-state.ts, ../commands/push/push-command.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [chalk]
 */

/**
 * Auto-Push Utility (ADR-077)
 *
 * Non-blocking push triggered after workflow events.
 * Respects GINKO_AUTO_PUSH=false to disable.
 *
 * Usage:
 *   import { autoPush } from '../lib/auto-push.js';
 *   await autoPush();                           // Push all changes
 *   await autoPush({ entityType: 'sprint' });   // Push only sprints
 */

import chalk from 'chalk';

export interface AutoPushOptions {
  /** Entity type to push (optional, defaults to all) */
  entityType?: string;
  /** Specific entity ID (optional) */
  entityId?: string;
  /** Push all files (ignore change detection) */
  all?: boolean;
}

/**
 * Check if auto-push is enabled
 */
function isAutoPushEnabled(): boolean {
  const envValue = process.env.GINKO_AUTO_PUSH;
  if (envValue === 'false' || envValue === '0') return false;
  return true;
}

/**
 * Trigger a non-blocking push after workflow events.
 *
 * This function is designed to be fire-and-forget: it catches all errors
 * and logs warnings rather than throwing. This ensures the calling command
 * completes even if push fails.
 */
export async function autoPush(options: AutoPushOptions = {}): Promise<void> {
  if (!isAutoPushEnabled()) return;

  try {
    // Dynamic import to avoid circular dependency and reduce startup cost
    const { pushCommand } = await import('../commands/push/push-command.js');

    await pushCommand({
      entityType: options.entityType,
      entityId: options.entityId,
      all: options.all,
      quiet: true,
      events: true,
    });
  } catch (error) {
    // Auto-push failures are non-fatal — log and continue
    const msg = error instanceof Error ? error.message : String(error);
    if (process.env.GINKO_DEBUG_API === 'true') {
      console.warn(chalk.dim(`  Auto-push failed: ${msg}`));
    }
  }
}

/**
 * Push all changes (for handoff)
 * Same as autoPush({ all: true }) but with visible output
 */
export async function pushAll(): Promise<void> {
  try {
    const { pushCommand } = await import('../commands/push/push-command.js');

    await pushCommand({
      all: true,
      events: true,
      quiet: false,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(chalk.yellow(`\u26a0\ufe0f  Push failed: ${msg}`));
  }
}
