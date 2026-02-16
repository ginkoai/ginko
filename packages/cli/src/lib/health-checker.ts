/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-16
 * @tags: [health, adherence, process, supervision, EPIC-022]
 * @related: [sync-state.ts, ../core/session-log-manager.ts, ../commands/health.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, simple-git, glob]
 */

/**
 * Health Checker Module (EPIC-022)
 *
 * Reusable health check runner that aggregates local data sources
 * into structured adherence results. Used by:
 * - `ginko health` command (full report)
 * - `ginko task complete` (one-line nudge)
 * - `ginko handoff` (summary before handoff)
 */

import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import glob from 'glob';
import { promisify } from 'util';
import { getUserEmail, getGinkoDir, getProjectRoot, formatTimeAgo } from '../utils/helpers.js';
import { readSyncState } from './sync-state.js';
import { SessionLogManager } from '../core/session-log-manager.js';
import { getUnpushedCount } from './git-change-detector.js';

const globAsync = promisify(glob);

// ── Types ────────────────────────────────────────────────────────

export interface HealthCheckItem {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  fix?: string;
}

export interface HealthCategory {
  name: string;
  icon: string;
  items: HealthCheckItem[];
}

export interface HealthResult {
  categories: HealthCategory[];
  adherence: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  totalChecks: number;
}

// ── Main Runner ──────────────────────────────────────────────────

/**
 * Run all health checks and return structured results.
 * All checks are local-only (no cloud dependency).
 */
export async function runHealthChecks(): Promise<HealthResult> {
  const ginkoDir = await getGinkoDir();
  const projectRoot = await getProjectRoot();
  const userEmail = await getUserEmail();
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  const sessionDir = path.join(ginkoDir, 'sessions', userSlug);

  const categories: HealthCategory[] = [];

  categories.push(await checkTracking(ginkoDir, projectRoot, sessionDir));
  categories.push(await checkCompletion(projectRoot, sessionDir));
  categories.push(await checkSync());
  categories.push(await checkSessionLogs(sessionDir));
  categories.push(await checkGit());

  // Calculate score
  let totalChecks = 0;
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const cat of categories) {
    for (const item of cat.items) {
      totalChecks++;
      if (item.status === 'pass') passCount++;
      else if (item.status === 'warn') warnCount++;
      else failCount++;
    }
  }

  const adherence = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;

  return { categories, adherence, passCount, warnCount, failCount, totalChecks };
}

// ── Tracking Checks ──────────────────────────────────────────────

async function checkTracking(
  ginkoDir: string,
  projectRoot: string,
  sessionDir: string,
): Promise<HealthCategory> {
  const items: HealthCheckItem[] = [];

  const sprintPath = path.join(sessionDir, 'current-sprint.json');
  let currentSprint: any = null;

  if (await fs.pathExists(sprintPath)) {
    try {
      currentSprint = await fs.readJSON(sprintPath);
    } catch {
      // corrupt file
    }
  }

  if (!currentSprint || !currentSprint.sprintId) {
    items.push({
      label: 'Active sprint',
      status: 'warn',
      detail: 'No active sprint assigned',
      fix: 'Run `ginko sprint create` or `ginko sprint quick-fix "<description>"`',
    });
    return { name: 'Tracking', icon: '📋', items };
  }

  // Check for epic file
  const epicId = currentSprint.epicId;
  if (epicId) {
    const epicFiles = await globAsync(path.join(projectRoot, `docs/epics/EPIC-*${epicId}*.md`));
    const epicNum = epicId.replace(/^e0*/, '').replace(/^EPIC-0*/, '');
    const epicFilesAlt = await globAsync(path.join(projectRoot, `docs/epics/EPIC-${epicNum.padStart(3, '0')}*.md`));
    const allEpicFiles = [...new Set([...epicFiles, ...epicFilesAlt])];

    if (allEpicFiles.length > 0) {
      items.push({
        label: 'Epic file',
        status: 'pass',
        detail: allEpicFiles[0],
      });
    } else {
      items.push({
        label: 'Epic file',
        status: 'fail',
        detail: `No file found for epic ${epicId}`,
        fix: 'Create epic file in docs/epics/ or run `ginko epic`',
      });
    }
  }

  // Check for sprint file
  const sprintId = currentSprint.sprintId;
  const sprintFiles = await globAsync(path.join(projectRoot, 'docs/sprints/SPRINT-*.md'));
  const matchingSprint = sprintFiles.find((f: string) => {
    const basename = path.basename(f).toLowerCase();
    const normalizedId = sprintId.replace(/_/g, '-').toLowerCase();
    return basename.includes(normalizedId) || basename.includes(sprintId.toLowerCase());
  });

  if (matchingSprint) {
    items.push({
      label: 'Sprint file',
      status: 'pass',
      detail: matchingSprint,
    });
  } else if (currentSprint.sprintFile && await fs.pathExists(path.join(projectRoot, currentSprint.sprintFile))) {
    items.push({
      label: 'Sprint file',
      status: 'pass',
      detail: currentSprint.sprintFile,
    });
  } else {
    items.push({
      label: 'Sprint file',
      status: 'fail',
      detail: `No file found for sprint ${sprintId}`,
      fix: 'Create sprint file in docs/sprints/',
    });
  }

  return { name: 'Tracking', icon: '📋', items };
}

