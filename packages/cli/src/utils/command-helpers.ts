/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-18
 * @pattern: utility
 * @tags: [command-patterns, ai-first-ux, smart-defaults, adr-046, utility-command]
 * @related: [log-quality.ts, ../commands/log.ts, ADR-046-command-patterns-reflection-vs-utility.md]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, log-quality]
 */

import chalk from 'chalk';
import { LogCategory, LogImpact } from '../core/session-log-manager.js';
import { detectGitContext, validateEntry } from './log-quality.js';
import type { LogEntry } from '../core/session-log-manager.js';

/**
 * Category detection keywords and patterns
 */
const CATEGORY_PATTERNS: Record<LogCategory, RegExp[]> = {
  fix: [
    /\b(fixed|fix|bug|error|issue|resolved|patched|repaired)\b/i,
    /\b(root cause|caused by|breaking)\b/i,
    /\b(corrected|debugged|troubleshot)\b/i,
  ],
  feature: [
    /\b(implemented|added|created|built|developed)\b/i,
    /\b(new feature|enhancement|capability)\b/i,
    /\b(introducing|rolled out)\b/i,
  ],
  decision: [
    /\b(decided|chose|selected|opted for)\b/i,
    /\b(vs|versus|instead of|rather than|over)\b/i,
    /\b(alternative|option|choice|approach)\b/i,
    /\b(rationale|reasoning|considered)\b/i,
  ],
  insight: [
    /\b(discovered|learned|realized|found that)\b/i,
    /\b(insight|pattern|observation|gotcha)\b/i,
    /\b(breakthrough|understanding|key finding)\b/i,
  ],
  achievement: [
    /\b(completed|finished|delivered|shipped)\b/i,
    /\b(milestone|achievement|success)\b/i,
    /\b(100%|all tests|fully working)\b/i,
  ],
  git: [
    /\b(commit(ted)?|push(ed)?|merg(e|ed|ing)|rebas(e|ed|ing)|cherry-pick(ed)?)\b/i,
    /\b(pull request|pr)\b/i,
    /\b(git|version control)\b/i,
    /\b(created?|made|new)\s+(feature\s+)?branch\b/i, // Branch operations
    /\bbranch\b.*\b(created?|new|made)\b/i, // Branch creation
  ],
};

/**
 * Impact indicators - metrics and language intensity
 */
const IMPACT_INDICATORS = {
  high: {
    metrics: [
      /\b\d+%\s*(reduction|improvement|faster|increase)\b/i,
      /\b(by|improved|reduced).*\d+%/i,
      /\b(\d+x|10x|100x)\b/i,
      /\b(critical|severe|major|significant)\b/i,
      /\b(production|blocker|urgent|emergency)\b/i,
    ],
    quantitative: [
      /\b\d+\s*(ms|s|sec|seconds?|minutes?|hours?)\s*[→>-]+\s*\d+/i, // Performance changes
      /\bfrom\s+\d+\s*(ms|s|sec|seconds?)\s+to\s+\d+/i, // "from X to Y" pattern
      /\b(90|95|98|99|100)%/i, // High percentages
      /\b[5-9]\d{1,2}\s*tokens?\b/i, // Large token counts
    ],
  },
  medium: {
    keywords: [
      /\b(updated|modified|refactored|improved)\b/i,
      /\b(moderate|reasonable|noticeable)\b/i,
    ],
  },
  low: {
    keywords: [
      /\b(minor|small|trivial|cosmetic)\b/i,
      /\b(typo|formatting|cleanup|documentation)\b/i,
    ],
  },
};

/**
 * Detect category from description keywords
 * Returns null if no clear category detected (caller should use default)
 */
