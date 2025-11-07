/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [embeddings, batch-processing, voyage-ai, neo4j, migration, adr-045]
 * @related: [voyage-client.ts, neo4j-client.ts, batch-embed-nodes.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [@ginko/shared, neo4j-driver, commander, dotenv]
 */

import { VoyageEmbeddingClient } from '../packages/shared/src/lib/embeddings/voyage-client.js';
import { VOYAGE_CONFIG, BATCH_PROCESSING_CONFIG, ENV_KEYS } from '../packages/shared/src/lib/embeddings/config.js';
import { Neo4jClient } from '../src/graph/neo4j-client.js';
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
dotenv.config();

/**
 * Knowledge node structure for embedding
 */
interface KnowledgeNode {
  id: string;
  labels: string[];
  title?: string;
  content?: string;
  summary?: string;
  description?: string;
}

/**
 * Checkpoint data for resume capability
 */
interface Checkpoint {
  lastProcessedIndex: number;
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  timestamp: string;
  errors: Array<{ nodeId: string; error: string }>;
}

/**
 * Statistics for tracking progress
 */
interface ProcessingStats {
  totalNodes: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ nodeId: string; error: string }>;
  startTime: number;
}

/**
 * Batch Embedding Generation Script (ADR-045 Phase 2)
 *
 * Features:
 * - Query Neo4j for nodes without embeddings
 * - Use VoyageEmbeddingClient.embedBatch() with recommended batch size (128)
 * - Generate embeddings with input_type='document'
 * - Save embeddings back to Neo4j
 * - Progress tracking with console output
 * - Checkpoint/resume capability (every 100 nodes)
 * - Quality gates (skip nodes with empty content)
 * - Error handling and retry logic
 * - Command-line arguments: --batch-size, --limit, --resume
 * - Statistics: processed, successful, failed, estimated time remaining
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts
 *   npx tsx scripts/generate-embeddings.ts --batch-size 64 --limit 1000
 *   npx tsx scripts/generate-embeddings.ts --resume
 */
class EmbeddingGenerator {
  private neo4jClient: Neo4jClient;
  private voyageClient: VoyageEmbeddingClient;
  private checkpointFile: string;
  private stats: ProcessingStats;

  constructor() {
    this.neo4jClient = new Neo4jClient();
    this.voyageClient = new VoyageEmbeddingClient();
    this.checkpointFile = path.join(process.cwd(), '.embeddings-checkpoint.json');
    this.stats = {
      totalNodes: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: Date.now(),
    };
  }

