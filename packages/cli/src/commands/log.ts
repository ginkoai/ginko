/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-22
 * @tags: [session-logging, defensive-logging, adr-033, references, task-010]
 * @related: [../core/session-log-manager.ts, start/start-reflection.ts, ../utils/reference-parser.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [chalk, commander, session-log-manager, reference-parser]
 */

import chalk from 'chalk';
import prompts from 'prompts';
import { v4 as uuidv4 } from 'uuid';
import { SessionLogManager, LogCategory, LogImpact, LogEntry } from '../core/session-log-manager.js';
import { getGinkoDir, getUserEmail } from '../utils/helpers.js';
import {
  detectGitContext,
  autoDetectFiles,
  validateEntry,
  scoreSessionLog,
  getQualityExamples,
  suggestInsights
} from '../utils/log-quality.js';
import {
  extractReferences,
  validateReferences,
  formatReferenceChain,
  getReferenceChain
} from '../utils/reference-parser.js';
import { ModuleGenerator } from '../services/module-generator.js';
import { SessionInsight, InsightType } from '../types/session.js';
import { initializeWriteDispatcher, appendLogEntry } from '../utils/dispatcher-logger.js';
import { logEvent as logEventToStream, EventEntry } from '../lib/event-logger.js';
import * as path from 'path';

interface LogOptions {
  files?: string;
  impact?: string;
  category?: string;
  show?: boolean;
  validate?: boolean;
  why?: boolean;
  quick?: boolean;
  refs?: boolean;
  shared?: boolean;
}

/**
 * Log an event to the current session
 * Part of ADR-033 defensive logging strategy
 */
export async function logCommand(description: string, options: LogOptions): Promise<void> {
  try {
    // Get session directory
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);

    // Check if session log exists
    const hasLog = await SessionLogManager.hasSessionLog(sessionDir);
    if (!hasLog) {
      console.error(chalk.red('❌ No active session log found.'));
      console.error(chalk.dim('   Run `ginko start` first to create a session.'));
      process.exit(1);
    }

    // Initialize WriteDispatcher for graph writes (if enabled)
    await initializeWriteDispatcher(ginkoDir);

    // Handle --validate flag: check log quality
    if (options.validate) {
      await validateSessionLog(sessionDir);
      return;
    }

    // Handle --show flag: display current session log
    if (options.show) {
      await showSessionLog(sessionDir);
      return;
    }

    // Handle --refs flag: show all references in session
    if (options.refs) {
      await showSessionReferences(sessionDir);
      return;
    }

    // Parse and validate category
    let category = (options.category || 'feature') as LogCategory;
    const validCategories: LogCategory[] = ['fix', 'feature', 'decision', 'insight', 'git', 'achievement'];
    if (!validCategories.includes(category)) {
      console.error(chalk.red(`❌ Invalid category: ${category}`));
      console.error(chalk.dim(`   Valid categories: ${validCategories.join(', ')}`));
      process.exit(1);
    }

    // Parse and validate impact
    let impact = (options.impact || 'medium') as LogImpact;
    const validImpacts: LogImpact[] = ['high', 'medium', 'low'];
    if (!validImpacts.includes(impact)) {
      console.error(chalk.red(`❌ Invalid impact: ${impact}`));
      console.error(chalk.dim(`   Valid impacts: ${validImpacts.join(', ')}`));
      process.exit(1);
    }

    // Enhanced description with interactive prompts (unless --quick mode)
    let enhancedDescription = description;

    if (!options.quick) {
      // Prompt for WHY on features
      if (category === 'feature' && options.why !== false) {
        console.log(chalk.cyan('\n💡 Quality Tip: Feature entries should explain WHY (what problem it solves)\n'));

        const answer = await prompts({
          type: 'text',
          name: 'why',
          message: 'What problem does this feature solve?',
          initial: ''
        });

        if (answer.why && answer.why.trim()) {
          enhancedDescription += `\nProblem: ${answer.why.trim()}`;
        }
      }

      // Prompt for alternatives on decisions
      if (category === 'decision') {
        console.log(chalk.cyan('\n💡 Quality Tip: Decision entries should mention alternatives considered\n'));

        const answer = await prompts({
          type: 'text',
          name: 'alternatives',
          message: 'What alternatives were considered?',
          initial: ''
        });

        if (answer.alternatives && answer.alternatives.trim()) {
          enhancedDescription += `\nAlternatives: ${answer.alternatives.trim()}`;
        }
      }

      // Prompt for root cause on fixes
      if (category === 'fix') {
        console.log(chalk.cyan('\n💡 Quality Tip: Fix entries should include root cause\n'));

        const answer = await prompts({
          type: 'text',
          name: 'rootCause',
          message: 'What was the root cause?',
          initial: ''
        });

        if (answer.rootCause && answer.rootCause.trim()) {
          enhancedDescription += `\nRoot cause: ${answer.rootCause.trim()}`;
        }
      }
    }

    // Auto-detect files from git if not provided
    let files: string[] | undefined = options.files
      ? options.files.split(',').map(f => f.trim())
      : undefined;

    if (!files || files.length === 0) {
      const detectedFiles = await autoDetectFiles();
      if (detectedFiles.length > 0 && !options.quick) {
        console.log(chalk.cyan(`\n📁 Detected ${detectedFiles.length} modified files from git\n`));

        const answer = await prompts({
          type: 'confirm',
          name: 'useDetected',
          message: 'Include these files in the log entry?',
          initial: true
        });

        if (answer.useDetected) {
          files = detectedFiles.slice(0, 5); // Limit to 5 most relevant
        }
      }
    }

    // Auto-detect references from description (TASK-010)
    const references = extractReferences(enhancedDescription);

    if (references.length > 0 && !options.quick) {
      console.log(chalk.cyan(`\n🔗 Detected ${references.length} reference(s): ${references.map(r => r.rawText).join(', ')}\n`));

      // Validate references asynchronously (non-blocking)
      const refValidation = await validateReferences(references);

      if (refValidation.broken.length > 0) {
        console.log(chalk.yellow('⚠️  Some references could not be resolved:'));
        for (const brokenRef of refValidation.broken) {
          console.log(chalk.dim(`   - ${brokenRef.rawText} (target not found)`));
        }
        console.log(chalk.dim('\n   This is just a warning - logging will continue.\n'));
      }
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category,
      description: enhancedDescription,
      files,
      impact
    };

    // Validate entry quality
    const validation = validateEntry(entry);
    if (validation.warnings.length > 0 && !options.quick) {
      console.log(chalk.yellow('\n⚠️  Quality Warnings:'));
      for (const warning of validation.warnings) {
        console.log(chalk.dim(`   - ${warning}`));
      }

      const answer = await prompts({
        type: 'confirm',
        name: 'continue',
        message: 'Continue with this entry?',
        initial: true
      });

      if (!answer.continue) {
        console.log(chalk.yellow('Entry cancelled.'));
        return;
      }
    }

    // Append to session log (via dispatcher if enabled, local fallback)
    await appendLogEntry(sessionDir, entry, userEmail);

    // ALSO log to event stream (ADR-043 dual-write)
    try {
      const eventEntry: EventEntry = {
        category,
        description: enhancedDescription,
        files,
        impact,
        shared: options.shared || false
      };
      await logEventToStream(eventEntry);
    } catch (error) {
      // Event stream logging is non-critical, don't block on failure
      console.warn(chalk.yellow('⚠ Event stream logging failed (session log preserved)'));
      console.warn(chalk.dim(`  ${error instanceof Error ? error.message : String(error)}`));
    }

    console.log(chalk.green(`\n✓ Logged ${category} event`));
    if (files && files.length > 0) {
      console.log(chalk.dim(`  Files: ${files.join(', ')}`));
    }
    console.log(chalk.dim(`  Impact: ${impact}`));

    // Show reference chains if detected
    if (references.length > 0) {
      console.log(chalk.dim(`  References: ${references.map(r => r.rawText).join(', ')}`));
    }

    // Check if this entry should be promoted to a context module
    if (!options.quick) {
      await promptForContextModule(entry, ginkoDir, sessionDir);
    }

  } catch (error) {
    console.error(chalk.red('Error logging event:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Prompt user to create a context module from high-value log entry
 */
async function promptForContextModule(
  entry: LogEntry,
  ginkoDir: string,
  sessionDir: string
): Promise<void> {
  // Step 1: Detect if entry qualifies for promotion
  const shouldPrompt = detectInsightPromotion(entry);

  if (!shouldPrompt) {
    return;
  }

  console.log(chalk.cyan('\n📦 This looks like valuable team knowledge!'));

  const confirmAnswer = await prompts({
    type: 'confirm',
    name: 'create',
    message: 'Create context module?',
    initial: true
  });

  if (!confirmAnswer.create) {
    return;
  }

  // Step 2: Gather additional context from user
  const answers = await prompts([
    {
      type: 'text',
      name: 'title',
      message: 'Module title (brief, descriptive):',
      initial: extractTitle(entry.description),
      validate: (input: string) => input.length > 0 || 'Title is required'
    },
    {
      type: 'text',
      name: 'problem',
      message: 'What problem does this solve?',
      validate: (input: string) => input.length > 0 || 'Problem description is required'
    },
    {
      type: 'text',
      name: 'solution',
      message: 'What is the solution/approach?',
      validate: (input: string) => input.length > 0 || 'Solution description is required'
    },
    {
      type: 'number',
      name: 'timeSaving',
      message: 'Estimated time saving for future use (minutes):',
      initial: 60,
      validate: (input: number) => input > 0 || 'Time saving must be positive'
    },
    {
      type: 'text',
      name: 'tags',
      message: 'Tags (comma-separated):',
      initial: extractTags(entry)
    }
  ]);

  // Process tags manually since prompts doesn't have a filter option
  const tags = typeof answers.tags === 'string'
    ? answers.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : answers.tags;

  // Step 3: Convert LogEntry to SessionInsight
  const insight: SessionInsight = {
    id: uuidv4(),
    type: mapCategoryToInsightType(entry.category),
    title: answers.title,
    problem: answers.problem,
    solution: answers.solution,
    impact: entry.description,
    reusabilityScore: entry.impact === 'high' ? 0.85 : 0.75,
    timeSavingPotential: answers.timeSaving,
    relevanceScore: 0.9,
    tags: tags,
    relatedFiles: entry.files,
    sessionId: await getSessionId(sessionDir),
    timestamp: new Date(entry.timestamp)
  };

  // Step 4: Generate module using ModuleGenerator
  try {
    const generator = new ModuleGenerator(ginkoDir);
    await generator.initialize();

    const result = await generator.generateModules([insight]);

    if (result.created.length > 0) {
      const module = result.created[0];
      console.log(chalk.green(`\n✓ Context module created: ${module.filename}`));
      console.log(chalk.dim('📚 Available to all team members in next session\n'));
    } else if (result.skipped.length > 0) {
      const skip = result.skipped[0];
      console.log(chalk.yellow(`\n⚠️  Module creation skipped: ${skip.reason}`));
      if (skip.existingModule) {
        console.log(chalk.dim(`   Similar module exists: ${skip.existingModule}\n`));
      }
    }
  } catch (error) {
    console.error(chalk.red('Error creating context module:'), error instanceof Error ? error.message : String(error));
  }
}

/**
 * Detect if log entry should trigger context module promotion
 */
function detectInsightPromotion(entry: LogEntry): boolean {
  // Detect by category
  const promotionCategories: LogCategory[] = ['insight', 'decision'];
  if (promotionCategories.includes(entry.category)) {
    return true;
  }

  // Detect by impact level
  if (entry.impact === 'high') {
    return true;
  }

  // Detect by keywords in description
  const keywords = [
    'discovered',
    'pattern',
    'breakthrough',
    'game changer',
    'significant',
    'profound',
    'brilliant',
    'critical insight',
    'key learning',
    'important finding'
  ];

  const lowerDesc = entry.description.toLowerCase();
  return keywords.some(keyword => lowerDesc.includes(keyword));
}

/**
 * Extract a title from description (first sentence or key phrase)
 */
function extractTitle(description: string): string {
  // Try to extract first sentence
  const firstSentence = description.split(/[.!?]/)[0];

  // Truncate if too long
  if (firstSentence.length > 60) {
    return firstSentence.substring(0, 57) + '...';
  }

  return firstSentence;
}

/**
 * Extract tags from log entry context
 */
function extractTags(entry: LogEntry): string {
  const tags: string[] = [entry.category];

  // Add impact as tag
  if (entry.impact !== 'medium') {
    tags.push(entry.impact);
  }

  // Extract technology keywords from description
  const techKeywords = [
    'typescript', 'javascript', 'react', 'nextjs', 'vercel',
    'supabase', 'postgres', 'api', 'cli', 'git', 'auth',
    'testing', 'performance', 'security', 'database'
  ];

  const lowerDesc = entry.description.toLowerCase();
  for (const keyword of techKeywords) {
    if (lowerDesc.includes(keyword)) {
      tags.push(keyword);
    }
  }

  return tags.slice(0, 5).join(', '); // Limit to 5 tags
}

/**
 * Map log category to insight type
 */
function mapCategoryToInsightType(category: LogCategory): InsightType {
  const mapping: Record<LogCategory, InsightType> = {
    insight: 'discovery',
    decision: 'decision',
    fix: 'gotcha',
    feature: 'pattern',
    git: 'configuration',
    achievement: 'discovery'
  };

  return mapping[category] || 'discovery';
}

/**
 * Get current session ID from session directory
 */
async function getSessionId(sessionDir: string): Promise<string> {
  try {
    const logContent = await SessionLogManager.loadSessionLog(sessionDir);
    const sessionIdMatch = logContent.match(/Session ID: `([^`]+)`/);
    if (sessionIdMatch) {
      return sessionIdMatch[1];
    }
  } catch {
    // Fall back to generating from directory
  }

  // Generate from directory path
  const sessionName = path.basename(sessionDir);
  return `session-${sessionName}-${Date.now()}`;
}

/**
 * Show current session log with quality score
 */
async function showSessionLog(sessionDir: string): Promise<void> {
  const logContent = await SessionLogManager.loadSessionLog(sessionDir);
  if (!logContent || logContent.length < 100) {
    console.log(chalk.yellow('⚠️  Session log is empty'));
    console.log(chalk.dim('   No events logged yet in this session.'));
    return;
  }

  console.log(chalk.cyan('\n📋 Current Session Log:\n'));
  console.log(logContent);
  console.log('');

  // Show summary statistics
  const summary = SessionLogManager.getSummary(logContent);
  console.log(chalk.cyan('📊 Summary:'));
  console.log(chalk.dim(`   Total entries: ${summary.totalEntries}`));
  console.log(chalk.dim(`   Files affected: ${summary.filesAffected}`));

  if (Object.keys(summary.byCategory).length > 0) {
    console.log(chalk.dim('   By category:'));
    for (const [cat, count] of Object.entries(summary.byCategory)) {
      console.log(chalk.dim(`     - ${cat}: ${count}`));
    }
  }

  // Show quality score
  const quality = scoreSessionLog(logContent);
  const scoreColor = quality.score >= 9 ? chalk.green : quality.score >= 7 ? chalk.yellow : chalk.red;
  console.log(chalk.cyan('\n🎯 Quality Score:'));
  console.log(scoreColor(`   ${quality.score.toFixed(1)}/10`));

  // Show quality breakdown
  console.log(chalk.dim('\n   Quality Checks:'));
  console.log(quality.hasRootCauses ? chalk.green('   ✓ Fix entries have root causes') : chalk.yellow('   ✗ Some fixes missing root causes'));
  console.log(quality.hasWhyForFeatures ? chalk.green('   ✓ Features explain WHY') : chalk.yellow('   ✗ Some features missing WHY'));
  console.log(quality.hasAlternatives ? chalk.green('   ✓ Decisions include alternatives') : chalk.yellow('   ✗ Some decisions missing alternatives'));
  console.log(quality.hasInsights ? chalk.green('   ✓ Insights documented') : chalk.dim('   - No insights yet (optional)'));
  console.log(quality.hasGitOps ? chalk.green('   ✓ Git operations logged') : chalk.dim('   - No git operations yet (optional)'));

  if (quality.terseEntries > 0) {
    console.log(chalk.yellow(`   ⚠ ${quality.terseEntries} terse entries (<15 words)`));
  }

  // Show suggestions
  const insights = suggestInsights(logContent);
  if (insights.length > 0) {
    console.log(chalk.cyan('\n💡 Suggestions:'));
    for (const insight of insights) {
      console.log(chalk.dim(`   • ${insight}`));
    }
  }

  console.log('');
}

/**
 * Validate current session log quality
 */
async function validateSessionLog(sessionDir: string): Promise<void> {
  const logContent = await SessionLogManager.loadSessionLog(sessionDir);
  if (!logContent || logContent.length < 100) {
    console.log(chalk.yellow('⚠️  Session log is empty'));
    console.log(chalk.dim('   No events logged yet in this session.'));
    return;
  }

  console.log(chalk.cyan('\n🔍 Validating Session Log Quality...\n'));

  const quality = scoreSessionLog(logContent);
  const scoreColor = quality.score >= 9 ? chalk.green : quality.score >= 7 ? chalk.yellow : chalk.red;

  console.log(chalk.cyan('Quality Score:'));
  console.log(scoreColor(`  ${quality.score.toFixed(1)}/10\n`));

  // Show detailed breakdown
  console.log(chalk.cyan('Quality Breakdown:'));
  const summary = SessionLogManager.getSummary(logContent);

  console.log(quality.hasRootCauses ? chalk.green('  ✓ Fix entries have root causes') : chalk.red('  ✗ Some fixes missing root causes'));
  console.log(quality.hasWhyForFeatures ? chalk.green('  ✓ Features explain WHY (problem solved)') : chalk.red('  ✗ Some features missing WHY'));
  console.log(quality.hasAlternatives ? chalk.green('  ✓ Decisions include alternatives') : chalk.red('  ✗ Some decisions missing alternatives'));
  console.log(quality.hasInsights ? chalk.green('  ✓ Insights documented') : chalk.yellow('  - No insights captured (consider documenting learnings)'));
  console.log(quality.hasGitOps ? chalk.green('  ✓ Git operations logged') : chalk.yellow('  - No git operations logged (optional)'));

  if (quality.terseEntries > 0) {
    console.log(chalk.yellow(`  ⚠ ${quality.terseEntries} terse entries (<15 words)`));
  }

  // Show suggestions
  if (quality.suggestions.length > 0) {
    console.log(chalk.cyan('\n📝 Recommendations:'));
    for (const suggestion of quality.suggestions) {
      console.log(chalk.dim(`  • ${suggestion}`));
    }
  }

  // Suggest insights from patterns
  const insightSuggestions = suggestInsights(logContent);
  if (insightSuggestions.length > 0) {
    console.log(chalk.cyan('\n💡 Insight Opportunities:'));
    for (const insight of insightSuggestions) {
      console.log(chalk.dim(`  • ${insight}`));
    }
  }

  // Show git context
  const gitContext = await detectGitContext();
  if (gitContext.recentCommits.length > 0) {
    console.log(chalk.cyan('\n🔄 Recent Git Activity (not yet logged):'));
    for (const commit of gitContext.recentCommits.slice(0, 3)) {
      console.log(chalk.dim(`  • ${commit}`));
    }
    console.log(chalk.dim('\n  Tip: Log significant commits with --category=git'));
  }

  console.log('');
}

/**
 * Show all references in current session log (TASK-010)
 */
async function showSessionReferences(sessionDir: string): Promise<void> {
  const logContent = await SessionLogManager.loadSessionLog(sessionDir);
  if (!logContent || logContent.length < 100) {
    console.log(chalk.yellow('⚠️  Session log is empty'));
    console.log(chalk.dim('   No events logged yet in this session.'));
    return;
  }

  console.log(chalk.cyan('\n🔗 Session References:\n'));

  // Extract all references from session log
  const references = extractReferences(logContent);

  if (references.length === 0) {
    console.log(chalk.dim('   No references found in this session.'));
    console.log(chalk.dim('\n   Tip: Use reference syntax like TASK-006, PRD-009, ADR-033 in log descriptions\n'));
    return;
  }

  console.log(chalk.dim(`   Found ${references.length} reference(s):\n`));

  // Group by type
  const byType: Record<string, string[]> = {};
  for (const ref of references) {
    if (!byType[ref.type]) byType[ref.type] = [];
    if (!byType[ref.type].includes(ref.rawText)) {
      byType[ref.type].push(ref.rawText);
    }
  }

  // Display grouped references
  for (const [type, refs] of Object.entries(byType)) {
    console.log(chalk.cyan(`   ${type.toUpperCase()}:`));
    for (const ref of refs) {
      console.log(chalk.dim(`     - ${ref}`));
    }
    console.log('');
  }

  // Validate all references
  console.log(chalk.cyan('   Validating references...\n'));
  const validation = await validateReferences(references);

  if (validation.valid.length > 0) {
    console.log(chalk.green(`   ✓ ${validation.valid.length} valid reference(s)`));
  }

  if (validation.broken.length > 0) {
    console.log(chalk.yellow(`   ⚠ ${validation.broken.length} broken reference(s):`));
    for (const brokenRef of validation.broken) {
      console.log(chalk.dim(`     - ${brokenRef.rawText} (target not found)`));
    }
  }

  // Show reference chains for key references
  if (validation.valid.length > 0) {
    console.log(chalk.cyan('\n   Reference Chains:\n'));

    // Show chains for first 3 valid references
    for (const validRef of validation.valid.slice(0, 3)) {
      try {
        const chain = await getReferenceChain(validRef, 2);
        const formatted = formatReferenceChain(chain);
        console.log(chalk.dim(`     ${formatted}`));
      } catch {
        // Skip if chain extraction fails
        continue;
      }
    }

    if (validation.valid.length > 3) {
      console.log(chalk.dim(`     ... and ${validation.valid.length - 3} more`));
    }
  }

  console.log('');
}

/**
 * Show examples of logging events
 */
export function logExamples(): void {
  console.log(chalk.cyan('\nSession Logging Examples:\n'));

  console.log(chalk.white('# Interactive mode (prompts for WHY, alternatives, etc.)'));
  console.log(chalk.dim('  ginko log "Implemented --show flag" --category=feature\n'));

  console.log(chalk.white('# Quick mode (skip prompts for speed)'));
  console.log(chalk.dim('  ginko log "Fixed timeout" --category=fix --quick\n'));

  console.log(chalk.white('# Validate session log quality'));
  console.log(chalk.dim('  ginko log --validate\n'));

  console.log(chalk.white('# Show current log with quality score'));
  console.log(chalk.dim('  ginko log --show\n'));

  console.log(chalk.white('# Show all references in session'));
  console.log(chalk.dim('  ginko log --refs\n'));

  console.log(chalk.cyan('Quality-Focused Examples:\n'));

  console.log(chalk.green('GOOD') + chalk.white(' - Fix with root cause:'));
  console.log(chalk.dim('  ginko log "Fixed auth timeout. Root cause: bcrypt rounds too high" --category=fix\n'));

  console.log(chalk.red('BAD') + chalk.white(' - Fix without root cause:'));
  console.log(chalk.dim('  ginko log "Fixed auth timeout" --category=fix\n'));

  console.log(chalk.green('GOOD') + chalk.white(' - Feature with WHY:'));
  console.log(chalk.dim('  ginko log "Added --validate flag to check log quality for better handoffs" --category=feature\n'));

  console.log(chalk.red('BAD') + chalk.white(' - Feature without WHY:'));
  console.log(chalk.dim('  ginko log "Added --validate flag" --category=feature\n'));

  console.log(chalk.green('GOOD') + chalk.white(' - Decision with alternatives:'));
  console.log(chalk.dim('  ginko log "Chose JWT over sessions. Alternatives: server sessions (harder to scale), OAuth (vendor lock-in)" --category=decision\n'));

  console.log(chalk.red('BAD') + chalk.white(' - Decision without alternatives:'));
  console.log(chalk.dim('  ginko log "Chose JWT for auth" --category=decision\n'));

  console.log(chalk.cyan('Categories:'));
  console.log(chalk.dim('  fix         - Bug fixes and error resolution (include root cause)'));
  console.log(chalk.dim('  feature     - New functionality (explain WHY/problem solved)'));
  console.log(chalk.dim('  decision    - Key decisions (mention alternatives considered)'));
  console.log(chalk.dim('  insight     - Patterns, gotchas, learnings discovered'));
  console.log(chalk.dim('  git         - Git operations and version control'));
  console.log(chalk.dim('  achievement - Milestones and completions\n'));

  console.log(chalk.cyan('Flags:'));
  console.log(chalk.dim('  --category   - Entry category (default: feature)'));
  console.log(chalk.dim('  --impact     - Impact level: high, medium, low (default: medium)'));
  console.log(chalk.dim('  --files      - Comma-separated file paths (or auto-detected)'));
  console.log(chalk.dim('  --quick      - Skip interactive prompts for speed'));
  console.log(chalk.dim('  --why        - Force WHY prompt (useful for features)'));
  console.log(chalk.dim('  --shared     - Mark event for team visibility (synced to graph)'));
  console.log(chalk.dim('  --show       - Display current log with quality score'));
  console.log(chalk.dim('  --validate   - Check log quality and get suggestions'));
  console.log(chalk.dim('  --refs       - Show all references in session with validation\n'));

  console.log(chalk.cyan('Reference Linking (TASK-010):\n'));
  console.log(chalk.dim('  Use reference syntax in descriptions to link to other documents:'));
  console.log(chalk.dim('  - TASK-XXX    → backlog/items/TASK-XXX.md'));
  console.log(chalk.dim('  - PRD-YYY     → docs/PRD/PRD-YYY-*.md'));
  console.log(chalk.dim('  - ADR-ZZZ     → docs/adr/ADR-ZZZ-*.md'));
  console.log(chalk.dim('  - FEATURE-NNN → backlog/items/FEATURE-NNN-*.md'));
  console.log(chalk.dim('  - SPRINT-*    → docs/sprints/SPRINT-*.md\n'));

  console.log(chalk.green('  Example with references:'));
  console.log(chalk.dim('  ginko log "Fixed TASK-006 per PRD-009 and ADR-033" --category=fix\n'));
}