export function detectCategory(description: string): LogCategory | null {
  // Handle edge cases: null, undefined, empty, whitespace-only
  if (!description || typeof description !== 'string' || !description.trim()) {
    return null;
  }

  const scores: Record<LogCategory, number> = {
    fix: 0,
    feature: 0,
    decision: 0,
    insight: 0,
    achievement: 0,
    git: 0,
  };

  // Check for low-confidence cases (very short descriptions)
  const wordCount = description.trim().split(/\s+/).length;
  const isTerse = wordCount < 3;

  // Score each category based on pattern matches
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        scores[category as LogCategory] += 1;
      }
    }
  }

  // Find highest scoring category
  let maxScore = 0;
  let detectedCategory: LogCategory | null = null;

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category as LogCategory;
    }
  }

  // Require higher confidence for terse descriptions
  const minScore = isTerse ? 2 : 1;
  return maxScore >= minScore ? detectedCategory : null;
}

/**
 * Detect impact level from metrics and language intensity
 * Always returns a value (defaults to medium)
 */
export function detectImpact(description: string): LogImpact {
  // Handle edge cases: null, undefined, empty, whitespace-only
  if (!description || typeof description !== 'string' || !description.trim()) {
    return 'medium'; // Safe default
  }

  // Check for high impact indicators first
  for (const pattern of IMPACT_INDICATORS.high.metrics) {
    if (pattern.test(description)) {
      return 'high';
    }
  }

  for (const pattern of IMPACT_INDICATORS.high.quantitative) {
    if (pattern.test(description)) {
      return 'high';
    }
  }

  // Check for low impact indicators
  for (const pattern of IMPACT_INDICATORS.low.keywords) {
    if (pattern.test(description)) {
      return 'low';
    }
  }

  // Check for medium impact indicators (explicit)
  for (const pattern of IMPACT_INDICATORS.medium.keywords) {
    if (pattern.test(description)) {
      return 'medium';
    }
  }

  // Default to medium if no clear signals
  return 'medium';
}

/**
 * Determine if context module should be auto-created
 * High-value entries: high impact + specific categories
 */
export function shouldCreateContextModule(
  category: LogCategory,
  impact: LogImpact
): boolean {
  const eligibleCategories: LogCategory[] = ['fix', 'feature', 'decision', 'insight'];
  return impact === 'high' && eligibleCategories.includes(category);
}

/**
 * Gather git context for smart defaults
 * Wrapper around log-quality detectGitContext for convenience
 */
export async function gatherGitContext() {
  return await detectGitContext();
}

/**
 * Format quality description for educational feedback
 */
export function getQualityDescription(validation: {
  score: number;
  warnings: string[];
}): string {
  if (validation.score >= 90) {
    return chalk.green('Excellent ') + chalk.dim('(WHAT+WHY+HOW present)');
  } else if (validation.score >= 70) {
    return chalk.cyan('Good ') + chalk.dim('(meets quality threshold)');
  } else if (validation.score >= 50) {
    return chalk.yellow('Fair ') + chalk.dim('(could use more context)');
  } else {
    return chalk.red('Needs improvement ') + chalk.dim('(add WHAT+WHY+HOW)');
  }
}

/**
 * Extract WHAT/WHY/HOW breakdown from description
 * Returns formatted breakdown string if patterns detected
 */
export function getQualityBreakdown(description: string): string | null {
  const lines: string[] = [];

  // WHAT detection - action taken
  const whatMatch = description.match(
    /\b(fixed|implemented|added|created|chose|discovered|optimized|improved|refactored|updated|built|developed)\s+([^.!?]+)/i
  );
  if (whatMatch) {
    lines.push(`WHAT: "${whatMatch[0].trim()}"`);
  }

  // WHY detection - root cause or reason
  const whyPatterns = [
    /root cause:\s*([^.!?]+)/i,
    /because\s+([^.!?]+)/i,
    /caused by\s+([^.!?]+)/i,
    /problem:\s*([^.!?]+)/i,
  ];

  for (const pattern of whyPatterns) {
    const match = description.match(pattern);
    if (match) {
      lines.push(`WHY: "${match[0].trim()}"`);
      break;
    }
  }

  // HOW detection - solution or approach
  const howPatterns = [
    /solution:\s*([^.!?]+)/i,
    /implemented\s+([^.!?]+)/i,
    /by\s+(adding|removing|changing|using)\s+([^.!?]+)/i,
  ];

  for (const pattern of howPatterns) {
    const match = description.match(pattern);
    if (match) {
      lines.push(`HOW: "${match[0].trim()}"`);
      break;
    }
  }

  // IMPACT detection - metrics or results
  const impactPatterns = [
    /(\d+%|\d+x|\d+\s*(ms|s|sec|tokens?))\s*[→>-]+\s*(\d+%|\d+x|\d+\s*(ms|s|sec|tokens?))/i,
    /from\s+(\d+\s*(ms|s|sec|seconds?|minutes?))\s+to\s+(\d+\s*(ms|s|sec|seconds?|minutes?))/i,
  ];

  for (const pattern of impactPatterns) {
    const match = description.match(pattern);
    if (match) {
      lines.push(`IMPACT: "${match[0].trim()}"`);
      break;
    }
  }

  return lines.length >= 2 ? lines.join('\n  - ') : null;
}

