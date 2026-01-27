/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-26
 * @tags: [coaching, insights, adaptive, epic-016-s05]
 * @related: [adoption-score.ts, planning-menu.ts, api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

/**
 * Adaptive Coaching Level (EPIC-016 Sprint 5 Task 1)
 *
 * Coaching adapts to user's insight scores—more help when struggling, quieter when thriving.
 *
 * Score Thresholds (based on 7-day overall score):
 * | Overall Score | Coaching Level | Behavior                          |
 * |---------------|----------------|-----------------------------------|
 * | ≥75           | Minimal        | Brief prompts, assume competence  |
 * | 60-74         | Standard       | Normal prompts with guidance      |
 * | <60           | Supportive     | Detailed prompts, more examples   |
 *
 * Data Flow:
 * 1. Fetch insight scores from dashboard API at session start
 * 2. Cache locally with 4-hour TTL
 * 3. Fall back to local adoption score if offline
 */

import fs from 'fs-extra';
import path from 'path';
import { getUserEmail, getGinkoDir } from '../utils/helpers.js';
import { getAdoptionScore, QuietingLevel } from './adoption-score.js';

// =============================================================================
// Types
// =============================================================================

export type CoachingLevel = 'minimal' | 'standard' | 'supportive';

export interface CoachingContext {
  overallScore: number;
  metrics: {
    sessionEfficiency: number;
    patternAdoption: number;
    collaborationQuality: number;
    antiPatterns: number;
  };
  level: CoachingLevel;
  override: CoachingLevel | null;
  source: 'dashboard' | 'cache' | 'adoption_fallback';
  cacheAge?: number; // minutes since cache
}

export interface InsightScores {
  overallScore: number;
  categoryScores: {
    efficiency: number;
    patterns: number;
    quality: number;
    'anti-patterns': number;
  };
  fetchedAt: string;
  periodDays: number;
}

export interface CoachingConfig {
  override: CoachingLevel | null;
  overrideSetAt: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const CACHE_FILE = 'insights-cache.json';
const CONFIG_FILE = 'coaching-config.json';
const CACHE_TTL_HOURS = 4;
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

const LEVEL_THRESHOLDS = {
  minimal: 75,   // ≥75: assume competence
  standard: 60,  // 60-74: balanced guidance
  // <60: supportive
};

// =============================================================================
// File Paths
// =============================================================================

async function getUserSessionDir(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const userEmail = await getUserEmail();
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  return path.join(ginkoDir, 'sessions', userSlug);
}

async function getCacheFilePath(): Promise<string> {
  const sessionDir = await getUserSessionDir();
  return path.join(sessionDir, CACHE_FILE);
}

async function getConfigFilePath(): Promise<string> {
  const sessionDir = await getUserSessionDir();
  return path.join(sessionDir, CONFIG_FILE);
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Load cached insight scores
 */
async function loadCachedScores(): Promise<InsightScores | null> {
  const cachePath = await getCacheFilePath();

  try {
    if (await fs.pathExists(cachePath)) {
      const data = await fs.readJSON(cachePath);
      const fetchedAt = new Date(data.fetchedAt).getTime();
      const now = Date.now();

      // Check if cache is still valid
      if (now - fetchedAt < CACHE_TTL_MS) {
        return data as InsightScores;
      }
    }
  } catch {
    // Cache corrupted or invalid
  }

  return null;
}

/**
 * Save insight scores to cache
 */
async function saveCachedScores(scores: InsightScores): Promise<void> {
  const cachePath = await getCacheFilePath();
  await fs.ensureDir(path.dirname(cachePath));
  await fs.writeJSON(cachePath, scores, { spaces: 2 });
}

/**
 * Get cache age in minutes
 */
function getCacheAgeMinutes(fetchedAt: string): number {
  const fetchedTime = new Date(fetchedAt).getTime();
  const now = Date.now();
  return Math.round((now - fetchedTime) / (1000 * 60));
}

// =============================================================================
// Config Management
// =============================================================================

/**
 * Load coaching config (manual overrides)
 */
export async function loadCoachingConfig(): Promise<CoachingConfig> {
  const configPath = await getConfigFilePath();

  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJSON(configPath);
    }
  } catch {
    // Config corrupted
  }

  return {
    override: null,
    overrideSetAt: null,
  };
}

/**
 * Save coaching config
 */
export async function saveCoachingConfig(config: CoachingConfig): Promise<void> {
  const configPath = await getConfigFilePath();
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJSON(configPath, config, { spaces: 2 });
}

/**
 * Set manual coaching level override
 */
export async function setCoachingOverride(level: CoachingLevel | 'auto'): Promise<void> {
  const config = await loadCoachingConfig();

  if (level === 'auto') {
    config.override = null;
    config.overrideSetAt = null;
  } else {
    config.override = level;
    config.overrideSetAt = new Date().toISOString();
  }

  await saveCoachingConfig(config);
}

// =============================================================================
// API Integration
// =============================================================================

/**
 * Fetch insight scores from dashboard API
 * Non-blocking with 2-second timeout
 */
async function fetchInsightScores(graphId: string): Promise<InsightScores | null> {
  // Import dynamically to avoid circular dependencies
  const { GraphApiClient } = await import('../commands/graph/api-client.js');
  const { isAuthenticated } = await import('../utils/auth-storage.js');

  if (!await isAuthenticated()) {
    return null;
  }

  const client = new GraphApiClient();

  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await client.request<{
      report?: {
        overallScore: number;
        categoryScores: Array<{
          category: string;
          score: number;
        }>;
      };
      trendScores?: {
        day7?: {
          score: number;
        };
      };
    }>('GET', `/api/v1/insights/sync?graphId=${encodeURIComponent(graphId)}&days=7`);

    clearTimeout(timeoutId);

    if (response.report) {
      const categoryMap: Record<string, number> = {};
      for (const cat of response.report.categoryScores) {
        categoryMap[cat.category] = cat.score;
      }

      const scores: InsightScores = {
        overallScore: response.trendScores?.day7?.score ?? response.report.overallScore,
        categoryScores: {
          efficiency: categoryMap['efficiency'] ?? 70,
          patterns: categoryMap['patterns'] ?? 70,
          quality: categoryMap['quality'] ?? 70,
          'anti-patterns': categoryMap['anti-patterns'] ?? 70,
        },
        fetchedAt: new Date().toISOString(),
        periodDays: 7,
      };

      await saveCachedScores(scores);
      return scores;
    }
  } catch {
    // API unavailable - will use cache or fallback
  }

  return null;
}

