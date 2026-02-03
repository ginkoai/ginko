/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-30
 * @tags: [push, sync, graph, git, ADR-077]
 * @related: [index.ts, ../../lib/sync-state.ts, ../../lib/git-change-detector.ts, ../../lib/entity-classifier.ts, ../graph/api-client.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, fs-extra, crypto, simple-git]
 */

/**
 * Push Command (ADR-077)
 *
 * Git-integrated push: detects changed files since last push using git diff,
 * classifies them by entity type, and pushes to the graph via API.
 *
 * Usage:
 *   ginko push                     # Push all changes since last push
 *   ginko push epic                # Push only changed epics
 *   ginko push epic EPIC-001       # Push specific epic
 *   ginko push sprint e001_s01     # Push specific sprint
 *   ginko push charter             # Push charter
 *   ginko push --dry-run           # Preview what would be pushed
 *   ginko push --force             # Overwrite graph even if conflicts
 *   ginko push --all               # Push all content (ignore change detection)
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { GraphApiClient, type DocumentUpload } from '../graph/api-client.js';
import { loadGraphConfig, isGraphInitialized, updateDocumentHash } from '../graph/config.js';
import { readSyncState, recordPush, recordGraphHashes } from '../../lib/sync-state.js';
import { detectChanges, type ChangeDetectionResult } from '../../lib/git-change-detector.js';
import { classifyFile, filterByType, type EntityType, type ClassifiedFile } from '../../lib/entity-classifier.js';
import { parseSprintTasks, type ParsedTask, type SprintParseResult } from '../../lib/task-parser.js';
import { getProjectRoot } from '../../utils/helpers.js';

export interface PushOptions {
  dryRun?: boolean;
  force?: boolean;
  all?: boolean;
  /** Entity type filter (from subcommand: epic, sprint, charter, adr, etc.) */
  entityType?: string;
  /** Specific entity ID (e.g., EPIC-001, e001_s01) */
  entityId?: string;
  /** Include events (session JSONL) in push */
  events?: boolean;
  /** Quiet mode for auto-push (minimal output) */
  quiet?: boolean;
}

export interface PushResult {
  pushed: string[];
  skipped: string[];
  errors: string[];
  tasksSynced: { created: number; updated: number; relationships: number };
  eventsPushed: number;
}

/**
 * Calculate SHA-256 hash of content
 */
function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Extract metadata from markdown frontmatter
 */
function extractMetadata(content: string): Record<string, unknown> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const metadata: Record<string, unknown> = {};
  const lines = frontmatterMatch[1].split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      metadata[key] = value.trim();
    }
  }

  return metadata;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  // Try frontmatter title first
  const frontmatterMatch = content.match(/^---\n[\s\S]*?title:\s*(.+?)\n/m);
  if (frontmatterMatch) return frontmatterMatch[1].trim();

  // Strip frontmatter and code blocks
  let cleanContent = content.replace(/^---\n[\s\S]*?\n---\n?/m, '');
  cleanContent = cleanContent.replace(/```[\s\S]*?```/g, '');

  // Try first heading
  const headingMatch = cleanContent.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  return 'Untitled';
}

/**
 * Display progress bar
 */
function displayProgress(current: number, total: number, label: string): void {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filled = Math.round((current / total) * barLength);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLength - filled);

  process.stdout.write(`\r  ${label}: ${bar} ${percentage}% (${current}/${total})`);

  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * Extract a stable entity ID from a filename (BUG-007).
 *
 * Filenames often include a slug after the entity ID:
 *   EPIC-001-strategic-context-and-dynamic-adaptivity.md → EPIC-001
 *   SPRINT-2026-01-epic014-s02.md → extract sprint entity ID from content
 *   ADR-039-event-stream-architecture.md → ADR-039
 *   e005_s01_t01-some-task.md → e005_s01_t01
 *
 * Falls back to the full basename if no pattern matches.
 */
