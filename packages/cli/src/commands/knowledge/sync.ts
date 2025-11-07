/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [knowledge, sync, migration, cloud, task-026]
 * @related: [index.ts, create.ts, scanner.ts, parser.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, commander]
 */

/**
 * Sync Command (TASK-026)
 *
 * Migrate local knowledge files (ADRs, PRDs, modules) to cloud knowledge graph
 *
 * Features:
 * - Dry-run mode to preview changes
 * - Conflict detection and resolution
 * - Progress reporting with real-time status
 * - Rollback support via sync logs
 * - Batch uploads with relationship mapping
 */

import chalk from 'chalk';
import { getConfig, getApiToken } from '../graph/config.js';
import { scanLocalKnowledge, LocalNode } from '../../lib/sync/scanner.js';
import { detectConflicts, Conflict, ConflictResolution } from '../../lib/sync/conflict-detector.js';
import { uploadNodes, UploadProgress } from '../../lib/sync/uploader.js';
import { SyncLogger } from '../../lib/sync/logger.js';
import prompts from 'prompts';

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  path?: string;
  project?: string;
  skip?: boolean;
  interactive?: boolean;
  localOnly?: boolean; // Skip cloud checks (for testing)
}

/**
 * Main sync command
 */
export async function syncCommand(options: SyncOptions): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(chalk.bold.cyan('🔄 Knowledge Sync: Local → Cloud\n'));

    // Get config and auth
    const config = await getConfig();
    const graphId = options.project || config.graphId;

    if (!graphId) {
      console.error(chalk.red('❌ No graph ID specified.'));
      console.error(chalk.dim('   Use --project=<id> or run `ginko graph init` first.'));
      process.exit(1);
    }

    const token = await getApiToken();
    if (!token) {
      console.error(chalk.red('❌ Not authenticated.'));
      console.error(chalk.dim('   Run `ginko login` to authenticate.'));
      process.exit(1);
    }

    // Initialize sync logger
    const syncLogger = new SyncLogger(graphId);
    await syncLogger.init();

    // Step 1: Scan local filesystem
    console.log(chalk.dim('📂 Scanning local knowledge...'));
    const basePath = options.path || process.cwd();
    const localNodes = await scanLocalKnowledge(basePath);

    if (localNodes.length === 0) {
      console.log(chalk.yellow('⚠️  No knowledge files found'));
      console.log(chalk.dim(`   Searched in: ${basePath}`));
      console.log(chalk.dim('   Looking for: docs/adr/ADR-*.md, docs/PRD/PRD-*.md'));
      return;
    }

    // Group by type for display
    const nodesByType = localNodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(chalk.green(`✓ Found: ${localNodes.length} files`));
    Object.entries(nodesByType).forEach(([type, count]) => {
      console.log(chalk.dim(`   ${type}: ${count}`));
    });
    console.log('');

    // Step 2: Conflict detection
    let conflicts: Conflict[] = [];
    let existingCount = 0;
    let newCount = localNodes.length;

    if (!options.localOnly) {
      console.log(chalk.dim('🔍 Checking cloud for duplicates...'));
      conflicts = await detectConflicts(localNodes, graphId, token, config.apiUrl);
      existingCount = conflicts.length;
      newCount = localNodes.length - existingCount;
    } else {
      console.log(chalk.dim('🔍 Skipping cloud check (local-only mode)...'));
    }

    console.log(chalk.dim(`   Existing: ${existingCount}`));
    console.log(chalk.dim(`   New: ${newCount}`));
    console.log('');

    // Determine resolution strategy
    let resolution: ConflictResolution = 'skip';

    if (options.force) {
      resolution = 'overwrite';
      console.log(chalk.yellow('⚡ Force mode: Will overwrite existing nodes'));
    } else if (options.skip) {
      resolution = 'skip';
      console.log(chalk.dim('📌 Skip mode: Will skip existing nodes'));
    } else if (options.interactive && conflicts.length > 0) {
      // Interactive conflict resolution
      console.log(chalk.yellow(`⚠️  Found ${conflicts.length} conflicts:\n`));

      // Show first 5 conflicts
      conflicts.slice(0, 5).forEach((conflict: Conflict) => {
        console.log(chalk.dim(`   - ${conflict.local.title}`));
        console.log(chalk.dim(`     Local:  ${conflict.local.filePath}`));
        console.log(chalk.dim(`     Cloud:  ${conflict.cloud.id} (updated: ${conflict.cloud.updatedAt})`));
        console.log('');
      });

      if (conflicts.length > 5) {
        console.log(chalk.dim(`   ... and ${conflicts.length - 5} more\n`));
      }

      const response = await prompts({
        type: 'select',
        name: 'resolution',
        message: 'How should conflicts be resolved?',
        choices: [
          { title: 'Skip existing (safe, default)', value: 'skip' },
          { title: 'Overwrite all (destructive)', value: 'overwrite' },
          { title: 'Cancel sync', value: 'cancel' },
        ],
        initial: 0,
      });

      if (response.resolution === 'cancel' || !response.resolution) {
        console.log(chalk.yellow('⚠️  Sync cancelled'));
        return;
      }

      resolution = response.resolution as ConflictResolution;
    }

    // Apply resolution to conflicts
    conflicts.forEach((conflict: Conflict) => {
      conflict.resolution = resolution;
    });

    // Filter nodes based on resolution
    const nodesToUpload = localNodes.filter(node => {
      const conflict = conflicts.find(c =>
        c.local.title === node.title && c.local.type === node.type
      );
      return !conflict || conflict.resolution === 'overwrite';
    });

    if (nodesToUpload.length === 0) {
      console.log(chalk.yellow('⚠️  No nodes to upload (all skipped)'));
      return;
    }

    // Dry-run mode: show what would be done
    if (options.dryRun || options.localOnly) {
      console.log(chalk.bold.yellow('🔍 DRY RUN - No changes will be made\n'));

      console.log(chalk.bold('Would upload:'));
      nodesToUpload.slice(0, 10).forEach(node => {
        console.log(chalk.green(`  ✓ ${node.type}: ${node.title}`));
        console.log(chalk.dim(`    ${node.filePath}`));
        if (node.relationships.length > 0) {
          console.log(chalk.dim(`    Relationships: ${node.relationships.length}`));
        }
      });

      if (nodesToUpload.length > 10) {
        console.log(chalk.dim(`  ... and ${nodesToUpload.length - 10} more\n`));
      }

      console.log(chalk.bold('\nSummary:'));
      console.log(chalk.dim(`  Total nodes: ${nodesToUpload.length}`));
      console.log(chalk.dim(`  Existing skipped: ${existingCount}`));
      console.log(chalk.dim(`  Relationships: ${nodesToUpload.reduce((sum, n) => sum + n.relationships.length, 0)}`));
      console.log('');

      if (!options.localOnly) {
        console.log(chalk.yellow('💡 Run without --dry-run to execute sync'));
      }

      return;
    }

    // Step 3: Upload nodes
    console.log(chalk.bold(`\n📤 Uploading ${nodesToUpload.length} nodes...\n`));

    const uploadProgress: UploadProgress = {
      total: nodesToUpload.length,
      uploaded: 0,
      failed: 0,
      skipped: existingCount,
      relationshipsCreated: 0,
    };

    // Progress callback
    const onProgress = (progress: UploadProgress) => {
      const percent = Math.round((progress.uploaded / progress.total) * 100);
      const bar = '='.repeat(Math.floor(percent / 5)) + '>'.padEnd(20 - Math.floor(percent / 5), ' ');

      process.stdout.write(`\r[${bar}] ${progress.uploaded}/${progress.total} (${percent}%)`);

      if (progress.uploaded === progress.total) {
        console.log(''); // New line after completion
      }
    };

    // Execute upload
    const result = await uploadNodes(nodesToUpload, graphId, token, config.apiUrl, onProgress);

    // Log sync results
    await syncLogger.logSync({
      timestamp: new Date().toISOString(),
      graphId,
      nodesScanned: localNodes.length,
      nodesUploaded: result.uploaded,
      nodesFailed: result.failed,
      nodesSkipped: result.skipped,
      relationshipsCreated: result.relationshipsCreated,
      conflicts: conflicts.length,
      resolution,
      duration: Date.now() - startTime,
    });

    // Display results
    console.log('');
    console.log(chalk.bold.green('✅ Sync Complete!\n'));

    console.log(chalk.bold('Results:'));
    console.log(chalk.green(`  ✓ Uploaded: ${result.uploaded} nodes`));
    console.log(chalk.cyan(`  ✓ Relationships: ${result.relationshipsCreated}`));
    console.log(chalk.dim(`  ⊘ Skipped: ${result.skipped} existing`));

    if (result.failed > 0) {
      console.log(chalk.red(`  ✗ Failed: ${result.failed}`));
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.dim(`  ⏱  Duration: ${durationSec}s`));
    console.log('');

    console.log(chalk.dim(`💾 Sync log: ${syncLogger.getLogPath()}`));
    console.log(chalk.dim(`💡 Rollback: ginko knowledge sync:rollback ${syncLogger.getSyncId()}`));

  } catch (error: any) {
    console.error(chalk.red('\n❌ Sync failed:'));
    console.error(chalk.red(`   ${error.message}`));

    if (error.stack && process.env.GINKO_DEBUG) {
      console.error(chalk.dim(error.stack));
    }

    process.exit(1);
  }
}

/**
 * Rollback command - restore state before sync
 */
export async function rollbackCommand(syncId: string): Promise<void> {
  try {
    console.log(chalk.bold.yellow(`🔙 Rolling back sync: ${syncId}\n`));

    const config = await getConfig();
    const syncLogger = new SyncLogger(config.graphId || '');

    const syncLog = await syncLogger.getSyncLog(syncId);

    if (!syncLog) {
      console.error(chalk.red(`❌ Sync log not found: ${syncId}`));
      process.exit(1);
    }

    console.log(chalk.dim(`Found sync from: ${syncLog.timestamp}`));
    console.log(chalk.dim(`Nodes uploaded: ${syncLog.nodesUploaded}`));
    console.log('');

    console.log(chalk.yellow('⚠️  Rollback not yet implemented'));
    console.log(chalk.dim('   This feature will delete uploaded nodes created during sync'));
    console.log(chalk.dim('   Implementation coming in next iteration'));

  } catch (error: any) {
    console.error(chalk.red('❌ Rollback failed:'));
    console.error(chalk.red(`   ${error.message}`));
    process.exit(1);
  }
}
