/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-15
 * @tags: [sync, cloud-to-local, git, ADR-054]
 * @related: [index.ts, node-syncer.ts, types.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, prompts, simple-git]
 */

/**
 * Sync Command (ADR-054)
 *
 * Pull dashboard edits from cloud graph to local git repository.
 *
 * Usage:
 *   ginko sync              # Sync all unsynced nodes
 *   ginko sync --dry-run    # Preview what would be synced
 *   ginko sync --force      # Overwrite local with graph versions
 *   ginko sync --type=ADR   # Sync only specific node type
 */

import chalk from 'chalk';
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
  console.log(chalk.dim('📋 Finding sprint files...'));

  const sprintFiles = await findSprintFiles(projectRoot);

  if (sprintFiles.length === 0) {
    console.log(chalk.yellow('No sprint files found in docs/sprints/'));
    return [];
  }

  console.log(chalk.cyan(`Found ${sprintFiles.length} sprint file(s):\n`));

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

  const results: SprintSyncResult[] = [];

  for (const sprintFile of sprintFiles) {
    console.log(chalk.dim(`Syncing: ${sprintFile.sprintId}...`));

    const result = await syncSprintFile(sprintFile, graphId, token, API_BASE);
    results.push(result);

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

  // Get config and auth
  const config = await getConfig();
  const graphId = config?.graphId;

  if (!graphId) {
    console.error(chalk.red('❌ No graph ID found.'));
    console.error(chalk.dim('   Run `ginko graph init` first.'));
    return result;
  }

  const token = await getApiToken();
  if (!token) {
    console.error(chalk.red('❌ Not authenticated.'));
    console.error(chalk.dim('   Run `ginko login` to authenticate.'));
    return result;
  }

  // Check team membership and staleness (EPIC-008)
  const stalenessThreshold = options.stalenessThresholdDays ?? 3;
  let teamStatus = null;

  if (!options.skipMembershipCheck) {
    teamStatus = await getTeamSyncStatus(graphId, token, stalenessThreshold);

    // Display team info if member
    if (teamStatus.isMember) {
      displayTeamInfo(teamStatus);
    }

    // Show staleness warning if applicable
    if (teamStatus.isMember && teamStatus.staleness.isStale) {
      displayStalenessWarning(teamStatus);
    }
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
  console.log(chalk.dim('📡 Fetching unsynced nodes from dashboard...'));

  let nodes: UnsyncedNode[];
  try {
    nodes = await fetchUnsyncedNodes(graphId, token, options.type);
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch unsynced nodes:'), error);
    return result;
  }

  if (nodes.length === 0) {
    console.log(chalk.green('✓ All nodes are synced. Nothing to do.'));
    return result;
  }

  console.log(chalk.cyan(`Found ${nodes.length} unsynced node(s):\n`));

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

  // Process each node
  const syncedFiles: string[] = [];

  for (const node of nodes) {
    const filePath = getFilePath(projectRoot, node);
    console.log(chalk.dim(`Processing: ${node.title}...`));

    try {
      const syncResult = await syncNode(node, projectRoot, { force: options.force });

      if (syncResult.conflict) {
        // Handle conflict
        if (options.force) {
          // Force mode: use graph version
          await applyResolution(syncResult.conflict, 'use-graph', projectRoot);
          syncedFiles.push(syncResult.filePath);
          result.synced.push(node.id);
          console.log(chalk.green(`  ✓ Force synced: ${filePath}`));
        } else {
          // Interactive conflict resolution
          const resolution = await resolveConflict(syncResult.conflict);
          syncResult.conflict.resolution = resolution;
          result.conflicts.push(syncResult.conflict);

          if (resolution !== 'skip') {
            const applied = await applyResolution(syncResult.conflict, resolution, projectRoot);
            if (applied.applied) {
              syncedFiles.push(filePath);
              result.synced.push(node.id);
              console.log(chalk.green(`  ✓ Resolved: ${filePath}`));
            }
          } else {
            result.skipped.push(node.id);
            console.log(chalk.yellow(`  ○ Skipped: ${filePath}`));
          }
        }
      } else if (syncResult.success) {
        syncedFiles.push(syncResult.filePath);
        result.synced.push(node.id);
        console.log(chalk.green(`  ✓ Synced: ${filePath}`));

        // Mark as synced in API
        try {
          await markNodeSynced(node.id, syncResult.hash, graphId, token);
        } catch (error) {
          console.warn(chalk.yellow(`  ⚠ Could not mark as synced in API: ${error}`));
        }
      }
    } catch (error) {
      result.errors.push({ nodeId: node.id, error: String(error) });
      console.error(chalk.red(`  ✗ Failed: ${node.id} - ${error}`));
    }
  }

  console.log('');

  // Commit changes
  if (syncedFiles.length > 0) {
    console.log(chalk.dim('📝 Committing changes...'));
    const committed = await commitSyncedFiles(syncedFiles, projectRoot);

    if (committed) {
      console.log(chalk.green(`\n✓ Synced ${syncedFiles.length} file(s) and committed to git.`));
    } else {
      console.log(chalk.yellow(`\n⚠ Synced ${syncedFiles.length} file(s) but commit failed.`));
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
