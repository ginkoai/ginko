/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, conversation, facilitator, natural-dialog, adaptive-questions]
 * @related: [confidence-scorer.ts, conversation-context.ts, question-templates.ts, ../../types/charter.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [prompts]
 */

import prompts from 'prompts';
import chalk from 'chalk';
import {
  Charter,
  CharterContent,
  CharterAspect,
  WorkMode,
  QuestionContext,
  CONFIDENCE_THRESHOLDS,
  CharterConfidence,
} from '../../types/charter.js';
import { ConversationContextManager } from './conversation-context.js';
import { ConfidenceScorer } from './confidence-scorer.js';
import {
  selectOpeningPrompt,
  selectQuestion,
  selectNudge,
  selectTBDMessage,
  selectSynthesisMessage,
} from './question-templates.js';

/**
 * Result returned by the facilitate() method
 */
export interface FacilitatorResult {
  content: CharterContent;
  workMode: WorkMode;
  confidence: CharterConfidence;
}

/**
 * Conversation Facilitator - Manages natural charter creation dialog
 *
 * Core Philosophy:
 * - Opens naturally with "What would you like to build?" (not announcing charter)
 * - Adaptive question generation based on confidence scores
 * - Gentle nudging when clarity needed (tact, patience, deference)
 * - TBD handling: Mark and move on if nudge doesn't work
 * - Completion logic: overall confidence > 70% OR all critical aspects > 40%
 * - Uses AI's native voice (not canned questions)
 *
 * The facilitator guides conversation like a thoughtful technical partner,
 * not a bureaucratic form or interrogation.
 */
export class ConversationFacilitator {
  private contextManager: ConversationContextManager;
  private scorer: ConfidenceScorer;
  private questionHistory: string[] = [];

  constructor() {
    this.contextManager = new ConversationContextManager();
    // Note: ConfidenceScorer constructor needs context, so we'll initialize it after first exchange
    this.scorer = new ConfidenceScorer(this.contextManager.getContext());
  }

  /**
   * Main conversation loop - orchestrates charter creation dialog
   *
   * Returns: Charter data ready for synthesis
   */
  async facilitate(): Promise<FacilitatorResult> {
    console.log(chalk.cyan('\n📋 Let\'s create a project charter together!\n'));

    // Phase 1: Opening - natural conversation starter
    const opening = this.generateOpening();
    const initialResponse = await this.prompt(opening);

    if (!initialResponse) {
      throw new Error('Conversation cancelled by user');
    }

    this.contextManager.addExchange(opening, initialResponse, 'purpose');
    this.updateScorer();

    // Phase 2: Adaptive exploration - ask questions based on what's missing
    while (!this.isComplete()) {
      const nextQuestion = this.generateNextQuestion();

      if (!nextQuestion) {
        // All aspects covered or user wants to stop
        break;
      }

      const response = await this.prompt(nextQuestion);

      if (!response) {
        // User cancelled - treat as stop signal
        break;
      }

      // Determine which aspect this question addressed
      const aspectAddressed = this.determineAspectsAddressed(nextQuestion)[0];
      this.contextManager.addExchange(nextQuestion, response, aspectAddressed);
      this.updateScorer();

      // Check if gentle nudge is needed
      if (this.shouldNudge()) {
        await this.gentleNudge();
      }
    }

    // Phase 3: Synthesis transition
    console.log(chalk.cyan(`\n${selectSynthesisMessage()}\n`));

    // Extract charter content from conversation
    const extracted = this.contextManager.getExtractedContent();
    const workMode = this.detectWorkMode();
    const scores = this.scorer.getScores();

    // Build charter content structure
    const content: CharterContent = {
      purpose: this.synthesizePurpose(extracted),
      users: extracted.userTypes,
      successCriteria: extracted.successCriteria,
      scope: {
        inScope: extracted.inScope,
        outOfScope: extracted.outOfScope,
        tbd: [], // Will be populated based on low confidence scores
      },
      constraints: extracted.constraints.join('; ') || undefined,
      timeline: extracted.timeline.join('; ') || undefined,
      team: extracted.team,
    };

    return {
      content,
      workMode,
      confidence: scores,
    };
  }

  /**
   * Generate opening question - natural conversation starter
   */
  private generateOpening(): string {
    return selectOpeningPrompt();
  }

  /**
   * Generate next question based on confidence scores and conversation flow
   *
   * Adaptive strategy:
   * - Asks about lowest-confidence aspect first
   * - Avoids asking same question twice
   * - Builds on previous answers (shows listening)
   */
  private generateNextQuestion(): string | null {
    const scores = this.scorer.getScores();

    // Check stop conditions
    if (this.contextManager.hasStopSignals()) {
      return null;
    }

    // Find aspect with lowest confidence that needs probing
    const unclearAspect = this.getMostUnclearAspect();

    if (!unclearAspect) {
      // All aspects covered sufficiently
      return null;
    }

    // Build question context
    const questionContext: QuestionContext = {
      previousQuestions: this.questionHistory,
      aspectsCovered: new Set(
        this.contextManager.getContext().exchanges
          .map(e => e.aspect)
          .filter((a): a is CharterAspect => a !== undefined)
      ),
      responseDepth: this.assessResponseDepth(),
      userTone: this.assessUserTone(),
    };

    // Select appropriate question for the aspect
    const question = selectQuestion(unclearAspect, questionContext);
    this.questionHistory.push(question);

    return question;
  }

  /**
   * Perform gentle nudge when aspect needs more clarity
   *
   * Per Chris's principle: "AI is first-class partner whose needs should be respected"
   *
   * Strategy:
   * - Explain why the information would help
   * - Ask respectfully (not demanding)
   * - If nudge doesn't work, mark TBD and move on
   * - Maximum 1 nudge per aspect, 3 total across conversation
   */
  private async gentleNudge(): Promise<void> {
    const unclearAspect = this.getMostUnclearAspect();

    if (!unclearAspect || this.contextManager.hasNudgedRecently()) {
      return;
    }

    const nudgeMessage = selectNudge(unclearAspect);
    console.log(chalk.yellow(`\n${nudgeMessage}\n`));

    const response = await this.prompt('');

    if (!response || response.length < 15) {
      // User declined or gave very short response - record as declined
      this.contextManager.recordNudge(unclearAspect, 'declined');
      console.log(chalk.dim(`\n${selectTBDMessage()}\n`));
      return;
    }

    // User provided more detail - record as clarified and add to conversation
    this.contextManager.recordNudge(unclearAspect, 'clarified');
    this.contextManager.addExchange(nudgeMessage, response, unclearAspect);
    this.updateScorer();
  }

  /**
   * Check if conversation should continue or is complete
   *
   * Complete if:
   * - Overall confidence > 70%, OR
   * - All critical aspects > 40%, OR
   * - User showing stop signals, OR
   * - Too many nudges attempted
   */
  private isComplete(): boolean {
    const scores = this.scorer.getScores();
    const context = this.contextManager.getContext();

    // Check overall confidence
    if (scores.overall >= CONFIDENCE_THRESHOLDS.WORKABLE) {
      return true;
    }

    // Check if all critical aspects meet minimum
    const allCritical =
      scores.purpose.score >= CONFIDENCE_THRESHOLDS.CRITICAL &&
      scores.users.score >= CONFIDENCE_THRESHOLDS.CRITICAL &&
      scores.success.score >= CONFIDENCE_THRESHOLDS.CRITICAL &&
      scores.scope.score >= CONFIDENCE_THRESHOLDS.CRITICAL;

    if (allCritical) {
      return true;
    }

    // Check stop signals
    if (context.userStopSignals.length > 0) {
      return true;
    }

    // Check nudge limit (max 3)
    if (context.nudgeHistory.length >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Check if gentle nudge should be used
   */
  private shouldNudge(): boolean {
    // Don't nudge if we just nudged
    if (this.contextManager.hasNudgedRecently()) {
      return false;
    }

    // Don't nudge if we've hit limit
    if (this.contextManager.getContext().nudgeHistory.length >= 3) {
      return false;
    }

    // Nudge if any aspect critically low
    return this.scorer.needsAdditionalProbing();
  }

  /**
   * Get the aspect with lowest confidence that needs attention
   */
  private getMostUnclearAspect(): CharterAspect | null {
    const scores = this.scorer.getScores();

    // Build list of aspects with scores
    const aspects: Array<{ aspect: CharterAspect; score: number }> = [
      { aspect: 'purpose' as CharterAspect, score: scores.purpose.score },
      { aspect: 'users' as CharterAspect, score: scores.users.score },
      { aspect: 'success' as CharterAspect, score: scores.success.score },
      { aspect: 'scope' as CharterAspect, score: scores.scope.score },
    ];

    // Find aspects below workable threshold
    const needsWork = aspects.filter(a => a.score < CONFIDENCE_THRESHOLDS.WORKABLE);

    if (needsWork.length === 0) {
      return null;
    }

    // Return lowest scoring aspect
    needsWork.sort((a, b) => a.score - b.score);
    return needsWork[0].aspect;
  }

  /**
   * Detect work mode from conversation signals
   */
  private detectWorkMode(): WorkMode {
    const signals = this.contextManager.getWorkModeSignals();

    // Find mode with most signals
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

    return modes[0].mode;
  }

  /**
   * Synthesize purpose statement from extracted content
   */
  private synthesizePurpose(extracted: any): string {
    const parts: string[] = [];

    if (extracted.problemStatements.length > 0) {
      parts.push(`**Problem:** ${extracted.problemStatements.join('. ')}`);
    }

    if (extracted.valueStatements.length > 0) {
      parts.push(`**Value:** ${extracted.valueStatements.join('. ')}`);
    }

    return parts.join('\n\n') || 'To be determined';
  }

  /**
   * Assess depth of user responses (shallow, moderate, deep)
   */
  private assessResponseDepth(): 'shallow' | 'moderate' | 'deep' {
    const exchanges = this.contextManager.getContext().exchanges;

    if (exchanges.length === 0) return 'moderate';

    const avgLength = exchanges.reduce((sum, e) => sum + e.answer.length, 0) / exchanges.length;

    if (avgLength < 30) return 'shallow';
    if (avgLength < 100) return 'moderate';
    return 'deep';
  }

  /**
   * Assess user's tone (urgent, exploratory, methodical)
   */
  private assessUserTone(): 'urgent' | 'exploratory' | 'methodical' {
    const signals = this.contextManager.getWorkModeSignals();

    // Urgent tone correlates with hack-ship
    if (signals.hackShip > signals.thinkBuild && signals.hackShip > signals.fullPlanning) {
      return 'urgent';
    }

    // Methodical tone correlates with full-planning
    if (signals.fullPlanning > signals.hackShip) {
      return 'methodical';
    }

    return 'exploratory';
  }

  /**
   * Determine which aspects a question addresses
   */
  private determineAspectsAddressed(question: string): CharterAspect[] {
    const aspects: CharterAspect[] = [];
    const lower = question.toLowerCase();

    // Purpose indicators
    if (lower.includes('problem') || lower.includes('pain') || lower.includes('why') ||
        lower.includes('value') || lower.includes('solve')) {
      aspects.push('purpose');
    }

    // Users indicators
    if (lower.includes('who') || lower.includes('user') || lower.includes('team') ||
        lower.includes('customer') || lower.includes('people')) {
      aspects.push('users');
    }

    // Success indicators
    if (lower.includes('success') || lower.includes('measure') || lower.includes('know it\'s working') ||
        lower.includes('goal') || lower.includes('outcome')) {
      aspects.push('success');
    }

    // Scope indicators
    if (lower.includes('scope') || lower.includes('building') || lower.includes('not building') ||
        lower.includes('minimum') || lower.includes('feature') || lower.includes('boundaries')) {
      aspects.push('scope');
    }

    // Default to purpose if no clear match
    if (aspects.length === 0) {
      aspects.push('purpose');
    }

    return aspects;
  }

  /**
   * Update confidence scorer with current context
   */
  private updateScorer(): void {
    this.scorer = new ConfidenceScorer(this.contextManager.getContext());
    this.scorer.update();
  }

  /**
   * Prompt user for input
   */
  private async prompt(message: string): Promise<string | null> {
    const response = await prompts({
      type: 'text',
      name: 'value',
      message: message || '> ',
      validate: (value: string) => {
        // Allow empty for optional questions, but not for opening
        if (!message && value.length === 0) {
          return 'Please provide a response';
        }
        return true;
      },
    });

    return response.value || null;
  }
}
