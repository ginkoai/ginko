/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-05
 * @tags: [sync, cloud-to-local, git, ADR-054, EPIC-008, onboarding-optimization]
 * @related: [index.ts, node-syncer.ts, types.ts, team-sync.ts, ../../lib/team-sync-reporter.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, prompts, simple-git]
 */

/**
 * Sync Command (ADR-054, EPIC-008)
 *
 * Pull dashboard edits from cloud graph to local git repository.
 * Team-aware with enhanced feedback showing who changed what.
 *
 * Usage:
 *   ginko sync              # Sync all unsynced nodes
 *   ginko sync --preview    # Preview team changes without syncing
 *   ginko sync --dry-run    # Preview what would be synced
 *   ginko sync --force      # Overwrite local with graph versions
 *   ginko sync --type=ADR   # Sync only specific node type
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import prompts from 'prompts';
import { getConfig, getApiToken } from '../graph/config.js';
import {
  syncNode,
  getFilePath,
  computeHash,
  readFileContent,
  applyResolution,
} from './node-syncer.js';
import {
  findSprintFiles,
  syncSprintFile,
  updateCurrentSprintFile,
} from './sprint-syncer.js';
import {
  getTeamSyncStatus,
  updateLastSyncTimestamp,
  displayStalenessWarning,
  displayTeamInfo,
} from './team-sync.js';
import {
  getTeamChangesSinceLast,
  displayTeamChangeReport,
  formatCompactSummary,
} from '../../lib/team-sync-reporter.js';
import type {
  SyncOptions,
  UnsyncedNode,
  SyncResult,
  SyncConflict,
  ConflictResolution,
  SyncApiResponse,
  SprintSyncResult,
  TeamSyncOptions,
} from './types.js';

const API_BASE = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

/**
 * Raw API response node structure (from Neo4j)
 */
interface RawApiNode {
  node: {
    id: string;
    label: string;
    properties: Record<string, unknown>;
  };
  syncStatus: {
    synced: boolean;
    syncedAt: string | null;
    editedAt: string;
    editedBy: string;
    contentHash: string;
    gitHash: string | null;
  };
}

/**
 * Transform raw API node to UnsyncedNode
 */
function transformApiNode(raw: RawApiNode): UnsyncedNode {
  const props = raw.node.properties || {};
  return {
    id: raw.node.id || (props.id as string) || '',
    type: (raw.node.label || props.type || 'ADR') as UnsyncedNode['type'],
    title: (props.title as string) || (props.name as string) || raw.node.id || 'Untitled',
    content: (props.content as string) || (props.body as string) || '',
    status: (props.status as string) || 'draft',
    tags: Array.isArray(props.tags) ? props.tags : [],
    synced: raw.syncStatus?.synced ?? false,
    syncedAt: raw.syncStatus?.syncedAt || null,
    editedAt: raw.syncStatus?.editedAt || new Date().toISOString(),
    editedBy: raw.syncStatus?.editedBy || 'unknown',
    contentHash: raw.syncStatus?.contentHash || '',
    gitHash: raw.syncStatus?.gitHash || null,
    slug: (props.slug as string) || undefined,
  };
}

/**
 * Estimate sync time based on node count (e008_s03_t03)
 */
function estimateSyncTime(count: number): string {
  if (count <= 3) return '<5s';
  if (count <= 10) return '5-15s';
  if (count <= 25) return '15-30s';
  return '>30s';
}

/**
 * Fetch unsynced nodes from API
 */
async function fetchUnsyncedNodes(
  graphId: string,
  token: string,
  type?: string
): Promise<UnsyncedNode[]> {
  const url = new URL(`${API_BASE}/api/v1/graph/nodes/unsynced`);
  url.searchParams.set('graphId', graphId);
  if (type) {
    url.searchParams.set('type', type);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch unsynced nodes: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { nodes: RawApiNode[]; count: number };

  // Transform raw API nodes to expected UnsyncedNode format
  return (data.nodes || []).map(transformApiNode);
}

/**
 * Mark a node as synced in the API
 */
async function markNodeSynced(
  nodeId: string,
  gitHash: string,
  graphId: string,
  token: string
): Promise<void> {
  // graphId must be in query params, not just body
  const url = `${API_BASE}/api/v1/graph/nodes/${encodeURIComponent(nodeId)}/sync?graphId=${encodeURIComponent(graphId)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gitHash,
      syncedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to mark node synced: ${response.status} ${text}`);
  }
}

