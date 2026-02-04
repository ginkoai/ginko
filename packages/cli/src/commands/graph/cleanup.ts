/**
 * @fileType: command
 * @status: current
 * @updated: 2026-02-02
 * @tags: [graph, cleanup, cli, maintenance]
 * @related: [api-client.ts, config.ts, status.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [chalk, api-client, config]
 */

import chalk from 'chalk';
import readline from 'readline';
import { GraphApiClient, CleanupAnalysisResponse } from './api-client.js';
import { loadGraphConfig, isGraphInitialized } from './config.js';

interface CleanupOptions {
  dryRun?: boolean;
  execute?: boolean;
  action?: string;
  yes?: boolean;
  verbose?: boolean;
}

const VALID_ACTIONS = [
  'cleanup-orphans',
  'cleanup-default',
  'dedupe-epics',
  'normalize-epic-ids',
  'dedupe-tasks',
  'cleanup-phantom-entities',
  'merge-duplicate-structural-nodes',
  'cleanup-stale',
];

/**
 * Prompt user for confirmation (unless --yes flag is set)
 */
function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Format the analysis report for display
 */
function displayAnalysis(
  analysis: CleanupAnalysisResponse,
  verbose: boolean
): void {
  const { orphanNodes, defaultGraphIdNodes, duplicateEpics, nonCanonicalEpics, duplicateTasks, staleGraphIds } =
    analysis.analysis;

  console.log(chalk.bold('\nGraph Cleanup Analysis'));
  console.log(chalk.gray('─'.repeat(50)));

  console.log(`\n${chalk.bold('Namespace')}: ${analysis.graphId}`);

  // Orphan nodes
  const orphanLabel = `Orphan Nodes (no graphId):`;
  console.log(
    `\n${orphanLabel.padEnd(35)} ${chalk.cyan(orphanNodes.total)} nodes`
  );
  if (orphanNodes.total > 0) {
    const typeSummary = orphanNodes.byType
      .map((t) => `${t.nodeType}: ${t.count}`)
      .join(', ');
    console.log(`  ${chalk.dim(typeSummary)}`);
    if (verbose) {
      for (const entry of orphanNodes.byType) {
        if (entry.sampleIds.length > 0) {
          console.log(
            `  ${chalk.dim(`  ${entry.nodeType} samples: ${entry.sampleIds.join(', ')}`)}`
          );
        }
      }
    }
  }

  // Default graphId nodes
  const defaultLabel = `Default GraphId Nodes:`;
  console.log(
    `${defaultLabel.padEnd(35)} ${chalk.cyan(defaultGraphIdNodes.total)} nodes`
  );
  if (defaultGraphIdNodes.total > 0) {
    const typeSummary = defaultGraphIdNodes.byType
      .map((t) => `${t.nodeType}: ${t.count}`)
      .join(', ');
    console.log(`  ${chalk.dim(typeSummary)}`);
    if (verbose) {
      for (const entry of defaultGraphIdNodes.byType) {
        if (entry.sampleIds.length > 0) {
          console.log(
            `  ${chalk.dim(`  ${entry.nodeType} samples: ${entry.sampleIds.join(', ')}`)}`
          );
        }
      }
    }
  }

  // Duplicate epics
  const epicLabel = `Duplicate Epics:`;
  console.log(
    `\n${epicLabel.padEnd(35)} ${chalk.cyan(duplicateEpics.length)} pairs`
  );
  if (duplicateEpics.length > 0) {
    for (const pair of duplicateEpics) {
      console.log(
        `  ${chalk.dim(`${pair.baseId} ↔ ${pair.duplicateId}`)}`
      );
    }
  }

  // Non-canonical epics (ADR-052)
  const nonCanonicalLabel = `Non-Canonical Epic IDs:`;
  const nonCanonicalCount = nonCanonicalEpics?.length ?? 0;
  console.log(
    `\n${nonCanonicalLabel.padEnd(35)} ${chalk.cyan(nonCanonicalCount)} nodes`
  );
  if (nonCanonicalCount > 0) {
    const shown = verbose ? nonCanonicalEpics : nonCanonicalEpics.slice(0, 5);
    for (const epic of shown) {
      console.log(
        `  ${chalk.dim(`${epic.legacyId} → ${epic.canonicalId}`)}`
      );
    }
    if (!verbose && nonCanonicalCount > 5) {
      console.log(chalk.dim(`  ... and ${nonCanonicalCount - 5} more`));
    }
  }

  // Duplicate tasks
  const taskLabel = `Duplicate Tasks:`;
  console.log(
    `\n${taskLabel.padEnd(35)} ${chalk.cyan(duplicateTasks.duplicateCount)} duplicates ${chalk.dim(`(${duplicateTasks.total} total, ${duplicateTasks.uniqueIds} unique)`)}`
  );
  if (duplicateTasks.samples.length > 0) {
    const sampleStr = duplicateTasks.samples
      .slice(0, verbose ? duplicateTasks.samples.length : 5)
      .map((s) => `${s.taskId} (×${s.count})`)
      .join(', ');
    const suffix =
      !verbose && duplicateTasks.samples.length > 5 ? '...' : '';
    console.log(`  ${chalk.dim(`${sampleStr}${suffix}`)}`);
  }

  // Stale graphIds
  const staleTotal = staleGraphIds.reduce((sum, s) => sum + s.count, 0);
  const staleLabel = `Stale GraphIds:`;
  console.log(
    `\n${staleLabel.padEnd(35)} ${chalk.cyan(staleGraphIds.length)} namespaces ${chalk.dim(`(${staleTotal} nodes)`)}`
  );
  if (verbose && staleGraphIds.length > 0) {
    for (const stale of staleGraphIds) {
      console.log(`  ${chalk.dim(`${stale.graphId}: ${stale.count} nodes`)}`);
    }
  }

  // Summary
  const totalActionable =
    orphanNodes.total +
    defaultGraphIdNodes.total +
    duplicateEpics.length +
    nonCanonicalCount +
    duplicateTasks.duplicateCount +
    staleTotal;

  console.log(chalk.gray('\n' + '─'.repeat(50)));
  console.log(`${chalk.bold('Total')}: ${chalk.yellow(totalActionable)} nodes to clean up`);

  // Available actions
  if (analysis.actions.available.length > 0) {
    console.log(`\n${chalk.bold('Available actions')}:`);
    for (const action of analysis.actions.available) {
      const count =
        action.estimatedDeletes ??
        action.estimatedAffected ??
        action.estimatedMerges ??
        0;
      const verb =
        action.action.startsWith('dedupe') ? 'Merge/delete' :
        'Delete';
      console.log(
        `  ${chalk.cyan(action.action.padEnd(20))} ${verb} ${count} ${action.action.includes('epic') ? 'epic pairs' : 'nodes'}`
      );
      if (action.warning) {
        console.log(`  ${chalk.yellow(`  ⚠ ${action.warning}`)}`);
      }
    }
  }
}