function extractEntityId(filename: string, entityType: string, content?: string): string {
  // ADR-052 entity naming (check first — canonical format)
  // e001, e001_s01, e001_s01_t01, adhoc_260131_s01
  const entityIdMatch = filename.match(/^((?:e\d{3}(?:_s\d{2}(?:_t\d{2})?)?)|(?:adhoc_\d{6}(?:_s\d{2}(?:_t\d{2})?)?))/i);
  if (entityIdMatch) return entityIdMatch[1].toLowerCase();

  // Epic normalization: EPIC-NNN-slug → eNNN (ADR-052)
  if (entityType === 'Epic') {
    const epicMatch = filename.match(/^EPIC-(\d+)/i);
    if (epicMatch) return `e${epicMatch[1].padStart(3, '0')}`;
  }

  // ADR-NNN, PRD-NNN, GOTCHA-NNN, PATTERN-NNN (unchanged)
  const docIdMatch = filename.match(/^((?:ADR|PRD|GOTCHA|PATTERN)-\d+)/i);
  if (docIdMatch) return docIdMatch[1].toUpperCase();

  // Sprint files: SPRINT-YYYY-MM-... → try to extract entity ID from content
  if (entityType === 'Sprint' && content) {
    const sprintIdMatch = content.match(/\*\*ID:\*\*\s*`?([a-z0-9_]+)`?/i);
    if (sprintIdMatch) return sprintIdMatch[1].toLowerCase();
    // Also try: **Sprint ID**: e014_s02 format
    const altIdMatch = content.match(/Sprint(?:\s+ID)?[:\s]+`?(e\d{3}_s\d{2})`?/i);
    if (altIdMatch) return altIdMatch[1].toLowerCase();

    // Heuristic: derive from sprint number in filename + EPIC-NNN in content
    const sprintNumMatch = filename.match(/sprint[_-]?(\d+)/i);
    const epicRefMatch = content.match(/EPIC-(\d+)/i);
    if (sprintNumMatch && epicRefMatch) {
      const epicId = `e${epicRefMatch[1].padStart(3, '0')}`;
      const sprintNum = sprintNumMatch[1].padStart(2, '0');
      return `${epicId}_s${sprintNum}`;
    }
  }

  // CURRENT-SPRINT → keep as-is (canonical name)
  if (filename === 'CURRENT-SPRINT') return filename;

  // PROJECT-CHARTER → keep as-is
  if (filename.startsWith('PROJECT-CHARTER')) return 'PROJECT-CHARTER';

  // Fallback: full basename (preserves backward compat for unrecognized patterns)
  return filename;
}

/**
 * Prepare a document for upload from a classified file
 */
async function prepareDocument(
  classified: ClassifiedFile,
  projectRoot: string
): Promise<DocumentUpload | null> {
  const fullPath = path.resolve(projectRoot, classified.filePath);

  if (!await fs.pathExists(fullPath)) return null;

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    const hash = `sha256:${calculateHash(content)}`;
    const filename = path.basename(classified.filePath, '.md');
    const id = extractEntityId(filename, classified.entityType, content);

    return {
      id,
      type: classified.entityType,
      title: extractTitle(content),
      content,
      filePath: classified.filePath,
      hash,
      metadata: extractMetadata(content),
    };
  } catch {
    return null;
  }
}

/**
 * Push event files (JSONL) to graph via documents endpoint
 */
