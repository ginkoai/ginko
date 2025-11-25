/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-24
 * @tags: [output, formatting, human-ux, ai-ux, task-11, dual-output]
 * @related: [start-reflection.ts, context-loader-events.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk]
 */

/**
 * Dual Output Formatter (TASK-11)
 *
 * Separates human-readable console output from AI-optimized context data.
 *
 * Key Principles (AI-UX):
 * 1. Human output: Concise, scannable, action-oriented (6-8 lines max)
 * 2. AI context: Rich, structured, complete (JSON with full details)
 * 3. Both outputs reflect the SAME underlying data
 * 4. --verbose flag shows AI context in console for debugging
 */

import chalk from 'chalk';

/**
 * Session output containing both human and AI formats
 */
export interface SessionOutput {
  /** Concise console display for humans (6-8 lines) */
  humanOutput: string;
  /** Rich structured data for AI context */
  aiContext: AISessionContext;
}

/**
 * Full AI context structure - everything the AI needs to understand the session
 */
export interface AISessionContext {
  /** Session metadata */
  session: {
    id: string;
    branch: string;
    startedAt: string;
    flowScore: number;
    flowState: string;
    workMode: string;
  };
  /** Project charter (mission, goals, success criteria) */
  charter?: {
    purpose: string;
    goals: string[];
    successCriteria: string[];
    scope?: {
      inScope: string[];
      outOfScope: string[];
      tbd: string[];
    };
  };
  /** Team activity from last 7 days */
  teamActivity?: {
    decisions: Array<{
      user: string;
      description: string;
      timestamp: string;
      impact?: string;
    }>;
    achievements: Array<{
      user: string;
      description: string;
      timestamp: string;
    }>;
  };
  /** Relevant patterns and gotchas */
  patterns?: Array<{
    title: string;
    content: string;
    tags: string[];
    category?: string;
  }>;
  /** Current sprint context */
  sprint?: {
    id: string;
    name: string;
    goal: string;
    progress: number;
    currentTask?: {
      id: string;
      title: string;
      status: string;
      files: string[];
      priority: string;
      /** ADR constraints this task must follow (EPIC-002 Phase 1) */
      constraints?: Array<{
        adr: {
          id: string;
          title: string;
          summary?: string;
        };
        source: string;
      }>;
    };
    tasks: Array<{
      id: string;
      title: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
  };
  /** Recent work synthesis */
  synthesis?: {
    completedWork: string[];
    inProgressWork: string[];
    blockedItems: string[];
    keyDecisions: string[];
    gotchas: string[];
    resumePoint?: string;
    nextAction?: string;
    suggestedCommand?: string;
  };
  /** Git status */
  git: {
    branch: string;
    commitsAhead: number;
    uncommittedChanges: {
      modified: string[];
      created: string[];
      untracked: string[];
    };
    warnings: string[];
  };
  /** Context loading metrics */
  metrics: {
    eventsLoaded: number;
    documentsLoaded: number;
    tokenEstimate: number;
    tokenReduction?: string;
    loadTimeMs: number;
  };
}

/**
 * Configuration for output formatting
 */
export interface OutputConfig {
  /** Show verbose AI context in console */
  verbose?: boolean;
  /** Minimal output for quick starts */
  minimal?: boolean;
  /** Disable colors (for piping) */
  noColor?: boolean;
  /** Work mode affects output verbosity */
  workMode?: 'hack-ship' | 'think-build' | 'full-planning';
}

/**
 * Format session output for both human and AI consumers
 *
 * Human output is concise (6-8 lines), AI context is rich (full JSON)
 */
export function formatSessionOutput(
  context: AISessionContext,
  config: OutputConfig = {}
): SessionOutput {
  const humanOutput = formatHumanOutput(context, config);
  const aiContext = context;

  return { humanOutput, aiContext };
}

/**
 * Format concise human-readable output (≤20 lines, typically 6-12)
 *
 * Focuses on: Flow state, resume point, sprint, branch, warnings, next action
 * Format matches CLAUDE.md specification (TASK-P2)
 */
export function formatHumanOutput(
  context: AISessionContext,
  config: OutputConfig = {}
): string {
  const lines: string[] = [];
  const { minimal = false } = config;

  // Line 1: Ready | Flow State | Work Mode
  const flowState = getFlowStateLabel(context.session.flowScore);
  lines.push(
    chalk.green('Ready') + chalk.dim(' | ') +
    chalk.cyan(`${flowState} (${context.session.flowScore}/10)`) + chalk.dim(' | ') +
    chalk.white(`${context.session.workMode} mode`)
  );

  // Line 2: Resume point (most important!)
  if (context.synthesis?.resumePoint) {
    const resumeShort = truncate(context.synthesis.resumePoint, 80);
    lines.push(chalk.white('Resume: ') + chalk.dim(resumeShort));
  }

  // Empty line for spacing
  lines.push('');

  // Line 3-4: Sprint + Branch context
  if (context.sprint && !minimal) {
    const progress = typeof context.sprint.progress === 'number' ? context.sprint.progress : 0;
    const sprintName = context.sprint.name || 'Active Sprint';
    const progressDisplay = progress >= 100
      ? chalk.green('Completed (100%)')
      : chalk.dim(`(${progress}%)`);
    lines.push(chalk.white('Sprint: ') + chalk.cyan(sprintName) + ' ' + progressDisplay);

    // Show current task if available
    if (context.sprint.currentTask) {
      lines.push(chalk.dim('  [@] ') + chalk.yellow(`${context.sprint.currentTask.id}: ${context.sprint.currentTask.title}`));

      // Show ADR constraints for current task (EPIC-002 Phase 1)
      if (context.sprint.currentTask.constraints && context.sprint.currentTask.constraints.length > 0) {
        const adrList = context.sprint.currentTask.constraints
          .map(c => c.adr.id)
          .join(', ');
        lines.push(chalk.dim('      Follow: ') + chalk.magenta(adrList));
      }
    }
  }

  // Branch + uncommitted files count
  const totalChanges =
    context.git.uncommittedChanges.modified.length +
    context.git.uncommittedChanges.created.length +
    context.git.uncommittedChanges.untracked.length;

  if (totalChanges > 0) {
    lines.push(
      chalk.white('Branch: ') +
      chalk.cyan(context.git.branch) +
      chalk.dim(` (${totalChanges} uncommitted files)`)
    );
  } else {
    lines.push(chalk.white('Branch: ') + chalk.cyan(context.git.branch) + chalk.dim(' (clean)'));
  }

  // Warnings section (1-2 key warnings)
  const warnings: string[] = [];

  // Priority 1: Blockers
  if (context.synthesis?.blockedItems && context.synthesis.blockedItems.length > 0) {
    warnings.push(chalk.red(`⚠️  Blocked: ${truncate(context.synthesis.blockedItems[0], 70)}`));
  }

  // Priority 2: Git warnings
  if (context.git.warnings.length > 0 && warnings.length < 2) {
    warnings.push(chalk.yellow(`⚠️  ${context.git.warnings[0]}`));
  }

  // Show warnings with spacing if any
  if (warnings.length > 0) {
    lines.push('');
    warnings.forEach(w => lines.push(w));
  }

  // Next action / ready message
  lines.push('');
  if (context.synthesis?.nextAction) {
    lines.push(chalk.white('Next: ') + chalk.dim(context.synthesis.nextAction));
  } else {
    lines.push(chalk.white('Next: ') + chalk.dim('What would you like to work on?'));
  }

  return lines.join('\n');
}

/**
 * Format verbose output showing AI context (for debugging)
 */
export function formatVerboseOutput(context: AISessionContext): string {
  const lines: string[] = [];

  lines.push(chalk.cyan.bold('\n📊 AI Context (--verbose mode)\n'));

  // Charter
  if (context.charter) {
    lines.push(chalk.yellow('📜 Charter:'));
    lines.push(`   Purpose: ${truncate(context.charter.purpose, 100)}`);
    lines.push(`   Goals: ${context.charter.goals.length} defined`);
    lines.push('');
  }

  // Team Activity
  if (context.teamActivity) {
    const decisions = context.teamActivity.decisions?.length || 0;
    const achievements = context.teamActivity.achievements?.length || 0;
    lines.push(chalk.yellow('👥 Team Activity (7d):'));
    lines.push(`   Decisions: ${decisions}, Achievements: ${achievements}`);
    lines.push('');
  }

  // Patterns
  if (context.patterns && context.patterns.length > 0) {
    lines.push(chalk.yellow('🧠 Patterns:'));
    for (const pattern of context.patterns.slice(0, 3)) {
      lines.push(`   - ${pattern.title} [${pattern.tags.join(', ')}]`);
    }
    lines.push('');
  }

  // Synthesis Details
  if (context.synthesis) {
    lines.push(chalk.yellow('📝 Synthesis:'));
    lines.push(`   Completed: ${context.synthesis.completedWork?.length || 0} items`);
    lines.push(`   In Progress: ${context.synthesis.inProgressWork?.length || 0} items`);
    lines.push(`   Decisions: ${context.synthesis.keyDecisions?.length || 0}`);
    lines.push(`   Gotchas: ${context.synthesis.gotchas?.length || 0}`);
    lines.push('');
  }

  // Metrics
  lines.push(chalk.yellow('📈 Metrics:'));
  lines.push(`   Events: ${context.metrics.eventsLoaded}`);
  lines.push(`   Documents: ${context.metrics.documentsLoaded}`);
  lines.push(`   Tokens: ${context.metrics.tokenEstimate.toLocaleString()}`);
  if (context.metrics.tokenReduction) {
    lines.push(`   Reduction: ${context.metrics.tokenReduction}`);
  }
  lines.push(`   Load time: ${context.metrics.loadTimeMs}ms`);

  return lines.join('\n');
}

/**
 * Format AI context as JSON for file storage or MCP
 */
export function formatAIContextJSON(context: AISessionContext): string {
  return JSON.stringify(context, null, 2);
}

/**
 * Format AI context as compact JSONL (for append-only logs)
 */
export function formatAIContextJSONL(context: AISessionContext): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    type: 'session-context',
    ...context,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get flow state emoji based on score
 */
function getFlowEmoji(score: number): string {
  if (score >= 8) return '🔥'; // Hot
  if (score >= 6) return '⚡'; // Energized
  if (score >= 4) return '🌊'; // Flowing
  if (score >= 2) return '🌱'; // Growing
  return '❄️'; // Cold
}

/**
 * Get flow state label based on score (for concise output)
 */
function getFlowStateLabel(score: number): string {
  if (score >= 8) return 'Hot';
  if (score >= 6) return 'Warm';
  if (score >= 4) return 'Flowing';
  if (score >= 2) return 'Warming Up';
  return 'Cold';
}

/**
 * Format a progress bar
 */
function formatProgressBar(progress: number, width: number = 20): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Format list of items with optional limit
 */
export function formatList(
  items: string[],
  options: { limit?: number; prefix?: string; emptyMessage?: string } = {}
): string {
  const { limit = 5, prefix = '  - ', emptyMessage = '(none)' } = options;

  if (items.length === 0) return emptyMessage;

  const displayed = items.slice(0, limit);
  const lines = displayed.map((item) => `${prefix}${item}`);

  if (items.length > limit) {
    lines.push(chalk.dim(`${prefix}... and ${items.length - limit} more`));
  }

  return lines.join('\n');
}

/**
 * Format success message
 */
export function formatSuccess(message: string, details?: string): string {
  let output = chalk.green(`✓ ${message}`);
  if (details) {
    output += '\n' + chalk.dim(`  ${details}`);
  }
  return output;
}

/**
 * Format error message
 */
export function formatError(message: string, details?: string): string {
  let output = chalk.red(`✗ ${message}`);
  if (details) {
    output += '\n' + chalk.dim(`  ${details}`);
  }
  return output;
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow(`⚠️  ${message}`);
}