/**
 * Execute cleanup actions and display results
 */
async function runCleanup(
  client: GraphApiClient,
  graphId: string,
  actions: CleanupAnalysisResponse['actions']['available'],
  specificAction: string | undefined,
  skipConfirm: boolean
): Promise<void> {
  // Filter out delete-project (too destructive for CLI — dashboard only)
  const safeActions = actions.filter((a) => a.action !== 'delete-project');

  const actionsToRun = specificAction
    ? safeActions.filter((a) => a.action === specificAction)
    : safeActions;

  if (actionsToRun.length === 0) {
    if (specificAction) {
      console.log(chalk.yellow(`\nNo action found matching "${specificAction}"`));
      console.log(chalk.dim(`Valid actions: ${VALID_ACTIONS.join(', ')}`));
    } else {
      console.log(chalk.green('\nNothing to clean up.'));
    }
    return;
  }

  // Confirmation prompt
  if (!skipConfirm) {
    const actionNames = actionsToRun.map((a) => a.action).join(', ');
    console.log('');
    const confirmed = await confirm(
      chalk.yellow(`Execute cleanup actions (${actionNames})? This cannot be undone.`)
    );
    if (!confirmed) {
      console.log(chalk.dim('Cleanup cancelled.'));
      return;
    }
  }

  console.log('');

  // Execute each action
  for (const action of actionsToRun) {
    try {
      process.stdout.write(
        `${chalk.dim('Running')} ${chalk.cyan(action.action)}${chalk.dim('...')} `
      );
      const result = await client.executeCleanup(graphId, action.action, false);
      console.log(
        chalk.green(`✓ ${result.affected} affected`) +
          (result.details ? chalk.dim(` — ${result.details}`) : '')
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`✗ Failed: ${message}`));
    }
  }

  console.log(chalk.green('\nCleanup complete.'));
}

/**
 * Main cleanup command handler
 */
export async function cleanupCommand(options: CleanupOptions): Promise<void> {
  try {
    // Check if graph is initialized
    if (!(await isGraphInitialized())) {
      console.log(chalk.yellow('⚠️  Graph not initialized'));
      console.log(chalk.dim('Run "ginko graph init" to create your knowledge graph'));
      return;
    }

    const config = await loadGraphConfig();
    if (!config) {
      console.log(chalk.red('✗ Failed to load graph configuration'));
      return;
    }

    // Validate --action value if provided
    if (options.action && !VALID_ACTIONS.includes(options.action)) {
      console.log(chalk.red(`✗ Unknown action: ${options.action}`));
      console.log(chalk.dim(`Valid actions: ${VALID_ACTIONS.join(', ')}`));
      process.exit(1);
    }

    const client = new GraphApiClient(config.apiEndpoint);

    // Fetch analysis
    console.log(chalk.dim('Analyzing graph...'));
    const analysis = await client.getCleanupAnalysis(config.graphId);

    // Display report
    displayAnalysis(analysis, options.verbose ?? false);

    // Execute if --execute flag is set
    if (options.execute) {
      await runCleanup(
        client,
        config.graphId,
        analysis.actions.available,
        options.action,
        options.yes ?? false
      );
    } else {
      console.log(
        `\n${chalk.dim('Run with --execute to apply changes:')}`
      );
      console.log(chalk.dim('  ginko graph cleanup --execute'));
      console.log(chalk.dim('  ginko graph cleanup --execute --action dedupe-tasks'));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));

      if (error.message.includes('Not authenticated')) {
        console.log(chalk.dim('\nRun "ginko login" to authenticate with Ginko Cloud'));
      }
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }
    process.exit(1);
  }
}
