/**
 * @fileType: command
 * @status: deprecated
 * @updated: 2026-02-02
 * @tags: [graph, load, deprecated, ADR-077]
 * @related: [../push/push-command.ts]
 * @priority: low
 * @complexity: low
 * @dependencies: [chalk]
 */

import chalk from 'chalk';

/**
 * Load command — REMOVED (ADR-077)
 * Use `ginko push --all` instead.
 */
export async function loadCommand(_options?: unknown): Promise<void> {
  console.log(chalk.red('\u2717 `ginko graph load` has been removed.'));
  console.log(chalk.dim('  Use `ginko push --all` instead (ADR-077).\n'));
  process.exit(1);
}
