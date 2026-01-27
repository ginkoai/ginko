/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-26
 * @tags: [handoff, session, cursor, adr-043, event-stream, epic-016-s04]
 * @related: [start/index.ts, lib/session-cursor.ts, status.ts, lib/work-reconciliation.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [fs-extra, chalk, simple-git]
 */

import chalk from 'chalk';
import ora from 'ora';
import { pauseCurrentCursor, SessionCursor } from '../lib/session-cursor.js';
import { SessionLogManager } from '../core/session-log-manager.js';
import { getGinkoDir, getUserEmail } from '../utils/helpers.js';
import { isQueueInitialized, getQueue } from '../lib/event-queue.js';
import path from 'path';
import { requireAuth } from '../utils/auth-storage.js';
// EPIC-016 Sprint 4: Handoff reconciliation (t06)
import { reconcileWork } from '../lib/work-reconciliation.js';
// EPIC-016 Sprint 5: Adaptive coaching (t03)
import { getCoachingContext } from '../lib/coaching-level.js';
import { showTargetedCoaching } from '../lib/targeted-coaching.js';
import { getGraphId } from './graph/config.js';

interface HandoffOptions {
  message?: string;
  verbose?: boolean;
}

/**
 * Handoff command - Pause current session and update cursor
 *
 * ADR-043: No synthesis! Just update cursor position and flush events.
 * Context loading happens on resume via reading backwards from cursor.
 *
 * Optional message parameter allows user-provided handoff summary.
 */
export async function handoffCommand(options: HandoffOptions = {}) {
  // Require authentication
  await requireAuth('handoff');

  // EPIC-016 Sprint 4 t06: Check for untracked work before handoff
  try {
    const reconciliation = await reconcileWork();
    if (reconciliation.userAction === 'cancelled') {
      console.log(chalk.dim('Handoff cancelled.'));
      return;
    }
    if (reconciliation.taskCreated) {
      console.log(chalk.dim(`Tracked as: ${reconciliation.taskCreated}`));
    }
  } catch {
    // Non-critical - continue with handoff even if reconciliation fails
  }

  const spinner = ora('Pausing work...').start();

  try {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);

    // 1. Get latest event ID from session log
    spinner.text = 'Capturing final event position...';
    let finalEventId: string | undefined;

    try {
      const sessionLog = await SessionLogManager.loadSessionLog(sessionDir);
      // Parse last event ID from log (simple timestamp-based for now)
      if (sessionLog) {
        const eventMatch = sessionLog.match(/evt_\d+_[a-z0-9]+/g);
        if (eventMatch && eventMatch.length > 0) {
          finalEventId = eventMatch[eventMatch.length - 1];
        }
      }
    } catch (error) {
      // No session log or unable to parse - that's okay
      console.warn(chalk.dim('No event ID found in session log'));
    }

    // 2. Flush event queue (sync pending events before pausing)
    spinner.text = 'Flushing event queue...';
    if (isQueueInitialized()) {
      try {
        const queue = getQueue();
        await queue.flush();
        spinner.info(chalk.dim('Event queue flushed'));
      } catch (error) {
        console.warn(chalk.yellow('⚠ Failed to flush event queue:'), error instanceof Error ? error.message : String(error));
      }
    }

    // 3. Pause cursor and update position
    spinner.text = 'Updating cursor position...';
    const cursor = await pauseCurrentCursor({ finalEventId });

    if (!cursor) {
      spinner.warn('No active cursor found');
      console.log(chalk.yellow('No active session to pause'));
      console.log(chalk.dim('Use `ginko start` to begin a new session'));
      return;
    }

    // 4. Archive session log
    spinner.text = 'Archiving session log...';
    try {
      const hasLog = await SessionLogManager.hasSessionLog(sessionDir);
      if (hasLog) {
        const archivePath = await SessionLogManager.archiveLog(sessionDir);
        spinner.info(chalk.dim(`Session log archived: ${path.basename(archivePath)}`));
      }
    } catch (error) {
      console.warn(chalk.dim('Failed to archive session log:'), error);
    }

    // 5. EPIC-004: Push real-time cursor update on handoff
    try {
      const { onHandoff } = await import('../lib/realtime-cursor.js');
      await onHandoff(finalEventId);
    } catch {
      // Cursor update is non-critical - don't block handoff
    }

    // 6. Display success message
    spinner.succeed('Work paused!');
    console.log('');
    console.log(chalk.green(`✓ Work paused on ${chalk.bold(cursor.branch)}`));

    // Display user-provided message if present
    if (options.message) {
      console.log('');
      console.log(chalk.cyan('Handoff Summary:'));
      console.log(chalk.dim(`   ${options.message}`));
    }

    console.log('');
    console.log(chalk.cyan('Session Cursor:'));
    console.log(chalk.dim(`   Project: ${cursor.project_id}`));
    console.log(chalk.dim(`   Branch: ${cursor.branch}`));
    console.log(chalk.dim(`   Position: ${cursor.current_event_id}`));
    console.log('');
    console.log(chalk.dim('Resume anytime with: ') + chalk.bold('ginko start'));
    console.log('');

    // EPIC-016 Sprint 5 t03: Show targeted coaching tips at handoff
    try {
      const graphId = await getGraphId().catch(() => null);
      const coachingContext = await getCoachingContext(graphId || undefined);
      await showTargetedCoaching(coachingContext, 'handoff');
    } catch {
      // Coaching tips are non-critical - don't block handoff
    }

    // Show sync status (future: when Neo4j event queue is implemented)
    if (options.verbose) {
      console.log(chalk.dim('Event queue sync: Not yet implemented'));
      console.log(chalk.dim('Current implementation uses local cursor storage'));
    }

  } catch (error) {
    spinner.fail('Handoff failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export default handoffCommand;
