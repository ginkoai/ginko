/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-18
 * @pattern: utility
 * @tags: [session-logging, defensive-logging, adr-033, adr-046, utility-command, ai-first-ux]
 * @related: [../core/session-log-manager.ts, ../utils/command-helpers.ts, ADR-046-command-patterns-reflection-vs-utility.md]
 * @priority: critical
 * @complexity: low
 * @dependencies: [chalk, session-log-manager, event-logger]
 */

import chalk from 'chalk';
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
  detectCategory,
  detectImpact,
  shouldCreateContextModule,
  getQualityDescription,
  getQualityBreakdown,
  analyzeQuality,
  extractGotchaReferences
} from '../utils/command-helpers.js';
import {
  extractReferences,
  validateReferences,
  formatReferenceChain,
  getReferenceChain
} from '../utils/reference-parser.js';
import { ModuleGenerator } from '../services/module-generator.js';
import { SessionInsight, InsightType } from '../types/session.js';
import { initializeWriteDispatcher, appendLogEntry } from '../utils/dispatcher-logger.js';
import { logEvent as logEventToStream, EventEntry, BlockerSeverity } from '../lib/event-logger.js';
import * as path from 'path';
import { requireAuth, isAuthenticated } from '../utils/auth-storage.js';
import { GraphApiClient } from './graph/api-client.js';

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
  // Blocker-specific options (EPIC-004 Sprint 2 TASK-4)
  blockedBy?: string;       // What's blocking (task ID, resource, etc.)
  blockingTasks?: string;   // Comma-separated list of tasks that can't proceed
  severity?: string;        // Blocker severity: low, medium, high, critical
}

/**
 * Log an event to the current session
 * Part of ADR-033 defensive logging strategy
 */
