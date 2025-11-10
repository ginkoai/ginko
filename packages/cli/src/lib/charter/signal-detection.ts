/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, signal-detection, work-mode, conversation-analysis]
 * @related: [charter-synthesizer.ts, confidence-scorer.ts, charter.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import type {
  WorkMode,
  ConversationContext,
  ConversationExchange,
  WorkModeSignals,
} from '../../types/charter.js';
import { WORK_MODE_CHARACTERISTICS } from '../../types/charter.js';

// ============================================================================
// Signal Patterns
// ============================================================================

/**
 * Keyword patterns for work mode detection
 */
const WORK_MODE_KEYWORDS = {
  'hack-ship': [
    'quick',
    'prototype',
    'mvp',
    'proof of concept',
    'poc',
    'weekend',
    'hackathon',
    'experiment',
    'validate',
    'test idea',
    'ship',
    'launch',
    'try',
    'explore',
    'spike',
    'minimal',
    'fast',
  ],
  'think-build': [
    'team',
    'process',
    'testing',
    'architecture',
    'maintainable',
    'scalable',
    'quality',
    'users',
    'feedback',
    'iteration',
    'production',
    'release',
    'integration',
    'deployment',
    'ci/cd',
  ],
  'full-planning': [
    'stakeholders',
    'governance',
    'approval',
    'risks',
    'mitigations',
    'alternatives',
    'enterprise',
    'compliance',
    'security',
    'roadmap',
    'quarters',
    'phases',
    'strategy',
    'board',
    'executive',
    'regulatory',
  ],
} as const;

/**
 * Response depth indicators
 */
const DEPTH_INDICATORS = {
  shallow: [
    'yes',
    'no',
    'maybe',
    'not sure',
    'idk',
    "don't know",
    'skip',
    'next',
  ],
  moderate: [
    'basically',
    'mostly',
    'kind of',
    'sort of',
    'probably',
    'generally',
  ],
  deep: [
    'specifically',
    'in detail',
    'for example',
    'such as',
    'because',
    'the reason',
    'which means',
    'this enables',
    'impact',
  ],
} as const;

/**
 * User tone indicators
 */
const TONE_INDICATORS = {
  urgent: [
    'asap',
    'urgent',
    'critical',
    'now',
    'immediately',
    'quickly',
    'fast',
    'blocking',
    'blocker',
  ],
  exploratory: [
    'explore',
    'investigate',
    'curious',
    'wondering',
    'what if',
    'could we',
    'might',
    'experiment',
    'try',
  ],
  methodical: [
    'process',
    'plan',
    'steps',
    'approach',
    'framework',
    'methodology',
    'systematic',
    'organized',
    'structure',
  ],
} as const;

// ============================================================================
// Signal Detection Functions
// ============================================================================

/**
 * Detect work mode from conversation context
 */
export function detectWorkMode(context: ConversationContext): WorkMode {
  const signals = analyzeWorkModeSignals(context);

  // Find mode with highest signal count
  const modes: Array<{ mode: WorkMode; count: number }> = [
    { mode: 'hack-ship', count: signals.hackShip },
    { mode: 'think-build', count: signals.thinkBuild },
    { mode: 'full-planning', count: signals.fullPlanning },
  ];

  modes.sort((a, b) => b.count - a.count);

  // Default to think-build if no clear signals
  if (modes[0].count === 0) {
    return 'think-build';
  }

  // If top two modes are very close, prefer the less comprehensive one
  // (don't over-plan unless signals are clear)
  if (modes.length > 1 && modes[1].count > 0) {
    const ratio = modes[1].count / modes[0].count;
    if (ratio > 0.7) {
      // Tie-breaking: prefer less comprehensive mode
      if (modes[0].mode === 'full-planning' && modes[1].mode === 'think-build') {
        return 'think-build';
      }
      if (modes[0].mode === 'think-build' && modes[1].mode === 'hack-ship') {
        return 'hack-ship';
      }
    }
  }

  return modes[0].mode;
}

/**
 * Analyze work mode signals from conversation
 */
export function analyzeWorkModeSignals(
  context: ConversationContext
): WorkModeSignals {
  const allText = getAllConversationText(context.exchanges);

  return {
    hackShip: countSignals(allText, WORK_MODE_KEYWORDS['hack-ship']),
    thinkBuild: countSignals(allText, WORK_MODE_KEYWORDS['think-build']),
    fullPlanning: countSignals(allText, WORK_MODE_KEYWORDS['full-planning']),
  };
}

/**
 * Analyze response depth from exchanges
 */
export function analyzeResponseDepth(
  exchanges: ConversationExchange[]
): 'shallow' | 'moderate' | 'deep' {
  if (exchanges.length === 0) return 'shallow';

  // Calculate average response length
  const avgLength =
    exchanges.reduce((sum, e) => sum + e.response.length, 0) / exchanges.length;

  // Count depth indicators
  const allText = getAllConversationText(exchanges);
  const shallowCount = countSignals(allText, DEPTH_INDICATORS.shallow);
  const moderateCount = countSignals(allText, DEPTH_INDICATORS.moderate);
  const deepCount = countSignals(allText, DEPTH_INDICATORS.deep);

  // Determine depth based on response length and indicators
  if (avgLength < 50 || shallowCount > deepCount + moderateCount) {
    return 'shallow';
  }

  if (deepCount > moderateCount && avgLength > 150) {
    return 'deep';
  }

  return 'moderate';
}

/**
 * Detect user tone from exchanges
 */
export function detectUserTone(
  exchanges: ConversationExchange[]
): 'urgent' | 'exploratory' | 'methodical' {
  if (exchanges.length === 0) return 'exploratory';

  const allText = getAllConversationText(exchanges);

  const urgentCount = countSignals(allText, TONE_INDICATORS.urgent);
  const exploratoryCount = countSignals(allText, TONE_INDICATORS.exploratory);
  const methodicalCount = countSignals(allText, TONE_INDICATORS.methodical);

  // Find dominant tone
  const tones: Array<{ tone: 'urgent' | 'exploratory' | 'methodical'; count: number }> = [
    { tone: 'urgent', count: urgentCount },
    { tone: 'exploratory', count: exploratoryCount },
    { tone: 'methodical', count: methodicalCount },
  ];

  tones.sort((a, b) => b.count - a.count);

  // Default to exploratory if no clear signals
  if (tones[0].count === 0) {
    return 'exploratory';
  }

  return tones[0].tone;
}

/**
 * Count occurrences of signal keywords in text
 */
export function countSignals(text: string, keywords: readonly string[]): number {
  const lowerText = text.toLowerCase();
  let count = 0;

  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

/**
 * Detect specific signals in text
 */
export function detectSignals(text: string, keywords: readonly string[]): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
    if (regex.test(lowerText)) {
      found.push(keyword);
    }
  }

  return found;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all conversation text from exchanges
 */
function getAllConversationText(exchanges: ConversationExchange[]): string {
  return exchanges
    .map((e) => `${e.question} ${e.response}`)
    .join(' ')
    .toLowerCase();
}

/**
 * Check if user is showing stop signals
 */
export function hasStopSignals(exchanges: ConversationExchange[]): boolean {
  const STOP_SIGNALS = [
    "that's enough",
    "let's move on",
    'good enough',
    'skip',
    'skip this',
    'not sure',
    "don't know",
    'can we continue',
    "let's just start",
    "i'll figure it out",
    'move forward',
    'enough for now',
  ];

  const recentText = exchanges
    .slice(-3) // Last 3 exchanges
    .map((e) => e.response)
    .join(' ')
    .toLowerCase();

  return STOP_SIGNALS.some((signal) => recentText.includes(signal));
}

/**
 * Analyze conversation length and pacing
 */
export function analyzeConversationPacing(exchanges: ConversationExchange[]): {
  exchangeCount: number;
  avgResponseLength: number;
  totalDuration: number;
  pace: 'rapid' | 'steady' | 'slow';
} {
  if (exchanges.length === 0) {
    return {
      exchangeCount: 0,
      avgResponseLength: 0,
      totalDuration: 0,
      pace: 'steady',
    };
  }

  const avgResponseLength =
    exchanges.reduce((sum, e) => sum + e.response.length, 0) / exchanges.length;

  const totalDuration =
    exchanges.length > 1
      ? exchanges[exchanges.length - 1].timestamp.getTime() -
        exchanges[0].timestamp.getTime()
      : 0;

  // Calculate pace based on exchanges per minute
  const exchangesPerMinute = totalDuration > 0 ? (exchanges.length / totalDuration) * 60000 : 0;

  let pace: 'rapid' | 'steady' | 'slow';
  if (exchangesPerMinute > 2) {
    pace = 'rapid';
  } else if (exchangesPerMinute > 0.5) {
    pace = 'steady';
  } else {
    pace = 'slow';
  }

  return {
    exchangeCount: exchanges.length,
    avgResponseLength,
    totalDuration,
    pace,
  };
}
