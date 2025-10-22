/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-22
 * @tags: [session-logging, quality-validation, adr-033, defensive-logging]
 * @related: [../core/session-log-manager.ts, ../commands/log.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-git, child_process]
 */

import { execSync } from 'child_process';
import { LogEntry, LogCategory } from '../core/session-log-manager.js';
import simpleGit from 'simple-git';

export interface QualityMetrics {
  score: number; // 0-10
  hasRootCauses: boolean; // Fix entries include root cause
  hasWhyForFeatures: boolean; // Features explain problem solved
  hasAlternatives: boolean; // Decisions include alternatives
  hasInsights: boolean; // At least one insight captured
  hasGitOps: boolean; // Git operations documented
  terseEntries: number; // Entries < 15 words
  suggestions: string[]; // Quality improvement suggestions
}

export interface GitContext {
  recentCommits: string[];
  currentBranch: string;
  modifiedFiles: string[];
  hasUncommittedChanges: boolean;
}

/**
 * Detect git operations and context for smart logging
 */
export async function detectGitContext(): Promise<GitContext> {
  const git = simpleGit();

  try {
    // Get current branch
    const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);

    // Get recent commits (last 5)
    const log = await git.log({ maxCount: 5 });
    const recentCommits = log.all.map(
      commit => `${commit.hash.substring(0, 7)} - ${commit.message}`
    );

    // Get modified files
    const status = await git.status();
    const modifiedFiles = [
      ...status.modified,
      ...status.created,
      ...status.deleted,
      ...status.renamed.map(r => r.to)
    ];

    return {
      recentCommits,
      currentBranch: currentBranch.trim(),
      modifiedFiles,
      hasUncommittedChanges: !status.isClean()
    };
  } catch (error) {
    // Return empty context if git operations fail
    return {
      recentCommits: [],
      currentBranch: '',
      modifiedFiles: [],
      hasUncommittedChanges: false
    };
  }
}

/**
 * Auto-detect files affected from git status
 */
export async function autoDetectFiles(): Promise<string[]> {
  const context = await detectGitContext();
  return context.modifiedFiles;
}

/**
 * Check if description contains WHY keywords
 */
function hasWhyKeywords(description: string): boolean {
  const whyKeywords = [
    'because',
    'to enable',
    'to fix',
    'to address',
    'solves',
    'addresses',
    'enables',
    'fixes',
    'root cause',
    'caused by',
    'rationale',
    'reason',
    'problem',
    'issue'
  ];

  const lowerDesc = description.toLowerCase();
  return whyKeywords.some(keyword => lowerDesc.includes(keyword));
}

/**
 * Check if description contains alternatives for decisions
 */
function hasAlternatives(description: string): boolean {
  const alternativeKeywords = [
    'alternative',
    'alternatives',
    'considered',
    'vs',
    'versus',
    'instead of',
    'rather than',
    'over',
    'compared to',
    'option',
    'choice'
  ];

  const lowerDesc = description.toLowerCase();
  return alternativeKeywords.some(keyword => lowerDesc.includes(keyword));
}

/**
 * Count words in a description
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Check if entry is terse (< 15 words)
 */
function isTerse(description: string): boolean {
  return countWords(description) < 15;
}

/**
 * Extract entries by category from log content
 */
function extractByCategory(logContent: string, category: string): string[] {
  const entries: string[] = [];

  // Match entry pattern: ### HH:MM - [category]
  const entryRegex = new RegExp(
    `### \\d{2}:\\d{2} - \\[${category}\\]\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`,
    'g'
  );

  let match;
  while ((match = entryRegex.exec(logContent)) !== null) {
    entries.push(match[1].trim());
  }

  return entries;
}

/**
 * Score session log quality based on criteria
 */
