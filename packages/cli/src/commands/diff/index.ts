/**
 * @fileType: command-entry
 * @status: current
 * @updated: 2026-01-30
 * @tags: [diff, command, ADR-077]
 * @related: [diff-command.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [commander]
 */

/**
 * Diff Command Entry Point (ADR-077)
 *
 * Registers the `ginko diff` command for comparing local vs graph content.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { diffCommand } from './diff-command.js';

export function createDiffCommand(): Command {
  const diff = new Command('diff')
    .description('Show differences between local files and graph (ADR-077)')
    .argument('<entity-path>', 'Entity to diff in format type/id (e.g., epic/EPIC-001)')
    .option('-v, --verbose', 'Show detailed diff output')
    .addHelpText('after', `
${chalk.gray('Examples:')}
  ${chalk.green('ginko diff epic/EPIC-001')} ${chalk.dim('# Compare local epic with graph version')}
  ${chalk.green('ginko diff sprint/e001_s01')} ${chalk.dim('# Compare local sprint with graph')}
  ${chalk.green('ginko diff adr/ADR-077')} ${chalk.dim('# Compare local ADR with graph')}
`)
    .action(async (entityPath: string, options: Record<string, unknown>) => {
      await diffCommand({
        entityPath,
        verbose: options.verbose === true,
      });
    });

  return diff;
}

export { diffCommand } from './diff-command.js';
export type { DiffOptions } from './diff-command.js';