  /**
   * Main execution function
   */
  async run(options: {
    batchSize: number;
    limit?: number;
    resume: boolean;
  }): Promise<void> {
    console.log('============================================');
    console.log('  Batch Embedding Generation (ADR-045)');
    console.log('  Provider: Voyage AI voyage-3.5');
    console.log('  Dimensions: 1024');
    console.log('============================================\n');

    try {
      // Validate environment
      this.validateEnvironment();

      // Display configuration
      this.displayConfiguration(options);

      // Connect to Neo4j
      console.log('Step 1: Connecting to Neo4j...');
      await this.neo4jClient.connect();
      console.log('✓ Connected to Neo4j\n');

      // Load checkpoint if resuming
      let checkpoint: Checkpoint | null = null;
      if (options.resume) {
        checkpoint = await this.loadCheckpoint();
        if (checkpoint) {
          console.log(`📍 Resuming from checkpoint:`);
          console.log(`   Last processed: ${checkpoint.lastProcessedIndex}`);
          console.log(`   Total processed: ${checkpoint.totalProcessed}`);
          console.log(`   Successful: ${checkpoint.successful}`);
          console.log(`   Failed: ${checkpoint.failed}\n`);
          this.stats.processed = checkpoint.totalProcessed;
          this.stats.successful = checkpoint.successful;
          this.stats.failed = checkpoint.failed;
          this.stats.skipped = checkpoint.skipped;
          this.stats.errors = checkpoint.errors;
        } else {
          console.log('⚠ No checkpoint found, starting from beginning\n');
        }
      }

      // Query nodes without embeddings
      console.log('Step 2: Querying nodes without embeddings...');
      const nodes = await this.queryNodesWithoutEmbeddings(options.limit);

      if (nodes.length === 0) {
        console.log('✓ All nodes already have embeddings!');
        console.log('\n============================================');
        console.log('✅ No work needed - all nodes embedded');
        console.log('============================================\n');
        return;
      }

      this.stats.totalNodes = nodes.length;
      console.log(`✓ Found ${nodes.length} nodes without embeddings\n`);

      // Display node type distribution
      this.displayNodeDistribution(nodes);

      // Process nodes in batches
      console.log('Step 3: Generating embeddings...\n');
      const startIndex = checkpoint?.lastProcessedIndex ?? 0;
      await this.processBatches(nodes, startIndex, options.batchSize);

      // Display final results
      this.displayFinalResults();

      // Clean up checkpoint file on success
      if (this.stats.failed === 0) {
        await this.deleteCheckpoint();
      }

    } catch (error: any) {
      console.error('\n❌ Fatal error:', error.message);
      console.error('Stack:', error.stack);

      // Save checkpoint on error
      await this.saveCheckpoint(this.stats.processed);
      console.log('\n💾 Checkpoint saved. Resume with --resume flag.');

      process.exit(1);
    } finally {
      await this.neo4jClient.close();
    }
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const required = [
      ENV_KEYS.VOYAGE_API_KEY,
      ENV_KEYS.NEO4J_URI,
      ENV_KEYS.NEO4J_USER,
      ENV_KEYS.NEO4J_PASSWORD,
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(key => console.error(`   - ${key}`));
      console.error('\nSet them in .env file or environment');
      process.exit(1);
    }
  }

  /**
   * Display configuration
   */
  private displayConfiguration(options: any): void {
    console.log('Configuration:');
    console.log(`  Neo4j URI: ${process.env[ENV_KEYS.NEO4J_URI]}`);
    console.log(`  Voyage API: ${this.voyageClient.getConfig().baseURL}`);
    console.log(`  Batch Size: ${options.batchSize}`);
    console.log(`  Limit: ${options.limit || 'none'}`);
    console.log(`  Resume: ${options.resume ? 'yes' : 'no'}`);
    console.log(`  Checkpoint Interval: ${BATCH_PROCESSING_CONFIG.CHECKPOINT_INTERVAL} nodes\n`);
  }

