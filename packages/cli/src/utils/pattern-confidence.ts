/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-25
 * @tags: [pattern, confidence, scoring, epic-002, task-3]
 * @related: [sprint-loader.ts, ../lib/output-formatter.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

/**
 * Pattern Confidence Calculator (TASK-3: EPIC-002 Sprint 3)
 *
 * Calculates confidence levels for patterns based on:
 * - Usage count: More usages = higher confidence
 * - Age: Patterns proven over time have higher confidence
 * - Resolution rate: For gotchas, successful resolutions increase confidence
 *
 * Confidence levels:
 * - high: Well-established pattern with proven track record
 * - medium: Reasonable confidence, some usage history
 * - low: New or rarely used pattern
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface PatternMetrics {
  /** Number of times pattern has been applied */
  usageCount: number;
  /** Date pattern was first created */
  createdAt: Date | string;
  /** Date pattern was last used */
  lastUsedAt?: Date | string;
  /** For gotchas: number of times encountered */
  encounters?: number;
  /** For gotchas: number of successful resolutions */
  resolutions?: number;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number; // 0-100 for sorting
  factors: {
    usage: number;
    age: number;
    resolution?: number;
  };
}

/**
 * Thresholds for confidence calculation
 */
const THRESHOLDS = {
  // Usage count thresholds
  HIGH_USAGE: 5, // 5+ usages = high confidence
  MEDIUM_USAGE: 2, // 2-4 usages = medium confidence

  // Age thresholds (in days)
  HIGH_AGE: 14, // 14+ days = high age score
  MEDIUM_AGE: 3, // 3-13 days = medium age score

  // Score weights
  USAGE_WEIGHT: 0.6, // Usage is most important
  AGE_WEIGHT: 0.3, // Age contributes to trust
  RESOLUTION_WEIGHT: 0.1, // Resolution rate (for gotchas)

  // Confidence level boundaries
  HIGH_THRESHOLD: 70,
  MEDIUM_THRESHOLD: 40,
};

/**
 * Calculate confidence level for a pattern
 *
 * @param metrics - Pattern usage metrics
 * @returns Confidence result with level, score, and contributing factors
 *
 * @example
 * const confidence = calculateConfidence({
 *   usageCount: 8,
 *   createdAt: '2025-11-01',
 *   lastUsedAt: '2025-11-24'
 * });
 * // { level: 'high', score: 85, factors: { usage: 100, age: 75 } }
 */
export function calculateConfidence(metrics: PatternMetrics): ConfidenceResult {
  const usageScore = calculateUsageScore(metrics.usageCount);
  const ageScore = calculateAgeScore(metrics.createdAt);
  const resolutionScore = metrics.encounters
    ? calculateResolutionScore(metrics.encounters, metrics.resolutions || 0)
    : undefined;

  // Calculate weighted score
  let totalScore: number;
  if (resolutionScore !== undefined) {
    // Gotcha: include resolution rate
    totalScore =
      usageScore * THRESHOLDS.USAGE_WEIGHT +
      ageScore * THRESHOLDS.AGE_WEIGHT +
      resolutionScore * THRESHOLDS.RESOLUTION_WEIGHT;
  } else {
    // Pattern: usage and age only, rebalance weights
    const adjustedUsageWeight =
      THRESHOLDS.USAGE_WEIGHT /
      (THRESHOLDS.USAGE_WEIGHT + THRESHOLDS.AGE_WEIGHT);
    const adjustedAgeWeight =
      THRESHOLDS.AGE_WEIGHT /
      (THRESHOLDS.USAGE_WEIGHT + THRESHOLDS.AGE_WEIGHT);
    totalScore = usageScore * adjustedUsageWeight + ageScore * adjustedAgeWeight;
  }

  // Determine confidence level
  let level: ConfidenceLevel;
  if (totalScore >= THRESHOLDS.HIGH_THRESHOLD) {
    level = 'high';
  } else if (totalScore >= THRESHOLDS.MEDIUM_THRESHOLD) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    level,
    score: Math.round(totalScore),
    factors: {
      usage: usageScore,
      age: ageScore,
      ...(resolutionScore !== undefined && { resolution: resolutionScore }),
    },
  };
}

/**
 * Calculate usage score (0-100)
 * Higher usage = higher score
 */
function calculateUsageScore(usageCount: number): number {
  if (usageCount >= THRESHOLDS.HIGH_USAGE) {
    return 100;
  } else if (usageCount >= THRESHOLDS.MEDIUM_USAGE) {
    // Linear interpolation between medium and high
    return 50 + ((usageCount - THRESHOLDS.MEDIUM_USAGE) / (THRESHOLDS.HIGH_USAGE - THRESHOLDS.MEDIUM_USAGE)) * 50;
  } else if (usageCount >= 1) {
    // Linear interpolation between 1 and medium
    return (usageCount / THRESHOLDS.MEDIUM_USAGE) * 50;
  }
  return 0;
}

/**
 * Calculate age score (0-100)
 * Older patterns with sustained use have higher trust
 */
function calculateAgeScore(createdAt: Date | string): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const ageInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  if (ageInDays >= THRESHOLDS.HIGH_AGE) {
    return 100;
  } else if (ageInDays >= THRESHOLDS.MEDIUM_AGE) {
    // Linear interpolation
    return 50 + ((ageInDays - THRESHOLDS.MEDIUM_AGE) / (THRESHOLDS.HIGH_AGE - THRESHOLDS.MEDIUM_AGE)) * 50;
  } else if (ageInDays >= 1) {
    return (ageInDays / THRESHOLDS.MEDIUM_AGE) * 50;
  }
  return 25; // Same-day patterns get base score (not zero - they exist for a reason)
}

/**
 * Calculate resolution score for gotchas (0-100)
 * Higher resolution rate = more confident the gotcha warning is useful
 */
function calculateResolutionScore(encounters: number, resolutions: number): number {
  if (encounters === 0) return 50; // No data, assume medium
  const rate = resolutions / encounters;
  return Math.round(rate * 100);
}

/**
 * Get default confidence for new patterns
 * New patterns start at medium to avoid cold-start issues
 */
export function getDefaultConfidence(): ConfidenceResult {
  return {
    level: 'medium',
    score: 50,
    factors: {
      usage: 25,
      age: 25,
    },
  };
}

/**
 * Sort patterns by confidence (highest first)
 *
 * @param patterns - Array of patterns with confidence scores
 * @returns Sorted array (descending by score)
 */
export function sortByConfidence<T extends { confidence?: ConfidenceResult }>(
  patterns: T[]
): T[] {
  return [...patterns].sort((a, b) => {
    const scoreA = a.confidence?.score ?? 50;
    const scoreB = b.confidence?.score ?? 50;
    return scoreB - scoreA;
  });
}

/**
 * Format confidence for display
 *
 * @param confidence - Confidence result
 * @returns Human-readable string
 */
export function formatConfidence(confidence: ConfidenceResult): string {
  const emoji = confidence.level === 'high' ? '✓' : confidence.level === 'medium' ? '~' : '?';
  return `${emoji} ${confidence.level} (${confidence.score}%)`;
}
