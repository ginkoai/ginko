/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-26
 * @tags: [planning, menu, coaching, structure-detection, epic-016-s04]
 * @related: [start-reflection.ts, user-sprint.ts, event-logger.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [prompts, chalk, event-logger]
 */

/**
 * Guided Planning Menu (EPIC-016 Sprint 4 t02)
 *
 * Shows a menu when `ginko start` detects no structured work.
 * Guides users toward Epic→Sprint→Task structure while allowing
 * ad-hoc work when appropriate.
 *
 * Menu Options:
 * [a] New Epic - Large initiative with multiple sprints
 * [b] New Feature Sprint - Focused work with clear goals
 * [c] Quick fix / Bug fix - Single task, minimal overhead
 * [d] Something else - Explore, research, or work ad-hoc
 */

import prompts from 'prompts';
import chalk from 'chalk';
import { WorkStructureStatus } from './user-sprint.js';
import { logEvent } from './event-logger.js';
// EPIC-016 Sprint 4: Adoption-based quieting (t05)
import {
  getAdoptionScore,
  recordAdoptionSignal,
  getPlanningMenuConfig,
  checkAdhocStreak,
  AdoptionSignal
} from './adoption-score.js';

// =============================================================================
// Types
// =============================================================================

export type PlanningChoice = 'epic' | 'sprint' | 'quick-fix' | 'adhoc';

export interface PlanningMenuResult {
  choice: PlanningChoice | null;  // null if user cancelled
  cancelled: boolean;
}

export interface PlanningRouteResult {
  success: boolean;
  sprintId?: string;
  taskId?: string;
  message?: string;
  shouldContinueStart?: boolean;  // Whether to continue normal start flow
}

// =============================================================================
// Constants
// =============================================================================

const PLANNING_MENU_CHOICES = [
  {
    title: 'New Epic',
    description: 'Large initiative with multiple sprints (launches ginko epic)',
    value: 'epic' as PlanningChoice,
  },
  {
    title: 'New Feature Sprint',
    description: 'Focused work with clear goals (guides through sprint creation)',
    value: 'sprint' as PlanningChoice,
  },
  {
    title: 'Quick fix / Bug fix',
    description: 'Single task, minimal overhead (creates 1-task sprint)',
    value: 'quick-fix' as PlanningChoice,
  },
  {
    title: 'Something else',
    description: 'Explore, research, or work ad-hoc (tracked for coaching)',
    value: 'adhoc' as PlanningChoice,
  },
];

// =============================================================================
// Menu Display
// =============================================================================

/**
 * Display the guided planning menu and get user selection
 *
 * Called when ginko start detects no structured work.
 * Logs selection for coaching insights analysis (t05).
 * Uses adoption-based quieting to adjust verbosity.
 *
 * @param status - Work structure status from checkWorkStructure()
 * @returns Menu selection result
 */
export async function showPlanningMenu(
  status?: WorkStructureStatus
): Promise<PlanningMenuResult> {
  // EPIC-016 Sprint 4 t05: Get quieting configuration based on adoption level
  const menuConfig = await getPlanningMenuConfig();
  const adoptionScore = await getAdoptionScore();

  console.log('');

  // Check for ad-hoc streak (3+ consecutive sessions resets score)
  if (status?.consecutiveAdhocSessions) {
    await checkAdhocStreak(status.consecutiveAdhocSessions);
  }

  // Show context-appropriate header based on quieting level
  if (menuConfig.showCelebration && adoptionScore.score >= 20) {
    console.log(chalk.green('🌳 Great job staying organized!'));
  }

  if (status?.reason === 'all_tasks_complete') {
    console.log(chalk.green(`🎉 Sprint complete! All tasks finished in ${status.sprintId}`));
    console.log(chalk.white('What would you like to work on next?'));
  } else if (menuConfig.showCoachingTip && status?.consecutiveAdhocSessions && status.consecutiveAdhocSessions > 1) {
    console.log(chalk.yellow(`💡 You've had ${status.consecutiveAdhocSessions} sessions without planned work.`));
    console.log(chalk.white('Would you like to plan your work?'));
  } else if (adoptionScore.level === 'minimal') {
    // Minimal prompt for high adopters
    console.log(chalk.dim('No active sprint.'));
  } else {
    console.log(chalk.yellow('You have no planned work.'));
    console.log(chalk.white('What would you like to work on?'));
  }

  console.log('');

  // Build menu choices based on quieting level
  const choices = PLANNING_MENU_CHOICES.map((c, i) => ({
    title: `${chalk.cyan(`[${String.fromCharCode(97 + i)}]`)} ${c.title}`,
    description: menuConfig.showFullDescription ? chalk.dim(c.description) : undefined,
    value: c.value,
  }));

  const response = await prompts({
    type: 'select',
    name: 'choice',
    message: 'Select an option',
    choices,
    initial: 0,
  });

  // Handle cancellation (Ctrl+C or ESC)
  if (response.choice === undefined) {
    return { choice: null, cancelled: true };
  }

  // Log selection and record adoption signal (non-blocking)
  logPlanningChoice(response.choice).catch(() => {
    // Ignore logging errors
  });

  return { choice: response.choice, cancelled: false };
}

/**
 * Log the planning menu selection for coaching analysis (t05)
 *
 * Enables the insights system to:
 * - Track pattern adoption over time
 * - Identify users who frequently choose ad-hoc
 * - Measure effectiveness of planning prompts
 *
 * Also records adoption signals for quieting behavior.
 */
async function logPlanningChoice(choice: PlanningChoice): Promise<void> {
  const descriptions: Record<PlanningChoice, string> = {
    'epic': 'Started new epic creation from planning menu',
    'sprint': 'Started new sprint creation from planning menu',
    'quick-fix': 'Started quick-fix flow from planning menu',
    'adhoc': 'Chose ad-hoc work from planning menu',
  };

  // Map menu choices to adoption signals
  const adoptionSignals: Record<PlanningChoice, AdoptionSignal | null> = {
    'epic': 'created_epic',
    'sprint': 'created_sprint',
    'quick-fix': 'used_quick_fix',
    'adhoc': 'chose_adhoc',
  };

  try {
    // Log event for insights
    await logEvent({
      category: 'decision',
      description: descriptions[choice],
      tags: ['planning-menu', `choice-${choice}`, 'coaching-data'],
      impact: choice === 'adhoc' ? 'low' : 'medium',
    });

    // Record adoption signal for quieting behavior (t05)
    const signal = adoptionSignals[choice];
    if (signal) {
      await recordAdoptionSignal(signal);
    }
  } catch {
    // Non-critical - don't fail startup if logging fails
  }
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * Route the planning menu choice to appropriate handler
 *
 * Routes:
 * - epic → launches ginko epic command
 * - sprint → launches sprint creation flow (t03)
 * - quick-fix → launches quick-fix flow (t04)
 * - adhoc → marks session as ad-hoc, continues to normal start
 *
 * @param choice - User's menu selection
 * @returns Route result with success status and metadata
 */
export async function routePlanningChoice(
  choice: PlanningChoice
): Promise<PlanningRouteResult> {
  switch (choice) {
    case 'epic':
      return routeToEpicCreation();

    case 'sprint':
      return routeToSprintCreation();

    case 'quick-fix':
      return routeToQuickFix();

    case 'adhoc':
      return routeToAdhocWork();

    default:
      return { success: false, message: 'Unknown choice', shouldContinueStart: true };
  }
}

/**
 * Route to epic creation (ginko epic)
 */
async function routeToEpicCreation(): Promise<PlanningRouteResult> {
  console.log('');
  console.log(chalk.cyan('🚀 Launching epic creation...'));
  console.log('');

  try {
    // Import and execute epic command
    const { epicCommand } = await import('../commands/epic.js');
    await epicCommand({});

    return {
      success: true,
      message: 'Epic creation flow completed',
      shouldContinueStart: false  // Epic command handles its own output
    };
  } catch (error) {
    console.error(chalk.red('Failed to launch epic creation:'), error);
    return {
      success: false,
      message: 'Epic creation failed',
      shouldContinueStart: true
    };
  }
}

/**
 * Route to sprint creation flow (t03)
 * Full implementation in packages/cli/src/commands/sprint/create.ts
 */
async function routeToSprintCreation(): Promise<PlanningRouteResult> {
  console.log('');
  console.log(chalk.cyan('📋 Starting sprint creation...'));
  console.log('');

  try {
    // Import and execute sprint create command
    const { createSprintCommand } = await import('../commands/sprint/create.js');
    const result = await createSprintCommand({ adhoc: true });

    return {
      success: result.success,
      sprintId: result.sprintId,
      message: result.message || 'Sprint creation completed',
      shouldContinueStart: !result.success  // Continue if creation failed
    };
  } catch (error) {
    // Fallback: Sprint creation not yet implemented (t03)
    console.log(chalk.dim('Sprint creation flow launching...'));
    console.log('');
    console.log(chalk.white('To create a sprint, describe what you want to build:'));
    console.log(chalk.dim('  The AI will break this down into tasks and create a sprint.'));
    console.log('');

    return {
      success: true,
      message: 'Sprint creation guidance displayed',
      shouldContinueStart: true
    };
  }
}

/**
 * Route to quick-fix flow (t04)
 * Creates a single-task sprint with minimal ceremony
 */
async function routeToQuickFix(): Promise<PlanningRouteResult> {
  console.log('');
  console.log(chalk.cyan('⚡ Quick fix mode'));
  console.log('');

  // Get quick description
  const response = await prompts({
    type: 'text',
    name: 'description',
    message: 'Describe the fix in one line:',
    validate: (value: string) => value.trim().length > 5 ? true : 'Please provide a brief description',
  });

  if (!response.description) {
    return { success: false, message: 'Quick fix cancelled', shouldContinueStart: false };
  }

  const description = response.description.trim();

  try {
    // Try to use the quick-fix implementation (t04)
    const { createQuickFixTask } = await import('../commands/sprint/quick-fix.js');
    const result = await createQuickFixTask(description);

    console.log('');
    console.log(chalk.green(`✓ Created: ${result.taskId} - ${description}`));
    console.log(chalk.dim('  Ready to work. Run `ginko task complete` when done.'));

    return {
      success: true,
      taskId: result.taskId,
      sprintId: result.sprintId,
      message: 'Quick fix task created',
      shouldContinueStart: true
    };
  } catch {
    // Fallback: Log as an event for now
    console.log('');
    console.log(chalk.green(`✓ Ready to work on: ${description}`));
    console.log(chalk.dim('  Tip: Run `ginko log "completed: ${description}"` when done.'));

    // Log the quick fix start as an event
    await logEvent({
      category: 'feature',
      description: `Quick fix started: ${description}`,
      tags: ['quick-fix', 'unstructured'],
      impact: 'medium',
    }).catch(() => {});

    return {
      success: true,
      message: 'Quick fix tracked (full sprint creation in t04)',
      shouldContinueStart: true
    };
  }
}

/**
 * Route to ad-hoc work mode
 * User explicitly chooses unstructured work - track for coaching
 */
async function routeToAdhocWork(): Promise<PlanningRouteResult> {
  console.log('');
  console.log(chalk.dim('Working ad-hoc. Use `ginko log` to track your progress.'));

  return {
    success: true,
    message: 'Ad-hoc work mode - session will continue normally',
    shouldContinueStart: true
  };
}

// =============================================================================
// Exports for Testing
// =============================================================================

export const __testing = {
  PLANNING_MENU_CHOICES,
  logPlanningChoice,
};
