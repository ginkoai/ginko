/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-03-15
 * @tags: [session-health, context-pressure, degradation, epic-025]
 * @related: [context-metrics.ts, output-formatter.ts, health-checker.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [fs-extra]
 */

/**
 * Session Health Tier Calculation (EPIC-025 Sprint 4)
 *
 * Calculates a health tier from session metrics (message count, duration)
 * to surface context degradation risk to the human partner.
 *
 * The AI partner under cognitive load is the worst judge of its own
 * degradation — EPIC-024 proved this at ~40 messages / ~200K tokens.
 * The human needs the signal.
 *
 * Thresholds calibrated against EPIC-023/024 session data:
 * - EPIC-024: First deployment failure at ~35 messages, serial bug fixing at ~45
 * - EPIC-023: Context score drop at ~30 messages, CLI interop bugs at ~40
 *
 * Compression events: Claude Code does NOT emit hook events for /compact.
 * Message count + duration remain the primary degradation signals.
 */

import fs from 'fs-extra';
import path from 'path';

// =============================================================================
// Types
// =============================================================================

export type HealthTier = 'fresh' | 'steady' | 'verify-deploys' | 'handoff-recommended';

export interface HealthTierInfo {
  tier: HealthTier;
  icon: string;
  label: string;
  messageCount: number;
  durationMinutes: number;
}

export interface HealthThresholds {
  /** Messages threshold for steady tier */
  steadyMessages: number;
  /** Messages threshold for verify-deploys tier */
  verifyMessages: number;
  /** Messages threshold for handoff-recommended tier */
  handoffMessages: number;
  /** Duration (minutes) threshold for steady tier */
  steadyDurationMin: number;
  /** Duration (minutes) threshold for verify-deploys tier */
  verifyDurationMin: number;
  /** Duration (minutes) threshold for handoff-recommended tier */
  handoffDurationMin: number;
}

// =============================================================================
// Defaults
// =============================================================================

/**
 * Default thresholds calibrated against EPIC-023/024 session data.
 *
 * EPIC-024 (262K token session):
 *   - Deployment failures began at ~35 messages
 *   - Serial bug fixing pattern at ~45 messages
 *   - Subagent collision at ~50 messages
 *
 * EPIC-023 (multi-session analysis):
 *   - Context score degradation at ~30 messages
 *   - CLI interop bugs surfaced at ~40 messages
 *   - E2E walkthrough late verification at ~45 messages
 */
export const DEFAULT_THRESHOLDS: HealthThresholds = {
  steadyMessages: 15,
  verifyMessages: 35,
  handoffMessages: 50,
  steadyDurationMin: 60,
  verifyDurationMin: 180,
  handoffDurationMin: 300,
};

// =============================================================================
// Tier Calculation
// =============================================================================

/**
 * Calculate health tier from message count and session duration.
 *
 * Uses the higher of message-based or duration-based tier
 * (whichever indicates more pressure).
 */
export function calculateHealthTier(
  messageCount: number,
  durationMinutes: number,
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS
): HealthTierInfo {
  // Message-based tier
  let messageTier: HealthTier = 'fresh';
  if (messageCount >= thresholds.handoffMessages) {
    messageTier = 'handoff-recommended';
  } else if (messageCount >= thresholds.verifyMessages) {
    messageTier = 'verify-deploys';
  } else if (messageCount >= thresholds.steadyMessages) {
    messageTier = 'steady';
  }

  // Duration-based tier
  let durationTier: HealthTier = 'fresh';
  if (durationMinutes >= thresholds.handoffDurationMin) {
    durationTier = 'handoff-recommended';
  } else if (durationMinutes >= thresholds.verifyDurationMin) {
    durationTier = 'verify-deploys';
  } else if (durationMinutes >= thresholds.steadyDurationMin) {
    durationTier = 'steady';
  }

  // Use the higher (more concerning) tier
  const tierOrder: HealthTier[] = ['fresh', 'steady', 'verify-deploys', 'handoff-recommended'];
  const messageIdx = tierOrder.indexOf(messageTier);
  const durationIdx = tierOrder.indexOf(durationTier);
  const tier = tierOrder[Math.max(messageIdx, durationIdx)];

  return {
    tier,
    icon: getTierIcon(tier),
    label: getTierLabel(tier),
    messageCount,
    durationMinutes,
  };
}

function getTierIcon(tier: HealthTier): string {
  switch (tier) {
    case 'fresh': return '✅';
    case 'steady': return '◐';
    case 'verify-deploys': return '⚠️';
    case 'handoff-recommended': return '🔄';
  }
}

function getTierLabel(tier: HealthTier): string {
  switch (tier) {
    case 'fresh': return 'fresh';
    case 'steady': return 'steady';
    case 'verify-deploys': return 'verify deploys';
    case 'handoff-recommended': return 'handoff recommended';
  }
}

// =============================================================================
// Session Metrics Extraction
// =============================================================================

/**
 * Count messages in the current session from events JSONL.
 */
export async function getSessionMessageCount(projectRoot?: string): Promise<number> {
  try {
    const root = projectRoot || getProjectRoot();
    const sessionsDir = path.join(root, '.ginko', 'sessions');

    if (!await fs.pathExists(sessionsDir)) return 0;

    const dirs = await fs.readdir(sessionsDir);
    for (const dir of dirs) {
      const eventsFile = path.join(sessionsDir, dir, 'current-events.jsonl');
      if (await fs.pathExists(eventsFile)) {
        const content = await fs.readFile(eventsFile, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());

        // Count message-type events
        let count = 0;
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === 'message' || event.type === 'tool_call' ||
                event.type === 'context_score' || event.type === 'task_complete' ||
                event.type === 'task_start') {
              count++;
            }
          } catch {
            // Skip malformed lines
          }
        }

        return count || lines.length;
      }
    }
  } catch {
    // Metric extraction failure returns 0
  }
  return 0;
}

