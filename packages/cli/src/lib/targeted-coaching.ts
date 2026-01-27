/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-26
 * @tags: [coaching, insights, targeted, adaptive, epic-016-s05]
 * @related: [coaching-level.ts, start-reflection.ts, handoff.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

/**
 * Targeted Coaching Elaborations (EPIC-016 Sprint 5 Task 3)
 *
 * When a specific metric is low, provides focused coaching in that area.
 *
 * Metric-Specific Coaching:
 * | Low Metric           | Coaching Focus                                          |
 * |----------------------|---------------------------------------------------------|
 * | Session Efficiency   | "Consider using `ginko handoff` to preserve context"    |
 * | Pattern Adoption     | Extra guidance on Epic→Sprint→Task structure            |
 * | Collaboration Quality| Prompts about logging decisions, handoff quality        |
 * | Anti-Patterns        | Specific warnings about detected anti-patterns          |
 *
 * Features:
 * - Track which tips shown to avoid repetition
 * - Inject tips at relevant moments (start, handoff)
 * - No tip spam (shown once per session max)
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getUserEmail, getGinkoDir } from '../utils/helpers.js';
import { CoachingContext, isMetricLow } from './coaching-level.js';
import { logTargetedTipShown } from './event-logger.js';

// =============================================================================
// Types
// =============================================================================

export type MetricType = 'sessionEfficiency' | 'patternAdoption' | 'collaborationQuality' | 'antiPatterns';
export type CoachingContext_Type = 'start' | 'handoff' | 'task_complete' | 'planning';

export interface CoachingTip {
  id: string;
  metric: MetricType;
  context: CoachingContext_Type[];
  message: string;
  action?: string;
  priority: number; // Higher priority shown first
}

export interface ShownTipsRecord {
  sessionId: string;
  shownTipIds: string[];
  lastUpdated: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIPS_RECORD_FILE = 'shown-tips.json';
const LOW_THRESHOLD = 70;

/**
 * All available coaching tips organized by metric
 */
export const COACHING_TIPS: CoachingTip[] = [
  // Session Efficiency Tips
  {
    id: 'efficiency-handoff',
    metric: 'sessionEfficiency',
    context: ['start', 'handoff'],
    message: 'Consider using `ginko handoff` to preserve context between sessions',
    action: 'ginko handoff',
    priority: 10,
  },
  {
    id: 'efficiency-context-loading',
    metric: 'sessionEfficiency',
    context: ['start'],
    message: 'Sessions with good handoffs start 40% faster on average',
    priority: 5,
  },
  {
    id: 'efficiency-log-decisions',
    metric: 'sessionEfficiency',
    context: ['handoff'],
    message: 'Log key decisions with `ginko log` before handoff for better context transfer',
    action: 'ginko log',
    priority: 8,
  },

  // Pattern Adoption Tips
  {
    id: 'patterns-structure',
    metric: 'patternAdoption',
    context: ['start', 'planning'],
    message: 'Try organizing work into Epic→Sprint→Task structure for better tracking',
    priority: 10,
  },
  {
    id: 'patterns-sprint-create',
    metric: 'patternAdoption',
    context: ['planning'],
    message: 'Use `ginko sprint create` to break down work into trackable tasks',
    action: 'ginko sprint create',
    priority: 8,
  },
  {
    id: 'patterns-quick-fix',
    metric: 'patternAdoption',
    context: ['start'],
    message: 'For small fixes, try `ginko sprint qf "description"` for minimal tracking overhead',
    action: 'ginko sprint qf',
    priority: 6,
  },

  // Collaboration Quality Tips
  {
    id: 'quality-log-decisions',
    metric: 'collaborationQuality',
    context: ['start', 'task_complete'],
    message: 'Log important decisions with `ginko log` to help future collaborators',
    action: 'ginko log',
    priority: 10,
  },
  {
    id: 'quality-handoff-content',
    metric: 'collaborationQuality',
    context: ['handoff'],
    message: 'Include what you learned, not just what you did, in handoffs',
    priority: 8,
  },
  {
    id: 'quality-team-sync',
    metric: 'collaborationQuality',
    context: ['start'],
    message: 'Run `ginko sync` periodically to stay aligned with team updates',
    action: 'ginko sync',
    priority: 6,
  },

  // Anti-Patterns Tips
  {
    id: 'antipatterns-review',
    metric: 'antiPatterns',
    context: ['start'],
    message: 'Review recent gotcha warnings - you may be hitting known issues',
    priority: 10,
  },
  {
    id: 'antipatterns-patterns',
    metric: 'antiPatterns',
    context: ['start', 'task_complete'],
    message: 'Check task patterns with `ginko graph explore <task-id>` for guidance',
    action: 'ginko graph explore',
    priority: 8,
  },
  {
    id: 'antipatterns-adr',
    metric: 'antiPatterns',
    context: ['start'],
    message: 'ADR constraints on your current task may help avoid common pitfalls',
    priority: 6,
  },
];

// =============================================================================
// Shown Tips Tracking
// =============================================================================

async function getShownTipsPath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const userEmail = await getUserEmail();
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  return path.join(ginkoDir, 'sessions', userSlug, TIPS_RECORD_FILE);
}