// ── Completion Checks ────────────────────────────────────────────

async function checkCompletion(projectRoot: string, sessionDir: string): Promise<HealthCategory> {
  const items: HealthCheckItem[] = [];

  // Scope to current sprint context, not all historical sprints
  const sprintPath = path.join(sessionDir, 'current-sprint.json');
  let currentSprintId: string | null = null;
  let currentEpicId: string | null = null;

  if (await fs.pathExists(sprintPath)) {
    try {
      const sprintData = await fs.readJSON(sprintPath);
      currentSprintId = sprintData.sprintId || null;
      currentEpicId = sprintData.epicId || null;
    } catch {
      // ignore
    }
  }

  // Find sprint files for the current epic (scoped, not all history)
  const allSprintFiles = await globAsync(path.join(projectRoot, 'docs/sprints/SPRINT-*.md'));
  const activeSprintFiles = allSprintFiles.filter((f: string) => {
    if (f.includes('archive')) return false;
    // If we have a current epic, scope to its sprints
    if (currentEpicId) {
      const basename = path.basename(f).toLowerCase();
      const normalizedEpic = currentEpicId.replace(/_/g, '-').toLowerCase();
      return basename.includes(normalizedEpic) || basename.includes(currentEpicId.toLowerCase());
    }
    return false; // No active epic — don't scan all history
  });

  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let notStartedTasks = 0;
  let sprintsNotMarked = 0;

  for (const sprintFile of activeSprintFiles) {
    let content: string;
    try {
      content = await fs.readFile(sprintFile, 'utf8');
    } catch {
      continue;
    }

    const completed = (content.match(/\[x\]/gi) || []).length;
    const inProgress = (content.match(/\[@\]/g) || []).length;
    const notStarted = (content.match(/\[ \]/g) || []).length;
    const sprintTotal = completed + inProgress + notStarted;

    if (sprintTotal === 0) continue;

    totalTasks += sprintTotal;
    completedTasks += completed;
    inProgressTasks += inProgress;
    notStartedTasks += notStarted;

    if (completed === sprintTotal && sprintTotal > 0) {
      const progressMatch = content.match(/Progress:?\s*(\d+)%/i);
      if (!progressMatch || parseInt(progressMatch[1]) < 100) {
        sprintsNotMarked++;
      }
    }
  }

  if (totalTasks === 0) {
    items.push({
      label: 'Tasks',
      status: 'warn',
      detail: 'No tasks found in sprint files',
      fix: 'Add tasks to your sprint file or run `ginko sprint create`',
    });
  } else {
    if (completedTasks === totalTasks) {
      items.push({
        label: 'Tasks',
        status: 'pass',
        detail: `${completedTasks}/${totalTasks} tasks marked complete`,
      });
    } else {
      items.push({
        label: 'Tasks',
        status: inProgressTasks > 0 || completedTasks > 0 ? 'warn' : 'pass',
        detail: `${completedTasks} complete, ${inProgressTasks} in progress, ${notStartedTasks} not started (${totalTasks} total)`,
      });
    }

    if (sprintsNotMarked > 0) {
      items.push({
        label: 'Sprint completion',
        status: 'fail',
        detail: `${sprintsNotMarked} sprint(s) with all tasks done but NOT MARKED COMPLETE`,
        fix: 'Run `ginko sprint complete <sprint_id>` or update sprint progress to 100%',
      });
    }
  }

  return { name: 'Completion', icon: '✅', items };
}

