/**
 * @fileType: utility
 * @status: specification
 * @updated: 2025-11-10
 * @tags: [charter, confidence-scoring, conversation-quality, design-spec]
 * @related: [conversation-facilitator.ts, charter-synthesizer.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: []
 */

/**
 * Confidence Scoring Specification for Charter Conversations
 *
 * This module defines the algorithm for assessing how well each charter aspect
 * is understood during conversational charter creation. It tracks confidence
 * across four critical aspects (purpose, users, success, scope) and determines
 * when additional probing is needed versus when to accept TBD.
 *
 * Philosophy:
 * - Confidence scoring guides conversation depth, not bureaucratic completeness
 * - Low confidence triggers gentle probing (max 1 per aspect, 3 total)
 * - TBD is acceptable when user doesn't have clarity yet
 * - Scoring is transparent and shown to user
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Overall confidence assessment for charter
 */
export interface CharterConfidence {
  purpose: AspectScore;
  users: AspectScore;
  success: AspectScore;
  scope: AspectScore;
  overall: number; // Weighted average (0-100)
  workMode?: WorkMode; // Detected work mode
  qualityLevel: ConfidenceLevel; // High-level quality indicator
}

/**
 * Confidence score for a specific charter aspect
 */
export interface AspectScore {
  score: number; // 0-100
  signals: string[]; // Keywords/phrases indicating understanding
  missing: string[]; // Unclear or absent aspects
  needsProbing: boolean; // Should we gently nudge for clarity?
  markedTBD: boolean; // User explicitly deferred this aspect
}

/**
 * High-level confidence indicator
 */
export type ConfidenceLevel =
  | 'insufficient' // < 40%: Missing critical information
  | 'workable' // 40-70%: Adequate for starting work
  | 'good' // 70-85%: Strong understanding
  | 'excellent'; // > 85%: Comprehensive clarity

/**
 * Detected work mode from conversation signals
 */
export type WorkMode = 'hack-ship' | 'think-build' | 'full-planning';

/**
 * Conversation context passed to scorer
 */
export interface ConversationContext {
  exchanges: Exchange[]; // All question-answer pairs
  workModeSignals: WorkModeSignals; // Detected signals for work mode
  nudgeHistory: NudgeRecord[]; // Previous nudging attempts
  userStopSignals: string[]; // Signals user wants to conclude
}

export interface Exchange {
  question: string;
  answer: string;
  timestamp: Date;
  aspect?: CharterAspect; // Which aspect was being explored
}

export interface WorkModeSignals {
  hackShip: number; // Count of hack-ship indicators
  thinkBuild: number; // Count of think-build indicators
  fullPlanning: number; // Count of full-planning indicators
}

export interface NudgeRecord {
  aspect: CharterAspect;
  timestamp: Date;
  response: 'clarified' | 'stayed-vague' | 'declined' | 'frustrated';
}

export type CharterAspect = 'purpose' | 'users' | 'success' | 'scope';

// ============================================================================
// Signal Detection Patterns
// ============================================================================

/**
 * Keyword patterns for detecting understanding in each aspect
 */
