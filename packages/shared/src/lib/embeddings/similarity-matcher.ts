/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [embeddings, similarity, neo4j, vector-search, adr-045]
 * @related: [types.ts, config.ts, voyage-client.ts, _neo4j.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { Driver, Session } from 'neo4j-driver';
import type {
  SimilarNode,
  SimilarityRelationshipType,
  SimilaritySearchOptions,
  SimilarityStats,
  BatchProcessingResult,
  SimilarityDistribution,
} from './types';
import {
  SIMILARITY_CONFIG,
  VECTOR_INDEX_CONFIG,
  getRelationshipType,
} from './config';

/**
 * SimilarityMatcher - Implements similarity relationship tuning from ADR-045 Phase 4
 *
 * Manages vector similarity search and relationship creation in Neo4j knowledge graph.
 * Uses multi-layer filtering strategy to prevent over-connected graphs:
 *
 * 1. Top-K limiting (max 10 neighbors per node)
 * 2. Score thresholds (min 0.75 similarity)
 * 3. Contextual filtering (project, status)
 * 4. Typed relationships (DUPLICATE_OF, HIGHLY_RELATED_TO, etc.)
 * 5. Quality gates (skip weak nodes)
 *
 * @example
 * ```typescript
 * const matcher = new SimilarityMatcher(neo4jDriver);
 *
 * // Find similar nodes
 * const similar = await matcher.findSimilarNodes(embedding, {
 *   minScore: 0.75,
 *   limit: 10,
 *   projectId: 'my-project'
 * });
 *
 * // Create typed relationships
 * await matcher.createSimilarityRelationships('node-123', similar);
 *
 * // Analyze distribution for threshold tuning
 * const dist = await matcher.analyzeSimilarityDistribution();
 * console.log('Recommended threshold:', dist.recommendedThreshold);
 * ```
 */
export class SimilarityMatcher {
  constructor(private driver: Driver) {}

  /**
   * Find similar nodes using Neo4j vector index
   *
   * Queries the knowledge_embeddings vector index with multi-layer filtering:
   * - Top-K limiting (default: 10)
   * - Score threshold (default: 0.75)
   * - Contextual filters (project, status, exclusions)
   *
   * @param embedding - The query embedding vector
   * @param options - Search options (minScore, limit, projectId, etc.)
   * @returns Array of similar nodes with scores and relationship types
   *
   * @example
   * ```typescript
   * const similar = await matcher.findSimilarNodes(queryEmbedding, {
   *   minScore: 0.80,
   *   limit: 5,
   *   projectId: 'my-project',
   *   status: 'active',
   *   excludeIds: ['self-node-id']
   * });
   * ```
   */
  async findSimilarNodes(
    embedding: number[],
    options: SimilaritySearchOptions = {}
  ): Promise<SimilarNode[]> {
    const {
      minScore = SIMILARITY_CONFIG.MIN_SCORE,
      limit = SIMILARITY_CONFIG.SEARCH_LIMIT_DEFAULT,
      projectId,
      status = 'active',
      excludeIds = [],
    } = options;

    // Clamp limit to max
    const clampedLimit = Math.min(limit, SIMILARITY_CONFIG.SEARCH_LIMIT_MAX);

    const session = this.driver.session();
    try {
      // Build contextual filters
      const filters: string[] = [
        'score >= $minScore',
        'NOT node.id IN $excludeIds',
      ];

      if (projectId && SIMILARITY_CONFIG.SAME_PROJECT_ONLY) {
        filters.push('node.projectId = $projectId');
      }

      if (status !== 'all') {
        filters.push('node.status = $status');
      }

      const whereClause = filters.join(' AND ');

      // Query vector index with filters
      const query = `
        CALL db.index.vector.queryNodes(
          $indexName,
          $limit,
          $embedding
        )
        YIELD node, score
        WHERE ${whereClause}
        RETURN node, score
        ORDER BY score DESC
      `;

      const result = await session.run(query, {
        indexName: VECTOR_INDEX_CONFIG.INDEX_NAME,
        limit: clampedLimit,
        embedding,
        minScore,
        excludeIds,
        projectId: projectId || null,
        status,
      });

      // Map results to SimilarNode with classified relationship types
      return result.records.map((record) => {
        const score = record.get('score') as number;
        return {
          node: record.get('node'),
          score,
          relationshipType: this.classifyRelationship(score),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Classify relationship type based on similarity score
   *
   * Maps scores to relationship types using thresholds from config:
   * - >= 0.95: DUPLICATE_OF (near-identical content)
   * - >= 0.85: HIGHLY_RELATED_TO (strong conceptual match)
   * - >= 0.75: RELATED_TO (good recommendation)
   * - >= 0.65: LOOSELY_RELATED_TO (exploratory search)
   *
   * @param score - Similarity score (0.0 to 1.0)
   * @returns Relationship type string
   */
  private classifyRelationship(score: number): SimilarityRelationshipType {
    return getRelationshipType(score);
  }

  /**
   * Create typed similarity relationships in Neo4j
   *
   * Generates relationships with different types based on similarity strength.
   * Uses APOC to create dynamic relationship types (DUPLICATE_OF, HIGHLY_RELATED_TO, etc.)
   *
   * Quality gate: Skips if average score < MIN_AVG_SCORE (0.80)
   *
   * @param sourceNodeId - Source node ID
   * @param similarNodes - Array of similar nodes with scores
   * @returns Number of relationships created
   *
   * @example
   * ```typescript
   * const similar = await matcher.findSimilarNodes(embedding);
   * const created = await matcher.createSimilarityRelationships('node-123', similar);
   * console.log(`Created ${created} relationships`);
   * ```
   */
  async createSimilarityRelationships(
    sourceNodeId: string,
    similarNodes: SimilarNode[]
  ): Promise<number> {
    if (similarNodes.length === 0) {
      return 0;
    }

    // Quality gate: Skip if average similarity is weak
    const avgScore =
      similarNodes.reduce((sum, n) => sum + n.score, 0) / similarNodes.length;
    if (avgScore < SIMILARITY_CONFIG.MIN_AVG_SCORE) {
      console.log(
        `[SimilarityMatcher] Skipping node ${sourceNodeId} - weak avg score: ${avgScore.toFixed(3)}`
      );
      return 0;
    }

    const session = this.driver.session();
    try {
      // Create relationships in batch with dynamic types
      const query = `
        MATCH (source:KnowledgeNode {id: $sourceNodeId})
        UNWIND $relationships AS rel
        MATCH (target:KnowledgeNode {id: rel.targetId})
        CALL apoc.create.relationship(
          source,
          rel.type,
          {
            score: rel.score,
            createdAt: datetime(),
            createdBy: 'similarity-matcher'
          },
          target
        )
        YIELD rel AS createdRel
        RETURN count(createdRel) as relationshipsCreated
      `;

      // Cap at max relationships per node
      const cappedNodes = similarNodes.slice(
        0,
        SIMILARITY_CONFIG.MAX_RELATIONSHIPS_PER_NODE
      );

      const relationships = cappedNodes.map((node) => ({
        targetId: node.node.properties.id,
        type: node.relationshipType,
        score: node.score,
      }));

      const result = await session.run(query, {
        sourceNodeId,
        relationships,
      });

      const created = result.records[0]?.get('relationshipsCreated') || 0;
      return created;
    } finally {
      await session.close();
    }
  }

  /**
   * Batch process all knowledge nodes to generate similarity relationships
   *
   * Processes nodes in batches, applying quality gates and creating typed relationships.
   * Supports checkpointing and resume on failure.
   *
   * @param options - Batch processing options
   * @returns Processing statistics
   *
   * @example
   * ```typescript
   * const result = await matcher.batchGenerateSimilarityRelationships({
   *   minScore: 0.75,
   *   limit: 10,
   *   checkpointInterval: 100
   * });
   *
   * console.log(`Processed: ${result.processed}`);
   * console.log(`Created: ${result.relationshipsCreated} relationships`);
   * console.log(`Skipped: ${result.skipped} low-quality nodes`);
   * ```
   */
  async batchGenerateSimilarityRelationships(
    options: SimilaritySearchOptions & { checkpointInterval?: number } = {}
  ): Promise<BatchProcessingResult> {
    const { checkpointInterval = 100, ...searchOptions } = options;

    const result: BatchProcessingResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      relationshipsCreated: 0,
    };

    const session = this.driver.session();
    try {
      // Get all knowledge nodes with embeddings
      const nodesResult = await session.run(`
        MATCH (n:KnowledgeNode)
        WHERE n.embedding IS NOT NULL
        RETURN n.id as nodeId, n.embedding as embedding
      `);

      const nodes = nodesResult.records.map((r) => ({
        id: r.get('nodeId') as string,
        embedding: r.get('embedding') as number[],
      }));

      console.log(
        `[SimilarityMatcher] Processing ${nodes.length} nodes...`
      );

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        result.processed++;

        try {
          // Find similar nodes (exclude self)
          const similarNodes = await this.findSimilarNodes(node.embedding, {
            ...searchOptions,
            excludeIds: [node.id],
          });

          if (similarNodes.length === 0) {
            result.skipped++;
            continue;
          }

          // Create relationships with quality gate
          const created = await this.createSimilarityRelationships(
            node.id,
            similarNodes
          );

          if (created === 0) {
            result.skipped++;
          } else {
            result.successful++;
            result.relationshipsCreated += created;
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Checkpoint progress
        if (result.processed % checkpointInterval === 0) {
          console.log(
            `[SimilarityMatcher] Progress: ${result.processed}/${nodes.length} ` +
              `(${result.relationshipsCreated} relationships created, ${result.skipped} skipped)`
          );
        }
      }

      console.log('[SimilarityMatcher] Batch processing complete:', result);
      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Analyze similarity score distribution for threshold tuning
   *
   * Samples random nodes and computes percentiles (P50, P75, P90, P95, P99).
   * Recommends threshold at P75 (keeps top 25% of similarities).
   *
   * Use this to empirically tune SIMILARITY_CONFIG thresholds.
   *
   * @param sampleSize - Number of nodes to sample (default: 100)
   * @returns Distribution statistics with recommended threshold
   *
   * @example
   * ```typescript
   * const dist = await matcher.analyzeSimilarityDistribution(200);
   *
   * console.log('Similarity Score Distribution:');
   * console.log(`  P50 (median): ${dist.p50.toFixed(3)}`);
   * console.log(`  P75: ${dist.p75.toFixed(3)}`);
   * console.log(`  P90: ${dist.p90.toFixed(3)}`);
   * console.log(`  P95: ${dist.p95.toFixed(3)}`);
   * console.log(`  Recommended threshold: ${dist.recommendedThreshold.toFixed(3)}`);
   * ```
   */
  async analyzeSimilarityDistribution(
    sampleSize = 100
  ): Promise<SimilarityDistribution> {
    const session = this.driver.session();
    try {
      // Sample random knowledge nodes
      const samplesResult = await session.run(
        `
        MATCH (n:KnowledgeNode)
        WHERE n.embedding IS NOT NULL
        WITH n, rand() as random
        ORDER BY random
        LIMIT $sampleSize
        RETURN n.id as nodeId, n.embedding as embedding
      `,
        { sampleSize }
      );

      const samples = samplesResult.records.map((r) => ({
        id: r.get('nodeId') as string,
        embedding: r.get('embedding') as number[],
      }));

      console.log(
        `[SimilarityMatcher] Analyzing ${samples.length} sample nodes...`
      );

      // Collect similarity scores from all samples
      const allScores: number[] = [];

      for (const sample of samples) {
        const neighbors = await this.findSimilarNodes(sample.embedding, {
          minScore: 0.0, // No filtering - get full distribution
          limit: 50,
          excludeIds: [sample.id],
        });

        allScores.push(...neighbors.map((n) => n.score));
      }

      if (allScores.length === 0) {
        throw new Error('No similarity scores found');
      }

      // Sort for percentile calculation
      allScores.sort((a, b) => a - b);

      // Calculate percentiles
      const percentile = (p: number) => {
        const index = Math.ceil((p / 100) * allScores.length) - 1;
        return allScores[Math.max(0, index)];
      };

      const distribution: SimilarityDistribution = {
        p50: percentile(50),
        p75: percentile(75),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99),
        recommendedThreshold: percentile(75), // P75 keeps top 25%
      };

      console.log('[SimilarityMatcher] Distribution analysis:', {
        totalScores: allScores.length,
        ...distribution,
      });

      return distribution;
    } finally {
      await session.close();
    }
  }

  /**
   * Get similarity relationship statistics
   *
   * Returns aggregate stats about existing similarity relationships:
   * - Total relationships
   * - Average/min/max scores
   * - Count by relationship type
   *
   * Use this to validate tuning and monitor quality.
   *
   * @returns Similarity statistics
   *
   * @example
   * ```typescript
   * const stats = await matcher.getSimilarityStats();
   *
   * console.log(`Total relationships: ${stats.totalRelationships}`);
   * console.log(`Average score: ${stats.averageScore.toFixed(3)}`);
   * console.log('By type:', stats.byType);
   * ```
   */
  async getSimilarityStats(): Promise<SimilarityStats> {
    const session = this.driver.session();
    try {
      // Get aggregate stats
      const statsResult = await session.run(`
        MATCH ()-[r:DUPLICATE_OF|HIGHLY_RELATED_TO|RELATED_TO|LOOSELY_RELATED_TO]->()
        RETURN count(r) as total,
               avg(r.score) as avgScore,
               min(r.score) as minScore,
               max(r.score) as maxScore
      `);

      const statsRecord = statsResult.records[0];
      const total = statsRecord?.get('total') || 0;
      const avgScore = statsRecord?.get('avgScore') || 0;
      const minScore = statsRecord?.get('minScore') || 0;
      const maxScore = statsRecord?.get('maxScore') || 0;

      // Get counts by type
      const typeResult = await session.run(`
        MATCH ()-[r]->()
        WHERE type(r) IN ['DUPLICATE_OF', 'HIGHLY_RELATED_TO', 'RELATED_TO', 'LOOSELY_RELATED_TO']
        RETURN type(r) as relType, count(r) as count
      `);

      const byType: Record<SimilarityRelationshipType, number> = {
        DUPLICATE_OF: 0,
        HIGHLY_RELATED_TO: 0,
        RELATED_TO: 0,
        LOOSELY_RELATED_TO: 0,
      };

      typeResult.records.forEach((record) => {
        const relType = record.get('relType') as SimilarityRelationshipType;
        const count = record.get('count') as number;
        byType[relType] = count;
      });

      return {
        totalRelationships: total,
        averageScore: avgScore,
        minScore,
        maxScore,
        byType,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Validate relationship distribution quality
   *
   * Checks if relationships meet quality targets:
   * - 5-15 relationships per node (not too sparse, not too dense)
   * - Average score > 0.80 (high-quality matches)
   * - P95 score > 0.85 (top matches are very relevant)
   *
   * @returns Validation results with warnings
   *
   * @example
   * ```typescript
   * const validation = await matcher.validateRelationshipQuality();
   *
   * if (!validation.passed) {
   *   console.warn('Quality issues:', validation.warnings);
   * }
   * ```
   */
  async validateRelationshipQuality(): Promise<{
    passed: boolean;
    warnings: string[];
    metrics: {
      avgRelationshipsPerNode: number;
      maxRelationshipsPerNode: number;
      avgScore: number;
      p95Score: number;
    };
  }> {
    const session = this.driver.session();
    const warnings: string[] = [];

    try {
      // Check relationships per node distribution
      const distResult = await session.run(`
        MATCH (n:KnowledgeNode)
        OPTIONAL MATCH (n)-[r:DUPLICATE_OF|HIGHLY_RELATED_TO|RELATED_TO|LOOSELY_RELATED_TO]->()
        WITH n, count(r) as relCount
        RETURN avg(relCount) as avgRels,
               max(relCount) as maxRels
      `);

      const avgRels = distResult.records[0]?.get('avgRels') || 0;
      const maxRels = distResult.records[0]?.get('maxRels') || 0;

      // Check score quality
      const stats = await this.getSimilarityStats();

      // Get P95 score
      const scoreResult = await session.run(`
        MATCH ()-[r:DUPLICATE_OF|HIGHLY_RELATED_TO|RELATED_TO|LOOSELY_RELATED_TO]->()
        WITH r.score as score
        ORDER BY score DESC
        WITH collect(score) as scores
        RETURN scores[toInteger(size(scores) * 0.05)] as p95
      `);

      const p95Score = scoreResult.records[0]?.get('p95') || 0;

      // Validate against targets
      if (
        avgRels < SIMILARITY_CONFIG.TARGET_RELATIONSHIPS_PER_NODE_MIN ||
        avgRels > SIMILARITY_CONFIG.TARGET_RELATIONSHIPS_PER_NODE_MAX
      ) {
        warnings.push(
          `Average relationships per node (${avgRels.toFixed(1)}) outside target range ` +
            `(${SIMILARITY_CONFIG.TARGET_RELATIONSHIPS_PER_NODE_MIN}-${SIMILARITY_CONFIG.TARGET_RELATIONSHIPS_PER_NODE_MAX})`
        );
      }

      if (maxRels > SIMILARITY_CONFIG.MAX_RELATIONSHIPS_PER_NODE) {
        warnings.push(
          `Max relationships per node (${maxRels}) exceeds limit ` +
            `(${SIMILARITY_CONFIG.MAX_RELATIONSHIPS_PER_NODE})`
        );
      }

      if (stats.averageScore < SIMILARITY_CONFIG.TARGET_AVG_SCORE) {
        warnings.push(
          `Average score (${stats.averageScore.toFixed(3)}) below target ` +
            `(${SIMILARITY_CONFIG.TARGET_AVG_SCORE})`
        );
      }

      if (p95Score < SIMILARITY_CONFIG.TARGET_P95_SCORE) {
        warnings.push(
          `P95 score (${p95Score.toFixed(3)}) below target ` +
            `(${SIMILARITY_CONFIG.TARGET_P95_SCORE})`
        );
      }

      return {
        passed: warnings.length === 0,
        warnings,
        metrics: {
          avgRelationshipsPerNode: avgRels,
          maxRelationshipsPerNode: maxRels,
          avgScore: stats.averageScore,
          p95Score,
        },
      };
    } finally {
      await session.close();
    }
  }
}
