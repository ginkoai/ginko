/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-14
 * @tags: [migration, epic, graph_id, EPIC-011]
 * @related: [../api-client.ts]
 * @priority: high
 * @complexity: low
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
  migratedCount: number;
  skippedCount: number;
  errors: string[];
  dryRun: boolean;
}

interface EpicGraphIdResponse {
  migrated: number;
  skipped: number;
  errors: string[];
}

/**
 * Migration 010: Add graph_id to Epic nodes
 *
 * Adds graph_id (snake_case) to Epic nodes that only have graphId (camelCase).
 * This ensures consistency with other node types and fixes nodes API filtering.
 */
export async function runMigration010(options: MigrationOptions = {}): Promise<MigrationResult> {
  const { dryRun = false, verbose = false } = options;
  const client = new GraphApiClient();

  console.log(chalk.blue('\n🔄 Migration 010: Epic graph_id Property'));
  console.log(chalk.dim('   Adding graph_id to Epic nodes for API consistency (EPIC-011)\n'));

  if (dryRun) {
    console.log(chalk.yellow('   📋 DRY RUN MODE - No changes will be made\n'));
  }

  try {
    const endpoint = dryRun
      ? '/api/v1/migrations/010-epic-graph-id?dryRun=true'
      : '/api/v1/migrations/010-epic-graph-id';

    const response = await client.request<EpicGraphIdResponse>('POST', endpoint);

    console.log(chalk.green(`\n✓ Migration complete`));
    console.log(chalk.dim(`   Migrated: ${response.migrated}`));
    console.log(chalk.dim(`   Skipped:  ${response.skipped}`));

    if (response.errors.length > 0) {
      console.log(chalk.red(`   Errors:   ${response.errors.length}`));
      for (const error of response.errors) {
        console.log(chalk.red(`     - ${error}`));
      }
    }

    return {
      success: response.errors.length === 0,
      migratedCount: response.migrated,
      skippedCount: response.skipped,
      errors: response.errors,
      dryRun,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\n✗ Migration failed: ${message}`));

    return {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      errors: [message],
      dryRun,
    };
  }
}

export async function migrate010Command(options: MigrationOptions = {}): Promise<void> {
  const result = await runMigration010(options);
  if (!result.success) {
    process.exit(1);
  }
}