async function loadShownTips(): Promise<ShownTipsRecord> {
  const filePath = await getShownTipsPath();

  try {
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJSON(filePath);

      // Check if this is the same session (within 8 hours)
      const lastUpdated = new Date(data.lastUpdated).getTime();
      const now = Date.now();
      const eightHours = 8 * 60 * 60 * 1000;

      if (now - lastUpdated < eightHours) {
        return data;
      }
    }
  } catch {
    // File corrupted or invalid
  }

  // Start fresh session
  return {
    sessionId: generateSessionId(),
    shownTipIds: [],
    lastUpdated: new Date().toISOString(),
  };
}

async function saveShownTips(record: ShownTipsRecord): Promise<void> {
  const filePath = await getShownTipsPath();
  await fs.ensureDir(path.dirname(filePath));
  record.lastUpdated = new Date().toISOString();
  await fs.writeJSON(filePath, record, { spaces: 2 });
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function markTipAsShown(tipId: string): Promise<void> {
  const record = await loadShownTips();
  if (!record.shownTipIds.includes(tipId)) {
    record.shownTipIds.push(tipId);
    await saveShownTips(record);
  }
}

async function isTipShown(tipId: string): Promise<boolean> {
  const record = await loadShownTips();
  return record.shownTipIds.includes(tipId);
}

// =============================================================================
// Tip Selection
// =============================================================================

/**
 * Get applicable tips for a given context and coaching context
 *
 * @param coachingCtx - Coaching context with metric scores
 * @param context - Current context (start, handoff, etc.)
 * @param limit - Maximum number of tips to return
 * @returns Array of applicable tips, prioritized
 */
export async function getApplicableTips(
  coachingCtx: CoachingContext,
  context: CoachingContext_Type,
  limit: number = 1
): Promise<CoachingTip[]> {
  // Only show tips in supportive or standard mode
  if (coachingCtx.level === 'minimal') {
    return [];
  }

  const applicableTips: CoachingTip[] = [];

  // Find tips for low metrics
  for (const tip of COACHING_TIPS) {
    // Check if tip applies to this context
    if (!tip.context.includes(context)) {
      continue;
    }

    // Check if the metric is low
    const metricValue = getMetricValue(coachingCtx, tip.metric);
    if (!isMetricLow(metricValue, LOW_THRESHOLD)) {
      continue;
    }

    // Check if already shown this session
    if (await isTipShown(tip.id)) {
      continue;
    }

    applicableTips.push(tip);
  }

  // Sort by priority (highest first) and limit
  return applicableTips
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

function getMetricValue(ctx: CoachingContext, metric: MetricType): number {
  switch (metric) {
    case 'sessionEfficiency':
      return ctx.metrics.sessionEfficiency;
    case 'patternAdoption':
      return ctx.metrics.patternAdoption;
    case 'collaborationQuality':
      return ctx.metrics.collaborationQuality;
    case 'antiPatterns':
      return ctx.metrics.antiPatterns;
  }
}

// =============================================================================
// Display Functions
// =============================================================================

/**
 * Display a coaching tip to the console
 */
export function displayTip(tip: CoachingTip): void {
  const icon = getTipIcon(tip.metric);
  console.log(chalk.cyan(`${icon} Coaching tip:`));
  console.log(chalk.white(`   ${tip.message}`));
  if (tip.action) {
    console.log(chalk.dim(`   Try: ${tip.action}`));
  }
  console.log('');
}

/**
 * Show targeted coaching tips for the current context
 *
 * @param coachingCtx - Coaching context with metric scores
 * @param context - Current context
 * @returns Number of tips shown
 */
export async function showTargetedCoaching(
  coachingCtx: CoachingContext,
  context: CoachingContext_Type
): Promise<number> {
  const tips = await getApplicableTips(coachingCtx, context);

  for (const tip of tips) {
    displayTip(tip);
    await markTipAsShown(tip.id);

    // EPIC-016 Sprint 5 t05: Log tip shown for feedback loop
    logTargetedTipShown(tip.id, tip.metric, coachingCtx.level).catch(() => {
      // Non-critical - don't fail on logging errors
    });
  }

  return tips.length;
}

/**
 * Get coaching tip for a specific metric (for inline use)
 */
export async function getTipForMetric(
  coachingCtx: CoachingContext,
  metric: MetricType,
  context: CoachingContext_Type
): Promise<string | null> {
  const tips = await getApplicableTips(coachingCtx, context);
  const tip = tips.find(t => t.metric === metric);
  return tip ? tip.message : null;
}

function getTipIcon(metric: MetricType): string {
  switch (metric) {
    case 'sessionEfficiency':
      return '⚡';
    case 'patternAdoption':
      return '📋';
    case 'collaborationQuality':
      return '🤝';
    case 'antiPatterns':
      return '⚠️';
  }
}

// =============================================================================
// Metric Display Names
// =============================================================================

export const METRIC_DISPLAY_NAMES: Record<MetricType, string> = {
  sessionEfficiency: 'Session Efficiency',
  patternAdoption: 'Pattern Adoption',
  collaborationQuality: 'Collaboration Quality',
  antiPatterns: 'Anti-Patterns',
};

// =============================================================================
// Testing Exports
// =============================================================================

export const __testing = {
  LOW_THRESHOLD,
  loadShownTips,
  saveShownTips,
  markTipAsShown,
  isTipShown,
  getMetricValue,
};
