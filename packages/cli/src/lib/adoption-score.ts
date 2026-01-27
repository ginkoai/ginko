/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-26
 * @tags: [adoption, coaching, behavior, quieting, epic-016-s04]
 * @related: [planning-menu.ts, user-sprint.ts, insights/index.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [fs-extra, path]
 */

/**
 * Behavior-Based Quieting (EPIC-016 Sprint 4 t05)
 *
 * Tracks pattern adoption signals and adjusts planning menu verbosity.
 *
 * Signals of Adoption:
 * | User Behavior                    | Points |
 * |----------------------------------|--------|
 * | "What's our next task?"          | +1     |
 * | "Let's continue Sprint X"        | +1     |
 * | `ginko sprint` unprompted        | +2     |
 * | Selects [d] Something else       | +0     |
 * | 3+ consecutive ad-hoc sessions   | reset  |
 *
 * Quieting Levels:
 * - 0-5 points: Full prompts (default for new users)
 * - 6-15 points: Lighter prompts (briefer menu)
 * - 16+ points: Minimal prompts (only when truly unstructured)
 */

import fs from 'fs-extra';
import path from 'path';
import { getUserEmail, getGinkoDir } from '../utils/helpers.js';

// =============================================================================
// Types
// =============================================================================

export type AdoptionSignal =
  | 'asked_next_task'      // "What's our next task?" +1
  | 'continued_sprint'     // "Let's continue Sprint X" +1
  | 'created_sprint'       // ginko sprint unprompted +2
  | 'created_epic'         // ginko epic +2
  | 'used_quick_fix'       // Used quick-fix flow +1
  | 'chose_adhoc'          // Chose ad-hoc from menu +0
  | 'completed_task'       // Completed a tracked task +1
  | 'adhoc_streak';        // 3+ consecutive ad-hoc: reset

export type QuietingLevel = 'full' | 'light' | 'minimal';

export interface AdoptionScore {
  score: number;
  level: QuietingLevel;
  history: Array<{
    date: string;
    signal: AdoptionSignal;
    points: number;
  }>;
  lastUpdated: string;
}

// =============================================================================
// Constants
// =============================================================================

const ADOPTION_FILE = 'adoption-score.json';

const SIGNAL_POINTS: Record<AdoptionSignal, number> = {
  'asked_next_task': 1,
  'continued_sprint': 1,
  'created_sprint': 2,
  'created_epic': 2,
  'used_quick_fix': 1,
  'chose_adhoc': 0,
  'completed_task': 1,
  'adhoc_streak': -999,  // Special: resets score
};

const LEVEL_THRESHOLDS = {
  minimal: 16,  // 16+ points
  light: 6,     // 6-15 points
  full: 0,      // 0-5 points
};

// =============================================================================
// Score Management
// =============================================================================

/**
 * Get path to user's adoption score file
 */
async function getAdoptionFilePath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const userEmail = await getUserEmail();
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  return path.join(ginkoDir, 'sessions', userSlug, ADOPTION_FILE);
}

/**
 * Load user's adoption score
 */
export async function getAdoptionScore(): Promise<AdoptionScore> {
  const filePath = await getAdoptionFilePath();

  try {
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJSON(filePath);
      return {
        score: data.score || 0,
        level: calculateLevel(data.score || 0),
        history: data.history || [],
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    }
  } catch {
    // Return default if file is corrupted
  }

  return {
    score: 0,
    level: 'full',
    history: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save user's adoption score
 */
async function saveAdoptionScore(score: AdoptionScore): Promise<void> {
  const filePath = await getAdoptionFilePath();
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJSON(filePath, score, { spaces: 2 });
}

/**
 * Calculate quieting level from score
 */
function calculateLevel(score: number): QuietingLevel {
  if (score >= LEVEL_THRESHOLDS.minimal) return 'minimal';
  if (score >= LEVEL_THRESHOLDS.light) return 'light';
  return 'full';
}

// =============================================================================
// Signal Recording
// =============================================================================

/**
 * Record an adoption signal
 *
 * @param signal - The adoption signal to record
 * @returns Updated adoption score
 */
export async function recordAdoptionSignal(
  signal: AdoptionSignal
): Promise<AdoptionScore> {
  const current = await getAdoptionScore();
  const points = SIGNAL_POINTS[signal];

  // Special case: adhoc_streak resets score
  if (signal === 'adhoc_streak') {
    current.score = 0;
    current.history = [];
  } else {
    current.score = Math.max(0, current.score + points);

    // Keep last 50 history entries
    current.history.push({
      date: new Date().toISOString(),
      signal,
      points,
    });
    if (current.history.length > 50) {
      current.history = current.history.slice(-50);
    }
  }

  current.level = calculateLevel(current.score);
  current.lastUpdated = new Date().toISOString();

  await saveAdoptionScore(current);
  return current;
}

/**
 * Check if ad-hoc streak should reset score
 *
 * @param consecutiveAdhocSessions - Number of consecutive ad-hoc sessions
 * @returns true if score was reset
 */
export async function checkAdhocStreak(
  consecutiveAdhocSessions: number
): Promise<boolean> {
  if (consecutiveAdhocSessions >= 3) {
    await recordAdoptionSignal('adhoc_streak');
    return true;
  }
  return false;
}

// =============================================================================
// Planning Menu Customization
// =============================================================================

export interface PlanningMenuConfig {
  showFullDescription: boolean;  // Show detailed option descriptions
  showCoachingTip: boolean;      // Show "You've had X ad-hoc sessions" message
  showCelebration: boolean;      // Show "Great job staying organized!" message
}

/**
 * Get planning menu configuration based on adoption level
 */
export async function getPlanningMenuConfig(): Promise<PlanningMenuConfig> {
  const { level, score } = await getAdoptionScore();

  switch (level) {
    case 'minimal':
      // High adopters: minimal prompts
      return {
        showFullDescription: false,
        showCoachingTip: false,
        showCelebration: score >= 20,  // Celebrate high adopters occasionally
      };

    case 'light':
      // Medium adopters: lighter prompts
      return {
        showFullDescription: true,
        showCoachingTip: false,
        showCelebration: false,
      };

    case 'full':
    default:
      // New/low adopters: full coaching
      return {
        showFullDescription: true,
        showCoachingTip: true,
        showCelebration: false,
      };
  }
}

/**
 * Get a brief status message for the adoption score
 * Used in `ginko insights` output
 */
export async function getAdoptionStatus(): Promise<string> {
  const { score, level } = await getAdoptionScore();

  const levelEmoji = {
    full: '🌱',      // Growing
    light: '🌿',     // Established
    minimal: '🌳',   // Mature
  };

  return `${levelEmoji[level]} Pattern Adoption: ${score} points (${level} prompts)`;
}

// =============================================================================
// Exports
// =============================================================================

export const __testing = {
  SIGNAL_POINTS,
  LEVEL_THRESHOLDS,
  calculateLevel,
};
