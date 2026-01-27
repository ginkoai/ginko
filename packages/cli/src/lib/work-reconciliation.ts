/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-26
 * @tags: [reconciliation, handoff, untracked-work, coaching, epic-016-s04]
 * @related: [handoff.ts, planning-menu.ts, user-sprint.ts, event-logger.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [prompts, chalk, simple-git, event-logger]
 */

/**
 * Handoff Reconciliation (EPIC-016 Sprint 4 t06)
 *
 * Catches untracked work at session end by:
 * 1. Detecting meaningful changes (commits, modified files)
 * 2. Comparing against tracked sprint/task work
 * 3. Prompting user to create ad-hoc tasks for untracked work
 *
 * Goal: Ensure all significant work is captured for knowledge graph
 * without being annoying or slowing down the workflow.
 */

import prompts from 'prompts';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import { logEvent } from './event-logger.js';
import { getUserCurrentSprint } from './user-sprint.js';
import { createQuickFixTask } from '../commands/sprint/quick-fix.js';

// =============================================================================
// Types
// =============================================================================

export interface WorkReconciliationResult {
  hasUntrackedWork: boolean;
  untrackedCommits: number;
  untrackedFiles: number;
  userAction: 'tracked' | 'skipped' | 'no-work' | 'cancelled';
  taskCreated?: string;
}

interface SessionWorkSummary {
  commits: Array<{
    hash: string;
    message: string;
    date: string;
  }>;
  modifiedFiles: string[];
  hasActiveTask: boolean;
  currentSprintId: string | null;
}

// =============================================================================
// Constants
// =============================================================================

// Minimum thresholds for prompting about untracked work
const UNTRACKED_THRESHOLD = {
  commits: 1,      // Prompt if 1+ commits without task
  files: 5,        // Or 5+ modified files
};

// File patterns to ignore when counting modified files
const IGNORED_PATTERNS = [
  /^\.ginko\//,
  /^node_modules\//,
  /\.log$/,
  /\.tmp$/,
  /\.lock$/,
];

// =============================================================================
// Work Detection
// =============================================================================

/**
 * Get summary of work done in current session
 */
async function getSessionWorkSummary(): Promise<SessionWorkSummary> {
  const git = simpleGit();

  // Get current sprint info
  const userSprint = await getUserCurrentSprint();
  const hasActiveTask = userSprint !== null;
  const currentSprintId = userSprint?.sprintId || null;

  // Get recent commits (last 24 hours or since last handoff marker)
  let commits: SessionWorkSummary['commits'] = [];
  try {
    const log = await git.log({
      '--since': '24 hours ago',
      maxCount: 20,
    });

    commits = log.all.map(c => ({
      hash: c.hash.slice(0, 7),
      message: c.message.split('\n')[0],
      date: c.date,
    }));
  } catch {
    // Git log failed - might not be a git repo
  }

  // Get modified files (staged + unstaged)
  let modifiedFiles: string[] = [];
  try {
    const status = await git.status();
    modifiedFiles = [
      ...status.modified,
      ...status.staged,
      ...status.not_added,
    ].filter(f => !IGNORED_PATTERNS.some(p => p.test(f)));
  } catch {
    // Git status failed
  }

  return {
    commits,
    modifiedFiles,
    hasActiveTask,
    currentSprintId,
  };
}

/**
 * Determine if there's significant untracked work
 */
function hasSignificantUntrackedWork(summary: SessionWorkSummary): boolean {
  // If user has an active task, assume work is tracked
  if (summary.hasActiveTask) {
    return false;
  }

  // Check thresholds
  return (
    summary.commits.length >= UNTRACKED_THRESHOLD.commits ||
    summary.modifiedFiles.length >= UNTRACKED_THRESHOLD.files
  );
}

// =============================================================================
// User Prompts
// =============================================================================

/**
 * Prompt user about untracked work
 */
async function promptForUntrackedWork(
  summary: SessionWorkSummary
): Promise<WorkReconciliationResult> {
  console.log('');
  console.log(chalk.yellow('📋 You have work that may not be tracked:'));

  if (summary.commits.length > 0) {
    console.log(chalk.dim(`   ${summary.commits.length} commit(s) in the last 24h`));
    // Show first commit message as context
    if (summary.commits[0]) {
      console.log(chalk.dim(`   Latest: "${summary.commits[0].message.slice(0, 50)}..."`));
    }
  }

  if (summary.modifiedFiles.length > 0) {
    console.log(chalk.dim(`   ${summary.modifiedFiles.length} modified file(s)`));
  }

  console.log('');

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'Would you like to track this work?',
    choices: [
      {
        title: 'Yes, create a quick task',
        description: 'Track this work with a simple description',
        value: 'track',
      },
      {
        title: 'No, skip this time',
        description: 'Continue without tracking',
        value: 'skip',
      },
    ],
  });

  if (action === undefined) {
    return {
      hasUntrackedWork: true,
      untrackedCommits: summary.commits.length,
      untrackedFiles: summary.modifiedFiles.length,
      userAction: 'cancelled',
    };
  }

  if (action === 'skip') {
    // Log that user skipped tracking
    await logEvent({
      category: 'decision',
      description: 'Skipped tracking untracked work at handoff',
      tags: ['handoff', 'untracked-work', 'skipped'],
      impact: 'low',
    }).catch(() => {});

    return {
      hasUntrackedWork: true,
      untrackedCommits: summary.commits.length,
      untrackedFiles: summary.modifiedFiles.length,
      userAction: 'skipped',
    };
  }

  // User wants to track - get description
  const { description } = await prompts({
    type: 'text',
    name: 'description',
    message: 'Brief description of the work:',
    initial: summary.commits[0]?.message.slice(0, 50) || '',
    validate: (v) => v.trim().length >= 5 ? true : 'Please provide a brief description',
  });

  if (!description) {
    return {
      hasUntrackedWork: true,
      untrackedCommits: summary.commits.length,
      untrackedFiles: summary.modifiedFiles.length,
      userAction: 'cancelled',
    };
  }

  // Create quick-fix task
  try {
    const result = await createQuickFixTask(description.trim());

    if (result.success && result.taskId) {
      console.log(chalk.green(`✓ Created: ${result.taskId}`));

      return {
        hasUntrackedWork: true,
        untrackedCommits: summary.commits.length,
        untrackedFiles: summary.modifiedFiles.length,
        userAction: 'tracked',
        taskCreated: result.taskId,
      };
    }
  } catch {
    console.log(chalk.dim('Task creation skipped (graph may not be initialized)'));
  }

  // Log the work even if task creation failed
  await logEvent({
    category: 'feature',
    description: `Handoff work: ${description}`,
    tags: ['handoff', 'untracked-work', 'logged'],
    impact: 'medium',
  }).catch(() => {});

  return {
    hasUntrackedWork: true,
    untrackedCommits: summary.commits.length,
    untrackedFiles: summary.modifiedFiles.length,
    userAction: 'tracked',
  };
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Check for untracked work and prompt user if significant
 *
 * Called during handoff to catch work that should be tracked.
 * Non-blocking - if user declines, handoff continues normally.
 *
 * @returns Reconciliation result with user's action
 */
export async function reconcileWork(): Promise<WorkReconciliationResult> {
  try {
    const summary = await getSessionWorkSummary();

    if (!hasSignificantUntrackedWork(summary)) {
      return {
        hasUntrackedWork: false,
        untrackedCommits: 0,
        untrackedFiles: 0,
        userAction: 'no-work',
      };
    }

    return await promptForUntrackedWork(summary);
  } catch (error) {
    // Non-critical - don't block handoff on reconciliation errors
    console.warn(chalk.dim('Work reconciliation skipped:'), error instanceof Error ? error.message : String(error));

    return {
      hasUntrackedWork: false,
      untrackedCommits: 0,
      untrackedFiles: 0,
      userAction: 'no-work',
    };
  }
}

/**
 * Quick check if reconciliation might be needed (for verbose output)
 */
export async function hasUntrackedWork(): Promise<boolean> {
  try {
    const summary = await getSessionWorkSummary();
    return hasSignificantUntrackedWork(summary);
  } catch {
    return false;
  }
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const __testing = {
  UNTRACKED_THRESHOLD,
  IGNORED_PATTERNS,
  getSessionWorkSummary,
  hasSignificantUntrackedWork,
};
