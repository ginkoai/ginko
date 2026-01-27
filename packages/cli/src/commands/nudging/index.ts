/**
 * @fileType: command-index
 * @status: current
 * @updated: 2026-01-26
 * @tags: [cli, nudging, coaching, command, epic-016-s05]
 * @related: [coaching-level.ts, adoption-score.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander, chalk]
 */

/**
 * ginko nudging - Manual override for coaching intensity (EPIC-016 Sprint 5 Task 2)
 *
 * Usage:
 *   ginko nudging              # View current level
 *   ginko nudging minimal      # Set to minimal (expert mode)
 *   ginko nudging standard     # Set to balanced guidance
 *   ginko nudging supportive   # Set to extra help
 *   ginko nudging auto         # Return to auto-adjustment
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  getCoachingContext,
  setCoachingOverride,
  CoachingLevel,
} from '../../lib/coaching-level.js';
import { getGraphId } from '../graph/config.js';
import { logCoachingLevelChange } from '../../lib/event-logger.js';

// =============================================================================
// Level Descriptions
// =============================================================================

const LEVEL_INFO: Record<CoachingLevel, { emoji: string; label: string; description: string }> = {
  minimal: {
    emoji: '🚀',
    label: 'Minimal',
    description: 'Brief prompts, assume competence',
  },
  standard: {
    emoji: '📋',
    label: 'Standard',
    description: 'Balanced guidance with context',
  },
  supportive: {
    emoji: '🤝',
    label: 'Supportive',
    description: 'Detailed prompts with examples',
  },
};

const SOURCE_LABELS: Record<string, string> = {
  dashboard: 'Live dashboard insights',
  cache: 'Cached insights',
  adoption_fallback: 'Local adoption score (offline)',
};

// =============================================================================
// Display Helpers
// =============================================================================

function formatScore(score: number): string {
  if (score >= 75) return chalk.green(`${score}`);
  if (score >= 60) return chalk.yellow(`${score}`);
  return chalk.red(`${score}`);
}

function formatLevel(level: CoachingLevel): string {
  const info = LEVEL_INFO[level];
  return `${info.emoji} ${info.label}`;
}

// =============================================================================
// View Command
// =============================================================================

async function viewNudgingStatus(): Promise<void> {
  const graphId = await getGraphId();
  const context = await getCoachingContext(graphId || undefined);

  console.log(chalk.cyan('\n🎯 Coaching Settings\n'));

  // Current level
  const levelInfo = LEVEL_INFO[context.level];
  console.log(`  Current level: ${formatLevel(context.level)}`);
  console.log(chalk.dim(`                 ${levelInfo.description}`));

  // Score info
  console.log(`\n  7-day score:   ${formatScore(context.overallScore)}/100`);

  // Category breakdown
  console.log(chalk.dim('\n  Category Breakdown:'));
  console.log(chalk.dim(`    Session Efficiency:    ${context.metrics.sessionEfficiency}`));
  console.log(chalk.dim(`    Pattern Adoption:      ${context.metrics.patternAdoption}`));
  console.log(chalk.dim(`    Collaboration Quality: ${context.metrics.collaborationQuality}`));
  console.log(chalk.dim(`    Anti-Patterns:         ${context.metrics.antiPatterns}`));

  // Source
  console.log(chalk.dim(`\n  Data source: ${SOURCE_LABELS[context.source]}`));
  if (context.cacheAge !== undefined) {
    console.log(chalk.dim(`  Cache age:   ${context.cacheAge} minutes`));
  }

  // Override status
  if (context.override) {
    console.log(chalk.yellow(`\n  ⚠️  Manual override active: ${context.override}`));
    console.log(chalk.dim('     Run `ginko nudging auto` to return to auto-adjustment'));
  } else {
    console.log(chalk.green('\n  ✓ Auto-adjusting based on 7-day insights'));
  }

  console.log('');
}

// =============================================================================
// Set Command
// =============================================================================

async function setNudgingLevel(level: string): Promise<void> {
  // Validate level
  const validLevels = ['minimal', 'standard', 'supportive', 'auto'];
  if (!validLevels.includes(level)) {
    console.error(chalk.red(`\n✗ Invalid level: ${level}`));
    console.error(chalk.dim(`  Valid options: ${validLevels.join(', ')}`));
    process.exit(1);
  }

  // Get previous level before changing
  const graphId = await getGraphId();
  const previousContext = await getCoachingContext(graphId || undefined);
  const previousLevel = previousContext.level;

  await setCoachingOverride(level as CoachingLevel | 'auto');

  if (level === 'auto') {
    // Fetch current auto level
    const context = await getCoachingContext(graphId || undefined);

    console.log(chalk.green('\n✓ Coaching returned to auto-adjustment'));
    console.log(`  Current level: ${formatLevel(context.level)} (score: ${context.overallScore})`);

    // EPIC-016 Sprint 5 t05: Log level change for feedback loop
    logCoachingLevelChange(context.level, false, context.overallScore, previousLevel).catch(() => {
      // Non-critical - don't fail on logging errors
    });
  } else {
    const info = LEVEL_INFO[level as CoachingLevel];
    console.log(chalk.green(`\n✓ Coaching set to: ${info.emoji} ${info.label}`));
    console.log(chalk.dim(`  ${info.description}`));
    console.log(chalk.dim('\n  Override active until: ginko nudging auto'));

    // EPIC-016 Sprint 5 t05: Log level change for feedback loop
    logCoachingLevelChange(level as CoachingLevel, true, previousContext.overallScore, previousLevel).catch(() => {
      // Non-critical - don't fail on logging errors
    });
  }

  console.log('');
}

// =============================================================================
// Command Registration
// =============================================================================

export function nudgingCommand(): Command {
  const nudging = new Command('nudging')
    .description('Configure coaching intensity (EPIC-016 Sprint 5)')
    .argument('[level]', 'Set coaching level: minimal, standard, supportive, or auto')
    .action(async (level?: string) => {
      try {
        if (level) {
          await setNudgingLevel(level);
        } else {
          await viewNudgingStatus();
        }
      } catch (error) {
        console.error(
          chalk.red('Error:'),
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });

  // Add help examples
  nudging.addHelpText('after', `
Examples:
  $ ginko nudging              # View current coaching level
  $ ginko nudging minimal      # Expert mode - brief prompts
  $ ginko nudging standard     # Balanced guidance
  $ ginko nudging supportive   # Extra help and examples
  $ ginko nudging auto         # Return to auto-adjustment

Levels are determined by your 7-day insight score:
  ≥75  →  Minimal     (assume competence)
  60-74 →  Standard    (balanced guidance)
  <60  →  Supportive  (detailed prompts)
`);

  return nudging;
}

export default nudgingCommand;