// ── Sync Checks ──────────────────────────────────────────────────

async function checkSync(): Promise<HealthCategory> {
  const items: HealthCheckItem[] = [];

  try {
    const syncState = await readSyncState();
    const now = Date.now();

    // Push staleness
    if (syncState.lastPushTimestamp) {
      const pushAge = now - new Date(syncState.lastPushTimestamp).getTime();
      const pushDays = Math.floor(pushAge / (1000 * 60 * 60 * 24));

      if (pushDays >= 7) {
        items.push({
          label: 'Last push',
          status: 'fail',
          detail: `${formatTimeAgo(new Date(syncState.lastPushTimestamp))} (critically stale)`,
          fix: 'Run `ginko push` to sync changes to graph',
        });
      } else if (pushDays >= 1) {
        items.push({
          label: 'Last push',
          status: 'warn',
          detail: formatTimeAgo(new Date(syncState.lastPushTimestamp)),
          fix: 'Run `ginko push` to sync changes to graph',
        });
      } else {
        items.push({
          label: 'Last push',
          status: 'pass',
          detail: formatTimeAgo(new Date(syncState.lastPushTimestamp)),
        });
      }
    } else {
      items.push({
        label: 'Last push',
        status: 'fail',
        detail: 'Never pushed',
        fix: 'Run `ginko push` to sync changes to graph',
      });
    }

    // Pull staleness
    if (syncState.lastPullTimestamp) {
      const pullAge = now - new Date(syncState.lastPullTimestamp).getTime();
      const pullDays = Math.floor(pullAge / (1000 * 60 * 60 * 24));

      if (pullDays >= 7) {
        items.push({
          label: 'Last pull',
          status: 'fail',
          detail: `${formatTimeAgo(new Date(syncState.lastPullTimestamp))} (critically stale)`,
          fix: 'Run `ginko pull` to pull team updates',
        });
      } else if (pullDays >= 1) {
        items.push({
          label: 'Last pull',
          status: 'warn',
          detail: formatTimeAgo(new Date(syncState.lastPullTimestamp)),
          fix: 'Run `ginko pull` to pull team updates',
        });
      } else {
        items.push({
          label: 'Last pull',
          status: 'pass',
          detail: formatTimeAgo(new Date(syncState.lastPullTimestamp)),
        });
      }
    } else {
      items.push({
        label: 'Last pull',
        status: 'warn',
        detail: 'Never pulled (OK if working solo)',
      });
    }

    // Unpushed changes
    try {
      const unpushed = await getUnpushedCount(syncState.lastPushCommit);
      if (unpushed > 0) {
        items.push({
          label: 'Pending changes',
          status: 'warn',
          detail: `${unpushed} file(s) not yet pushed to graph`,
          fix: 'Run `ginko push` to sync',
        });
      } else {
        items.push({
          label: 'Pending changes',
          status: 'pass',
          detail: '0 (up to date)',
        });
      }
    } catch {
      // Skip if git detection fails
    }

  } catch {
    items.push({
      label: 'Sync state',
      status: 'warn',
      detail: 'Could not read sync state (local-only mode)',
    });
  }

  return { name: 'Graph Sync', icon: '🔄', items };
}