/**
 * Format educational feedback output for utility commands
 * Standardized format across all commands
 */
export interface FeedbackOptions {
  category: LogCategory;
  impact: LogImpact;
  autoDetected?: {
    category?: boolean;
    impact?: boolean;
  };
  quality?: {
    score: number;
    warnings: string[];
  };
  files?: string[];
  references?: Array<{ rawText: string }>;
  moduleCreated?: boolean;
}

export function formatFeedback(options: FeedbackOptions): string {
  const lines: string[] = [];

  // Header - success message
  const autoLabel =
    options.autoDetected?.category || options.autoDetected?.impact
      ? chalk.dim(' (auto-detected)')
      : '';
  lines.push(
    chalk.green(`\n✓ Event logged: ${options.category} (${options.impact} impact)`) + autoLabel
  );

  // Quality analysis (if provided)
  if (options.quality) {
    lines.push('');
    lines.push(chalk.cyan('Quality: ') + getQualityDescription(options.quality));
  }

  // Auto-detection details (transparency)
  if (options.autoDetected?.category || options.autoDetected?.impact) {
    const detected: string[] = [];
    if (options.autoDetected.category) detected.push(`category=${options.category}`);
    if (options.autoDetected.impact) detected.push(`impact=${options.impact}`);
    lines.push(chalk.dim(`  Auto-detected: ${detected.join(', ')}`));
  }

  // Files included
  if (options.files && options.files.length > 0) {
    lines.push('');
    lines.push(chalk.cyan('Files: ') + chalk.dim(`${options.files.length} auto-included`));
    for (const file of options.files.slice(0, 3)) {
      lines.push(chalk.dim(`  - ${file}`));
    }
    if (options.files.length > 3) {
      lines.push(chalk.dim(`  ... and ${options.files.length - 3} more`));
    }
  }

  // References detected
  if (options.references && options.references.length > 0) {
    lines.push('');
    lines.push(chalk.cyan('References: ') + chalk.dim(`${options.references.length} detected`));
    for (const ref of options.references.slice(0, 3)) {
      lines.push(chalk.dim(`  - ${ref.rawText}`));
    }
  }

  // Context module creation
  if (options.moduleCreated) {
    lines.push('');
    lines.push(chalk.green('Context module: ') + chalk.dim('Created (high-impact pattern)'));
  }

  // Quality coaching (if warnings present)
  if (options.quality && options.quality.warnings.length > 0) {
    lines.push('');
    lines.push(chalk.yellow('💡 Quality Tips:'));
    for (const warning of options.quality.warnings) {
      lines.push(chalk.dim(`   ${warning}`));
    }
    lines.push(chalk.dim('\n   Next entry: Include WHAT+WHY+HOW for richer context'));
    lines.push(
      chalk.dim('   Example: "Fixed X. Root cause: Y. Solution: Z. Impact: A→B"')
    );
  }

  lines.push(''); // Blank line for spacing
  return lines.join('\n');
}

/**
 * Analyze entry quality and return scoring
 * Wrapper around validateEntry for consistency
 */
export function analyzeQuality(entry: LogEntry): { score: number; warnings: string[] } {
  const validation = validateEntry(entry);
  const score = validation.warnings.length === 0 ? 100 : Math.max(50, 100 - validation.warnings.length * 20);
  return {
    score,
    warnings: validation.warnings,
  };
}
