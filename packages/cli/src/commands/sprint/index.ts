/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [sprint, router, pipeline, safe-defaults, epic-004]
 * @related: [./sprint-pipeline.ts, ./sprint-pipeline-enhanced.ts, ./deps.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander]
 */

import { Command } from 'commander';
import { SprintPipeline } from './sprint-pipeline.js';
import { EnhancedSprintPipeline, SprintOptions } from './sprint-pipeline-enhanced.js';
import { createDepsCommand } from './deps.js';
import { createSprintStatusCommands, addSprintStatusShortcuts } from './status.js';
// EPIC-016 Sprint 4: Conversational sprint creation
import { createSprintCommand as createSprintAction } from './create.js';
import { createQuickFixTask } from './quick-fix.js';

/**
 * Sprint command router
 * Routes to enhanced pipeline by default (ADR-014 Safe Defaults)
 */
export async function sprintCommandAction(intent: string = '', options: any = {}): Promise<void> {
  // Use basic pipeline if explicitly requested
  if (options.basic) {
    const pipeline = new SprintPipeline(intent);
    await pipeline.build();
    return;
  }

  // Use enhanced pipeline by default (ADR-014)
  const sprintOptions: SprintOptions = {
    wbs: options.wbs || false,
    trace: options.trace || false,
    dryrun: options.dryrun || false,
    strict: options.strict || false,
    nodep: options.nodep || false,
    nowarn: options.nowarn || false
  };

  const pipeline = new EnhancedSprintPipeline(intent, sprintOptions);
  await pipeline.build();
}

/**
 * Create sprint command with subcommands (EPIC-004 Sprint 4)
 */
export function sprintCommand(): Command {
  const sprint = new Command('sprint')
    .description('Sprint management and planning commands')
    .argument('[intent]', 'Sprint intent or description')
    .option('--basic', 'Use basic pipeline')
    .option('--wbs', 'Enable work breakdown structure')
    .option('--trace', 'Enable tracing')
    .option('--dryrun', 'Dry run mode')
    .option('--strict', 'Strict mode')
    .option('--nodep', 'No dependencies')
    .option('--nowarn', 'Suppress warnings')
    .action((intent, options) => sprintCommandAction(intent, options));

  // Add subcommands (EPIC-004 Sprint 4)
  sprint.addCommand(createDepsCommand());

  // Add status commands (EPIC-015 Sprint 1)
  sprint.addCommand(createSprintStatusCommands());
  addSprintStatusShortcuts(sprint);

  // EPIC-016 Sprint 4: Conversational sprint creation (t03)
  sprint
    .command('create')
    .description('Create a new feature sprint (conversational)')
    .option('--adhoc', 'Link to Ad-Hoc epic (default: true)')
    .option('--epic <epicId>', 'Link to specific epic')
    .action(async (options) => {
      await createSprintAction(options);
    });

  // EPIC-016 Sprint 4: Quick-fix fast path (t04)
  sprint
    .command('quick-fix <description>')
    .alias('qf')
    .description('Create a single-task sprint for a quick fix')
    .action(async (description) => {
      const result = await createQuickFixTask(description);
      if (result.success) {
        console.log(`✓ Created: ${result.taskId} - ${description}`);
        console.log('  Run `ginko task complete` when done.');
      }
    });

  return sprint;
}

// Export both for direct usage
export { SprintPipeline, EnhancedSprintPipeline };
export type { SprintOptions };

export default sprintCommand;