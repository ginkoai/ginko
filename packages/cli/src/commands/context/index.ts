/**
 * @fileType: command
 * @status: current
 * @updated: 2026-02-05
 * @tags: [cli, context, management, quality, epic-018]
 * @related: [score.ts, ../../lib/context-quality.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [commander, chalk, fs-extra]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../../utils/helpers.js';
import { scoreCommand } from './score.js';

/**
 * Context command with subcommands for context management and quality scoring
 *
 * Usage:
 *   ginko context                    Show current context (default)
 *   ginko context --add <files>      Add files to context
 *   ginko context --remove <files>   Remove files from context
 *   ginko context score <scores>     Score context quality (EPIC-018)
 */
export function createContextCommand(): Command {
  const context = new Command('context')
    .description('Manage session context and quality scoring')
    .addHelpText('after', `
${chalk.gray('Context Management:')}
  ${chalk.green('ginko context')}                    ${chalk.dim('Show current context')}
  ${chalk.green('ginko context --add')} <files>      ${chalk.dim('Add files to context')}
  ${chalk.green('ginko context --remove')} <files>   ${chalk.dim('Remove files from context')}
  ${chalk.green('ginko context --show')}             ${chalk.dim('Show current context')}

${chalk.gray('Quality Scoring (EPIC-018):')}
  ${chalk.green('ginko context score')} <scores>     ${chalk.dim('Score context quality')}
  ${chalk.green('ginko context score')} 8,7,9,6     ${chalk.dim('Score: D=8, I=7, L=9, H=6')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko context --add src/index.ts')}
  ${chalk.green('ginko context score "direction=8, intent=7, location=9, history=6"')}
  ${chalk.green('ginko context score 8,7,9,6 --notes "Missing ADR refs"')}
`)
    .option('-a, --add <files...>', 'Add files to context')
    .option('-r, --remove <files...>', 'Remove files from context')
    .option('-s, --show', 'Show current context')
    .action(async (options) => {
      await contextManagementCommand(options);
    });

  // Add score subcommand
  context
    .command('score [scores]')
    .description('Score context quality after loading (EPIC-018 Sprint 1)')
    .option('-d, --direction <score>', 'Direction score (0-10): Do I know what to do next?')
    .option('-i, --intent <score>', 'Intent score (0-10): Do I understand WHY?')
    .option('-l, --location <score>', 'Location score (0-10): Do I know WHERE to start?')
    .option('-H, --history <score>', 'History score (0-10): Do I know WHAT was decided?')
    .option('-n, --notes <notes>', 'Semicolon-separated notes about what\'s missing')
    .option('--detailed', 'Show full breakdown with suggestions')
    .option('--json', 'Output as JSON')
    .option('--no-log', 'Score without logging to event stream')
    .addHelpText('after', `
${chalk.gray('Dimensions (0-10 each):')}
  ${chalk.dim('Direction - Do I know what to do next?')}
  ${chalk.dim('Intent    - Do I understand WHY?')}
  ${chalk.dim('Location  - Do I know WHERE to start?')}
  ${chalk.dim('History   - Do I know WHAT was decided?')}

${chalk.gray('Input Formats:')}
  ${chalk.dim('Named:      "direction=8, intent=7, location=9, history=6"')}
  ${chalk.dim('Positional: "8,7,9,6" (order: direction, intent, location, history)')}
  ${chalk.dim('Options:    --direction 8 --intent 7 --location 9 --history 6')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko context score 8,7,9,6')}
  ${chalk.green('ginko context score "direction=8, intent=7, location=9, history=6"')}
  ${chalk.green('ginko context score --direction 8 --intent 7 --location 9 --history 6')}
  ${chalk.green('ginko context score 8,7,9,6 --notes "Missing ADR refs; Unclear entry point"')}
  ${chalk.green('ginko context score 8,7,9,6 --detailed')}
`)
    .action(async (scores, options) => {
      await scoreCommand(scores, options);
    });

  return context;
}

/**
 * Original context management functionality
 */
async function contextManagementCommand(options: {
  add?: string[];
  remove?: string[];
  show?: boolean;
}): Promise<void> {
  try {
    const ginkoDir = await getGinkoDir();
    const contextFile = path.join(ginkoDir, 'context', 'current.json');

    // Load existing context
    let contextData: { files: string[]; patterns: string[]; boundaries: string[] } = {
      files: [],
      patterns: [],
      boundaries: ['module']
    };

    if (await fs.pathExists(contextFile)) {
      contextData = await fs.readJSON(contextFile);
    }

    // Handle operations
    if (options.add) {
      for (const pattern of options.add) {
        if (!contextData.files.includes(pattern)) {
          contextData.files.push(pattern);
          console.log(chalk.green(`Added to context: ${pattern}`));
        }
      }
      await fs.ensureDir(path.dirname(contextFile));
      await fs.writeJSON(contextFile, contextData, { spaces: 2 });
    }

    if (options.remove) {
      for (const pattern of options.remove) {
        const index = contextData.files.indexOf(pattern);
        if (index > -1) {
          contextData.files.splice(index, 1);
          console.log(chalk.yellow(`Removed from context: ${pattern}`));
        }
      }
      await fs.writeJSON(contextFile, contextData, { spaces: 2 });
    }

    // Show context (default or explicit)
    if (options.show || (!options.add && !options.remove)) {
      console.log(chalk.green('\nCurrent Context\n'));

      if (contextData.files.length === 0) {
        console.log(chalk.dim('No files in context'));
        console.log(chalk.dim('Add files with: ginko context --add <files>'));
      } else {
        console.log(chalk.cyan('Files:'));
        contextData.files.forEach(file => {
          console.log(`  - ${file}`);
        });

        // Calculate estimated size
        let totalSize = 0;
        for (const file of contextData.files) {
          if (await fs.pathExists(file)) {
            const stats = await fs.stat(file);
            totalSize += stats.size;
          }
        }

        console.log(chalk.dim(`\nEstimated size: ${Math.round(totalSize / 1024)}KB`));
        console.log(chalk.dim('Note: Context stays local, never sent to servers'));
      }

      // Show rules
      const rulesFile = path.join(ginkoDir, 'context', 'rules.md');
      if (await fs.pathExists(rulesFile)) {
        console.log(chalk.cyan('\nRules:'));
        console.log(chalk.dim('  Defined in .ginko/context/rules.md'));
      }
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Export for backward compatibility with direct imports
export async function contextCommand(options: {
  add?: string[];
  remove?: string[];
  show?: boolean;
}): Promise<void> {
  return contextManagementCommand(options);
}

export default createContextCommand;