export async function logCommand(description: string, options: LogOptions): Promise<void> {
  try {
    // Require authentication
    await requireAuth('log');

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

    // Auto-detect category if not provided (TASK-002: Smart Defaults)
    const autoDetected = {
      category: false,
      impact: false
    };

    let category: LogCategory;
    if (options.category) {
      // User provided explicit category - validate it
      category = options.category as LogCategory;
      const validCategories: LogCategory[] = ['fix', 'feature', 'decision', 'insight', 'git', 'achievement', 'blocker'];
      if (!validCategories.includes(category)) {
        console.error(chalk.red(`❌ Invalid category: ${options.category}`));
        console.error(chalk.dim(`   Valid categories: ${validCategories.join(', ')}`));
        process.exit(1);
      }
    } else {
      // Auto-detect category from description
      const detected = detectCategory(description);
      category = detected || 'feature'; // Default to feature if detection fails
      autoDetected.category = detected !== null;
    }

    // Auto-detect impact if not provided (TASK-002: Smart Defaults)
    let impact: LogImpact;
    if (options.impact) {
      // User provided explicit impact - validate it
      impact = options.impact as LogImpact;
      const validImpacts: LogImpact[] = ['high', 'medium', 'low'];
      if (!validImpacts.includes(impact)) {
        console.error(chalk.red(`❌ Invalid impact: ${options.impact}`));
        console.error(chalk.dim(`   Valid impacts: ${validImpacts.join(', ')}`));
        process.exit(1);
      }
    } else {
      // Auto-detect impact from description
      impact = detectImpact(description);
      autoDetected.impact = true;
    }

    // AI-first: No prompts - description provided upfront contains all context
    let enhancedDescription = description;

    // Auto-detect files from git if not provided (AI-first: no confirmation needed)
    let files: string[] | undefined = options.files
      ? options.files.split(',').map(f => f.trim())
      : undefined;

    if (!files || files.length === 0) {
      const detectedFiles = await autoDetectFiles();
      if (detectedFiles.length > 0) {
        files = detectedFiles.slice(0, 5); // Auto-include, limit to 5 most relevant
      }
    }

    // Auto-detect references from description (TASK-010)
    const references = extractReferences(enhancedDescription);

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category,
      description: enhancedDescription,
      files,
      impact
    };

    // Validate entry quality (AI-first: provide feedback, don't block)
    const validation = validateEntry(entry);

    // Append to session log (via dispatcher if enabled, local fallback)
    await appendLogEntry(sessionDir, entry, userEmail);

    // ALSO log to event stream (ADR-043 dual-write)
    try {
      // Parse blocker-specific fields if category is blocker
      let blockedBy: string | undefined;
      let blockingTasks: string[] | undefined;
      let blockerSeverity: BlockerSeverity | undefined;

      if (category === 'blocker') {
        blockedBy = options.blockedBy;
        blockingTasks = options.blockingTasks
          ? options.blockingTasks.split(',').map(t => t.trim())
          : undefined;

        if (options.severity) {
          const validSeverities: BlockerSeverity[] = ['low', 'medium', 'high', 'critical'];
          if (validSeverities.includes(options.severity as BlockerSeverity)) {
            blockerSeverity = options.severity as BlockerSeverity;
          } else {
            console.warn(chalk.yellow(`⚠ Invalid severity: ${options.severity}, defaulting to 'medium'`));
            blockerSeverity = 'medium';
          }
        } else {
          blockerSeverity = 'medium'; // Default severity for blockers
        }
      }

      const eventEntry: EventEntry = {
        category,
        description: enhancedDescription,
        files,
        impact,
        shared: options.shared || false,
        // Blocker-specific fields (EPIC-004 Sprint 2 TASK-4)
        blocked_by: blockedBy,
        blocking_tasks: blockingTasks,
        blocker_severity: blockerSeverity
      };
      await logEventToStream(eventEntry);
    } catch (error) {
      // Event stream logging is non-critical, don't block on failure
      console.warn(chalk.yellow('⚠ Event stream logging failed (session log preserved)'));
      console.warn(chalk.dim(`  ${error instanceof Error ? error.message : String(error)}`));
    }

    // Educational feedback output (AI-first UX with auto-detection transparency)
    const autoLabel = (autoDetected.category || autoDetected.impact)
      ? chalk.dim(' (auto-detected)')
      : '';
    console.log(chalk.green(`\n✓ Event logged: ${category} (${impact} impact)`) + autoLabel + '\n');

    // Quality analysis feedback
    const qualityScore = validation.warnings.length === 0 ? 100 : Math.max(50, 100 - (validation.warnings.length * 20));
    console.log(chalk.cyan('Quality:'), getQualityDescription({ score: qualityScore, warnings: validation.warnings }));

    // Show auto-detection details for transparency
    if (autoDetected.category || autoDetected.impact) {
      const detected: string[] = [];
      if (autoDetected.category) detected.push(`category=${category}`);
      if (autoDetected.impact) detected.push(`impact=${impact}`);
      console.log(chalk.dim(`  Auto-detected: ${detected.join(', ')}`));
    }

    // Show quality breakdown for good entries
    if (qualityScore >= 70) {
      const breakdown = getQualityBreakdown(enhancedDescription);
      if (breakdown) {
        console.log(chalk.dim('  ' + breakdown));
      }
    }

    // Files included
    if (files && files.length > 0) {
      console.log(chalk.cyan('\nFiles:'), chalk.dim(`${files.length} auto-included`));
      for (const file of files.slice(0, 3)) {
        console.log(chalk.dim(`  - ${file}`));
      }
      if (files.length > 3) {
        console.log(chalk.dim(`  ... and ${files.length - 3} more`));
      }
    }

    // References detected
    if (references.length > 0) {
      console.log(chalk.cyan('\nReferences:'), chalk.dim(`${references.length} detected`));
      for (const ref of references.slice(0, 3)) {
        console.log(chalk.dim(`  - ${ref.rawText}`));
      }
    }

    // EPIC-004 Sprint 2 TASK-4: Show blocker details when logging a blocker
    if (category === 'blocker') {
      console.log(chalk.red('\n🚧 Blocker Signaled'));
      if (options.blockedBy) {
        console.log(chalk.dim(`  Blocked by: ${options.blockedBy}`));
      }
      if (options.blockingTasks) {
        const tasks = options.blockingTasks.split(',').map((t: string) => t.trim());
        console.log(chalk.dim(`  Affecting tasks: ${tasks.join(', ')}`));
      }
      if (options.severity) {
        const severityColors: Record<string, (s: string) => string> = {
          low: chalk.dim,
          medium: chalk.yellow,
          high: chalk.red,
          critical: chalk.bgRed.white
        };
        const colorFn = severityColors[options.severity] || chalk.yellow;
        console.log(chalk.dim('  Severity: ') + colorFn(options.severity.toUpperCase()));
      }
      console.log(chalk.dim('\n  Other agents will see this blocker via event stream'));
    }

    // TASK-4: Track gotcha encounters when category=gotcha or gotcha references detected
    // This enables AI learning from gotcha frequency and resolution patterns
    if (category === 'gotcha' || await isAuthenticated()) {
      const gotchaRefs = extractGotchaReferences(enhancedDescription);
      if (gotchaRefs.length > 0 && await isAuthenticated()) {
        try {
          const graphClient = new GraphApiClient();
          let encounteredCount = 0;

          for (const gotchaId of gotchaRefs) {
            try {
              await graphClient.recordGotchaEncounter(gotchaId, {
                description: enhancedDescription,
              });
              encounteredCount++;
            } catch (err) {
              // Individual gotcha tracking is non-critical
              // May fail if gotcha doesn't exist in graph yet
            }
          }

          if (encounteredCount > 0) {
            console.log(chalk.cyan('\nGotchas:'), chalk.dim(`${encounteredCount} encounter(s) tracked`));
            for (const ref of gotchaRefs.slice(0, 3)) {
              console.log(chalk.dim(`  - ${ref}`));
            }
          }
        } catch (err) {
          // Graph API unavailable - gotcha tracking is non-critical
        }
      }
    }

    // Auto-create context module for high-value entries (no prompt)
    // Use new shouldCreateContextModule from command-helpers
    if (shouldCreateContextModule(category, impact)) {
      await autoCreateContextModule(entry, ginkoDir, sessionDir);
      console.log(chalk.green('\nContext module:'), chalk.dim('Created (high-impact pattern)'));
    }

    // Quality coaching for low-quality entries
    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n💡 Quality Tips:'));
      for (const warning of validation.warnings) {
        console.log(chalk.dim(`   ${warning}`));
      }
      console.log(chalk.dim('\n   Next entry: Include WHAT+WHY+HOW for richer context'));
      console.log(chalk.dim('   Example: "Fixed X. Root cause: Y. Solution: Z. Impact: A→B"'));
    }

    console.log(''); // Blank line for spacing

  } catch (error) {
    console.error(chalk.red('Error logging event:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Auto-create context module from high-value log entry (AI-first: no prompts)
 */
async function autoCreateContextModule(
  entry: LogEntry,
  ginkoDir: string,
  sessionDir: string
): Promise<void> {
  try {
    // Extract title, problem, solution from description
    const title = extractTitle(entry.description);
    const tags = extractTags(entry).split(',').map(t => t.trim()).filter(t => t.length > 0);

    // Convert LogEntry to SessionInsight with intelligent defaults
    const insight: SessionInsight = {
      id: uuidv4(),
      type: mapCategoryToInsightType(entry.category),
      title,
      problem: extractProblemFromDescription(entry.description, entry.category),
      solution: extractSolutionFromDescription(entry.description, entry.category),
      impact: entry.description,
      reusabilityScore: entry.impact === 'high' ? 0.85 : 0.75,
      timeSavingPotential: estimateTimeSaving(entry.category, entry.impact),
      relevanceScore: 0.9,
      tags,
      relatedFiles: entry.files,
      sessionId: await getSessionId(sessionDir),
      timestamp: new Date(entry.timestamp)
    };

    // Generate module using ModuleGenerator
    const generator = new ModuleGenerator(ginkoDir);
    await generator.initialize();

    const result = await generator.generateModules([insight]);

    if (result.created.length > 0) {
      const module = result.created[0];
      console.log(chalk.cyan('\nContext module:'), chalk.green('Created'));
      console.log(chalk.dim(`  ${module.filename} (${entry.impact}-impact ${entry.category} pattern)`));
    } else if (result.skipped.length > 0) {
      const skip = result.skipped[0];
      console.log(chalk.cyan('\nContext module:'), chalk.dim('Skipped'));
      console.log(chalk.dim(`  Reason: ${skip.reason}`));
      if (skip.existingModule) {
        console.log(chalk.dim(`  Similar: ${skip.existingModule}`));
      }
    }
  } catch (error) {
    // Context module creation is non-critical, don't block
    console.log(chalk.dim('\n  Context module creation skipped (non-critical error)'));
  }
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
    achievement: 'discovery',
    gotcha: 'gotcha',
    blocker: 'gotcha'  // Blockers are treated like gotchas for insight categorization
  };

  return mapping[category] || 'discovery';
}

/**
 * Extract problem from description based on category
 */
function extractProblemFromDescription(description: string, category: LogCategory): string {
  // Try to extract explicit problem statement
  const problemMatch = description.match(/Problem:\s*([^\n]+)/i);
  if (problemMatch) {
    return problemMatch[1].trim();
  }

  const rootCauseMatch = description.match(/Root cause:\s*([^\n]+)/i);
  if (rootCauseMatch) {
    return rootCauseMatch[1].trim();
  }

  // Category-specific extraction
  if (category === 'fix') {
    // For fixes, the problem is what was broken
    const fixMatch = description.match(/Fixed\s+([^.]+)/i);
    if (fixMatch) {
      return fixMatch[1].trim();
    }
  }

  // Default: use first sentence
  return description.split(/[.!?]/)[0].trim();
}

/**
 * Extract solution from description based on category
 */
function extractSolutionFromDescription(description: string, category: LogCategory): string {
  // Try to extract explicit solution statement
  const solutionMatch = description.match(/Solution:\s*([^\n]+)/i);
  if (solutionMatch) {
    return solutionMatch[1].trim();
  }

  const approachMatch = description.match(/Approach:\s*([^\n]+)/i);
  if (approachMatch) {
    return approachMatch[1].trim();
  }

  // Try to find "by doing X" pattern
  const byMatch = description.match(/[Bb]y\s+([^.]+)/);
  if (byMatch) {
    return byMatch[1].trim();
  }

  // Try to find "Added/Implemented X" pattern
  const actionMatch = description.match(/(?:Added|Implemented|Created|Used)\s+([^.]+)/i);
  if (actionMatch) {
    return actionMatch[1].trim();
  }

  // Default: use description as solution
  return description.trim();
}

/**
 * Estimate time saving based on category and impact
 */
function estimateTimeSaving(category: LogCategory, impact: LogImpact): number {
  const baseMinutes: Record<LogCategory, number> = {
    fix: 30,
    feature: 60,
    decision: 90,
    insight: 120,
    git: 15,
    achievement: 30,
    gotcha: 45,
    blocker: 60  // Blockers can save significant time if resolved early
  };

  const impactMultiplier: Record<LogImpact, number> = {
    high: 2,
    medium: 1,
    low: 0.5
  };

  return (baseMinutes[category] || 60) * (impactMultiplier[impact] || 1);
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

  console.log(chalk.green('GOOD') + chalk.white(' - Blocker with details (EPIC-004):'));
  console.log(chalk.dim('  ginko log "API rate limit exceeded, cannot proceed with integration tests" \\'));
  console.log(chalk.dim('    --category=blocker --blocked-by="third-party-api" \\'));
  console.log(chalk.dim('    --blocking-tasks="TASK-5,TASK-8" --severity=high\n'));

  console.log(chalk.cyan('Categories:'));
  console.log(chalk.dim('  fix         - Bug fixes and error resolution (include root cause)'));
  console.log(chalk.dim('  feature     - New functionality (explain WHY/problem solved)'));
  console.log(chalk.dim('  decision    - Key decisions (mention alternatives considered)'));
  console.log(chalk.dim('  insight     - Patterns, gotchas, learnings discovered'));
  console.log(chalk.dim('  git         - Git operations and version control'));
  console.log(chalk.dim('  achievement - Milestones and completions'));
  console.log(chalk.dim('  blocker     - Impediments blocking work (EPIC-004)\n'));

  console.log(chalk.cyan('Flags:'));
  console.log(chalk.dim('  --category      - Entry category (default: feature)'));
  console.log(chalk.dim('  --impact        - Impact level: high, medium, low (default: medium)'));
  console.log(chalk.dim('  --files         - Comma-separated file paths (or auto-detected)'));
  console.log(chalk.dim('  --quick         - Skip interactive prompts for speed'));
  console.log(chalk.dim('  --why           - Force WHY prompt (useful for features)'));
  console.log(chalk.dim('  --shared        - Mark event for team visibility (synced to graph)'));
  console.log(chalk.dim('  --show          - Display current log with quality score'));
  console.log(chalk.dim('  --validate      - Check log quality and get suggestions'));
  console.log(chalk.dim('  --refs          - Show all references in session with validation'));
  console.log(chalk.dim('  --blocked-by    - What is blocking (for blocker category)'));
  console.log(chalk.dim('  --blocking-tasks- Tasks affected (comma-separated)'));
  console.log(chalk.dim('  --severity      - Blocker severity: low, medium, high, critical\n'));

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