async function pushEvents(
  client: GraphApiClient,
  graphId: string,
  classifiedFiles: ClassifiedFile[],
  projectRoot: string,
  quiet: boolean
): Promise<number> {
  const sessionFiles = classifiedFiles.filter(f =>
    f.entityType === 'Session' && f.filePath.endsWith('.jsonl')
  );

  if (sessionFiles.length === 0) return 0;

  if (!quiet) {
    console.log(chalk.dim(`\nPushing ${sessionFiles.length} event file(s)...`));
  }

  let eventCount = 0;

  for (const sessionFile of sessionFiles) {
    const fullPath = path.resolve(projectRoot, sessionFile.filePath);
    if (!await fs.pathExists(fullPath)) continue;

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      // Parse JSONL events
      const events = [];
      for (const line of lines) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }

      if (events.length > 0) {
        // Upload via documents endpoint (events as a document batch)
        const doc: DocumentUpload = {
          id: path.basename(sessionFile.filePath, '.jsonl'),
          type: 'Session',
          title: `Session Events: ${path.basename(sessionFile.filePath)}`,
          content,
          filePath: sessionFile.filePath,
          hash: `sha256:${calculateHash(content)}`,
        };

        await client.uploadDocuments(graphId, [doc]);
        eventCount += events.length;
      }
    } catch (error) {
      if (!quiet) {
        console.warn(chalk.yellow(`  Failed to push events from ${sessionFile.filePath}`));
      }
    }
  }

  return eventCount;
}

/**
 * Main push command implementation
 */
