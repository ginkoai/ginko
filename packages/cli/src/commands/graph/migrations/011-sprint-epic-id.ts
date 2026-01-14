/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-14
 * @tags: [migration, sprint, task, epic_id, EPIC-011]
 * @related: [../api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk]
 */

import chalk from 'chalk';
import { GraphApiClient } from '../api-client.js';

export interface MigrationOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export interface MigrationResult {
  success: boolean;
  sprintsMigrated: number;
  tasksMigrated: number;
  errors: string[];
  dryRun: boolean;
}

interface SprintEpicIdResponse {
  sprintsMigrated: number;
  tasksMigrated: number;
  sprintsSkipped: number;
  tasksSkipped: number;
  errors: string[];
}

/**
 * Migration 011: Add epic_id and graph_id to Sprint and Task nodes
 *
 * This migration:
 * 1. Adds graph_id (snake_case) to Sprint/Task nodes
 * 2. Extracts epic_id from Sprint ID (e{NNN}_s{NN} → EPIC-{N})
 * 3. Adds epic_id to Task nodes based on parent Sprint
 */
export async function runMigration011(options: MigrationOptions = {}): Promise<MigrationResult> {
  const { dryRun = false, verbose = false } = options;
  const client = new GraphApiClient();

  console.log(chalk.blue('\n🔄 Migration 011: Sprint & Task Hierarchy Properties'));
  console.log(chalk.dim('   Adding epic_id and graph_id to Sprint and Task nodes (EPIC-011)\n'));

  if (dryRun) {
    console.log(chalk.yellow('   📋 DRY RUN MODE - No changes will be made\n'));
  }

  try {
    const endpoint = dryRun
      ? '/api/v1/migrations/011-sprint-epic-id?dryRun=true'
      : '/api/v1/migrations/011-sprint-epic-id';

    const response = await client.request<SprintEpicIdResponse>('POST', endpoint);

    console.log(chalk.green(`\n✓ Migration complete`));
    console.log(chalk.dim(`   Sprints migrated: ${response.sprintsMigrated}`));
    console.log(chalk.dim(`   Sprints skipped:  ${response.sprintsSkipped}`));
    console.log(chalk.dim(`   Tasks migrated:   ${response.tasksMigrated}`));
    console.log(chalk.dim(`   Tasks skipped:    ${response.tasksSkipped}`));

    if (response.errors.length > 0) {
      console.log(chalk.red(`   Errors: ${response.errors.length}`));
      for (const error of response.errors) {
        console.log(chalk.red(`     - ${error}`));
      }
    }

    return {
      success: response.errors.length === 0,
      sprintsMigrated: response.sprintsMigrated,
      tasksMigrated: response.tasksMigrated,
      errors: response.errors,
      dryRun,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\n✗ Migration failed: ${message}`));

    return {
      success: false,
      sprintsMigrated: 0,
      tasksMigrated: 0,
      errors: [message],
      dryRun,
    };
  }
}

export async function migrate011Command(options: MigrationOptions = {}): Promise<void> {
  const result = await runMigration011(options);
  if (!result.success) {
    process.exit(1);
  }
}