/**
 * Get session duration in minutes from session start timestamp.
 */
export async function getSessionDurationMinutes(projectRoot?: string): Promise<number> {
  try {
    const root = projectRoot || getProjectRoot();
    const sessionsDir = path.join(root, '.ginko', 'sessions');

    if (!await fs.pathExists(sessionsDir)) return 0;

    const dirs = await fs.readdir(sessionsDir);
    for (const dir of dirs) {
      const eventsFile = path.join(sessionsDir, dir, 'current-events.jsonl');
      if (await fs.pathExists(eventsFile)) {
        const content = await fs.readFile(eventsFile, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());

        if (lines.length === 0) return 0;

        // Find earliest timestamp
        let earliest: number | null = null;
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.timestamp) {
              const ts = new Date(event.timestamp).getTime();
              if (!earliest || ts < earliest) earliest = ts;
            }
          } catch {
            // Skip malformed lines
          }
        }

        if (earliest) {
          return Math.round((Date.now() - earliest) / 60000);
        }
      }
    }
  } catch {
    // Duration extraction failure returns 0
  }
  return 0;
}

/**
 * Load custom thresholds from .ginko/config.json if configured.
 */
export async function loadThresholds(projectRoot?: string): Promise<HealthThresholds> {
  try {
    const root = projectRoot || getProjectRoot();
    const configFile = path.join(root, '.ginko', 'config.json');

    if (await fs.pathExists(configFile)) {
      const config = await fs.readJson(configFile);
      if (config.healthThresholds) {
        return { ...DEFAULT_THRESHOLDS, ...config.healthThresholds };
      }
    }
  } catch {
    // Config load failure uses defaults
  }
  return DEFAULT_THRESHOLDS;
}

// =============================================================================
// Convenience
// =============================================================================

/**
 * Get current session health tier (all-in-one).
 */
export async function getCurrentHealthTier(projectRoot?: string): Promise<HealthTierInfo> {
  const [messageCount, durationMinutes, thresholds] = await Promise.all([
    getSessionMessageCount(projectRoot),
    getSessionDurationMinutes(projectRoot),
    loadThresholds(projectRoot),
  ]);

  return calculateHealthTier(messageCount, durationMinutes, thresholds);
}

/**
 * Format health tier for status line display.
 * Compact format: "12 msgs | ✅ fresh"
 */
export function formatHealthForStatusLine(info: HealthTierInfo): string {
  return `${info.messageCount} msgs | ${info.icon} ${info.label}`;
}

// =============================================================================
// Helpers
// =============================================================================

function getProjectRoot(): string {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}