// ── Session Log Checks ───────────────────────────────────────────

async function checkSessionLogs(sessionDir: string): Promise<HealthCategory> {
  const items: HealthCheckItem[] = [];

  const hasLog = await SessionLogManager.hasSessionLog(sessionDir);

  if (!hasLog) {
    items.push({
      label: 'Session log',
      status: 'warn',
      detail: 'No active session log',
      fix: 'Run `ginko start` to initialize session logging',
    });
    return { name: 'Session Logs', icon: '📝', items };
  }

  const logContent = await SessionLogManager.loadSessionLog(sessionDir);
  const summary = SessionLogManager.getSummary(logContent);

  if (summary.totalEntries === 0) {
    items.push({
      label: 'Log entries',
      status: 'warn',
      detail: 'Session log exists but has 0 entries',
      fix: 'Use `ginko log "<description>" --category=<type>` to capture decisions and insights',
    });
  } else {
    const categories = Object.entries(summary.byCategory)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(', ');
    items.push({
      label: 'Log entries',
      status: 'pass',
      detail: `${summary.totalEntries} entries (${categories})`,
    });
  }

  const decisions = summary.byCategory['decision'] || 0;
  if (decisions === 0) {
    items.push({
      label: 'Decisions logged',
      status: 'warn',
      detail: 'No decisions captured this session',
      fix: 'Run `ginko log "your decision" --category=decision` after key choices',
    });
  } else {
    items.push({
      label: 'Decisions logged',
      status: 'pass',
      detail: `${decisions} decision(s) captured`,
    });
  }

  // Check for context score
  const eventsPath = path.join(sessionDir, 'current-events.jsonl');
  let hasContextScore = false;

  if (await fs.pathExists(path.join(sessionDir, 'context-scores.json'))) {
    hasContextScore = true;
  } else if (await fs.pathExists(eventsPath)) {
    try {
      const events = await fs.readFile(eventsPath, 'utf8');
      hasContextScore = events.includes('context_score') || events.includes('context-score');
    } catch {
      // skip
    }
  }

  if (!hasContextScore) {
    items.push({
      label: 'Context score',
      status: 'warn',
      detail: 'Not recorded this session',
      fix: 'Run `ginko context score 8,7,9,6` to rate your context clarity',
    });
  } else {
    items.push({
      label: 'Context score',
      status: 'pass',
      detail: 'Recorded',
    });
  }

  return { name: 'Session Logs', icon: '📝', items };
}

// ── Git Checks ───────────────────────────────────────────────────

async function checkGit(): Promise<HealthCategory> {
  const items: HealthCheckItem[] = [];
  const git = simpleGit();

  try {
    const gitStatus = await git.status();
    const totalUncommitted =
      gitStatus.modified.length +
      gitStatus.staged.length +
      gitStatus.not_added.length +
      gitStatus.deleted.length;

    if (totalUncommitted === 0) {
      items.push({
        label: 'Working tree',
        status: 'pass',
        detail: 'Clean',
      });
    } else if (totalUncommitted > 20) {
      items.push({
        label: 'Working tree',
        status: 'warn',
        detail: `${totalUncommitted} uncommitted files (${gitStatus.staged.length} staged, ${gitStatus.modified.length} modified, ${gitStatus.not_added.length} untracked)`,
        fix: 'Consider committing related changes',
      });
    } else {
      items.push({
        label: 'Working tree',
        status: 'pass',
        detail: `${totalUncommitted} uncommitted files`,
      });
    }

    const branch = await git.branchLocal();
    items.push({
      label: 'Branch',
      status: 'pass',
      detail: branch.current,
    });

  } catch {
    items.push({
      label: 'Git',
      status: 'warn',
      detail: 'Could not read git status',
    });
  }

  return { name: 'Git', icon: '🌳', items };
}
