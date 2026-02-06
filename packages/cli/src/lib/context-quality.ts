/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-05
 * @tags: [context-quality, ai-feedback, flow-optimization, epic-018, sprint-1]
 * @related: [event-logger.ts, context-metrics.ts, ../commands/context.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [event-logger]
 */

/**
 * Context Quality Scoring Module (EPIC-018 Sprint 1 TASK-9)
 *
 * Provides a self-assessment framework for AI assistants to score how
 * well-prepared they feel after context loads. This creates a feedback loop
 * for synthesis improvement.
 *
 * Dimensions:
 * - Direction: Do I know what to do next?
 * - Intent: Do I understand WHY?
 * - Location: Do I know WHERE to start?
 * - History: Do I know WHAT was decided?
 *
 * Usage:
 * - AI scores context within 60 seconds of session start
 * - Scores logged as events for aggregation and analysis
 * - Low scores surface synthesis improvement opportunities
 */

import { logEvent, EventEntry } from './event-logger.js';

// ============================================================
// Types
// ============================================================

/**
 * Individual dimension scores (0-10 scale)
 *
 * Scoring guide:
 * - 0-3: Missing critical information, cannot proceed confidently
 * - 4-6: Partial information, may need clarification
 * - 7-8: Good clarity, minor gaps acceptable
 * - 9-10: Crystal clear, ready to execute
 */
export interface ContextQualityScore {
  /** 0-10: Do I know what to do next? (task clarity) */
  direction: number;
  /** 0-10: Do I understand WHY? (purpose/motivation) */
  intent: number;
  /** 0-10: Do I know WHERE to start? (entry points, files) */
  location: number;
  /** 0-10: Do I know WHAT was decided? (ADRs, decisions) */
  history: number;
  /** Average of above dimensions */
  overall: number;
  /** When the score was recorded */
  scoredAt: Date;
  /** Who scored: 'ai' or user email */
  scoredBy?: string;
  /** What's missing or unclear */
  notes?: string[];
}

/**
 * Feedback with actionable suggestions
 */
export interface ContextQualityFeedback {
  /** The quality score */
  score: ContextQualityScore;
  /** Suggestions for improving the score */
  suggestions: string[];
  /** Confidence level in the score itself (meta-confidence) */
  scoreConfidence?: number;
}

/**
 * Quality zone classification based on overall score
 */
export type ContextQualityZone = 'excellent' | 'good' | 'adequate' | 'poor' | 'critical';

/**
 * Dimension metadata for display and analysis
 */
export interface DimensionInfo {
  name: string;
  question: string;
  description: string;
  improvementHint: string;
}

// ============================================================
// Constants
// ============================================================

/**
 * Dimension metadata for each quality dimension
 */
export const DIMENSION_INFO: Record<keyof Omit<ContextQualityScore, 'overall' | 'scoredAt' | 'scoredBy' | 'notes'>, DimensionInfo> = {
  direction: {
    name: 'Direction',
    question: 'Do I know what to do next?',
    description: 'Clarity about immediate next steps, current task, and sprint goals',
    improvementHint: 'Include current task details, sprint progress, and explicit next steps in context'
  },
  intent: {
    name: 'Intent',
    question: 'Do I understand WHY?',
    description: 'Understanding of purpose, motivation, and business value',
    improvementHint: 'Reference epic goals, PRD context, and stakeholder needs'
  },
  location: {
    name: 'Location',
    question: 'Do I know WHERE to start?',
    description: 'Knowledge of relevant files, entry points, and architecture',
    improvementHint: 'Include file paths, module locations, and architectural context'
  },
  history: {
    name: 'History',
    question: 'Do I know WHAT was decided?',
    description: 'Awareness of past decisions, ADRs, and established patterns',
    improvementHint: 'Reference relevant ADRs, previous decisions, and gotchas'
  }
};

/**
 * Thresholds for quality zone classification
 */
export const QUALITY_THRESHOLDS = {
  excellent: 9.0,  // 9-10
  good: 7.0,       // 7-8.9
  adequate: 5.0,   // 5-6.9
  poor: 3.0,       // 3-4.9
  critical: 0.0    // 0-2.9
};

/**
 * Alert threshold - scores below this in any dimension trigger notes
 */
export const DIMENSION_ALERT_THRESHOLD = 7;

// ============================================================
// Scoring Functions
// ============================================================

/**
 * Calculate overall score from individual dimensions
 *
 * @param dimensions - Individual dimension scores
 * @returns Average of all dimensions (0-10)
 */
export function calculateOverallScore(dimensions: {
  direction: number;
  intent: number;
  location: number;
  history: number;
}): number {
  const { direction, intent, location, history } = dimensions;
  const sum = direction + intent + location + history;
  const average = sum / 4;

  // Round to 1 decimal place
  return Math.round(average * 10) / 10;
}

/**
 * Create a complete quality score from dimension values
 *
 * @param dimensions - Individual dimension scores (0-10 each)
 * @param scoredBy - 'ai' or user email
 * @param notes - Optional notes about what's missing
 * @returns Complete ContextQualityScore
 */
export function createQualityScore(
  dimensions: {
    direction: number;
    intent: number;
    location: number;
    history: number;
  },
  scoredBy?: string,
  notes?: string[]
): ContextQualityScore {
  // Validate and clamp dimension values
  const clamp = (value: number): number => Math.max(0, Math.min(10, value));

  const direction = clamp(dimensions.direction);
  const intent = clamp(dimensions.intent);
  const location = clamp(dimensions.location);
  const history = clamp(dimensions.history);

  return {
    direction,
    intent,
    location,
    history,
    overall: calculateOverallScore({ direction, intent, location, history }),
    scoredAt: new Date(),
    scoredBy,
    notes
  };
}

/**
 * Get quality zone from overall score
 *
 * @param score - Overall score (0-10)
 * @returns Quality zone classification
 */
export function getQualityZone(score: number): ContextQualityZone {
  if (score >= QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (score >= QUALITY_THRESHOLDS.good) return 'good';
  if (score >= QUALITY_THRESHOLDS.adequate) return 'adequate';
  if (score >= QUALITY_THRESHOLDS.poor) return 'poor';
  return 'critical';
}

/**
 * Get color for quality zone (for display)
 *
 * @param zone - Quality zone
 * @returns Chalk color name
 */
export function getQualityColor(zone: ContextQualityZone): string {
  switch (zone) {
    case 'excellent': return 'green';
    case 'good': return 'cyan';
    case 'adequate': return 'yellow';
    case 'poor': return 'red';
    case 'critical': return 'magenta';
  }
}

/**
 * Generate suggestions based on low-scoring dimensions
 *
 * @param score - The quality score
 * @returns Array of improvement suggestions
 */
export function generateSuggestions(score: ContextQualityScore): string[] {
  const suggestions: string[] = [];

  // Check each dimension against threshold
  const dimensions: Array<keyof typeof DIMENSION_INFO> = ['direction', 'intent', 'location', 'history'];

  for (const dim of dimensions) {
    if (score[dim] < DIMENSION_ALERT_THRESHOLD) {
      const info = DIMENSION_INFO[dim];
      suggestions.push(`${info.name} (${score[dim]}/10): ${info.improvementHint}`);
    }
  }

  // Add general suggestions for critical scores
  if (score.overall < QUALITY_THRESHOLDS.adequate) {
    suggestions.push('Consider running `ginko start --verbose` for more context');
    suggestions.push('Check if session handoff includes sufficient detail');
  }

  return suggestions;
}

/**
 * Create complete feedback with score and suggestions
 *
 * @param dimensions - Individual dimension scores
 * @param scoredBy - 'ai' or user email
 * @param notes - Optional notes about what's missing
 * @returns Complete feedback with suggestions
 */
export function createQualityFeedback(
  dimensions: {
    direction: number;
    intent: number;
    location: number;
    history: number;
  },
  scoredBy?: string,
  notes?: string[]
): ContextQualityFeedback {
  const score = createQualityScore(dimensions, scoredBy, notes);
  const suggestions = generateSuggestions(score);

  return {
    score,
    suggestions,
    scoreConfidence: 0.8  // Default meta-confidence
  };
}

// ============================================================
// Event Logging
// ============================================================

/**
 * Log a context quality score as an event
 *
 * This enables aggregation and analysis of context quality over time.
 *
 * @param score - The quality score to log
 * @returns Promise resolving when event is logged
 */
export async function logContextQualityScore(score: ContextQualityScore): Promise<void> {
  const zone = getQualityZone(score.overall);

  // Format description for event log
  const description = formatScoreDescription(score);

  const eventEntry: EventEntry = {
    category: 'insight',
    description,
    impact: zone === 'critical' || zone === 'poor' ? 'high' : 'medium',
    tags: [
      'context-quality',
      `quality-${zone}`,
      `direction-${Math.round(score.direction)}`,
      `intent-${Math.round(score.intent)}`,
      `location-${Math.round(score.location)}`,
      `history-${Math.round(score.history)}`
    ]
  };

  await logEvent(eventEntry);
}

/**
 * Format score as a human-readable description
 *
 * @param score - The quality score
 * @returns Formatted description string
 */
export function formatScoreDescription(score: ContextQualityScore): string {
  const zone = getQualityZone(score.overall);

  let desc = `Context score: direction=${score.direction}, intent=${score.intent}, location=${score.location}, history=${score.history} (overall: ${score.overall}/10, ${zone})`;

  if (score.notes && score.notes.length > 0) {
    desc += ` | Notes: ${score.notes.join('; ')}`;
  }

  return desc;
}

/**
 * Format score as compact single-line display
 *
 * @param score - The quality score
 * @returns Compact display string
 */
export function formatScoreCompact(score: ContextQualityScore): string {
  const zone = getQualityZone(score.overall);
  const icon = zone === 'excellent' ? '++' :
               zone === 'good' ? '+' :
               zone === 'adequate' ? '~' :
               zone === 'poor' ? '-' :
               '--';

  return `[${icon}] D:${score.direction} I:${score.intent} L:${score.location} H:${score.history} = ${score.overall}/10`;
}

/**
 * Format score for detailed display
 *
 * @param feedback - Complete feedback with suggestions
 * @returns Multi-line display string
 */
export function formatScoreDetailed(feedback: ContextQualityFeedback): string {
  const { score, suggestions } = feedback;
  const zone = getQualityZone(score.overall);

  const lines: string[] = [
    `Context Quality Assessment`,
    `==========================`,
    '',
    `Overall: ${score.overall}/10 (${zone.toUpperCase()})`,
    '',
    `Dimensions:`,
    `  Direction: ${score.direction}/10 - ${DIMENSION_INFO.direction.question}`,
    `  Intent:    ${score.intent}/10 - ${DIMENSION_INFO.intent.question}`,
    `  Location:  ${score.location}/10 - ${DIMENSION_INFO.location.question}`,
    `  History:   ${score.history}/10 - ${DIMENSION_INFO.history.question}`
  ];

  if (score.notes && score.notes.length > 0) {
    lines.push('');
    lines.push('Notes:');
    for (const note of score.notes) {
      lines.push(`  - ${note}`);
    }
  }

  if (suggestions.length > 0) {
    lines.push('');
    lines.push('Suggestions:');
    for (const suggestion of suggestions) {
      lines.push(`  - ${suggestion}`);
    }
  }

  if (score.scoredBy) {
    lines.push('');
    lines.push(`Scored by: ${score.scoredBy} at ${score.scoredAt.toISOString()}`);
  }

  return lines.join('\n');
}

// ============================================================
// Parsing Functions
// ============================================================

/**
 * Parse a score string into a ContextQualityScore
 *
 * Supports formats:
 * - "direction=8, intent=7, location=9, history=6"
 * - "8,7,9,6" (in order: direction, intent, location, history)
 *
 * @param input - Score string to parse
 * @param scoredBy - Who scored (optional)
 * @returns Parsed ContextQualityScore
 * @throws Error if parsing fails
 */
export function parseScoreString(input: string, scoredBy?: string): ContextQualityScore {
  // Try named format first: "direction=8, intent=7, ..."
  const namedMatch = input.match(/direction[=:]?\s*(\d+)/i);

  if (namedMatch) {
    const direction = parseInt(input.match(/direction[=:]?\s*(\d+)/i)?.[1] || '0', 10);
    const intent = parseInt(input.match(/intent[=:]?\s*(\d+)/i)?.[1] || '0', 10);
    const location = parseInt(input.match(/location[=:]?\s*(\d+)/i)?.[1] || '0', 10);
    const history = parseInt(input.match(/history[=:]?\s*(\d+)/i)?.[1] || '0', 10);

    return createQualityScore({ direction, intent, location, history }, scoredBy);
  }

  // Try positional format: "8,7,9,6"
  const numbers = input.split(/[,\s]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));

  if (numbers.length >= 4) {
    const [direction, intent, location, history] = numbers;
    return createQualityScore({ direction, intent, location, history }, scoredBy);
  }

  throw new Error(`Unable to parse score string: "${input}". Expected format: "direction=8, intent=7, location=9, history=6" or "8,7,9,6"`);
}

// ============================================================
// Quick Score Function (for AI use)
// ============================================================

/**
 * Quick score entry point for AI assistants
 *
 * Call this within 60 seconds of session start to log context quality.
 *
 * @param direction - 0-10: Do I know what to do next?
 * @param intent - 0-10: Do I understand WHY?
 * @param location - 0-10: Do I know WHERE to start?
 * @param history - 0-10: Do I know WHAT was decided?
 * @param notes - Optional notes about what's missing
 * @returns Promise resolving to the logged score
 *
 * @example
 * ```typescript
 * // AI scores context after ginko start
 * await scoreContext(8, 7, 9, 6, ['Missing ADR references for auth decision']);
 * ```
 */
export async function scoreContext(
  direction: number,
  intent: number,
  location: number,
  history: number,
  notes?: string[]
): Promise<ContextQualityScore> {
  const score = createQualityScore(
    { direction, intent, location, history },
    'ai',
    notes
  );

  await logContextQualityScore(score);

  return score;
}

export default {
  createQualityScore,
  createQualityFeedback,
  scoreContext,
  logContextQualityScore,
  parseScoreString,
  formatScoreCompact,
  formatScoreDetailed,
  getQualityZone,
  getQualityColor,
  DIMENSION_INFO,
  QUALITY_THRESHOLDS,
  DIMENSION_ALERT_THRESHOLD
};
