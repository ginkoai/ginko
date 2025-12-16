/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-16
 * @tags: [cli, principles, seeding, graph-sync]
 * @related: [standard-principles.ts, graph-api-client.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { STANDARD_PRINCIPLES, type StandardPrinciple } from '../../data/standard-principles';

interface SeedOptions {
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Seed standard principles to the knowledge graph.
 * This command creates Principle nodes for all standard best practices.
 */
export async function seedPrinciples(options: SeedOptions = {}): Promise<void> {
  const { dryRun = false, force = false } = options;

  console.log(chalk.cyan('\n📚 Ginko Principles Seeder\n'));
  console.log(chalk.dim(`Found ${STANDARD_PRINCIPLES.length} standard principles to seed\n`));

  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes will be made\n'));
  }

  // Display principles to be seeded
  for (const principle of STANDARD_PRINCIPLES) {
    const statusIcon = principle.status === 'active' ? '✅' : '⚠️';
    console.log(`${statusIcon} ${chalk.bold(principle.principle_id)}: ${principle.name}`);
    console.log(chalk.dim(`   Source: ${principle.source}`));
    if (principle.related_adrs?.length) {
      console.log(chalk.dim(`   ADRs: ${principle.related_adrs.join(', ')}`));
    }
    console.log();
  }

  if (dryRun) {
    console.log(chalk.yellow('\n✓ Dry run complete. Use --force to actually seed.\n'));
    return;
  }

  // Check for graph configuration
  const graphId = process.env.GINKO_GRAPH_ID;
  const bearerToken = process.env.GINKO_BEARER_TOKEN;

  if (!graphId || !bearerToken) {
    console.log(chalk.yellow('\n⚠️  Graph credentials not found.'));
    console.log(chalk.dim('   Set GINKO_GRAPH_ID and GINKO_BEARER_TOKEN to seed to graph.'));
    console.log(chalk.dim('   Principles are defined in packages/cli/src/data/standard-principles.ts\n'));
    return;
  }

  // Seed to graph API
  console.log(chalk.cyan('\n🌐 Seeding principles to graph...\n'));

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const principle of STANDARD_PRINCIPLES) {
    try {
      const response = await fetch('https://app.ginkoai.com/api/v1/graph/nodes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          graphId,
          label: 'Principle',
          properties: {
            principle_id: principle.principle_id,
            name: principle.name,
            theory: principle.theory,
            type: principle.type,
            status: principle.status,
            source: principle.source,
            related_patterns: principle.related_patterns || [],
            related_adrs: principle.related_adrs || [],
            version: principle.version
          }
        })
      });

      if (response.ok) {
        console.log(chalk.green(`  ✓ ${principle.principle_id}: ${principle.name}`));
        successCount++;
      } else if (response.status === 409) {
        // Already exists
        if (force) {
          // Update existing
          const updateResponse = await fetch(`https://app.ginkoai.com/api/v1/graph/nodes/${principle.principle_id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${bearerToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              graphId,
              properties: {
                name: principle.name,
                theory: principle.theory,
                type: principle.type,
                status: principle.status,
                source: principle.source,
                related_patterns: principle.related_patterns || [],
                related_adrs: principle.related_adrs || [],
                version: principle.version
              }
            })
          });

          if (updateResponse.ok) {
            console.log(chalk.blue(`  ↻ ${principle.principle_id}: Updated`));
            successCount++;
          } else {
            console.log(chalk.yellow(`  ⚠ ${principle.principle_id}: Update failed`));
            errorCount++;
          }
        } else {
          console.log(chalk.dim(`  ○ ${principle.principle_id}: Already exists (use --force to update)`));
          skipCount++;
        }
      } else {
        const error = await response.text();
        console.log(chalk.red(`  ✗ ${principle.principle_id}: Failed - ${error}`));
        errorCount++;
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ ${principle.principle_id}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      errorCount++;
    }
  }

  // Summary
  console.log(chalk.cyan('\n📊 Seeding Summary'));
  console.log(`   Created: ${chalk.green(successCount)}`);
  console.log(`   Skipped: ${chalk.dim(skipCount)}`);
  console.log(`   Errors:  ${errorCount > 0 ? chalk.red(errorCount) : chalk.dim(errorCount)}\n`);
}

/**
 * Create the principles seed command for the CLI.
 */
export function createSeedCommand(): Command {
  const command = new Command('seed')
    .description('Seed standard principles to the knowledge graph')
    .option('--dry-run', 'Show what would be seeded without making changes')
    .option('--force', 'Update existing principles instead of skipping')
    .action(async (options) => {
      await seedPrinciples(options);
    });

  return command;
}

export default createSeedCommand;