export const SIGNAL_PATTERNS = {
  purpose: {
    // Problem indicators
    problem: [
      'problem',
      'pain',
      'frustration',
      'challenge',
      'issue',
      'difficulty',
      'bottleneck',
      'blocker',
      'friction',
    ],

    // Value indicators
    value: [
      'value',
      'benefit',
      'impact',
      'improve',
      'save',
      'enable',
      'unlock',
      'empower',
      'efficiency',
    ],

    // Motivation indicators
    motivation: [
      'because',
      'why',
      'need',
      'want',
      'goal',
      'vision',
      'mission',
      'opportunity',
    ],

    // Urgency indicators
    urgency: ['now', 'urgent', 'critical', 'blocking', 'immediately', 'asap'],
  },

  users: {
    // User type indicators
    userTypes: [
      'users',
      'developers',
      'team',
      'engineers',
      'designers',
      'customers',
      'clients',
      'people',
      'myself',
      'we',
      'they',
    ],

    // User needs indicators
    needs: [
      'needs',
      'wants',
      'requires',
      'looking for',
      'expects',
      'jobs to be done',
      'use cases',
    ],

    // User outcomes indicators
    outcomes: [
      'achieve',
      'accomplish',
      'complete',
      'finish',
      'succeed',
      'get',
      'make',
      'do',
    ],
  },

  success: {
    // Qualitative criteria
    qualitative: [
      'happy',
      'satisfied',
      'delighted',
      'easy',
      'fast',
      'simple',
      'intuitive',
      'reliable',
      'quality',
    ],

    // Quantitative criteria
    quantitative: [
      'time',
      'minutes',
      'hours',
      'seconds',
      'faster',
      'reduce',
      'increase',
      'percent',
      'number',
      'count',
      'metric',
    ],

    // Outcome indicators
    outcomes: [
      'results in',
      'leads to',
      'enables',
      'allows',
      'means',
      'demonstrates',
      'proves',
    ],
  },

  scope: {
    // In-scope indicators
    inScope: [
      'includes',
      'covers',
      'handles',
      'supports',
      'provides',
      'features',
      'capabilities',
      'building',
      'creating',
      'implementing',
    ],

    // Out-of-scope indicators
    outOfScope: [
      'not',
      'excluding',
      'skip',
      'defer',
      'later',
      'phase 2',
      'future',
      'won\'t',
      'don\'t',
    ],

    // Boundary indicators
    boundaries: [
      'only',
      'just',
      'limited to',
      'focused on',
      'specifically',
      'explicitly',
      'solely',
    ],
  },
} as const;

/**
 * Work mode detection patterns
 */
export const WORK_MODE_SIGNALS = {
  hackShip: [
    'quick',
    'prototype',
    'mvp',
    'proof of concept',
    'poc',
    'weekend',
    'hackathon',
    'experiment',
    'validate',
    'test',
    'ship',
    'launch',
    'try',
    'explore',
  ],

  thinkBuild: [
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
  ],

  fullPlanning: [
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
  ],
} as const;

/**
 * User stop signals (wants to conclude conversation)
 */
export const STOP_SIGNALS = [
  'that\'s enough',
  'let\'s move on',
  'good enough',
  'skip',
  'skip this',
  'not sure',
  'don\'t know',
  'can we continue',
  'let\'s just start',
  'i\'ll figure it out',
] as const;

// ============================================================================
// Confidence Scoring Algorithm
// ============================================================================

/**
 * Core confidence scorer class
 */
export class ConfidenceScorer {
  private context: ConversationContext;
  private scores: CharterConfidence;

  constructor(context: ConversationContext) {
    this.context = context;
    this.scores = this.initializeScores();
  }

  /**
   * Initialize confidence scores with zero state
   */
  private initializeScores(): CharterConfidence {
    return {
      purpose: this.createEmptyScore(),
      users: this.createEmptyScore(),
      success: this.createEmptyScore(),
      scope: this.createEmptyScore(),
      overall: 0,
      qualityLevel: 'insufficient',
    };
  }

  private createEmptyScore(): AspectScore {
    return {
      score: 0,
      signals: [],
      missing: [],
      needsProbing: false,
      markedTBD: false,
    };
  }

  /**
   * Update all confidence scores based on current conversation context
   */
  public update(): CharterConfidence {
    // Score each aspect
    this.scores.purpose = this.scorePurpose();
    this.scores.users = this.scoreUsers();
    this.scores.success = this.scoreSuccess();
    this.scores.scope = this.scoreScope();

    // Calculate overall confidence
    this.scores.overall = this.calculateOverall();

    // Determine quality level
    this.scores.qualityLevel = this.determineQualityLevel(this.scores.overall);

    // Detect work mode
    this.scores.workMode = this.detectWorkMode();

    return this.scores;
  }

  /**
   * Get current confidence scores
   */
  public getScores(): CharterConfidence {
    return this.scores;
  }

  // ==========================================================================
  // Aspect-Specific Scoring
  // ==========================================================================