// =============================================================================
// Level Calculation
// =============================================================================

/**
 * Calculate coaching level from overall score
 */
export function calculateCoachingLevel(score: number): CoachingLevel {
  if (score >= LEVEL_THRESHOLDS.minimal) return 'minimal';
  if (score >= LEVEL_THRESHOLDS.standard) return 'standard';
  return 'supportive';
}

/**
 * Convert adoption QuietingLevel to CoachingLevel
 */
function adoptionLevelToCoachingLevel(quieting: QuietingLevel): CoachingLevel {
  switch (quieting) {
    case 'minimal':
      return 'minimal';
    case 'light':
      return 'standard';
    case 'full':
    default:
      return 'supportive';
  }
}

/**
 * Estimate score from adoption level for fallback
 */
function adoptionLevelToScore(quieting: QuietingLevel): number {
  switch (quieting) {
    case 'minimal':
      return 80; // High adopters
    case 'light':
      return 68; // Medium adopters
    case 'full':
    default:
      return 50; // New users
  }
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Get coaching context for current session
 *
 * Priority:
 * 1. Manual override (if set)
 * 2. Dashboard insight scores (if available)
 * 3. Cached scores (if within TTL)
 * 4. Adoption score fallback (if offline)
 */
export async function getCoachingContext(graphId?: string): Promise<CoachingContext> {
  const config = await loadCoachingConfig();

  // Try to get scores in order of preference
  let scores: InsightScores | null = null;
  let source: CoachingContext['source'] = 'adoption_fallback';
  let cacheAge: number | undefined;

  // 1. Try fresh API fetch if we have graphId
  if (graphId) {
    scores = await fetchInsightScores(graphId);
    if (scores) {
      source = 'dashboard';
    }
  }

  // 2. Fall back to cache
  if (!scores) {
    scores = await loadCachedScores();
    if (scores) {
      source = 'cache';
      cacheAge = getCacheAgeMinutes(scores.fetchedAt);
    }
  }

  // 3. Fall back to adoption score
  if (!scores) {
    const adoption = await getAdoptionScore();
    const estimatedScore = adoptionLevelToScore(adoption.level);

    scores = {
      overallScore: estimatedScore,
      categoryScores: {
        efficiency: estimatedScore,
        patterns: estimatedScore,
        quality: estimatedScore,
        'anti-patterns': estimatedScore,
      },
      fetchedAt: new Date().toISOString(),
      periodDays: 7,
    };
    source = 'adoption_fallback';
  }

  // Calculate level (or use override)
  const calculatedLevel = calculateCoachingLevel(scores.overallScore);
  const effectiveLevel = config.override ?? calculatedLevel;

  return {
    overallScore: scores.overallScore,
    metrics: {
      sessionEfficiency: scores.categoryScores.efficiency,
      patternAdoption: scores.categoryScores.patterns,
      collaborationQuality: scores.categoryScores.quality,
      antiPatterns: scores.categoryScores['anti-patterns'],
    },
    level: effectiveLevel,
    override: config.override,
    source,
    cacheAge,
  };
}

/**
 * Get coaching level for quick checks
 * Simplified version that just returns the level
 */
export async function getCoachingLevel(graphId?: string): Promise<CoachingLevel> {
  const context = await getCoachingContext(graphId);
  return context.level;
}

/**
 * Check if a specific metric is low and needs targeted coaching
 */
export function isMetricLow(value: number, threshold: number = 70): boolean {
  return value < threshold;
}

/**
 * Get targeted coaching suggestions based on low metrics
 */
export function getTargetedCoachingSuggestions(context: CoachingContext): string[] {
  const suggestions: string[] = [];
  const threshold = 70;

  if (isMetricLow(context.metrics.sessionEfficiency, threshold)) {
    suggestions.push('Consider using `ginko handoff` to preserve context between sessions');
  }

  if (isMetricLow(context.metrics.patternAdoption, threshold)) {
    suggestions.push('Try organizing work into Epic→Sprint→Task structure for better tracking');
  }

  if (isMetricLow(context.metrics.collaborationQuality, threshold)) {
    suggestions.push('Log more decisions with `ginko log` to improve collaboration quality');
  }

  if (isMetricLow(context.metrics.antiPatterns, threshold)) {
    suggestions.push('Review recent gotcha warnings - you may be hitting known issues');
  }

  return suggestions;
}

// =============================================================================
// Prompt Variants
// =============================================================================

export interface PromptVariants {
  minimal: string;
  standard: string;
  supportive: string;
}

/**
 * Get the appropriate prompt variant based on coaching level
 */
export function selectPrompt<T extends string>(
  variants: Record<CoachingLevel, T>,
  level: CoachingLevel
): T {
  return variants[level];
}

/**
 * Standard prompt variants for common scenarios
 */
export const PROMPT_VARIANTS = {
  noStructure: {
    minimal: 'No active sprint. [a] Epic [b] Sprint [c] Quick [d] Ad-hoc',
    standard: `You have no planned work. What would you like to work on?

[a] New Epic - Large initiative with multiple sprints
[b] New Feature Sprint - Focused work with clear goals
[c] Quick fix / Bug fix - Single task, minimal overhead
[d] Something else - Explore, research, or work ad-hoc`,
    supportive: `I notice you're not currently in a sprint. Sprints help track progress and maintain focus.

What would you like to work on?

[a] New Epic (Recommended)
    For large initiatives that need multiple sprints to complete.
    Example: "Implement user authentication system"

[b] New Feature Sprint
    For focused work with a clear goal that can be done in ~1 week.
    Example: "Add dark mode toggle"

[c] Quick fix / Bug fix
    For small, single tasks that don't need sprint overhead.
    Example: "Fix login button alignment"

[d] Something else
    For exploration, research, or ad-hoc work.

Tip: Structured work (options a-c) improves your collaboration insights!`,
  },

  sprintComplete: {
    minimal: 'Sprint done! [a] Next sprint [b] New epic [c] Ad-hoc',
    standard: `🎉 Sprint complete! All tasks finished.

What's next?
[a] Start next sprint
[b] Create new epic
[c] Work on something else`,
    supportive: `🎉 Great work! You've completed all tasks in this sprint.

What would you like to do next?

[a] Start next sprint
    Continue momentum with the next planned sprint.

[b] Create new epic
    Begin a new large initiative.

[c] Work on something else
    Take a break or explore other work.

Tip: Completing sprints contributes to your pattern adoption score!`,
  },
} as const;

// =============================================================================
// Exports for Testing
// =============================================================================

export const __testing = {
  LEVEL_THRESHOLDS,
  CACHE_TTL_HOURS,
  adoptionLevelToCoachingLevel,
  adoptionLevelToScore,
  getCacheAgeMinutes,
};