export async function pushCommand(options: PushOptions): Promise<PushResult> {
  const result: PushResult = {
    pushed: [],
    skipped: [],
    errors: [],
    tasksSynced: { created: 0, updated: 0, relationships: 0 },
    eventsPushed: 0,
  };

  const quiet = !!options.quiet;

  // Check graph initialization
  if (!await isGraphInitialized()) {
    console.log(chalk.yellow('\u26a0\ufe0f  Graph not initialized'));
    console.log(chalk.dim('Run "ginko graph init" to create your knowledge graph'));
    return result;
  }

  const config = await loadGraphConfig();
  if (!config) {
    console.log(chalk.red('\u2717 Failed to load graph configuration'));
    return result;
  }

  if (!quiet) {
    console.log(chalk.bold.cyan('\n\u2b06  Push: Git \u2192 Graph\n'));
  }

  // Get project root
  let projectRoot: string;
  try {
    projectRoot = await getProjectRoot();
  } catch {
    projectRoot = process.cwd();
  }

  // Read sync state
  const syncState = await readSyncState();

  // Detect changes
  let detection: ChangeDetectionResult;

  if (options.all) {
    // Force push all content files
    detection = await detectChanges(null, projectRoot);
    if (!quiet) {
      console.log(chalk.dim('Scanning all content files (--all)...'));
    }
  } else {
    detection = await detectChanges(syncState.lastPushCommit, projectRoot);
    if (!quiet) {
      if (detection.isFirstPush) {
        console.log(chalk.dim('First push: scanning all content files...'));
      } else {
        console.log(chalk.dim(`Detecting changes since ${syncState.lastPushCommit?.substring(0, 8)}...`));
      }
    }
  }

  // Filter by entity type if subcommand specified
  let filesToPush = detection.classifiedFiles;

  if (options.entityType) {
    filesToPush = filterByType(filesToPush, options.entityType);

    // Further filter by specific entity ID if provided
    if (options.entityId) {
      const normalizedId = options.entityId.toLowerCase();
      filesToPush = filesToPush.filter(f => {
        const filename = path.basename(f.filePath, '.md').toLowerCase();
        return filename.includes(normalizedId) || f.filePath.toLowerCase().includes(normalizedId);
      });
    }
  }

  // Separate events from documents
  const eventFiles = filesToPush.filter(f => f.filePath.endsWith('.jsonl'));
  const docFiles = filesToPush.filter(f => !f.filePath.endsWith('.jsonl'));

  if (docFiles.length === 0 && eventFiles.length === 0) {
    if (!quiet) {
      console.log(chalk.green('\u2713 No changes to push'));
      if (syncState.lastPushTimestamp) {
        console.log(chalk.dim(`  Last push: ${syncState.lastPushTimestamp}`));
      }
    }
    return result;
  }

  if (!quiet) {
    console.log(chalk.green(`\u2713 Found ${docFiles.length} document(s) and ${eventFiles.length} event file(s) to push`));

    // Display breakdown by type
    const byType = new Map<string, number>();
    for (const f of docFiles) {
      byType.set(f.entityType, (byType.get(f.entityType) || 0) + 1);
    }

    if (byType.size > 0) {
      console.log(chalk.dim('  Documents:'));
      for (const [type, count] of byType) {
        console.log(chalk.dim(`    ${type}: ${count}`));
      }
    }
  }

  // Show warnings for misfiled entities
  for (const f of filesToPush) {
    if (f.warning && !quiet) {
      console.warn(chalk.yellow(`\u26a0\ufe0f  ${f.warning}`));
    }
  }

  // Dry run mode
  if (options.dryRun) {
    if (!quiet) {
      console.log(chalk.yellow('\n\ud83d\udccb Dry run - no changes will be made:\n'));
      for (const f of docFiles) {
        console.log(chalk.dim(`  ${f.entityType}: ${f.filePath}`));
      }
      if (eventFiles.length > 0) {
        console.log(chalk.dim(`  Events: ${eventFiles.length} file(s)`));
      }
    }
    return result;
  }

  // Prepare documents
  if (!quiet) {
    console.log(chalk.dim('\nPreparing documents...'));
  }

  const documents: DocumentUpload[] = [];
  for (const classified of docFiles) {
    const doc = await prepareDocument(classified, projectRoot);
    if (doc) {
      documents.push(doc);
    } else {
      result.skipped.push(classified.filePath);
    }
  }

  if (documents.length === 0 && eventFiles.length === 0) {
    if (!quiet) {
      console.log(chalk.yellow('\u26a0\ufe0f  No documents could be prepared for upload'));
    }
    return result;
  }

  // Pre-push conflict detection (BUG-018 Phase 1)
  // Compare local hashes against last-pushed hashes to detect graph-side changes
  if (!options.force && Object.keys(syncState.graphHashes).length > 0) {
    const conflicts: Array<{ filePath: string; docId: string }> = [];

    for (const doc of documents) {
      const lastPushedHash = syncState.pushedFiles[doc.filePath];
      const lastGraphHash = syncState.graphHashes[doc.filePath];

      // If we have a record of what the graph had at last push,
      // and the local file changed since then, flag for awareness
      if (lastPushedHash && lastGraphHash && lastPushedHash !== doc.hash) {
        // Local file changed since last push — this is expected.
        // The conflict would be if the GRAPH also changed (which we can't
        // cheaply check without an API call). For now, track the hash delta.
        conflicts.push({ filePath: doc.filePath, docId: doc.id });
      }
    }

    // Note: Full graph-side conflict detection requires a batch API endpoint
    // to fetch current graph hashes. For now, we track state for future use.
    // When the API supports it, we'll compare graphHashes[path] against
    // the current graph content hash to detect external edits.
  }

  // Upload documents
  const client = new GraphApiClient(config.apiEndpoint);

  if (documents.length > 0) {
    if (!quiet) {
      console.log(chalk.dim('Uploading documents...'));
    }

    // Batch documents (500 per batch, matching load.ts)
    const batchSize = 500;
    const batches: DocumentUpload[][] = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }

    const jobs: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      try {
        const batchResult = await client.uploadDocuments(config.graphId, batches[i]);
        jobs.push(batchResult.job.jobId);
        if (!quiet) {
          displayProgress(i + 1, batches.length, 'Upload');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Batch ${i + 1} upload failed: ${msg}`);
        if (!quiet) {
          console.error(chalk.red(`  Batch ${i + 1} failed: ${msg}`));
        }
      }
    }

    // Poll for job completion
    if (jobs.length > 0 && !quiet) {
      console.log(chalk.dim('\nProcessing...'));
    }

    for (const jobId of jobs) {
      try {
        let lastProgress = 0;
        await client.pollJob(jobId, (progress) => {
          if (!quiet && progress.embedded > lastProgress) {
            displayProgress(progress.embedded, progress.total, 'Processing');
            lastProgress = progress.embedded;
          }
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Job processing failed: ${msg}`);
      }
    }

    // Update hashes in config
    for (const doc of documents) {
      try {
        await updateDocumentHash(doc.filePath, doc.hash);
        result.pushed.push(doc.filePath);
      } catch {
        // Non-fatal: hash update failure
      }
    }

    if (!quiet) {
      console.log(chalk.green(`\u2713 ${result.pushed.length} document(s) pushed`));
    }

    // Extract and sync tasks from sprint files
    const sprintDocs = documents.filter(doc => doc.type === 'Sprint');
    if (sprintDocs.length > 0) {
      if (!quiet) {
        console.log(chalk.dim('\nSyncing tasks from sprint files...'));
      }

      const allTasks: ParsedTask[] = [];
      for (const doc of sprintDocs) {
        try {
          const sprintResult = parseSprintTasks(doc.content, doc.filePath);
          allTasks.push(...sprintResult.tasks);
        } catch {
          if (!quiet) {
            console.warn(chalk.yellow(`  Failed to parse tasks from ${doc.filePath}`));
          }
        }
      }

      if (allTasks.length > 0) {
        try {
          const syncResult = await client.syncTasks(config.graphId, allTasks, true);
          result.tasksSynced = {
            created: syncResult.created,
            updated: syncResult.updated,
            relationships: syncResult.relationships,
          };
          if (!quiet) {
            console.log(chalk.green(`\u2713 Tasks synced: ${syncResult.created} created, ${syncResult.updated} updated`));
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Task sync failed: ${msg}`);
          if (!quiet) {
            console.warn(chalk.yellow(`  Task sync failed: ${msg}`));
          }
        }
      }
    }
  }

  // Push events
  if (eventFiles.length > 0 && options.events !== false) {
    try {
      result.eventsPushed = await pushEvents(client, config.graphId, eventFiles, projectRoot, quiet);
      if (!quiet && result.eventsPushed > 0) {
        console.log(chalk.green(`\u2713 ${result.eventsPushed} event(s) pushed`));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Event push failed: ${msg}`);
    }
  }

  // Update sync state (including graph hashes for conflict detection — BUG-018)
  try {
    const fileHashes: Record<string, string> = {};
    const graphHashes: Record<string, string> = {};
    for (const doc of documents) {
      fileHashes[doc.filePath] = doc.hash;
      // After a successful push, the graph content matches what we just pushed
      graphHashes[doc.filePath] = doc.hash;
    }
    await recordPush(detection.headCommit, fileHashes);
    await recordGraphHashes(graphHashes);
  } catch {
    // Non-fatal: sync state update failure
  }

  // Summary output
  if (!quiet) {
    console.log(chalk.gray('\n' + '\u2500'.repeat(50)));

    const parts: string[] = [];
    if (result.pushed.length > 0) parts.push(`${result.pushed.length} file(s)`);
    if (result.tasksSynced.created + result.tasksSynced.updated > 0) {
      parts.push(`${result.tasksSynced.created + result.tasksSynced.updated} task(s)`);
    }
    if (result.eventsPushed > 0) parts.push(`${result.eventsPushed} event(s)`);

    if (parts.length > 0) {
      console.log(chalk.green(`\u2713 Pushed ${parts.join(', ')} to graph`));

      // Reinforcement hint
      console.log(chalk.dim('\n\ud83d\udca1 Graph context is fresh. Use `ginko graph query` for fast lookups.'));
    }

    if (result.errors.length > 0) {
      console.log(chalk.yellow(`\n\u26a0\ufe0f  ${result.errors.length} error(s) occurred during push`));
      for (const err of result.errors) {
        console.log(chalk.dim(`  \u2022 ${err}`));
      }
    }
  }

  return result;
}
