/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-05
 * @tags: [output, formatting, human-ux, ai-ux, task-11, dual-output, onboarding-optimization]
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

// ============================================================================
// Ginko Branding Constants (TASK-5)
// ============================================================================

/**
 * Ginko brand styling for consistent CLI output
 */
export const GINKO_BRAND = {
  /** Header: Bold #C0FD77 "ginko" */
  header: chalk.hex('#C0FD77').bold('ginko'),
  /** Footer: Dimmed "ginkoai.com" */
  footer: chalk.dim('ginkoai.com'),
  /** Primary accent color (green) */
  accent: chalk.green,
  /** Highlight color (cyan) */
  highlight: chalk.cyan,
  /** Warning color (yellow) */
  warning: chalk.yellow,
  /** Error color (red) */
  error: chalk.red,
  /** Success color (green) */
  success: chalk.green,
  /** Muted/secondary text */
  dim: chalk.dim,
  /** Box drawing characters for table borders */
  box: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    teeLeft: '├',
    teeRight: '┤',
    teeDown: '┬',
    teeUp: '┴',
    cross: '┼',
  },
};

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
    /** True if this is a first-time team member (no prior session history) */
    isFirstTimeMember?: boolean;
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
      /** ADR constraints this task must follow (EPIC-002 Phase 1, enriched) */
      constraints?: Array<{
        adr: {
          id: string;
          title: string;
          summary?: string;
          rationale?: string;
        };
        source: string;
      }>;
      /** Pattern guidance for this task (EPIC-002 Sprint 3, enriched from graph API) */
      patterns?: Array<{
        id: string;
        title: string;
        confidence: 'high' | 'medium' | 'low';
        confidenceScore: number;
        content?: string;
        usageCount: number;
        usages?: Array<{
          fileId: string;
          context?: string;
        }>;
      }>;
      /** Gotcha warnings for this task (EPIC-002 Sprint 3, enriched from graph API) */
      gotchas?: Array<{
        id: string;
        title: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        symptom?: string;
        cause?: string;
        solution?: string;
        resolutionRate: number;
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

  // First-time member welcome (e008_s03_t03 onboarding optimization)
  if (context.session.isFirstTimeMember) {
    lines.push(chalk.cyan('👋 Welcome to the team!'));
    lines.push('');

    // Show team context summary
    if (context.charter) {
      lines.push(chalk.white('Project: ') + chalk.dim(truncate(context.charter.purpose, 60)));
    }

    // Show patterns/ADRs available
    const patternCount = context.patterns?.length || 0;
    if (patternCount > 0) {
      lines.push(chalk.white('Team knowledge: ') + chalk.dim(`${patternCount} patterns loaded`));
    }

    lines.push('');
    lines.push(chalk.dim('Tip: Run `ginko start --team` to see recent team activity'));
    lines.push('');

    // Still show sprint context for first-time members
    if (context.sprint) {
      const progress = typeof context.sprint.progress === 'number' ? context.sprint.progress : 0;
      lines.push(chalk.white('Sprint: ') + chalk.cyan(context.sprint.name || 'Active Sprint') + ' ' + chalk.dim(`${progress}%`));
    }

    // Branch info
    lines.push(chalk.white('Branch: ') + chalk.cyan(context.git.branch));

    return lines.join('\n');
  }

  // Line 1: Ready | Flow State | Work Mode
  const flowState = getFlowStateLabel(context.session.flowScore);
  lines.push(
    chalk.green('Ready') + chalk.dim(' | ') +
    chalk.cyan(`${flowState} (${context.session.flowScore}/10)`) + chalk.dim(' | ') +
    chalk.white(`${context.session.workMode} mode`)
  );

  // Line 2: Last session (what was done/in progress)
  if (context.synthesis?.resumePoint) {
    const resumeShort = truncate(context.synthesis.resumePoint, 70);
    lines.push(chalk.white('Last session: ') + chalk.dim(resumeShort));
  }

  // Line 3: Next up (what to work on now)
  if (context.sprint?.currentTask) {
    const task = context.sprint.currentTask;
    const statusLabel = task.status === 'in_progress' ? 'continue' : 'start';
    lines.push(
      chalk.white('Next up: ') +
      chalk.yellow(`${task.id}`) +
      chalk.dim(` - ${truncate(task.title, 50)} (${statusLabel})`)
    );
  }

  // Empty line for spacing
  lines.push('');

  // Sprint context with cognitive scaffolding for current task
  if (context.sprint && !minimal) {
    const progress = typeof context.sprint.progress === 'number' ? context.sprint.progress : 0;
    const sprintName = context.sprint.name || 'Active Sprint';
    const progressDisplay = progress >= 100
      ? chalk.green('Complete')
      : chalk.dim(`${progress}%`);
    lines.push(chalk.white('Sprint: ') + chalk.cyan(sprintName) + ' ' + progressDisplay);

    // Show cognitive scaffolding for current task (patterns, gotchas, constraints)
    if (context.sprint.currentTask) {
      // Show ADR constraints for current task (EPIC-002 Phase 1, enriched)
      if (context.sprint.currentTask.constraints && context.sprint.currentTask.constraints.length > 0) {
        const adrList = context.sprint.currentTask.constraints
          .map(c => c.adr.id)
          .join(', ');
        lines.push(chalk.dim('  Follow: ') + chalk.magenta(adrList));
      }

      // Show pattern guidance for current task (EPIC-002 Sprint 3, enriched from graph)
      if (context.sprint.currentTask.patterns && context.sprint.currentTask.patterns.length > 0) {
        const patternList = context.sprint.currentTask.patterns.slice(0, 3).map(p => {
          const confIcon = p.confidence === 'high' ? '★' : p.confidence === 'medium' ? '◐' : '○';
          return `${p.title} ${confIcon}`;
        }).join(', ');
        lines.push(chalk.dim('  Apply: ') + chalk.blue(patternList));
      }

      // Show gotcha warnings for current task (EPIC-002 Sprint 3, enriched from graph)
      if (context.sprint.currentTask.gotchas && context.sprint.currentTask.gotchas.length > 0) {
        const gotchaList = context.sprint.currentTask.gotchas.slice(0, 2).map(g => {
          const sevIcon = g.severity === 'critical' ? '🚨' : g.severity === 'high' ? '⚠️' : '💡';
          return `${sevIcon} ${g.title}`;
        }).join(', ');
        lines.push(chalk.dim('  Avoid: ') + chalk.red(gotchaList));
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

  // Ready prompt (only if no "Next up" was shown)
  if (!context.sprint?.currentTask) {
    lines.push('');
    lines.push(chalk.dim('What would you like to work on?'));
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
export function formatProgressBar(progress: number, width: number = 20): string {
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

// ============================================================================
// Table View Output (TASK-4)
// ============================================================================

/**
 * Table output configuration
 */
export interface TableOutputConfig {
  /** Terminal width (default: 75) */
  width?: number;
  /** Show ginko branding header/footer (default: true) */
  showBranding?: boolean;
  /** Show task list in sprint section (default: true) */
  showTasks?: boolean;
  /** Maximum tasks to show (default: 6) */
  maxTasks?: number;
  /** Compact mode - 8 lines max, no task list (default: false) */
  compact?: boolean;
}

/**
 * Format compact 8-line table for Claude Code display
 * Avoids output collapsing in Claude Code UI
 *
 * Layout (8 lines):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ginko     Ready │ Hot (10/10) │ Think & Build                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  Sprint: Graph Explorer v2 Sprint 1                       0% [t01/7]    │
 * │  Next: e011_s01_t01 - Refactor Nav Tree (continue)                      │
 * │  Branch: main (5 uncommitted) ⚠️ Blocked: ...                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  ginko.ai                                                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
function formatCompactTable(context: AISessionContext, width: number = 75): string {
  const lines: string[] = [];
  const { box } = GINKO_BRAND;

  const hLine = (left: string, right: string, fill?: string) =>
    left + (fill || box.horizontal).repeat(width - 2) + right;

  const row = (content: string) => {
    const stripped = content.replace(/\u001b\[[0-9;]*m/g, '');
    const padding = Math.max(0, width - 4 - stripped.length);
    return `${box.vertical}  ${content}${' '.repeat(padding)}${box.vertical}`;
  };

  // Line 1: Top border
  lines.push(chalk.dim(hLine(box.topLeft, box.topRight)));

  // Line 2: Header + Status combined
  const flowState = getFlowStateLabel(context.session.flowScore);
  const headerStatus =
    GINKO_BRAND.header +
    GINKO_BRAND.dim('     ') +
    GINKO_BRAND.success('Ready') +
    GINKO_BRAND.dim(' │ ') +
    GINKO_BRAND.highlight(`${flowState} (${context.session.flowScore}/10)`) +
    GINKO_BRAND.dim(' │ ') +
    context.session.workMode;
  lines.push(row(headerStatus));

  // Line 3: Separator
  lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));

  // Line 4: Sprint info
  if (context.sprint) {
    const progress = typeof context.sprint.progress === 'number' ? context.sprint.progress : 0;
    const sprintName = truncate(context.sprint.name || 'Active Sprint', width - 35);
    const taskCount = context.sprint.tasks?.length || 0;
    const currentTaskNum = context.sprint.currentTask?.id.split('_').pop()?.replace('t', '') || '0';

    lines.push(
      row(
        GINKO_BRAND.dim('Sprint: ') +
        sprintName +
        GINKO_BRAND.dim(` ${progress}% [t${currentTaskNum}/${taskCount}]`)
      )
    );
  } else {
    lines.push(row(GINKO_BRAND.dim('No active sprint')));
  }

  // Line 5: Next task
  if (context.sprint?.currentTask) {
    const task = context.sprint.currentTask;
    const statusLabel = task.status === 'in_progress' ? 'continue' : 'start';
    lines.push(
      row(
        GINKO_BRAND.dim('Next: ') +
        GINKO_BRAND.warning(task.id) +
        GINKO_BRAND.dim(` - ${truncate(task.title, width - 35)} (${statusLabel})`)
      )
    );
  } else {
    lines.push(row(GINKO_BRAND.dim('Ready for work')));
  }

  // Line 6: Branch + Warning combined
  const totalChanges =
    context.git.uncommittedChanges.modified.length +
    context.git.uncommittedChanges.created.length +
    context.git.uncommittedChanges.untracked.length;

  const branchPart = totalChanges > 0
    ? `${context.git.branch} (${totalChanges} uncommitted)`
    : `${context.git.branch} (clean)`;

  let branchLine = GINKO_BRAND.dim('Branch: ') + branchPart;

  // Add warning inline if there is one
  if (context.synthesis?.blockedItems?.length) {
    branchLine += GINKO_BRAND.dim(' │ ') +
      GINKO_BRAND.error(`⚠️ ${truncate(context.synthesis.blockedItems[0], width - 50)}`);
  } else if (context.git.warnings.length > 0) {
    branchLine += GINKO_BRAND.dim(' │ ') +
      GINKO_BRAND.warning(`⚠️ ${truncate(context.git.warnings[0], width - 50)}`);
  }

  lines.push(row(branchLine));

  // Line 7: Separator
  lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));

  // Line 8: Footer
  lines.push(row(GINKO_BRAND.footer));

  // Line 9: Bottom border
  lines.push(chalk.dim(hLine(box.bottomLeft, box.bottomRight)));

  return lines.join('\n');
}

/**
 * Format session output as a bordered table (new default format)
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  ginko                                                              │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  Ready │ Hot (10/10) │ Think & Build                                │
 * │  Last: EPIC-011 Sprint 0 complete                                   │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  Sprint: e011_s01 Hierarchy Navigation                        0/6  │
 * ├────┬────────────────────────────────────────────────────┬──────────┤
 * │ 01 │ Nav Tree shows nested hierarchy                    │ [ ] todo │
 * │ 02 │ Parent link visible at card top                    │ [ ] todo │
 * ├────┴────────────────────────────────────────────────────┴──────────┤
 * │  Next: e011_s01_t01 - Nav Tree (start)                              │
 * │  Branch: main (2 uncommitted)                                       │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  ginko.ai                                                           │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function formatTableOutput(
  context: AISessionContext,
  config: TableOutputConfig = {}
): string {
  const {
    width = 75,
    showBranding = true,
    showTasks = true,
    maxTasks = 6,
    compact = false,
  } = config;

  const lines: string[] = [];
  const { box } = GINKO_BRAND;

  // Compact mode: 8 lines max for Claude Code display
  if (compact) {
    return formatCompactTable(context, width);
  }

  // Helper to create a horizontal line
  const hLine = (left: string, right: string, fill?: string) =>
    left + (fill || box.horizontal).repeat(width - 2) + right;

  // Helper to pad content within a row
  const row = (content: string) => {
    // Strip ANSI codes for length calculation
    const stripped = content.replace(/\u001b\[[0-9;]*m/g, '');
    const padding = Math.max(0, width - 4 - stripped.length);
    return `${box.vertical}  ${content}${' '.repeat(padding)}${box.vertical}`;
  };

  // Top border
  lines.push(chalk.dim(hLine(box.topLeft, box.topRight)));

  // Header: ginko branding
  if (showBranding) {
    lines.push(row(GINKO_BRAND.header));
    lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));
  }

  // Status row: Ready | Flow | Mode
  const flowState = getFlowStateLabel(context.session.flowScore);
  const statusLine =
    GINKO_BRAND.success('Ready') +
    GINKO_BRAND.dim(' │ ') +
    GINKO_BRAND.highlight(`${flowState} (${context.session.flowScore}/10)`) +
    GINKO_BRAND.dim(' │ ') +
    context.session.workMode;
  lines.push(row(statusLine));

  // Last session line
  if (context.synthesis?.resumePoint) {
    const resumeShort = truncate(context.synthesis.resumePoint, width - 12);
    lines.push(row(GINKO_BRAND.dim('Last: ') + resumeShort));
  }

  // Separator
  lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));

  // Sprint section
  if (context.sprint) {
    const progress = typeof context.sprint.progress === 'number' ? context.sprint.progress : 0;
    const sprintName = truncate(context.sprint.name || 'Active Sprint', width - 30);

    // Sprint header with progress
    const progressText = progress >= 100
      ? GINKO_BRAND.success('Complete')
      : GINKO_BRAND.dim(`${progress}%`);

    const sprintProgressSuffix = context.sprint.currentTask
      ? ` ${context.sprint.currentTask.id.split('-').pop() || '0'}/${maxTasks}`
      : '';

    lines.push(
      row(
        GINKO_BRAND.dim('Sprint: ') +
        GINKO_BRAND.highlight(sprintName) +
        ' ' +
        progressText +
        GINKO_BRAND.dim(sprintProgressSuffix)
      )
    );

    // Task list (if available and enabled)
    if (showTasks && context.sprint.tasks && context.sprint.tasks.length > 0) {
      lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));

      const tasks = context.sprint.tasks.slice(0, maxTasks);
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const num = String(i + 1).padStart(2, '0');
        const title = truncate(task.title || task.id, width - 25);
        const statusIcon = task.status === 'completed' ? '[x]'
          : task.status === 'in_progress' ? '[@]'
          : '[ ]';

        const taskColor = task.status === 'completed' ? GINKO_BRAND.dim
          : task.status === 'in_progress' ? GINKO_BRAND.highlight
          : (s: string) => s;

        lines.push(
          row(
            GINKO_BRAND.dim(num + ' ') +
            taskColor(title) +
            GINKO_BRAND.dim(' ' + statusIcon)
          )
        );
      }

      if (context.sprint.tasks.length > maxTasks) {
        lines.push(
          row(GINKO_BRAND.dim(`   ... +${context.sprint.tasks.length - maxTasks} more tasks`))
        );
      }
    }

    // Cognitive scaffolding (patterns, gotchas, constraints)
    if (context.sprint.currentTask) {
      const scaffolding: string[] = [];

      if (context.sprint.currentTask.constraints?.length) {
        const adrList = context.sprint.currentTask.constraints.map(c => c.adr.id).join(', ');
        scaffolding.push(GINKO_BRAND.dim('Follow: ') + chalk.magenta(adrList));
      }

      if (context.sprint.currentTask.patterns?.length) {
        const patternList = context.sprint.currentTask.patterns.slice(0, 2).map(p => {
          const icon = p.confidence === 'high' ? '★' : p.confidence === 'medium' ? '◐' : '○';
          return `${p.title} ${icon}`;
        }).join(', ');
        scaffolding.push(GINKO_BRAND.dim('Apply: ') + chalk.blue(patternList));
      }

      if (context.sprint.currentTask.gotchas?.length) {
        const gotchaList = context.sprint.currentTask.gotchas.slice(0, 2).map(g => {
          const icon = g.severity === 'critical' ? '🚨' : g.severity === 'high' ? '⚠️' : '💡';
          return `${icon} ${g.title}`;
        }).join(', ');
        scaffolding.push(GINKO_BRAND.dim('Avoid: ') + chalk.red(gotchaList));
      }

      if (scaffolding.length > 0) {
        lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));
        scaffolding.forEach(s => lines.push(row(s)));
      }
    }
  }

  // Separator
  lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));

  // Next up line
  if (context.sprint?.currentTask) {
    const task = context.sprint.currentTask;
    const statusLabel = task.status === 'in_progress' ? 'continue' : 'start';
    lines.push(
      row(
        GINKO_BRAND.dim('Next: ') +
        GINKO_BRAND.warning(task.id) +
        GINKO_BRAND.dim(` - ${truncate(task.title, width - 30)} (${statusLabel})`)
      )
    );
  } else {
    lines.push(row(GINKO_BRAND.dim('Ready for work. What would you like to do?')));
  }

  // Branch + uncommitted
  const totalChanges =
    context.git.uncommittedChanges.modified.length +
    context.git.uncommittedChanges.created.length +
    context.git.uncommittedChanges.untracked.length;

  const branchLine = totalChanges > 0
    ? `${context.git.branch} (${totalChanges} uncommitted)`
    : `${context.git.branch} (clean)`;

  lines.push(row(GINKO_BRAND.dim('Branch: ') + GINKO_BRAND.highlight(branchLine)));

  // Warnings
  const warnings: string[] = [];
  if (context.synthesis?.blockedItems?.length) {
    warnings.push(GINKO_BRAND.error(`⚠️  Blocked: ${truncate(context.synthesis.blockedItems[0], width - 20)}`));
  }
  if (context.git.warnings.length > 0 && warnings.length < 1) {
    warnings.push(GINKO_BRAND.warning(`⚠️  ${context.git.warnings[0]}`));
  }

  if (warnings.length > 0) {
    lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));
    warnings.forEach(w => lines.push(row(w)));
  }

  // Footer: ginko.ai branding
  if (showBranding) {
    lines.push(chalk.dim(hLine(box.teeLeft, box.teeRight)));
    lines.push(row(GINKO_BRAND.footer));
  }

  // Bottom border
  lines.push(chalk.dim(hLine(box.bottomLeft, box.bottomRight)));

  return lines.join('\n');
}

/**
 * Format epic completion message (TASK-3)
 */
export function formatEpicComplete(epicName: string, epicId: string): string {
  const lines: string[] = [];
  const { box } = GINKO_BRAND;
  const width = 75;

  const hLine = (left: string, right: string) =>
    left + box.horizontal.repeat(width - 2) + right;

  const row = (content: string) => {
    const stripped = content.replace(/\u001b\[[0-9;]*m/g, '');
    const padding = Math.max(0, width - 4 - stripped.length);
    return `${box.vertical}  ${content}${' '.repeat(padding)}${box.vertical}`;
  };

  lines.push('');
  lines.push(GINKO_BRAND.success(hLine(box.topLeft, box.topRight)));
  lines.push(GINKO_BRAND.success(row('')));
  lines.push(GINKO_BRAND.success(row('🎉  EPIC COMPLETE')));
  lines.push(GINKO_BRAND.success(row('')));
  lines.push(GINKO_BRAND.success(row(epicName)));
  lines.push(GINKO_BRAND.success(row('')));
  lines.push(GINKO_BRAND.success(row('All sprints completed successfully.')));
  lines.push(GINKO_BRAND.success(row('')));
  lines.push(row(GINKO_BRAND.dim('Next steps:')));
  lines.push(row(GINKO_BRAND.dim(`  • Run \`ginko epic close ${epicId}\` to mark complete`)));
  lines.push(row(GINKO_BRAND.dim(`  • Review docs/epics/${epicId.toUpperCase()}-*.md`)));
  lines.push(GINKO_BRAND.success(row('')));
  lines.push(GINKO_BRAND.success(hLine(box.bottomLeft, box.bottomRight)));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format sprint progression prompt
 */
export function formatSprintProgressionPrompt(
  currentSprintId: string,
  nextSprintId: string,
  nextSprintName: string
): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(GINKO_BRAND.success('✓ Sprint complete: ') + currentSprintId);
  lines.push('');
  lines.push(GINKO_BRAND.highlight('Next sprint available:'));
  lines.push(`  ${nextSprintId} - ${nextSprintName}`);
  lines.push('');

  return lines.join('\n');
}
