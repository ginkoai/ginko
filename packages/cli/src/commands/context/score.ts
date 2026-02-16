/**
 * @fileType: command
 * @status: current
 * @updated: 2026-02-05
 * @tags: [cli, context, quality, scoring, epic-018, sprint-1]
 * @related: [../../lib/context-quality.ts, ../log.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander, chalk]
 */

import chalk from 'chalk';
import {
  parseScoreString,
  createQualityFeedback,
  logContextQualityScore,
  formatScoreCompact,
  formatScoreDetailed,
  getQualityZone,
  getQualityColor,
  DIMENSION_INFO,
  ContextQualityScore
} from '../../lib/context-quality.js';
import { isAuthenticated } from '../../utils/auth-storage.js';

interface ScoreOptions {
  direction?: string;
  intent?: string;
  location?: string;
  history?: string;
  notes?: string;
  detailed?: boolean;
  json?: boolean;
  log?: boolean;  // Commander.js uses --no-log which sets log: false
}

/**
 * Score context quality command
 *
 * Allows AI or humans to score how well-prepared they feel after context loads.
 * Creates a feedback loop for synthesis improvement.
 *
 * Usage:
 *   ginko context score "direction=8, intent=7, location=9, history=6"
 *   ginko context score --direction 8 --intent 7 --location 9 --history 6
 *   ginko context score 8,7,9,6
 */
export async function scoreCommand(scoreInput: string | undefined, options: ScoreOptions): Promise<void> {
  try {
    // Check authentication for optional graph logging (--no-log sets log: false)
    const authenticated = await isAuthenticated();
    const shouldLog = options.log !== false && authenticated;

    let score: ContextQualityScore;

    // Parse score from input or options
    if (scoreInput) {
      // Parse from string input
      score = parseScoreString(scoreInput, 'ai');
    } else if (options.direction && options.intent && options.location && options.history) {
      // Parse from individual options
      const direction = parseInt(options.direction, 10);
      const intent = parseInt(options.intent, 10);
      const location = parseInt(options.location, 10);
      const history = parseInt(options.history, 10);

      // Validate values
      const values = [direction, intent, location, history];
      for (const v of values) {
        if (isNaN(v) || v < 0 || v > 10) {
          console.error(chalk.red('Error: All dimension scores must be numbers between 0 and 10'));
          process.exit(1);
        }
      }

      const notes = options.notes ? options.notes.split(';').map(n => n.trim()) : undefined;
      const feedback = createQualityFeedback({ direction, intent, location, history }, 'ai', notes);
      score = feedback.score;
    } else {
      // Show help if no input provided
      showScoreHelp();
      return;
    }

    // Add notes if provided separately
    if (options.notes && !score.notes) {
      score.notes = options.notes.split(';').map(n => n.trim());
    }

    // Log the score (unless --no-log)
    if (shouldLog) {
      await logContextQualityScore(score);
    }

    // Output based on format
    if (options.json) {
      console.log(JSON.stringify(score, null, 2));
      return;
    }

    if (options.detailed) {
      const feedback = createQualityFeedback(
        {
          direction: score.direction,
          intent: score.intent,
          location: score.location,
          history: score.history
        },
        score.scoredBy,
        score.notes
      );
      console.log('\n' + formatScoreDetailed(feedback));
    } else {
      // Compact output
      const zone = getQualityZone(score.overall);
      const colorName = getQualityColor(zone);
      const colorFn = chalk[colorName as keyof typeof chalk] as (s: string) => string;

      console.log('');
      console.log(colorFn(formatScoreCompact(score)));

      // Show notes if present
      if (score.notes && score.notes.length > 0) {
        console.log(chalk.dim('\nNotes:'));
        for (const note of score.notes) {
          console.log(chalk.dim(`  - ${note}`));
        }
      }

      // Show alert for low scores
      if (score.overall < 7) {
        console.log('');
        console.log(chalk.yellow('Low score detected. Consider:'));
        if (score.direction < 7) {
          console.log(chalk.dim(`  - Direction: ${DIMENSION_INFO.direction.improvementHint}`));
        }
        if (score.intent < 7) {
          console.log(chalk.dim(`  - Intent: ${DIMENSION_INFO.intent.improvementHint}`));
        }
        if (score.location < 7) {
          console.log(chalk.dim(`  - Location: ${DIMENSION_INFO.location.improvementHint}`));
        }
        if (score.history < 7) {
          console.log(chalk.dim(`  - History: ${DIMENSION_INFO.history.improvementHint}`));
        }
      }
    }

    // Confirmation message
    if (shouldLog) {
      console.log('');
      console.log(chalk.green('Context quality score logged.'));
    }
    console.log('');

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('Error:'), error.message);
    } else {
      console.error(chalk.red('Error:'), String(error));
    }
    process.exit(1);
  }
}

/**
 * Show help for the score command
 */
function showScoreHelp(): void {
  console.log(chalk.cyan('\nContext Quality Scoring (EPIC-018)\n'));
  console.log(chalk.dim('Score how well-prepared you feel after context loads.\n'));

  console.log(chalk.white('Dimensions (0-10 each):'));
  console.log(chalk.dim(`  Direction - ${DIMENSION_INFO.direction.question}`));
  console.log(chalk.dim(`  Intent    - ${DIMENSION_INFO.intent.question}`));
  console.log(chalk.dim(`  Location  - ${DIMENSION_INFO.location.question}`));
  console.log(chalk.dim(`  History   - ${DIMENSION_INFO.history.question}`));
  console.log('');

  console.log(chalk.white('Usage:'));
  console.log(chalk.dim('  ginko context score "direction=8, intent=7, location=9, history=6"'));
  console.log(chalk.dim('  ginko context score 8,7,9,6'));
  console.log(chalk.dim('  ginko context score --direction 8 --intent 7 --location 9 --history 6'));
  console.log(chalk.dim('  ginko context score --direction 8 --intent 7 --location 9 --history 6 --notes "Missing ADR refs"'));
  console.log('');

  console.log(chalk.white('Options:'));
  console.log(chalk.dim('  --detailed    Show full breakdown with suggestions'));
  console.log(chalk.dim('  --json        Output as JSON'));
  console.log(chalk.dim('  --no-log      Score without logging to event stream'));
  console.log(chalk.dim('  --notes       Semicolon-separated notes about what\'s missing'));
  console.log('');

  console.log(chalk.white('Scoring Guide:'));
  console.log(chalk.dim('  9-10  Excellent - Crystal clear, ready to execute'));
  console.log(chalk.dim('  7-8   Good - Minor gaps acceptable'));
  console.log(chalk.dim('  5-6   Adequate - May need clarification'));
  console.log(chalk.dim('  3-4   Poor - Missing information'));
  console.log(chalk.dim('  0-2   Critical - Cannot proceed confidently'));
  console.log('');
}

export default scoreCommand;