/**
 * Show conflict resolution dialog
 */
async function resolveConflict(conflict: SyncConflict): Promise<ConflictResolution> {
  console.log(chalk.yellow(`\n⚠️  Conflict detected: ${conflict.node.title}`));
  console.log(chalk.dim(`   File: ${conflict.node.type}/${conflict.node.id}`));
  console.log(chalk.dim(`   Local hash: ${conflict.localHash.substring(0, 8)}...`));
  console.log(chalk.dim(`   Graph hash: ${conflict.node.contentHash.substring(0, 8)}...`));

  const { resolution } = await prompts({
    type: 'select',
    name: 'resolution',
    message: 'How would you like to resolve this conflict?',
    choices: [
      { title: 'Use graph version (overwrite local)', value: 'use-graph' },
      { title: 'Keep local version (update graph)', value: 'use-local' },
      { title: 'Skip this file', value: 'skip' },
    ],
  });

  return resolution || 'skip';
}

/**
 * Stage and commit synced files
 */
async function commitSyncedFiles(
  files: string[],
  projectRoot: string
): Promise<boolean> {
  if (files.length === 0) return true;

  try {
    const { simpleGit } = await import('simple-git');
    const git = simpleGit(projectRoot);

    // Stage files
    await git.add(files);

    // Determine if this is sprint sync or knowledge sync
    const isSprintSync = files.some(f => f.includes('sprints/'));
    const syncType = isSprintSync ? 'sprint' : 'knowledge node';

    // Commit
    const message = `sync: Pull ${files.length} ${syncType}(s) from dashboard

Synced files:
${files.map((f) => `- ${f}`).join('\n')}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Chris Norton <chris@watchhill.ai>`;

    await git.commit(message);
    return true;
  } catch (error) {
    console.error(chalk.red('Failed to commit:'), error);
    return false;
  }
}

/**
 * Sync sprints from graph to local markdown
 */
async function syncSprints(
  graphId: string,
  token: string,
  projectRoot: string,
  options: SyncOptions
): Promise<SprintSyncResult[]> {
  const sprintSpinner = ora('Finding sprint files...').start();

  const sprintFiles = await findSprintFiles(projectRoot);

  if (sprintFiles.length === 0) {
    sprintSpinner.warn('No sprint files found in docs/sprints/');
    return [];
  }

  sprintSpinner.succeed(`Found ${sprintFiles.length} sprint file(s)`);

  for (const sf of sprintFiles) {
    console.log(`  📋 ${sf.sprintId}: ${sf.path.split('/').pop()}`);
  }
  console.log('');

  if (options.dryRun) {
    console.log(chalk.yellow('📋 Dry run mode - no changes will be made.\n'));
    return [];
  }

  // Confirm before proceeding
  if (!options.force) {
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: `Sync ${sprintFiles.length} sprint(s) from graph?`,
      initial: true,
    });

    if (!proceed) {
      console.log(chalk.dim('Sync cancelled.'));
      return [];
    }
  }

  console.log('');

  // Optimization: Process sprint files in parallel with progress indicator
  const syncSpinner = ora(`Syncing ${sprintFiles.length} sprint(s) in parallel... (est. 2-5s)`).start();

  const results = await Promise.all(
    sprintFiles.map((sprintFile) => syncSprintFile(sprintFile, graphId, token, API_BASE))
  );

  syncSpinner.succeed(`Processed ${sprintFiles.length} sprint(s)`);

  // Display results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const sprintFile = sprintFiles[i];
    console.log(chalk.dim(`\n${sprintFile.sprintId}:`));

    if (result.error) {
      console.log(chalk.red(`  ✗ Error: ${result.error}`));
    } else if (result.tasksUpdated > 0) {
      console.log(chalk.green(`  ✓ Updated ${result.tasksUpdated} task(s)`));
      for (const change of result.changes) {
        console.log(chalk.dim(`     ${change}`));
      }
    } else {
      console.log(chalk.dim(`  ○ ${result.changes[0] || 'No changes'}`));
    }
  }

  // Update CURRENT-SPRINT.md if we have an active sprint
  const updatedSprints = results.filter(r => r.tasksUpdated > 0);
  if (updatedSprints.length > 0) {
    // Find the most recently updated sprint
    const latestSprint = sprintFiles.find(sf => sf.sprintId === updatedSprints[0].sprintId);
    if (latestSprint) {
      try {
        await updateCurrentSprintFile(projectRoot, latestSprint.path);
        console.log(chalk.dim('\n  Updated CURRENT-SPRINT.md'));
      } catch {
        // Ignore errors updating CURRENT-SPRINT.md
      }
    }
  }

  return results;
}