  /**
   * Score purpose & value understanding
   *
   * Signals:
   * - Problem statement mentioned
   * - Business value articulated
   * - Motivation clear
   * - Urgency/timing indicated
   *
   * Scoring:
   * - 0-20: No clear problem or value
   * - 20-40: Problem mentioned, value implied
   * - 40-60: Problem clear, value mentioned
   * - 60-80: Problem, value, and motivation all clear
   * - 80-100: Comprehensive with urgency and impact
   */
  private scorePurpose(): AspectScore {
    const answers = this.getAnswersForAspect('purpose');
    const allText = this.getAllConversationText();

    // Check for TBD marking
    if (this.isMarkedTBD('purpose')) {
      return {
        score: 0,
        signals: [],
        missing: ['Marked as TBD by user'],
        needsProbing: false,
        markedTBD: true,
      };
    }

    // Detect signals
    const problemMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.purpose.problem
    );
    const valueMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.purpose.value
    );
    const motivationClear = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.purpose.motivation
    );
    const urgencyIndicated = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.purpose.urgency
    );

    // Calculate score
    let score = 0;
    const signals: string[] = [];
    const missing: string[] = [];

    if (problemMentioned.length > 0) {
      score += 30;
      signals.push('Problem identified');
    } else {
      missing.push('Problem statement unclear');
    }

    if (valueMentioned.length > 0) {
      score += 30;
      signals.push('Value articulated');
    } else {
      missing.push('Business value not explicit');
    }

    if (motivationClear.length > 0) {
      score += 25;
      signals.push('Motivation clear');
    } else {
      missing.push('Motivation not stated');
    }

    if (urgencyIndicated.length > 0) {
      score += 15;
      signals.push('Urgency indicated');
    }

    // Check if probing needed
    const needsProbing = score < 40 && !this.hasBeenNudged('purpose');

    return {
      score,
      signals,
      missing,
      needsProbing,
      markedTBD: false,
    };
  }

  /**
   * Score user & persona understanding
   *
   * Signals:
   * - User types identified
   * - User needs described
   * - User outcomes mentioned
   *
   * Scoring:
   * - 0-20: No user identification
   * - 20-40: Vague user mention ("users", "people")
   * - 40-60: Specific user type identified
   * - 60-80: User type + needs described
   * - 80-100: Multiple users with clear needs and outcomes
   */
  private scoreUsers(): AspectScore {
    const allText = this.getAllConversationText();

    if (this.isMarkedTBD('users')) {
      return {
        score: 0,
        signals: [],
        missing: ['Marked as TBD by user'],
        needsProbing: false,
        markedTBD: true,
      };
    }

    // Detect signals
    const userTypesMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.users.userTypes
    );
    const needsMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.users.needs
    );
    const outcomesMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.users.outcomes
    );

    let score = 0;
    const signals: string[] = [];
    const missing: string[] = [];

    if (userTypesMentioned.length > 0) {
      score += 40;
      signals.push(`User types: ${userTypesMentioned.join(', ')}`);
    } else {
      missing.push('User types not identified');
    }

    if (needsMentioned.length > 0) {
      score += 30;
      signals.push('User needs described');
    } else {
      missing.push('User needs unclear');
    }

    if (outcomesMentioned.length > 0) {
      score += 30;
      signals.push('User outcomes mentioned');
    }

    // Bonus for multiple user types
    if (userTypesMentioned.length > 2) {
      score = Math.min(100, score + 10);
      signals.push('Multiple user types identified');
    }

    const needsProbing = score < 40 && !this.hasBeenNudged('users');

    return {
      score,
      signals,
      missing,
      needsProbing,
      markedTBD: false,
    };
  }

  /**
   * Score success criteria understanding
   *
   * Signals:
   * - Qualitative criteria mentioned
   * - Quantitative criteria mentioned
   * - User outcomes described
   *
   * Scoring:
   * - 0-20: No success criteria
   * - 20-40: Vague success mention
   * - 40-60: Qualitative criteria clear
   * - 60-80: Both qualitative and quantitative
   * - 80-100: Comprehensive with timeframes and user outcomes
   */
  private scoreSuccess(): AspectScore {
    const allText = this.getAllConversationText();

    if (this.isMarkedTBD('success')) {
      return {
        score: 0,
        signals: [],
        missing: ['Marked as TBD by user'],
        needsProbing: false,
        markedTBD: true,
      };
    }

    const qualitativeMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.success.qualitative
    );
    const quantitativeMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.success.quantitative
    );
    const outcomesMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.success.outcomes
    );

    let score = 0;
    const signals: string[] = [];
    const missing: string[] = [];

    if (qualitativeMentioned.length > 0) {
      score += 35;
      signals.push('Qualitative criteria mentioned');
    } else {
      missing.push('Qualitative criteria unclear');
    }

    if (quantitativeMentioned.length > 0) {
      score += 35;
      signals.push('Quantitative criteria mentioned');
    } else {
      missing.push('Quantitative criteria unclear');
    }

    if (outcomesMentioned.length > 0) {
      score += 30;
      signals.push('User outcomes described');
    }

    const needsProbing = score < 40 && !this.hasBeenNudged('success');

    return {
      score,
      signals,
      missing,
      needsProbing,
      markedTBD: false,
    };
  }

  /**
   * Score scope & boundaries understanding
   *
   * Signals:
   * - In-scope features mentioned
   * - Out-of-scope explicitly stated
   * - Boundaries clear
   *
   * Scoring:
   * - 0-20: No scope definition
   * - 20-40: Vague scope mention
   * - 40-60: In-scope features clear
   * - 60-80: In-scope + some out-of-scope
   * - 80-100: Both in/out scope with clear boundaries
   */
  private scoreScope(): AspectScore {
    const allText = this.getAllConversationText();

    if (this.isMarkedTBD('scope')) {
      return {
        score: 0,
        signals: [],
        missing: ['Marked as TBD by user'],
        needsProbing: false,
        markedTBD: true,
      };
    }

    const inScopeMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.scope.inScope
    );
    const outOfScopeMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.scope.outOfScope
    );
    const boundariesMentioned = this.detectSignals(
      allText,
      SIGNAL_PATTERNS.scope.boundaries
    );

    let score = 0;
    const signals: string[] = [];
    const missing: string[] = [];

    if (inScopeMentioned.length > 0) {
      score += 40;
      signals.push('In-scope features mentioned');
    } else {
      missing.push('In-scope features unclear');
    }

    if (outOfScopeMentioned.length > 0) {
      score += 40;
      signals.push('Out-of-scope explicitly stated');
    } else {
      missing.push('Out-of-scope boundaries unclear');
    }

    if (boundariesMentioned.length > 0) {
      score += 20;
      signals.push('Clear boundaries defined');
    }

    const needsProbing = score < 40 && !this.hasBeenNudged('scope');

    return {
      score,
      signals,
      missing,
      needsProbing,
      markedTBD: false,
    };
  }

  // ==========================================================================
  // Overall Scoring & Quality
  // ==========================================================================

  /**
   * Calculate overall confidence as weighted average
   *
   * Weights:
   * - Purpose: 30% (most critical)
   * - Scope: 25% (prevents drift)
   * - Success: 25% (measurability)
   * - Users: 20% (important but can be inferred)
   */
  private calculateOverall(): number {
    const weights = {
      purpose: 0.3,
      users: 0.2,
      success: 0.25,
      scope: 0.25,
    };

    const weightedSum =
      this.scores.purpose.score * weights.purpose +
      this.scores.users.score * weights.users +
      this.scores.success.score * weights.success +
      this.scores.scope.score * weights.scope;

    return Math.round(weightedSum);
  }

  /**
   * Determine quality level from overall score
   */
  private determineQualityLevel(overall: number): ConfidenceLevel {
    if (overall < 40) return 'insufficient';
    if (overall < 70) return 'workable';
    if (overall < 85) return 'good';
    return 'excellent';
  }

  // ==========================================================================
  // Work Mode Detection
  // ==========================================================================

  /**
   * Detect work mode from conversation signals
   */
  private detectWorkMode(): WorkMode {
    const signals = this.context.workModeSignals;

    // Find mode with most signals
    const modes: Array<{ mode: WorkMode; count: number }> = [
      { mode: 'hack-ship', count: signals.hackShip },
      { mode: 'think-build', count: signals.thinkBuild },
      { mode: 'full-planning', count: signals.fullPlanning },
    ];

    modes.sort((a, b) => b.count - a.count);

    // Default to think-build if no clear signals
    if (modes[0].count === 0) return 'think-build';

    return modes[0].mode;
  }

  // ==========================================================================
  // Decision Logic
  // ==========================================================================

  /**
   * Check if conversation needs more depth for critical aspects
   */
  public needsAdditionalProbing(): boolean {
    const critical = [
      this.scores.purpose,
      this.scores.users,
      this.scores.success,
      this.scores.scope,
    ];

    return critical.some((aspect) => aspect.needsProbing);
  }

  /**
   * Get the aspect that most needs probing
   */
  public getMostUnclearAspect(): CharterAspect | null {
    const aspects: Array<{ aspect: CharterAspect; score: number }> = [
      { aspect: 'purpose', score: this.scores.purpose.score },
      { aspect: 'users', score: this.scores.users.score },
      { aspect: 'success', score: this.scores.success.score },
      { aspect: 'scope', score: this.scores.scope.score },
    ];

    // Filter to aspects that need probing
    const needsProbing = aspects.filter(
      (a) => this.scores[a.aspect].needsProbing
    );

    if (needsProbing.length === 0) return null;

    // Return lowest scoring aspect that needs probing
    needsProbing.sort((a, b) => a.score - b.score);
    return needsProbing[0].aspect;
  }

  /**
   * Check if ready to synthesize charter
   */
  public isReadyToSynthesize(): boolean {
    // Ready if:
    // 1. Overall confidence > 70%, OR
    // 2. All critical aspects > 40% (workable minimum), OR
    // 3. User showing stop signals, OR
    // 4. Max nudges reached

    if (this.scores.overall > 70) return true;

    if (this.allCriticalAspectsCovered()) return true;

    if (this.hasUserStopSignals()) return true;

    if (this.maxNudgesReached()) return true;

    return false;
  }

  private allCriticalAspectsCovered(): boolean {
    return (
      this.scores.purpose.score > 40 &&
      this.scores.users.score > 40 &&
      this.scores.success.score > 40 &&
      this.scores.scope.score > 40
    );
  }

  private hasUserStopSignals(): boolean {
    return this.context.userStopSignals.length > 0;
  }

  private maxNudgesReached(): boolean {
    return this.context.nudgeHistory.length >= 3;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get all answers for a specific aspect
   */
  private getAnswersForAspect(aspect: CharterAspect): string[] {
    return this.context.exchanges
      .filter((e) => e.aspect === aspect)
      .map((e) => e.answer);
  }

  /**
   * Get all conversation text (questions + answers)
   */
  private getAllConversationText(): string {
    return this.context.exchanges
      .map((e) => `${e.question} ${e.answer}`)
      .join(' ')
      .toLowerCase();
  }

  /**
   * Detect signal keywords in text
   */
  private detectSignals(text: string, patterns: readonly string[]): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const pattern of patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        found.push(pattern);
      }
    }

    return found;
  }

  /**
   * Check if aspect has been marked TBD by user
   */
  private isMarkedTBD(aspect: CharterAspect): boolean {
    return this.scores[aspect]?.markedTBD || false;
  }

  /**
   * Check if aspect has already been nudged
   */
  private hasBeenNudged(aspect: CharterAspect): boolean {
    return this.context.nudgeHistory.some((n) => n.aspect === aspect);
  }

  /**
   * Get human-readable confidence summary
   */
  public getConfidenceSummary(): string {
    const level = this.scores.qualityLevel;
    const overall = this.scores.overall;

    const summaries: Record<ConfidenceLevel, string> = {
      insufficient:
        'Missing critical information - needs more conversation',
      workable: 'Good enough to start - can refine later',
      good: 'Strong understanding - ready to build',
      excellent: 'Comprehensive clarity - excellent foundation',
    };

    return `${overall}% - ${summaries[level]}`;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default ConfidenceScorer;
