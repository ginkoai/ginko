/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-30
 * @tags: [diff, sync, local-vs-graph, ADR-077]
 * @related: [index.ts, ../graph/api-client.ts, ../../lib/entity-classifier.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [chalk, fs-extra]
 */

/**
 * Diff Command (ADR-077)
 *
 * Compare local file content with graph version to show differences.
 *
 * Usage:
 *   ginko diff epic/EPIC-001          # Show local vs graph diff for an epic
 *   ginko diff sprint/e001_s01        # Show diff for a sprint
 *   ginko diff adr/ADR-077            # Show diff for an ADR
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { GraphApiClient } from '../graph/api-client.js';
import { loadGraphConfig, isGraphInitialized } from '../graph/config.js';
import { getProjectRoot } from '../../utils/helpers.js';

export interface DiffOptions {
  /** Entity path in format "type/id" (e.g., "epic/EPIC-001") */
  entityPath: string;
  verbose?: boolean;
}

/**
 * Find local file for an entity ID
 */
async function findLocalFile(
  entityType: string,
  entityId: string,
  projectRoot: string
): Promise<string | null> {
  const typeDir: Record<string, string> = {
    'epic': 'docs/epics',
    'sprint': 'docs/sprints',
    'adr': 'docs/adr',
    'prd': 'docs/PRD',
    'charter': 'docs',
  };

  const dir = typeDir[entityType.toLowerCase()];
  if (!dir) return null;

  const dirPath = path.join(projectRoot, dir);
  if (!await fs.pathExists(dirPath)) return null;

  // For charter, check PROJECT-CHARTER.md directly
  if (entityType.toLowerCase() === 'charter') {
    const charterPath = path.join(dirPath, 'PROJECT-CHARTER.md');
    return await fs.pathExists(charterPath) ? charterPath : null;
  }

  // Search for a file matching the entity ID
  const files = await fs.readdir(dirPath);
  const normalizedId = entityId.toLowerCase();

  for (const file of files) {
    if (file.toLowerCase().includes(normalizedId) && file.endsWith('.md')) {
      return path.join(dirPath, file);
    }
  }

  return null;
}

/**
 * Simple line-by-line diff
 */
function computeDiff(localLines: string[], graphLines: string[]): string[] {
  const output: string[] = [];
  const maxLen = Math.max(localLines.length, graphLines.length);

  let diffCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const local = localLines[i] ?? '';
    const graph = graphLines[i] ?? '';

    if (local === graph) continue;

    diffCount++;
    if (localLines[i] !== undefined && graphLines[i] === undefined) {
      output.push(chalk.green(`+ ${i + 1}: ${local}`));
    } else if (localLines[i] === undefined && graphLines[i] !== undefined) {
      output.push(chalk.red(`- ${i + 1}: ${graph}`));
    } else {
      output.push(chalk.red(`- ${i + 1}: ${graph}`));
      output.push(chalk.green(`+ ${i + 1}: ${local}`));
    }

    if (diffCount > 50) {
      output.push(chalk.dim(`  ... and more differences`));
      break;
    }
  }

  return output;
}

/**
 * Main diff command implementation
 */
export async function diffCommand(options: DiffOptions): Promise<void> {
  // Parse entity path
  const parts = options.entityPath.split('/');
  if (parts.length < 2) {
    console.error(chalk.red('\u2717 Invalid entity path. Use format: type/id'));
    console.error(chalk.dim('  Examples: epic/EPIC-001, sprint/e001_s01, adr/ADR-077'));
    process.exit(1);
  }

  const [entityType, entityId] = parts;

  // Check graph initialization
  if (!await isGraphInitialized()) {
    console.error(chalk.yellow('\u26a0\ufe0f  Graph not initialized'));
    console.error(chalk.dim('Run "ginko graph init" first'));
    return;
  }

  const config = await loadGraphConfig();
  if (!config) {
    console.error(chalk.red('\u2717 Failed to load graph configuration'));
    return;
  }

  let projectRoot: string;
  try {
    projectRoot = await getProjectRoot();
  } catch {
    projectRoot = process.cwd();
  }

  console.log(chalk.bold.cyan(`\n\ud83d\udd0d Diff: ${entityType}/${entityId}\n`));

  // Find local file
  const localPath = await findLocalFile(entityType, entityId, projectRoot);
  let localContent: string | null = null;

  if (localPath) {
    localContent = await fs.readFile(localPath, 'utf-8');
    console.log(chalk.dim(`Local: ${path.relative(projectRoot, localPath)}`));
  } else {
    console.log(chalk.yellow('Local: not found'));
  }

  // Fetch from graph
  const client = new GraphApiClient(config.apiEndpoint);
  let graphContent: string | null = null;

  try {
    const exploreResult = await client.explore(config.graphId, entityId);
    graphContent = exploreResult.document?.content || null;

    if (graphContent) {
      console.log(chalk.dim(`Graph: ${exploreResult.document.type}/${exploreResult.document.id}`));
    } else {
      console.log(chalk.yellow('Graph: not found'));
    }
  } catch {
    console.log(chalk.yellow('Graph: unable to fetch (may not exist)'));
  }

  console.log('');

  // Compare
  if (!localContent && !graphContent) {
    console.log(chalk.yellow('Entity not found in either local or graph.'));
    return;
  }

  if (!localContent && graphContent) {
    console.log(chalk.yellow('Only in graph (not synced to local).'));
    console.log(chalk.dim('Run `ginko pull` to sync this entity.'));
    return;
  }

  if (localContent && !graphContent) {
    console.log(chalk.yellow('Only in local (not pushed to graph).'));
    console.log(chalk.dim('Run `ginko push` to sync this entity.'));
    return;
  }

  // Both exist - compute diff
  const localLines = localContent!.split('\n');
  const graphLines = graphContent!.split('\n');

  if (localContent === graphContent) {
    console.log(chalk.green('\u2713 Local and graph are in sync. No differences.'));
    return;
  }

  const diffLines = computeDiff(localLines, graphLines);

  if (diffLines.length === 0) {
    console.log(chalk.green('\u2713 Content is equivalent (whitespace differences only).'));
    return;
  }

  console.log(chalk.bold('Differences (local vs graph):'));
  console.log(chalk.dim(`  ${chalk.green('+')} local only  ${chalk.red('-')} graph only\n`));

  for (const line of diffLines) {
    console.log(`  ${line}`);
  }

  console.log(chalk.dim(`\nTo sync: \`ginko push\` (local \u2192 graph) or \`ginko pull\` (graph \u2192 local)`));
}
