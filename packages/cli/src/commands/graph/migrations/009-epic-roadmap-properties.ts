/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-09
 * @tags: [migration, epic, roadmap, graph, ADR-056]
 * @related: [../api-client.ts, ADR-056]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk]
 */

import chalk from 'chalk';
import { GraphApiClient } from '../api-client.js';

// =============================================================================
// Migration 009: Add Roadmap Properties to Epic Nodes
// =============================================================================

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

interface EpicMigrationResponse {
  migrated: number;
  skipped: number;
  errors: string[];
  details?: Array<{
    epic_id: string;
    status: 'migrated' | 'skipped' | 'error';
    message?: string;
  }>;
}

/**
 * Migration 009: Add roadmap properties to all Epic nodes
 *
 * This migration adds the following properties to Epic nodes:
 * - commitment_status: 'uncommitted' (default)
 * - roadmap_status: 'not_started' (default)
 * - roadmap_visible: true (default)
 * - changelog: [] (empty array, initialized)
 *
 * Epics that already have these properties will be skipped.
 *
 * @param options Migration options
 * @returns Migration result
 */
export async function runMigration009(options: MigrationOptions = {}): Promise<MigrationResult> {
  const { dryRun = false, verbose = false } = options;
  const client = new GraphApiClient();

  console.log(chalk.blue('\n🔄 Migration 009: Epic Roadmap Properties'));
  console.log(chalk.dim('   Adding roadmap properties to Epic nodes (ADR-056)\n'));

  if (dryRun) {
    console.log(chalk.yellow('   📋 DRY RUN MODE - No changes will be made\n'));
  }

  try {
    // Call the migration API endpoint
    const endpoint = dryRun
      ? '/api/v1/migrations/009-epic-roadmap?dryRun=true'
      : '/api/v1/migrations/009-epic-roadmap';

    const response = await client.request<EpicMigrationResponse>(
      'POST',
      endpoint
    );

    // Display results
    if (verbose && response.details) {
      console.log(chalk.dim('\n   Details:'));
      for (const detail of response.details) {
        const icon = detail.status === 'migrated' ? '✓' :
                     detail.status === 'skipped' ? '○' : '✗';
        const color = detail.status === 'migrated' ? chalk.green :
                      detail.status === 'skipped' ? chalk.dim : chalk.red;
        console.log(color(`   ${icon} ${detail.epic_id}: ${detail.message || detail.status}`));
      }
    }

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

/**
 * CLI entry point for migration 009
 */
export async function migrate009Command(options: MigrationOptions = {}): Promise<void> {
  const result = await runMigration009(options);

  if (!result.success) {
    process.exit(1);
  }
}