export function scoreSessionLog(logContent: string): QualityMetrics {
  const fixes = extractByCategory(logContent, 'fix');
  const features = extractByCategory(logContent, 'feature');
  const decisions = extractByCategory(logContent, 'decision');
  const insights = extractByCategory(logContent, 'insight');
  const gitOps = extractByCategory(logContent, 'git');

  let score = 10.0;
  const suggestions: string[] = [];

  // Check root causes in fixes
  const fixesWithRootCause = fixes.filter(f => hasWhyKeywords(f));
  const fixRatio = fixes.length > 0 ? fixesWithRootCause.length / fixes.length : 1;
  const hasRootCauses = fixRatio >= 0.8;

  if (!hasRootCauses && fixes.length > 0) {
    score -= 1.0;
    suggestions.push(
      `Add root causes to fix entries (${fixesWithRootCause.length}/${fixes.length} have them)`
    );
  }

  // Check WHY in features
  const featuresWithWhy = features.filter(f => hasWhyKeywords(f));
  const featureRatio = features.length > 0 ? featuresWithWhy.length / features.length : 1;
  const hasWhyForFeatures = featureRatio >= 0.7;

  if (!hasWhyForFeatures && features.length > 0) {
    score -= 1.5;
    suggestions.push(
      `Add WHY (problem solved) to feature entries (${featuresWithWhy.length}/${features.length} have it)`
    );
  }

  // Check alternatives in decisions
  const decisionsWithAlternatives = decisions.filter(d => hasAlternatives(d));
  const decisionRatio = decisions.length > 0 ? decisionsWithAlternatives.length / decisions.length : 1;
  const hasAlternativesPresent = decisionRatio >= 0.6;

  if (!hasAlternativesPresent && decisions.length > 0) {
    score -= 1.0;
    suggestions.push(
      `Document alternatives in decision entries (${decisionsWithAlternatives.length}/${decisions.length} have them)`
    );
  }

  // Check for insights
  const hasInsightsPresent = insights.length > 0;
  if (!hasInsightsPresent) {
    score -= 0.5;
    suggestions.push('Consider documenting insights and learnings discovered during session');
  }

  // Check for git operations
  const hasGitOps = gitOps.length > 0;
  if (!hasGitOps) {
    suggestions.push('Consider logging git operations (commits, merges, branch changes)');
  }

  // Count terse entries across all categories
  const allDescriptions = [...fixes, ...features, ...decisions, ...insights, ...gitOps];
  const terseEntries = allDescriptions.filter(d => isTerse(d)).length;

  if (terseEntries > 0) {
    score -= 0.5;
    suggestions.push(
      `${terseEntries} entries are terse (<15 words). Add more context for better handoffs.`
    );
  }

  return {
    score: Math.max(0, Math.min(10, score)),
    hasRootCauses,
    hasWhyForFeatures,
    hasAlternatives: hasAlternativesPresent,
    hasInsights: hasInsightsPresent,
    hasGitOps,
    terseEntries,
    suggestions
  };
}

/**
 * Validate a single log entry for quality
 */
export function validateEntry(entry: LogEntry): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for terse descriptions
  if (isTerse(entry.description)) {
    warnings.push('Description is terse (<15 words). Consider adding more context.');
  }

  // Check category-specific requirements
  switch (entry.category) {
    case 'fix':
      if (!hasWhyKeywords(entry.description)) {
        warnings.push('Fix entry should include root cause (why it happened).');
      }
      break;

    case 'feature':
      if (!hasWhyKeywords(entry.description)) {
        warnings.push('Feature entry should explain WHY (what problem it solves).');
      }
      break;

    case 'decision':
      if (!hasAlternatives(entry.description)) {
        warnings.push('Decision entry should mention alternatives considered.');
      }
      break;

    case 'insight':
      // Insights are flexible, just check they're not too terse
      break;

    case 'git':
    case 'achievement':
      // These are typically fine as-is
      break;
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Generate quality examples for help text
 */
export function getQualityExamples(): string {
  return `
Quality Examples:

GOOD - Fix with root cause:
  "Fixed authentication timeout in login flow. Root cause: bcrypt rounds set to 15
   (too slow). Reduced to 11 for 200ms response time while maintaining security."

BAD - Fix without root cause:
  "Fixed auth timeout"

GOOD - Feature with WHY:
  "Implemented --show flag for ginko log command. Problem: Users couldn't view logged
   events without opening files manually. Solution: Added terminal view with summary
   statistics for quick access."

BAD - Feature without WHY:
  "Implemented --show flag"

GOOD - Decision with alternatives:
  "Chose JWT over session cookies for authentication. Alternatives: 1) Server-side
   sessions (better security but harder to scale), 2) OAuth only (simpler but vendor
   lock-in). JWT selected for stateless scaling and mobile client support."

BAD - Decision without alternatives:
  "Chose JWT for authentication"

GOOD - Insight with context:
  "Discovered bcrypt rounds 10-11 provide optimal security/performance balance. Testing
   showed rounds 15 caused 800ms login delays; rounds 11 achieved 200ms with acceptable
   entropy per OWASP standards."

BAD - Insight without context:
  "Bcrypt rounds should be 11"
`;
}

/**
 * Suggest insights based on patterns in session log
 */
export function suggestInsights(logContent: string): string[] {
  const suggestions: string[] = [];
  const fixes = extractByCategory(logContent, 'fix');

  // Check for repeated errors
  const errorPatterns = new Map<string, number>();
  for (const fix of fixes) {
    // Extract potential error patterns (simplified)
    const words = fix.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 5) {
        // Only count meaningful words
        errorPatterns.set(word, (errorPatterns.get(word) || 0) + 1);
      }
    }
  }

  // Find patterns that occurred multiple times
  for (const [pattern, count] of errorPatterns) {
    if (count >= 2) {
      suggestions.push(
        `Pattern detected: "${pattern}" mentioned in ${count} fix entries. Consider documenting this as an insight.`
      );
    }
  }

  // Check for performance-related fixes
  const performanceKeywords = ['slow', 'timeout', 'performance', 'latency', 'delay'];
  const hasPerformanceFixes = fixes.some(f =>
    performanceKeywords.some(kw => f.toLowerCase().includes(kw))
  );

  if (hasPerformanceFixes) {
    suggestions.push('Performance improvements detected. Consider documenting the optimization as an insight.');
  }

  return suggestions;
}
