/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, synthesis, content-generation, conversation-processing]
 * @related: [signal-detection.ts, confidence-scorer.ts, charter-versioning.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: []
 */

import { randomUUID } from 'crypto';
import type {
  Charter,
  CharterContent,
  CharterScope,
  CharterConfidence,
  ConversationContext,
  ExtractedContent,
  WorkMode,
} from '../../types/charter.js';
import { WORK_MODE_CHARACTERISTICS } from '../../types/charter.js';
import {
  createInitialVersion,
  versionToString,
  createInitialChangelog,
} from './charter-versioning.js';
import {
  detectWorkMode,
  analyzeResponseDepth,
  detectUserTone,
  detectSignals,
} from './signal-detection.js';

// ============================================================================
// Content Extraction Patterns
// ============================================================================

/**
 * Patterns for extracting content from conversation
 */
const EXTRACTION_PATTERNS = {
  problem: [
    'problem',
    'issue',
    'challenge',
    'pain',
    'frustration',
    'difficulty',
    'bottleneck',
    'blocker',
  ],
  value: [
    'value',
    'benefit',
    'impact',
    'improve',
    'save',
    'enable',
    'unlock',
    'empower',
    'help',
    'solve',
  ],
  userTypes: [
    'users',
    'developers',
    'team',
    'engineers',
    'designers',
    'customers',
    'clients',
    'stakeholders',
  ],
  success: [
    'success',
    'measure',
    'metric',
    'criteria',
    'done',
    'complete',
    'finished',
    'working',
  ],
  inScope: [
    'includes',
    'covers',
    'handles',
    'supports',
    'provides',
    'features',
    'building',
    'creating',
  ],
  outOfScope: [
    'not',
    'excluding',
    'skip',
    'defer',
    'later',
    'phase 2',
    'future',
    "won't",
  ],
  constraints: ['constraint', 'limit', 'requirement', 'must', 'cannot', 'should'],
  timeline: ['timeline', 'deadline', 'schedule', 'date', 'week', 'month', 'sprint'],
  team: ['team', 'member', 'role', 'responsible', 'owner', 'stakeholder'],
  risks: ['risk', 'concern', 'worry', 'potential problem', 'might fail', 'challenge'],
  alternatives: [
    'alternative',
    'option',
    'could also',
    'instead',
    'another way',
    'considered',
  ],
} as const;

// ============================================================================
// Charter Synthesizer
// ============================================================================

/**
 * Main charter synthesizer class
 */
export class CharterSynthesizer {
  private context: ConversationContext;
  private workMode: WorkMode;
  private confidence: CharterConfidence;

  constructor(context: ConversationContext, confidence: CharterConfidence) {
    this.context = context;
    this.confidence = confidence;
    this.workMode = detectWorkMode(context);
  }

  /**
   * Synthesize complete charter from conversation context
   */
  public synthesize(projectId: string): Charter {
    const extracted = this.extractContent();
    const content = this.generateContent(extracted);
    const version = createInitialVersion();

    const charter: Charter = {
      id: randomUUID(),
      projectId,
      status: 'draft',
      workMode: this.workMode,
      version,
      createdAt: new Date(),
      updatedAt: new Date(),
      content,
      confidence: this.confidence,
      changelog: [],
    };

    // Add initial changelog entry
    charter.changelog = [createInitialChangelog(charter, this.getParticipants())];

    return charter;
  }

  /**
   * Extract content from conversation exchanges
   */
  private extractContent(): ExtractedContent {
    const allText = this.getAllConversationText();
    const extracted: ExtractedContent = {
      problemStatements: this.extractPhrases(allText, 'problem'),
      valueStatements: this.extractPhrases(allText, 'value'),
      userTypes: this.extractPhrases(allText, 'userTypes'),
      successCriteria: this.extractPhrases(allText, 'success'),
      inScope: this.extractPhrases(allText, 'inScope'),
      outOfScope: this.extractPhrases(allText, 'outOfScope'),
      constraints: this.extractPhrases(allText, 'constraints'),
      timeline: this.extractPhrases(allText, 'timeline'),
      team: this.extractPhrases(allText, 'team'),
    };

    // Add optional sections for full-planning mode
    if (this.workMode === 'full-planning') {
      extracted.risks = this.extractPhrases(allText, 'risks');
      extracted.alternatives = this.extractPhrases(allText, 'alternatives');
    }

    return extracted;
  }

  /**
   * Generate charter content from extracted phrases
   */
  private generateContent(extracted: ExtractedContent): CharterContent {
    const content: CharterContent = {
      purpose: this.synthesizePurpose(extracted),
      users: this.synthesizeUsers(extracted),
      successCriteria: this.synthesizeSuccess(extracted),
      scope: this.synthesizeScope(extracted),
    };

    // Add optional sections based on work mode
    if (extracted.constraints.length > 0) {
      content.constraints = this.synthesizeConstraints(extracted);
    }

    if (extracted.timeline.length > 0) {
      content.timeline = this.synthesizeTimeline(extracted);
    }

    if (extracted.team.length > 0) {
      content.team = extracted.team;
    }

    if (this.workMode === 'full-planning') {
      if (extracted.risks && extracted.risks.length > 0) {
        content.risks = extracted.risks;
      }
      if (extracted.alternatives && extracted.alternatives.length > 0) {
        content.alternatives = extracted.alternatives;
      }
      // Governance placeholder for full-planning
      content.governance = this.synthesizeGovernance();
    }

    return content;
  }

  /**
   * Synthesize purpose statement from extracted content
   */
  private synthesizePurpose(extracted: ExtractedContent): string {
    const { problemStatements, valueStatements } = extracted;

    // If low confidence, mark as TBD
    if (this.confidence.purpose.score < 40) {
      return 'TBD - Purpose needs clarification during development';
    }

    const parts: string[] = [];

    // Problem statement
    if (problemStatements.length > 0) {
      parts.push(problemStatements[0]);
    }

    // Value proposition
    if (valueStatements.length > 0) {
      if (parts.length > 0) {
        parts.push('This will ' + valueStatements[0]);
      } else {
        parts.push(valueStatements[0]);
      }
    }

    if (parts.length === 0) {
      return 'TBD - Purpose needs clarification';
    }

    return parts.join('. ');
  }

  /**
   * Synthesize user personas from extracted content
   */
  private synthesizeUsers(extracted: ExtractedContent): string[] {
    if (this.confidence.users.score < 40) {
      return ['TBD - User personas need clarification'];
    }

    if (extracted.userTypes.length === 0) {
      return ['TBD - Users not yet identified'];
    }

    // Remove duplicates and return unique user types
    return [...new Set(extracted.userTypes)];
  }

  /**
   * Synthesize success criteria from extracted content
   */
  private synthesizeSuccess(extracted: ExtractedContent): string[] {
    if (this.confidence.success.score < 40) {
      return ['TBD - Success criteria need definition'];
    }

    if (extracted.successCriteria.length === 0) {
      return ['TBD - Success metrics not yet defined'];
    }

    return extracted.successCriteria;
  }

  /**
   * Synthesize scope from extracted content
   */
  private synthesizeScope(extracted: ExtractedContent): CharterScope {
    const scope: CharterScope = {
      inScope: [],
      outOfScope: [],
      tbd: [],
    };

    // In-scope items
    if (extracted.inScope.length > 0) {
      scope.inScope = extracted.inScope;
    } else if (this.confidence.scope.score < 40) {
      scope.tbd.push('In-scope features need definition');
    }

    // Out-of-scope items
    if (extracted.outOfScope.length > 0) {
      scope.outOfScope = extracted.outOfScope;
    }

    // Mark entire scope as TBD if very low confidence
    if (this.confidence.scope.score < 30) {
      scope.tbd.push('Scope boundaries need clarification');
    }

    return scope;
  }

  /**
   * Synthesize constraints from extracted content
   */
  private synthesizeConstraints(extracted: ExtractedContent): string {
    if (extracted.constraints.length === 0) {
      return '';
    }

    return extracted.constraints.join('; ');
  }

  /**
   * Synthesize timeline from extracted content
   */
  private synthesizeTimeline(extracted: ExtractedContent): string {
    if (extracted.timeline.length === 0) {
      return '';
    }

    return extracted.timeline.join('; ');
  }

  /**
   * Synthesize governance section (full-planning only)
   */
  private synthesizeGovernance(): string {
    // Placeholder - will be enhanced based on conversation
    return 'TBD - Governance structure to be defined';
  }

  /**
   * Extract key phrases from text based on pattern type
   */
  private extractPhrases(text: string, patternType: keyof typeof EXTRACTION_PATTERNS): string[] {
    const keywords = EXTRACTION_PATTERNS[patternType];
    const phrases: string[] = [];

    // Get sentences that contain keywords
    const sentences = this.context.exchanges
      .map((e) => e.response)
      .join('. ')
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const hasKeyword = keywords.some((keyword) =>
        lowerSentence.includes(keyword.toLowerCase())
      );

      if (hasKeyword && !phrases.includes(sentence)) {
        phrases.push(sentence);
      }
    }

    // Limit to most relevant phrases (max 5 per type)
    return phrases.slice(0, 5);
  }

  /**
   * Render charter as markdown
   */
  public renderMarkdown(charter: Charter): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Project Charter`);
    lines.push('');
    lines.push(`**Status:** ${charter.status}`);
    lines.push(`**Work Mode:** ${WORK_MODE_CHARACTERISTICS[charter.workMode].name}`);
    lines.push(`**Version:** ${versionToString(charter.version)}`);
    lines.push(`**Confidence:** ${charter.confidence.overall}%`);
    lines.push(`**Created:** ${charter.createdAt.toISOString().split('T')[0]}`);
    lines.push(`**Updated:** ${charter.updatedAt.toISOString().split('T')[0]}`);
    lines.push('');

    // Purpose
    lines.push('## Purpose');
    lines.push('');
    lines.push(charter.content.purpose);
    lines.push('');

    // Users
    lines.push('## Users & Stakeholders');
    lines.push('');
    for (const user of charter.content.users) {
      lines.push(`- ${user}`);
    }
    lines.push('');

    // Success Criteria
    lines.push('## Success Criteria');
    lines.push('');
    for (const criteria of charter.content.successCriteria) {
      lines.push(`- ${criteria}`);
    }
    lines.push('');

    // Scope
    lines.push('## Scope');
    lines.push('');
    if (charter.content.scope.inScope.length > 0) {
      lines.push('### In Scope');
      for (const item of charter.content.scope.inScope) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }

    if (charter.content.scope.outOfScope.length > 0) {
      lines.push('### Out of Scope');
      for (const item of charter.content.scope.outOfScope) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }

    if (charter.content.scope.tbd.length > 0) {
      lines.push('### To Be Determined');
      for (const item of charter.content.scope.tbd) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }

    // Optional sections
    if (charter.content.constraints) {
      lines.push('## Constraints');
      lines.push('');
      lines.push(charter.content.constraints);
      lines.push('');
    }

    if (charter.content.timeline) {
      lines.push('## Timeline');
      lines.push('');
      lines.push(charter.content.timeline);
      lines.push('');
    }

    if (charter.content.team && charter.content.team.length > 0) {
      lines.push('## Team');
      lines.push('');
      for (const member of charter.content.team) {
        lines.push(`- ${member}`);
      }
      lines.push('');
    }

    if (charter.content.risks && charter.content.risks.length > 0) {
      lines.push('## Risks');
      lines.push('');
      for (const risk of charter.content.risks) {
        lines.push(`- ${risk}`);
      }
      lines.push('');
    }

    if (charter.content.alternatives && charter.content.alternatives.length > 0) {
      lines.push('## Alternatives Considered');
      lines.push('');
      for (const alt of charter.content.alternatives) {
        lines.push(`- ${alt}`);
      }
      lines.push('');
    }

    if (charter.content.governance) {
      lines.push('## Governance');
      lines.push('');
      lines.push(charter.content.governance);
      lines.push('');
    }

    // Confidence breakdown
    lines.push('## Confidence Assessment');
    lines.push('');
    lines.push(`**Overall:** ${charter.confidence.overall}%`);
    lines.push('');
    lines.push('### Aspect Scores');
    lines.push(`- **Purpose:** ${charter.confidence.purpose.score}%`);
    if (charter.confidence.purpose.signals.length > 0) {
      lines.push(`  - Signals: ${charter.confidence.purpose.signals.join(', ')}`);
    }
    if (charter.confidence.purpose.missing.length > 0) {
      lines.push(`  - Missing: ${charter.confidence.purpose.missing.join(', ')}`);
    }
    lines.push('');

    lines.push(`- **Users:** ${charter.confidence.users.score}%`);
    if (charter.confidence.users.signals.length > 0) {
      lines.push(`  - Signals: ${charter.confidence.users.signals.join(', ')}`);
    }
    if (charter.confidence.users.missing.length > 0) {
      lines.push(`  - Missing: ${charter.confidence.users.missing.join(', ')}`);
    }
    lines.push('');

    lines.push(`- **Success:** ${charter.confidence.success.score}%`);
    if (charter.confidence.success.signals.length > 0) {
      lines.push(`  - Signals: ${charter.confidence.success.signals.join(', ')}`);
    }
    if (charter.confidence.success.missing.length > 0) {
      lines.push(`  - Missing: ${charter.confidence.success.missing.join(', ')}`);
    }
    lines.push('');

    lines.push(`- **Scope:** ${charter.confidence.scope.score}%`);
    if (charter.confidence.scope.signals.length > 0) {
      lines.push(`  - Signals: ${charter.confidence.scope.signals.join(', ')}`);
    }
    if (charter.confidence.scope.missing.length > 0) {
      lines.push(`  - Missing: ${charter.confidence.scope.missing.join(', ')}`);
    }
    lines.push('');

    // Changelog
    if (charter.changelog.length > 0) {
      lines.push('## Changelog');
      lines.push('');
      for (const entry of charter.changelog) {
        lines.push(`### v${entry.version} - ${entry.date}`);
        for (const change of entry.changes) {
          lines.push(`- ${change}`);
        }
        if (entry.participants.length > 0) {
          lines.push(`- Participants: ${entry.participants.join(', ')}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get all conversation text
   */
  private getAllConversationText(): string {
    return this.context.exchanges
      .map((e) => `${e.question} ${e.response}`)
      .join(' ');
  }

  /**
   * Get conversation participants
   */
  private getParticipants(): string[] {
    // Extract participants from context
    // For now, default to generic participants
    return ['User', 'AI Assistant'];
  }

  /**
   * Generate metadata for charter
   */
  public generateMetadata(workMode: WorkMode, confidence: CharterConfidence): {
    workMode: WorkMode;
    targetTime: number;
    requiredSections: string[];
    confidence: number;
  } {
    const characteristics = WORK_MODE_CHARACTERISTICS[workMode];

    return {
      workMode,
      targetTime: characteristics.targetTime,
      requiredSections: [...characteristics.requiredSections],
      confidence: confidence.overall,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create synthesizer from conversation context
 */
export function createSynthesizer(
  context: ConversationContext,
  confidence: CharterConfidence
): CharterSynthesizer {
  return new CharterSynthesizer(context, confidence);
}

/**
 * Quick synthesis for testing
 */
export function quickSynthesize(
  context: ConversationContext,
  confidence: CharterConfidence,
  projectId: string
): Charter {
  const synthesizer = new CharterSynthesizer(context, confidence);
  return synthesizer.synthesize(projectId);
}
