/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, conversation, context, state-management]
 * @related: [confidence-scorer.ts, conversation-facilitator.ts, ../../types/charter.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import {
  ConversationContext,
  Exchange,
  CharterAspect,
  WorkModeSignals,
  NudgeRecord,
} from './confidence-scorer.js';

// Re-export extracted content type from types/charter
import { ExtractedContent } from '../../types/charter.js';

/**
 * Manages conversation state during charter creation
 *
 * Tracks exchanges, accumulates signals, identifies patterns,
 * and provides context analysis for the conversation facilitator.
 */
export class ConversationContextManager {
  private context: ConversationContext;

  constructor() {
    this.context = {
      exchanges: [],
      workModeSignals: {
        hackShip: 0,
        thinkBuild: 0,
        fullPlanning: 0,
      },
      nudgeHistory: [],
      userStopSignals: [],
    };
  }

  /**
   * Add a question-response exchange to the conversation
   */
  addExchange(question: string, answer: string, aspect?: CharterAspect): void {
    this.context.exchanges.push({
      question,
      answer,
      timestamp: new Date(),
      aspect,
    });

    // Update work mode signals based on answer
    this.updateWorkModeSignals(answer);

    // Detect stop signals
    this.detectStopSignals(answer);
  }

  /**
   * Check if conversation mentions any of the given keywords
   */
  mentions(keywords: string[]): boolean {
    const allText = this.getAllText().toLowerCase();
    return keywords.some(keyword => allText.includes(keyword.toLowerCase()));
  }

  /**
   * Count how many times keywords appear in conversation
   */
  countSignals(keywords: string[]): number {
    const allText = this.getAllText().toLowerCase();
    return keywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = allText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Check if a gentle nudge was recently used
   */
  hasNudgedRecently(): boolean {
    if (this.context.nudgeHistory.length === 0) return false;
    const lastNudge = this.context.nudgeHistory[this.context.nudgeHistory.length - 1];
    const timeSinceLastNudge = Date.now() - lastNudge.timestamp.getTime();
    const fiveMinutes = 5 * 60 * 1000;
    return timeSinceLastNudge < fiveMinutes;
  }

  /**
   * Record that a nudge was used
   */
  recordNudge(aspect: CharterAspect, response: 'clarified' | 'stayed-vague' | 'declined' | 'frustrated'): void {
    this.context.nudgeHistory.push({
      aspect,
      timestamp: new Date(),
      response,
    });
  }

  /**
   * Check if user has signaled they want to stop
   */
  hasStopSignals(): boolean {
    return this.context.userStopSignals.length > 0;
  }

  /**
   * Get the full conversation context
   */
  getContext(): ConversationContext {
    return this.context;
  }

  /**
   * Get work mode signals
   */
  getWorkModeSignals(): WorkModeSignals {
    return this.context.workModeSignals;
  }

  /**
   * Extract user types mentioned in conversation
   */
  extractUserTypes(): string[] {
    const userPatterns = [
      /(?:for|targeting|users?|customers?|clients?)\s+(?:are|is|like)?\s*([^.,;]+)/gi,
      /(?:myself|my team|developers?|engineers?|designers?|managers?|stakeholders?)/gi,
    ];

    const matches: string[] = [];
    const allText = this.getAllText();

    userPatterns.forEach(pattern => {
      const found = allText.matchAll(pattern);
      for (const match of found) {
        if (match[1]) {
          matches.push(match[1].trim());
        } else if (match[0]) {
          matches.push(match[0].trim());
        }
      }
    });

    return [...new Set(matches)].slice(0, 5); // Dedupe and limit
  }

  /**
   * Extract in-scope features/capabilities
   */
  extractInScope(): string[] {
    const scopePatterns = [
      /(?:building|creating|implementing|adding|including)\s+([^.,;]+)/gi,
      /(?:features?|capabilities?|functionality)\s*:?\s*([^.,;]+)/gi,
      /(?:will|going to|plan to)\s+([^.,;]+)/gi,
    ];

    return this.extractWithPatterns(scopePatterns);
  }

  /**
   * Extract out-of-scope features/capabilities
   */
  extractOutOfScope(): string[] {
    const outScopePatterns = [
      /(?:not|won't|excluding|leave out|skip|defer)\s+(?:building|implementing|adding)?\s*([^.,;]+)/gi,
      /(?:out of scope|explicitly not|not planning)\s*:?\s*([^.,;]+)/gi,
    ];

    return this.extractWithPatterns(outScopePatterns);
  }

  /**
   * Extract success criteria mentioned
   */
  extractSuccessCriteria(): string[] {
    const successPatterns = [
      /(?:success|successful|working well)\s+(?:if|when|means)\s*([^.,;]+)/gi,
      /(?:know it's working|measure success)\s+(?:by|when|if)\s*([^.,;]+)/gi,
      /(?:goal|target|aim)\s+(?:is|would be)\s*([^.,;]+)/gi,
    ];

    return this.extractWithPatterns(successPatterns);
  }

  /**
   * Extract constraints mentioned
   */
  extractConstraints(): string[] {
    const constraintPatterns = [
      /(?:constraint|limitation|restriction|requirement)\s*:?\s*([^.,;]+)/gi,
      /(?:must|need to|have to|required to)\s+(?:use|work with|support)\s*([^.,;]+)/gi,
      /(?:existing|current)\s+(?:stack|platform|tech|technology)\s*:?\s*([^.,;]+)/gi,
    ];

    return this.extractWithPatterns(constraintPatterns);
  }

  /**
   * Extract timeline mentions
   */
  extractTimeline(): string[] {
    const timelinePatterns = [
      /(?:timeline|deadline|due|launch|release)\s*:?\s*([^.,;]+)/gi,
      /(?:by|before|within)\s+(\d+\s+(?:days?|weeks?|months?|quarters?))/gi,
      /(?:this|next)\s+(?:week|month|quarter|year)/gi,
    ];

    return this.extractWithPatterns(timelinePatterns);
  }

  /**
   * Extract team members mentioned
   */
  extractTeam(): string[] {
    const teamPatterns = [
      /(?:team|working with|collaborating with)\s*:?\s*([^.,;]+)/gi,
      /(?:myself|me|I|we|our team)/gi,
    ];

    return this.extractWithPatterns(teamPatterns);
  }

  /**
   * Extract problem statements
   */
  extractProblemStatements(): string[] {
    const problemPatterns = [
      /(?:problem|pain|frustration|challenge)\s+(?:is|with)\s*([^.,;]+)/gi,
      /(?:frustrating|annoying|difficult)\s+(?:that|when|because)\s*([^.,;]+)/gi,
    ];

    return this.extractWithPatterns(problemPatterns);
  }

  /**
   * Extract value statements
   */
  extractValueStatements(): string[] {
    const valuePatterns = [
      /(?:value|benefit|impact|help)\s+(?:is|would be|by)\s*([^.,;]+)/gi,
      /(?:important|valuable|critical)\s+(?:because|that|to)\s*([^.,;]+)/gi,
    ];

    return this.extractWithPatterns(valuePatterns);
  }

  /**
   * Get extracted content for synthesis
   */
  getExtractedContent(): ExtractedContent {
    return {
      problemStatements: this.extractProblemStatements(),
      valueStatements: this.extractValueStatements(),
      userTypes: this.extractUserTypes(),
      successCriteria: this.extractSuccessCriteria(),
      inScope: this.extractInScope(),
      outOfScope: this.extractOutOfScope(),
      constraints: this.extractConstraints(),
      timeline: this.extractTimeline(),
      team: this.extractTeam(),
    };
  }

  // Private helper methods

  private getAllText(): string {
    return this.context.exchanges
      .map(e => `${e.question} ${e.answer}`)
      .join(' ');
  }

  private extractWithPatterns(patterns: RegExp[]): string[] {
    const matches: string[] = [];
    const allText = this.getAllText();

    patterns.forEach(pattern => {
      const found = allText.matchAll(pattern);
      for (const match of found) {
        if (match[1]) {
          matches.push(match[1].trim());
        } else if (match[0]) {
          matches.push(match[0].trim());
        }
      }
    });

    return [...new Set(matches)].slice(0, 10); // Dedupe and limit
  }

  private updateWorkModeSignals(response: string): void {
    const lower = response.toLowerCase();

    // Hack & Ship signals
    const hackShipKeywords = ['quick', 'prototype', 'mvp', 'weekend', 'validate', 'experiment'];
    hackShipKeywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        this.context.workModeSignals.hackShip++;
      }
    });

    // Think & Build signals
    const thinkBuildKeywords = ['team', 'process', 'testing', 'architecture', 'design', 'quality'];
    thinkBuildKeywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        this.context.workModeSignals.thinkBuild++;
      }
    });

    // Full Planning signals
    const fullPlanningKeywords = ['stakeholders', 'governance', 'compliance', 'risks', 'enterprise', 'strategy'];
    fullPlanningKeywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        this.context.workModeSignals.fullPlanning++;
      }
    });
  }

  private detectStopSignals(answer: string): void {
    const lower = answer.toLowerCase();
    const stopPhrases = [
      'that\'s enough',
      'let\'s move on',
      'skip this',
      'not sure',
      'don\'t know',
      'just start',
      'stop asking',
    ];

    const stoppedPhrase = stopPhrases.find(phrase => lower.includes(phrase));
    if (stoppedPhrase) {
      this.context.userStopSignals.push(stoppedPhrase);
    }

    // Also detect very short answers repeatedly (user fatigue)
    const recentExchanges = this.context.exchanges.slice(-3);
    if (recentExchanges.length >= 3) {
      const allShort = recentExchanges.every(e => e.answer.length < 20);
      if (allShort) {
        this.context.userStopSignals.push('short answers detected (user fatigue)');
      }
    }
  }
}