/**
 * Main sync command implementation
 */
export async function syncCommand(options: TeamSyncOptions): Promise<SyncResult> {
  const result: SyncResult = {
    synced: [],
    skipped: [],
    conflicts: [],
    errors: [],
  };

  console.log(chalk.bold.cyan('🔄 Sync: Dashboard → Git\n'));

  // Initialize spinner for progress indication (e008_s03_t03)
  const spinner = ora('Checking authentication...').start();

  // Get config and auth
  const config = await getConfig();
  const graphId = config?.graphId;

  if (!graphId) {
    spinner.fail('No graph ID found');
    console.error(chalk.dim('   Run `ginko graph init` first.'));
    return result;
  }

  const token = await getApiToken();
  if (!token) {
    spinner.fail('Not authenticated');
    console.error(chalk.dim('   Run `ginko login` to authenticate.'));
    return result;
  }

  spinner.succeed('Authenticated');

  // Check team membership and staleness (EPIC-008)
  // Optimization: Fetch team status and changes in parallel when possible
  const stalenessThreshold = options.stalenessThresholdDays ?? 3;
  let teamStatus = null;
  let teamChangeSummary = null;

  if (!options.skipMembershipCheck) {
    spinner.start('Fetching team status...');

    // Start both fetches in parallel - team changes will use null for lastSyncAt initially
    // which returns all unsynced changes (safe fallback for first sync)
    const [teamStatusResult, teamChangesResult] = await Promise.all([
      getTeamSyncStatus(graphId, token, stalenessThreshold),
      getTeamChangesSinceLast(graphId, token, null), // Fetch all unsynced changes
    ]);

    teamStatus = teamStatusResult;

    // Display team info if member
    if (teamStatus.isMember) {
      spinner.stop();
      displayTeamInfo(teamStatus);

      // Show staleness warning if applicable
      if (teamStatus.staleness.isStale) {
        displayStalenessWarning(teamStatus);
      }

      // Use the pre-fetched team changes
      teamChangeSummary = teamChangesResult;
      if (teamChangeSummary.totalChanges > 0) {
        displayTeamChangeReport(teamChangeSummary);
      }
    } else {
      spinner.succeed('Team status loaded');
    }
  }

  // Preview mode: show team changes and exit (EPIC-008 Sprint 2)
  if (options.preview) {
    if (!teamChangeSummary || teamChangeSummary.totalChanges === 0) {
      console.log(chalk.green('✓ No pending changes from team members.'));
    } else {
      console.log(chalk.dim('Preview mode - no changes applied.'));
      console.log(chalk.dim('Run `ginko sync` to apply these changes.'));
    }
    return result;
  }

  // Get git root directory (not cwd, which might be a subdirectory)
  let projectRoot = process.cwd();
  try {
    const { simpleGit } = await import('simple-git');
    const git = simpleGit(process.cwd());
    projectRoot = await git.revparse(['--show-toplevel']);
    projectRoot = projectRoot.trim();
  } catch {
    // Fall back to cwd if not in a git repo
    console.warn(chalk.dim('⚠️  Not in a git repository, using current directory.'));
  }

  // Handle Sprint type separately (different sync mechanism)
  if (options.type === 'Sprint') {
    console.log(chalk.bold('📋 Sprint Sync Mode\n'));

    const sprintResults = await syncSprints(graphId, token, projectRoot, options);

    // Commit changes if any sprints were updated
    const updatedSprints = sprintResults.filter(r => r.tasksUpdated > 0);
    if (updatedSprints.length > 0) {
      const files = updatedSprints.map(r => r.filePath);
      // Also include CURRENT-SPRINT.md
      files.push('docs/sprints/CURRENT-SPRINT.md');

      console.log(chalk.dim('\n📝 Committing changes...'));
      const committed = await commitSyncedFiles(files, projectRoot);

      if (committed) {
        console.log(chalk.green(`\n✓ Synced ${updatedSprints.length} sprint(s) and committed to git.`));
      }
    }

    // Update team sync timestamp if we synced anything (EPIC-008)
    const totalUpdated = sprintResults.reduce((sum, r) => sum + r.tasksUpdated, 0);
    if (totalUpdated > 0 && teamStatus?.isMember) {
      const updated = await updateLastSyncTimestamp(graphId, token);
      if (updated) {
        console.log(chalk.dim('✓ Team sync timestamp updated'));
      }
    }

    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  Sprints processed: ${sprintResults.length}`);
    console.log(`  Tasks updated: ${totalUpdated}`);
    console.log(`  Errors: ${sprintResults.filter(r => r.error).length}`);

    return result;
  }

  // Fetch unsynced nodes (knowledge nodes only)
  spinner.start('Fetching unsynced nodes from dashboard...');

  let nodes: UnsyncedNode[];
  try {
    nodes = await fetchUnsyncedNodes(graphId, token, options.type);
  } catch (error) {
    spinner.fail('Failed to fetch unsynced nodes');
    console.error(chalk.red(`   ${error}`));
    return result;
  }

  if (nodes.length === 0) {
    spinner.succeed('All nodes are synced. Nothing to do.');
    return result;
  }

  spinner.succeed(`Found ${nodes.length} unsynced node(s)`);

  // Show preview
  for (const node of nodes) {
    const icon = getTypeIcon(node.type);
    console.log(`  ${icon} ${node.type}: ${node.title}`);
    console.log(chalk.dim(`     Edited by ${node.editedBy} at ${node.editedAt}`));
  }

  console.log('');

  // Dry run - just show what would happen
  if (options.dryRun) {
    console.log(chalk.yellow('📋 Dry run mode - no changes will be made.\n'));

    for (const node of nodes) {
      const filePath = getFilePath(projectRoot, node);
      const localContent = await readFileContent(filePath);

      if (!localContent) {
        console.log(chalk.green(`  + Would create: ${filePath}`));
      } else {
        const localHash = computeHash(localContent);
        if (localHash !== node.gitHash) {
          console.log(chalk.yellow(`  ~ Would update (conflict): ${filePath}`));
        } else {
          console.log(chalk.blue(`  ~ Would update: ${filePath}`));
        }
      }
    }

    return result;
  }

  // Confirm before proceeding
  if (!options.force) {
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: `Sync ${nodes.length} node(s) to local git?`,
      initial: true,
    });

    if (!proceed) {
      console.log(chalk.dim('Sync cancelled.'));
      return result;
    }
  }

  console.log('');

  // Process each node with progress indicator (e008_s03_t03)
  // Optimization: Collect synced nodes and batch markNodeSynced calls at the end
  const syncedFiles: string[] = [];
  const nodesToMarkSynced: Array<{ id: string; hash: string }> = [];
  const totalNodes = nodes.length;
  const timeEstimate = estimateSyncTime(totalNodes);

  spinner.start(`Syncing ${totalNodes} node(s)... (est. ${timeEstimate})`);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const filePath = getFilePath(projectRoot, node);
    const progress = Math.round(((i + 1) / totalNodes) * 100);
    const shortTitle = node.title.length > 25 ? node.title.slice(0, 25) + '...' : node.title;
    spinner.text = `Syncing node ${i + 1}/${totalNodes}: ${shortTitle} (${progress}%)`;

    try {
      const syncResult = await syncNode(node, projectRoot, { force: options.force });

      if (syncResult.conflict) {
        // Handle conflict
        if (options.force) {
          // Force mode: use graph version
          await applyResolution(syncResult.conflict, 'use-graph', projectRoot);
          syncedFiles.push(syncResult.filePath);
          result.synced.push(node.id);
          nodesToMarkSynced.push({ id: node.id, hash: syncResult.hash });
        } else {
          // Interactive conflict resolution - stop spinner for prompts
          spinner.stop();
          const resolution = await resolveConflict(syncResult.conflict);
          syncResult.conflict.resolution = resolution;
          result.conflicts.push(syncResult.conflict);

          if (resolution !== 'skip') {
            const applied = await applyResolution(syncResult.conflict, resolution, projectRoot);
            if (applied.applied) {
              syncedFiles.push(filePath);
              result.synced.push(node.id);
              // Only mark as synced if we used graph version
              if (resolution === 'use-graph') {
                nodesToMarkSynced.push({ id: node.id, hash: syncResult.hash });
              }
              console.log(chalk.green(`  ✓ Resolved: ${filePath}`));
            }
          } else {
            result.skipped.push(node.id);
            console.log(chalk.yellow(`  ○ Skipped: ${filePath}`));
          }
          // Resume spinner for remaining nodes
          if (i < nodes.length - 1) {
            spinner.start(`Syncing node ${i + 2}/${totalNodes}...`);
          }
        }
      } else if (syncResult.success) {
        syncedFiles.push(syncResult.filePath);
        result.synced.push(node.id);
        nodesToMarkSynced.push({ id: node.id, hash: syncResult.hash });
      }
    } catch (error) {
      result.errors.push({ nodeId: node.id, error: String(error) });
    }
  }

  // Show sync completion
  if (result.errors.length > 0) {
    spinner.warn(`Synced ${result.synced.length}/${totalNodes} nodes (${result.errors.length} errors)`);
  } else {
    spinner.succeed(`Synced ${result.synced.length} node(s)`);
  }

  // Batch mark nodes as synced in API (parallel calls)
  if (nodesToMarkSynced.length > 0) {
    spinner.start(`Marking ${nodesToMarkSynced.length} node(s) as synced...`);
    const markResults = await Promise.allSettled(
      nodesToMarkSynced.map(({ id, hash }) => markNodeSynced(id, hash, graphId, token))
    );

    const failures = markResults.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      spinner.warn(`Marked synced (${failures.length} API errors)`);
    } else {
      spinner.succeed('Marked nodes as synced');
    }
  }

  // Commit changes
  if (syncedFiles.length > 0) {
    spinner.start('Committing changes to git...');
    const committed = await commitSyncedFiles(syncedFiles, projectRoot);

    if (committed) {
      spinner.succeed(`Committed ${syncedFiles.length} file(s) to git`);
    } else {
      spinner.warn('Commit failed');
      console.log(chalk.dim('   You can commit manually with: git add . && git commit'));
    }
  }

  // Update team sync timestamp if we synced anything (EPIC-008)
  if (result.synced.length > 0 && teamStatus?.isMember) {
    const updated = await updateLastSyncTimestamp(graphId, token);
    if (updated) {
      console.log(chalk.dim('✓ Team sync timestamp updated'));
    }
  }

  // Summary
  console.log(chalk.bold('\n📊 Summary:'));
  console.log(`  Synced: ${result.synced.length}`);
  console.log(`  Skipped: ${result.skipped.length}`);
  console.log(`  Conflicts: ${result.conflicts.length}`);
  console.log(`  Errors: ${result.errors.length}`);

  return result;
}

/**
 * Get icon for node type
 */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'ADR':
      return '📜';
    case 'PRD':
      return '📋';
    case 'Pattern':
      return '🔷';
    case 'Gotcha':
      return '⚠️';
    case 'Charter':
      return '🎯';
    case 'Sprint':
      return '🏃';
    case 'Task':
      return '✅';
    default:
      return '📄';
  }
}
