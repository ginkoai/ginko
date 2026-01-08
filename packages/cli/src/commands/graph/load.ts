/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-31
 * @tags: [graph, load, upload, cli]
 * @related: [api-client.ts, config.ts, init.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, api-client, config, fs-extra, crypto, glob]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import glob from 'glob';
import { promisify } from 'util';

const globAsync = promisify(glob);
import { GraphApiClient, DocumentUpload } from './api-client.js';
import { loadGraphConfig, isGraphInitialized, updateDocumentHash } from './config.js';

interface LoadOptions {
  docsOnly?: boolean;
  extendedOnly?: boolean;
  force?: boolean;
}

/**
 * Calculate SHA-256 hash of file content
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
 * Extract title from markdown
 */
function extractTitle(content: string): string {
  // Try frontmatter title first
  const frontmatterMatch = content.match(/^---\n[\s\S]*?title:\s*(.+?)\n/m);
  if (frontmatterMatch) {
    return frontmatterMatch[1].trim();
  }

  // Try first heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  return 'Untitled';
}

/**
 * Determine document type from file path
 */
function getDocumentType(filePath: string): DocumentUpload['type'] {
  if (filePath.includes('/adr/')) return 'ADR';
  if (filePath.includes('/PRD/')) return 'PRD';
  if (filePath.includes('/epics/')) return 'Epic';
  if (filePath.includes('/sprints/')) return 'Sprint';
  if (filePath.includes('PROJECT-CHARTER')) return 'Charter';
  if (filePath.includes('pattern')) return 'Pattern';
  if (filePath.includes('gotcha')) return 'Gotcha';
  if (filePath.includes('/sessions/')) return 'Session';
  return 'ContextModule';
}

/**
 * Scan and prepare documents for upload
 */
async function prepareDocuments(options: LoadOptions): Promise<DocumentUpload[]> {
  const documents: DocumentUpload[] = [];

  // Define document patterns
  const patterns: string[] = [];

  if (!options.extendedOnly) {
    patterns.push('docs/adr/**/*.md');
    patterns.push('docs/PRD/**/*.md');
    patterns.push('docs/epics/**/*.md');
    patterns.push('docs/sprints/**/*.md');
    patterns.push('docs/PROJECT-CHARTER.md');
  }

  if (!options.docsOnly) {
    patterns.push('.ginko/context/modules/**/*pattern*.md');
    patterns.push('.ginko/context/modules/**/*gotcha*.md');
    patterns.push('.ginko/sessions/**/*.md');
  }

  // Scan for files
  console.log(chalk.dim('Scanning for documents...'));

  for (const pattern of patterns) {
    const files = await globAsync(pattern, { ignore: ['**/node_modules/**', '**/.git/**', '**/*INDEX*', '**/*TEMPLATE*'] });

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const hash = `sha256:${calculateHash(content)}`;

        // Generate document ID from filename
        const filename = path.basename(filePath, '.md');
        const id = filename;

        const doc: DocumentUpload = {
          id,
          type: getDocumentType(filePath),
          title: extractTitle(content),
          content,
          filePath,
          hash,
          metadata: extractMetadata(content),
        };

        documents.push(doc);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to read ${filePath}: ${error}`));
      }
    }
  }

  return documents;
}

/**
 * Display progress bar
 */
function displayProgress(current: number, total: number, label: string): void {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filled = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  process.stdout.write(`\r  ${label}: ${bar} ${percentage}% (${current}/${total})`);

  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * Load documents to knowledge graph
 */
export async function loadCommand(options: LoadOptions): Promise<void> {
  try {
    // Check if graph is initialized
    if (!await isGraphInitialized()) {
      console.log(chalk.yellow('⚠️  Graph not initialized'));
      console.log(chalk.dim('Run "ginko graph init" to create your knowledge graph'));
      return;
    }

    const config = await loadGraphConfig();
    if (!config) {
      console.log(chalk.red('✗ Failed to load graph configuration'));
      return;
    }

    console.log(chalk.green('\n🚀 Loading Knowledge Graph to Ginko Cloud'));
    console.log(chalk.gray('─'.repeat(50)));

    // Prepare documents
    const documents = await prepareDocuments(options);

    if (documents.length === 0) {
      console.log(chalk.yellow('\n⚠️  No documents found to upload'));
      return;
    }

    console.log(chalk.green(`✓ Found ${documents.length} documents`));

    // Display document breakdown
    const byType = documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(chalk.dim('  Breakdown:'));
    for (const [type, count] of Object.entries(byType)) {
      console.log(chalk.dim(`    ${type}: ${count}`));
    }

    console.log(chalk.dim('\nUploading documents...'));

    // Upload documents
    const client = new GraphApiClient(config.apiEndpoint);

    // Split into batches of 500
    const batchSize = 500;
    const batches: DocumentUpload[][] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      batches.push(documents.slice(i, i + batchSize));
    }

    console.log(chalk.dim(`  Uploading ${batches.length} batch${batches.length > 1 ? 'es' : ''}...`));

    const jobs: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const result = await client.uploadDocuments(config.graphId, batch);
      jobs.push(result.job.jobId);

      displayProgress(i + 1, batches.length, 'Upload progress');
    }

    console.log(chalk.green('✓ Upload complete'));

    // Poll for job completion
    console.log(chalk.dim('\nCloud processing...'));

    for (const jobId of jobs) {
      let lastProgress = 0;

      await client.pollJob(jobId, (progress) => {
        if (progress.embedded > lastProgress) {
          displayProgress(progress.embedded, progress.total, 'Processing');
          lastProgress = progress.embedded;
        }
      });
    }

    console.log(chalk.green('✓ Processing complete'));

    // Update hashes in config
    console.log(chalk.dim('\nUpdating configuration...'));

    for (const doc of documents) {
      await updateDocumentHash(doc.filePath, doc.hash);
    }

    console.log(chalk.green('✓ Configuration updated'));

    console.log(chalk.gray('\n' + '─'.repeat(50)));
    console.log(chalk.green('✅ Knowledge graph ready!'));

    console.log(chalk.dim('\n🔍 Try these commands:'));
    console.log(chalk.dim('  ginko graph status           # View statistics'));
    console.log(chalk.dim('  ginko graph query "topic"    # Semantic search'));
    console.log(chalk.dim('  ginko graph explore ADR-039  # Explore connections'));

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