  /**
   * Query Neo4j for nodes without embeddings
   */
  private async queryNodesWithoutEmbeddings(limit?: number): Promise<KnowledgeNode[]> {
    // Node types that should have embeddings
    const nodeTypes = ['ADR', 'PRD', 'Pattern', 'Gotcha', 'Session', 'CodeFile', 'ContextModule', 'KnowledgeNode'];

    const cypher = `
      MATCH (n)
      WHERE n.embedding IS NULL
        AND (${nodeTypes.map(t => `n:${t}`).join(' OR ')})
      RETURN
        n.id AS id,
        labels(n) AS labels,
        n.title AS title,
        n.content AS content,
        n.summary AS summary,
        n.description AS description
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    const records = await this.neo4jClient.queryRecords(cypher);

    return records.map(record => ({
      id: record.id,
      labels: record.labels,
      title: record.title,
      content: record.content,
      summary: record.summary,
      description: record.description,
    }));
  }

  /**
   * Display node type distribution
   */
  private displayNodeDistribution(nodes: KnowledgeNode[]): void {
    const byType = nodes.reduce((acc, node) => {
      const type = node.labels[0] || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('  Nodes by type:');
    Object.entries(byType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}`);
      });
    console.log();
  }

  /**
   * Process nodes in batches
   */
  private async processBatches(
    nodes: KnowledgeNode[],
    startIndex: number,
    batchSize: number
  ): Promise<void> {
    for (let i = startIndex; i < nodes.length; i += batchSize) {
      const batchNodes = nodes.slice(i, Math.min(i + batchSize, nodes.length));

      // Filter nodes with quality gates
      const validNodes = this.applyQualityGates(batchNodes);
      this.stats.skipped += batchNodes.length - validNodes.length;

      if (validNodes.length === 0) {
        console.log(`  ⚠ Batch ${i}-${i + batchSize}: All nodes skipped (no content)`);
        continue;
      }

      // Extract text content
      const texts = validNodes.map(node => this.extractTextForEmbedding(node));

      try {
        // Generate embeddings using Voyage AI
        const embeddings = await this.voyageClient.embed(texts, 'document', {
          dimension: 1024,
        });

        // Save embeddings to Neo4j
        await this.saveEmbeddingsToNeo4j(validNodes, embeddings);

        this.stats.successful += validNodes.length;
        this.stats.processed += batchNodes.length;

        // Progress update
        this.displayProgress();

        // Checkpoint every N nodes
        if ((i + batchSize) % BATCH_PROCESSING_CONFIG.CHECKPOINT_INTERVAL === 0) {
          await this.saveCheckpoint(i + batchSize);
        }

      } catch (error: any) {
        // Handle batch errors
        console.error(`  ✗ Batch ${i}-${i + batchSize} failed: ${error.message}`);

        validNodes.forEach(node => {
          this.stats.errors.push({
            nodeId: node.id,
            error: error.message,
          });
        });

        this.stats.failed += validNodes.length;
        this.stats.processed += batchNodes.length;

        // Save checkpoint on error
        await this.saveCheckpoint(i + batchSize);

        // Decide whether to continue or abort
        if (error.name === 'VoyageAPIError' && error.statusCode === 401) {
          throw error; // Auth errors should abort
        }

        // Continue with next batch for rate limits and transient errors
        console.log('  ⏭  Continuing with next batch...\n');
        await this.sleep(2000); // Wait 2s before retry
      }

      // Delay between batches to respect rate limits
      if (i + batchSize < nodes.length) {
        await this.sleep(BATCH_PROCESSING_CONFIG.DELAY_BETWEEN_BATCHES);
      }
    }
  }

  /**
   * Apply quality gates to filter nodes
   */
  private applyQualityGates(nodes: KnowledgeNode[]): KnowledgeNode[] {
    return nodes.filter(node => {
      // Skip nodes with no text content
      const hasContent = !!(
        node.title?.trim() ||
        node.content?.trim() ||
        node.summary?.trim() ||
        node.description?.trim()
      );

      if (!hasContent) {
        console.log(`  ⚠ Skipping ${node.id}: No text content`);
        return false;
      }

      return true;
    });
  }

  /**
   * Extract text content for embedding
   * Weights title more heavily (appears twice)
   */
  private extractTextForEmbedding(node: KnowledgeNode): string {
    const textParts = [
      node.title,
      node.title, // Weight title (appears twice)
      node.summary,
      node.description,
      node.content,
    ].filter(Boolean);

    return textParts.join('\n\n').trim();
  }

  /**
   * Save embeddings to Neo4j
   */
  private async saveEmbeddingsToNeo4j(
    nodes: KnowledgeNode[],
    embeddings: number[][]
  ): Promise<void> {
    if (nodes.length !== embeddings.length) {
      throw new Error(`Node count (${nodes.length}) doesn't match embedding count (${embeddings.length})`);
    }

    // Use transaction for batch update
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const embedding = embeddings[i];

      const cypher = `
        MATCH (n {id: $nodeId})
        SET n.embedding = $embedding,
            n.embedding_model = 'voyage-3.5',
            n.embedding_dimensions = $dimensions,
            n.embedding_generated_at = datetime()
        RETURN n.id
      `;

      const results = await this.neo4jClient.queryRecords(cypher, {
        nodeId: node.id,
        embedding,
        dimensions: embedding.length,
      });

      if (results.length === 0) {
        throw new Error(`Node ${node.id} not found in Neo4j`);
      }
    }
  }

  /**
   * Display progress update
   */
  private displayProgress(): void {
    const percent = Math.round((this.stats.processed / this.stats.totalNodes) * 100);
    const elapsed = Date.now() - this.stats.startTime;
    const rate = this.stats.processed / (elapsed / 1000); // nodes per second
    const remaining = this.stats.totalNodes - this.stats.processed;
    const estimatedSeconds = remaining / rate;

    console.log(
      `  ✓ Progress: ${this.stats.processed}/${this.stats.totalNodes} (${percent}%) | ` +
      `✓ ${this.stats.successful} ✗ ${this.stats.failed} ⊘ ${this.stats.skipped} | ` +
      `ETA: ${this.formatDuration(estimatedSeconds)}`
    );
  }

  /**
   * Display final results
   */
  private displayFinalResults(): void {
    const elapsed = Date.now() - this.stats.startTime;

    console.log('\n============================================');
    console.log('✅ Batch embedding complete!');
    console.log('============================================\n');

    console.log('Summary:');
    console.log(`  Total nodes: ${this.stats.totalNodes}`);
    console.log(`  ✓ Successfully embedded: ${this.stats.successful}`);
    console.log(`  ✗ Failed: ${this.stats.failed}`);
    console.log(`  ⊘ Skipped (no content): ${this.stats.skipped}`);
    console.log(`  ⏱  Duration: ${this.formatDuration(elapsed / 1000)}`);
    console.log(`  ⚡ Rate: ${(this.stats.processed / (elapsed / 1000)).toFixed(2)} nodes/sec\n`);

    if (this.stats.failed > 0) {
      console.log('Failed nodes:');
      this.stats.errors.forEach((error, index) => {
        if (index < 10) { // Show first 10 errors
          console.log(`  - ${error.nodeId}: ${error.error}`);
        }
      });
      if (this.stats.errors.length > 10) {
        console.log(`  ... and ${this.stats.errors.length - 10} more errors`);
      }
      console.log();
    }
  }

  /**
   * Save checkpoint for resume capability
   */
  private async saveCheckpoint(lastProcessedIndex: number): Promise<void> {
    const checkpoint: Checkpoint = {
      lastProcessedIndex,
      totalProcessed: this.stats.processed,
      successful: this.stats.successful,
      failed: this.stats.failed,
      skipped: this.stats.skipped,
      timestamp: new Date().toISOString(),
      errors: this.stats.errors,
    };

    await fs.writeFile(
      this.checkpointFile,
      JSON.stringify(checkpoint, null, 2),
      'utf-8'
    );
  }

  /**
   * Load checkpoint from disk
   */
  private async loadCheckpoint(): Promise<Checkpoint | null> {
    try {
      const data = await fs.readFile(this.checkpointFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete checkpoint file
   */
  private async deleteCheckpoint(): Promise<void> {
    try {
      await fs.unlink(this.checkpointFile);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(0)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (minutes < 60) {
      return `${minutes}m ${secs}s`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * CLI entry point
 */
async function main() {
  const program = new Command();

  program
    .name('generate-embeddings')
    .description('Generate Voyage AI embeddings for knowledge nodes without embeddings (ADR-045)')
    .option(
      '--batch-size <number>',
      'Batch size for embedding generation',
      String(BATCH_PROCESSING_CONFIG.BATCH_SIZE)
    )
    .option(
      '--limit <number>',
      'Limit number of nodes to process (for testing)',
      (val) => parseInt(val, 10)
    )
    .option(
      '--resume',
      'Resume from last checkpoint',
      false
    )
    .parse(process.argv);

  const options = program.opts();

  const generator = new EmbeddingGenerator();
  await generator.run({
    batchSize: parseInt(options.batchSize, 10),
    limit: options.limit,
    resume: options.resume,
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { EmbeddingGenerator };
