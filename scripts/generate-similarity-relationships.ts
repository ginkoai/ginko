/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [embeddings, similarity, relationships, neo4j, batch-processing, adr-045]
 * @related: [generate-embeddings.ts, similarity-matcher.ts, config.ts, _neo4j.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [@ginko/shared, neo4j-driver, commander, dotenv]
 */

import { SimilarityMatcher } from '../packages/shared/src/lib/embeddings/similarity-matcher.js';
import { SIMILARITY_CONFIG, BATCH_PROCESSING_CONFIG, ENV_KEYS } from '../packages/shared/src/lib/embeddings/config.js';
import neo4j, { Driver } from 'neo4j-driver';
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
dotenv.config();

/**
 * Knowledge node with embedding for similarity matching
 */
interface KnowledgeNodeWithEmbedding {
  id: string;
  labels: string[];
  projectId?: string;
  status: string;
  embedding: number[];
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
  relationshipsCreated: number;
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
  relationshipsCreated: number;
  errors: Array<{ nodeId: string; error: string }>;
  startTime: number;
}

/**
 * Quality validation metrics
 */
interface QualityMetrics {
  avgRelationshipsPerNode: number;
  maxRelationshipsPerNode: number;
  avgScore: number;
  p95Score: number;
  byType: {
    DUPLICATE_OF: number;
    HIGHLY_RELATED_TO: number;
    RELATED_TO: number;
    LOOSELY_RELATED_TO: number;
  };
}

/**
 * Typed Similarity Relationship Generator (ADR-045 Phase 4)
 *
 * Features:
 * - Query Neo4j for KnowledgeNode nodes WITH embeddings
 * - For each node, use SimilarityMatcher.findSimilarNodes() to find top-K similar nodes
 * - Apply quality gate: skip if average score < 0.80
 * - Create typed relationships using SimilarityMatcher.createSimilarityRelationships()
 * - Track statistics: total nodes, relationships created, nodes skipped, errors
 * - Progress tracking (processed, estimated time)
 * - Checkpoint/resume capability (every 100 nodes)
 * - Command-line arguments: --limit, --batch-size, --min-score, --top-k, --resume, --project-id
 * - Log validation metrics: rels/node, avg score, P95 score
 * - Follow ADR-045 Phase 4 quality gates and thresholds
 *
 * Usage:
 *   npx tsx scripts/generate-similarity-relationships.ts
 *   npx tsx scripts/generate-similarity-relationships.ts --min-score 0.80 --top-k 10
 *   npx tsx scripts/generate-similarity-relationships.ts --project-id my-project --resume
 *   npx tsx scripts/generate-similarity-relationships.ts --limit 100 --batch-size 50
 */
class SimilarityRelationshipGenerator {
  private driver: Driver;
  private matcher: SimilarityMatcher;
  private checkpointFile: string;
  private stats: ProcessingStats;

  constructor() {
    // Initialize Neo4j driver
    const uri = process.env[ENV_KEYS.NEO4J_URI] || 'bolt://localhost:7687';
    const user = process.env[ENV_KEYS.NEO4J_USER] || 'neo4j';
    const password = process.env[ENV_KEYS.NEO4J_PASSWORD] || 'neo4j';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 5000,
    });

    this.matcher = new SimilarityMatcher(this.driver);
    this.checkpointFile = path.join(process.cwd(), '.similarity-checkpoint.json');
    this.stats = {
      totalNodes: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      relationshipsCreated: 0,
      errors: [],
      startTime: Date.now(),
    };
  }

  /**
   * Main execution function
   */
  async run(options: {
    minScore: number;
    topK: number;
    limit?: number;
    projectId?: string;
    resume: boolean;
  }): Promise<void> {
    console.log('============================================');
    console.log('  Typed Similarity Relationships (ADR-045)');
    console.log('  Phase 4: Multi-Layer Filtering');
    console.log('============================================\n');

    try {
      // Validate environment
      this.validateEnvironment();

      // Display configuration
      this.displayConfiguration(options);

      // Verify Neo4j connectivity
      console.log('Step 1: Connecting to Neo4j...');
      await this.driver.verifyConnectivity();
      console.log('✓ Connected to Neo4j\n');

      // Load checkpoint if resuming
      let checkpoint: Checkpoint | null = null;
      if (options.resume) {
        checkpoint = await this.loadCheckpoint();
        if (checkpoint) {
          console.log(`📍 Resuming from checkpoint:`);
          console.log(`   Last processed: ${checkpoint.lastProcessedIndex}`);
          console.log(`   Total processed: ${checkpoint.totalProcessed}`);
          console.log(`   Relationships created: ${checkpoint.relationshipsCreated}`);
          console.log(`   Skipped: ${checkpoint.skipped}\n`);
          this.stats.processed = checkpoint.totalProcessed;
          this.stats.successful = checkpoint.successful;
          this.stats.failed = checkpoint.failed;
          this.stats.skipped = checkpoint.skipped;
          this.stats.relationshipsCreated = checkpoint.relationshipsCreated;
          this.stats.errors = checkpoint.errors;
        } else {
          console.log('⚠ No checkpoint found, starting from beginning\n');
        }
      }

      // Query nodes with embeddings
      console.log('Step 2: Querying nodes with embeddings...');
      const nodes = await this.queryNodesWithEmbeddings(options.limit, options.projectId);

      if (nodes.length === 0) {
        console.log('⚠ No nodes with embeddings found!');
        console.log('\n============================================');
        console.log('❌ No work needed - no embedded nodes');
        console.log('============================================\n');
        console.log('Run: npx tsx scripts/generate-embeddings.ts first');
        return;
      }

      this.stats.totalNodes = nodes.length;
      console.log(`✓ Found ${nodes.length} nodes with embeddings\n`);

      // Display node type distribution
      this.displayNodeDistribution(nodes);

      // Process nodes
      console.log('Step 3: Generating typed similarity relationships...\n');
      const startIndex = checkpoint?.lastProcessedIndex ?? 0;
      await this.processNodes(nodes, startIndex, options);

      // Display final results
      this.displayFinalResults();

      // Validate relationship quality
      console.log('Step 4: Validating relationship quality...\n');
      await this.validateAndDisplayQuality();

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
      await this.driver.close();
    }
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const required = [
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
    console.log(`  Min Score: ${options.minScore}`);
    console.log(`  Top-K: ${options.topK}`);
    console.log(`  Project ID: ${options.projectId || 'all projects'}`);
    console.log(`  Limit: ${options.limit || 'none'}`);
    console.log(`  Resume: ${options.resume ? 'yes' : 'no'}`);
    console.log(`  Checkpoint Interval: ${BATCH_PROCESSING_CONFIG.CHECKPOINT_INTERVAL} nodes\n`);
  }

  /**
   * Query Neo4j for nodes WITH embeddings
   */
  private async queryNodesWithEmbeddings(
    limit?: number,
    projectId?: string
  ): Promise<KnowledgeNodeWithEmbedding[]> {
    const session = this.driver.session();
    try {
      const projectFilter = projectId ? 'AND n.projectId = $projectId' : '';

      const cypher = `
        MATCH (n:KnowledgeNode)
        WHERE n.embedding IS NOT NULL
          ${projectFilter}
        RETURN
          n.id AS id,
          labels(n) AS labels,
          n.projectId AS projectId,
          COALESCE(n.status, 'active') AS status,
          n.embedding AS embedding
        ${limit ? `LIMIT ${limit}` : ''}
      `;

      const result = await session.run(cypher, { projectId: projectId || null });

      return result.records.map(record => ({
        id: record.get('id') as string,
        labels: record.get('labels') as string[],
        projectId: record.get('projectId') as string | undefined,
        status: record.get('status') as string,
        embedding: record.get('embedding') as number[],
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Display node type distribution
   */
  private displayNodeDistribution(nodes: KnowledgeNodeWithEmbedding[]): void {
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
   * Process nodes to generate similarity relationships
   */
  private async processNodes(
    nodes: KnowledgeNodeWithEmbedding[],
    startIndex: number,
    options: {
      minScore: number;
      topK: number;
      projectId?: string;
    }
  ): Promise<void> {
    for (let i = startIndex; i < nodes.length; i++) {
      const node = nodes[i];

      try {
        // Find similar nodes (exclude self)
        const similarNodes = await this.matcher.findSimilarNodes(node.embedding, {
          minScore: options.minScore,
          limit: options.topK,
          projectId: options.projectId,
          status: 'active',
          excludeIds: [node.id],
        });

        if (similarNodes.length === 0) {
          this.stats.skipped++;
          this.stats.processed++;
          this.displayProgress();
          continue;
        }

        // Apply quality gate and create relationships
        const created = await this.matcher.createSimilarityRelationships(
          node.id,
          similarNodes
        );

        if (created === 0) {
          // Skipped due to quality gate (avg score < MIN_AVG_SCORE)
          this.stats.skipped++;
        } else {
          this.stats.successful++;
          this.stats.relationshipsCreated += created;
        }

        this.stats.processed++;
        this.displayProgress();

        // Checkpoint every N nodes
        if ((i + 1) % BATCH_PROCESSING_CONFIG.CHECKPOINT_INTERVAL === 0) {
          await this.saveCheckpoint(i + 1);
        }

      } catch (error: any) {
        // Handle node processing errors
        console.error(`  ✗ Node ${node.id} failed: ${error.message}`);

        this.stats.errors.push({
          nodeId: node.id,
          error: error.message,
        });

        this.stats.failed++;
        this.stats.processed++;

        // Save checkpoint on error
        await this.saveCheckpoint(i + 1);

        // Continue with next node (don't abort entire batch)
        console.log('  ⏭  Continuing with next node...\n');
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

    // Calculate average relationships per processed node
    const avgRelsPerNode = this.stats.successful > 0
      ? (this.stats.relationshipsCreated / this.stats.successful).toFixed(1)
      : '0.0';

    console.log(
      `  ✓ Progress: ${this.stats.processed}/${this.stats.totalNodes} (${percent}%) | ` +
      `✓ ${this.stats.successful} ✗ ${this.stats.failed} ⊘ ${this.stats.skipped} | ` +
      `Rels: ${this.stats.relationshipsCreated} (avg: ${avgRelsPerNode}) | ` +
      `ETA: ${this.formatDuration(estimatedSeconds)}`
    );
  }

  /**
   * Display final results
   */
  private displayFinalResults(): void {
    const elapsed = Date.now() - this.stats.startTime;

    console.log('\n============================================');
    console.log('✅ Similarity relationship generation complete!');
    console.log('============================================\n');

    console.log('Summary:');
    console.log(`  Total nodes: ${this.stats.totalNodes}`);
    console.log(`  ✓ Successfully processed: ${this.stats.successful}`);
    console.log(`  ✗ Failed: ${this.stats.failed}`);
    console.log(`  ⊘ Skipped (quality gate): ${this.stats.skipped}`);
    console.log(`  🔗 Relationships created: ${this.stats.relationshipsCreated}`);

    if (this.stats.successful > 0) {
      const avgRelsPerNode = (this.stats.relationshipsCreated / this.stats.successful).toFixed(2);
      console.log(`  📊 Avg relationships/node: ${avgRelsPerNode}`);
    }

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
   * Validate and display quality metrics
   */
  private async validateAndDisplayQuality(): Promise<void> {
    try {
      // Get statistics
      const stats = await this.matcher.getSimilarityStats();

      console.log('Quality Metrics:');
      console.log(`  Total relationships: ${stats.totalRelationships}`);
      console.log(`  Average score: ${stats.averageScore.toFixed(3)}`);
      console.log(`  Min score: ${stats.minScore.toFixed(3)}`);
      console.log(`  Max score: ${stats.maxScore.toFixed(3)}`);
      console.log('\n  By type:');
      console.log(`    - DUPLICATE_OF: ${stats.byType.DUPLICATE_OF}`);
      console.log(`    - HIGHLY_RELATED_TO: ${stats.byType.HIGHLY_RELATED_TO}`);
      console.log(`    - RELATED_TO: ${stats.byType.RELATED_TO}`);
      console.log(`    - LOOSELY_RELATED_TO: ${stats.byType.LOOSELY_RELATED_TO}`);

      // Validate quality
      const validation = await this.matcher.validateRelationshipQuality();

      console.log('\nQuality Validation:');
      console.log(`  Status: ${validation.passed ? '✅ PASSED' : '⚠️  WARNINGS'}`);
      console.log(`  Avg relationships/node: ${validation.metrics.avgRelationshipsPerNode.toFixed(2)}`);
      console.log(`  Max relationships/node: ${validation.metrics.maxRelationshipsPerNode}`);
      console.log(`  Average score: ${validation.metrics.avgScore.toFixed(3)}`);
      console.log(`  P95 score: ${validation.metrics.p95Score.toFixed(3)}`);

      if (validation.warnings.length > 0) {
        console.log('\n  Warnings:');
        validation.warnings.forEach(warning => {
          console.log(`    ⚠️  ${warning}`);
        });
      }

      console.log('\nTargets (from ADR-045):');
      console.log(`  Relationships/node: ${SIMILARITY_CONFIG.TARGET_RELATIONSHIPS_PER_NODE_MIN}-${SIMILARITY_CONFIG.TARGET_RELATIONSHIPS_PER_NODE_MAX}`);
      console.log(`  Average score: >${SIMILARITY_CONFIG.TARGET_AVG_SCORE}`);
      console.log(`  P95 score: >${SIMILARITY_CONFIG.TARGET_P95_SCORE}`);
      console.log();

    } catch (error: any) {
      console.error('⚠️  Could not validate quality metrics:', error.message);
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
      relationshipsCreated: this.stats.relationshipsCreated,
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
}

/**
 * CLI entry point
 */
async function main() {
  const program = new Command();

  program
    .name('generate-similarity-relationships')
    .description('Generate typed similarity relationships between knowledge nodes (ADR-045 Phase 4)')
    .option(
      '--min-score <number>',
      'Minimum similarity score threshold',
      (val) => parseFloat(val),
      SIMILARITY_CONFIG.MIN_SCORE
    )
    .option(
      '--top-k <number>',
      'Maximum number of similar nodes per node',
      (val) => parseInt(val, 10),
      SIMILARITY_CONFIG.TOP_K
    )
    .option(
      '--limit <number>',
      'Limit number of nodes to process (for testing)',
      (val) => parseInt(val, 10)
    )
    .option(
      '--project-id <string>',
      'Only process nodes from specific project',
      undefined
    )
    .option(
      '--resume',
      'Resume from last checkpoint',
      false
    )
    .parse(process.argv);

  const options = program.opts();

  const generator = new SimilarityRelationshipGenerator();
  await generator.run({
    minScore: options.minScore,
    topK: options.topK,
    limit: options.limit,
    projectId: options.projectId,
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

export { SimilarityRelationshipGenerator };
