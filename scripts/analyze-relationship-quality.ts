/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: [analysis, relationships, quality-assessment]
 * @related: [create-relationships-hetzner.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [dotenv]
 */

import { CloudGraphClient } from '../api/v1/graph/_cloud-graph-client.js';
import dotenv from 'dotenv';

dotenv.config();

interface RelationshipSample {
  source: string;
  sourceTitle: string;
  sourceType: string;
  target: string;
  targetTitle: string;
  targetType: string;
  similarity: number;
  relType: string;
}

/**
 * Analyze relationship quality in the knowledge graph
 */
async function analyzeRelationshipQuality() {
  console.log('============================================');
  console.log('  Relationship Quality Analysis');
  console.log('  Target: Hetzner Neo4j');
  console.log('============================================\n');

  const bearerToken = process.env.GINKO_GRAPH_TOKEN || 'test_token_12345';
  const graphId = process.env.GINKO_GRAPH_ID || process.env.GRAPH_ID;

  if (!graphId) {
    console.error('❌ Error: GINKO_GRAPH_ID required');
    process.exit(1);
  }

  try {
    console.log('Connecting to graph...');
    const client = await CloudGraphClient.fromBearerToken(bearerToken, graphId);
    console.log('✓ Connected\n');

    // Get relationship statistics
    console.log('Step 1: Getting relationship statistics...');
    const stats = await client.getGraphStats();

    console.log('Overall Statistics:');
    console.log(`  Total nodes: ${stats.nodes.total}`);
    console.log(`  Total relationships: ${stats.relationships.total}`);
    console.log('\n  Relationships by type:');

    Object.entries(stats.relationships.byType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = ((count / stats.relationships.total) * 100).toFixed(1);
        console.log(`    ${type}: ${count} (${percentage}%)`);
      });
    console.log();

    // Sample SIMILAR_TO relationships by quality tiers
    console.log('Step 2: Sampling SIMILAR_TO relationships by quality tier...\n');

    const tiers = [
      { name: 'Excellent (0.85+)', min: 0.85, max: 1.0 },
      { name: 'High (0.75-0.85)', min: 0.75, max: 0.85 },
      { name: 'Moderate (0.65-0.75)', min: 0.65, max: 0.75 },
      { name: 'Low (0.60-0.65)', min: 0.60, max: 0.65 },
      { name: 'Very Low (<0.60)', min: 0.0, max: 0.60 },
    ];

    for (const tier of tiers) {
      const query = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n1)
        MATCH (g)-[:CONTAINS]->(n2)
        MATCH (n1)-[r:SIMILAR_TO]->(n2)
        WHERE r.similarity >= $min AND r.similarity < $max
        RETURN
          n1.id AS source,
          n1.title AS sourceTitle,
          labels(n1)[0] AS sourceType,
          n2.id AS target,
          n2.title AS targetTitle,
          labels(n2)[0] AS targetType,
          r.similarity AS similarity,
          'SIMILAR_TO' AS relType
        ORDER BY r.similarity DESC
        LIMIT 5
      `;

      const samples = await client.runScopedQuery<RelationshipSample>(query, {
        min: tier.min,
        max: tier.max,
      });

      console.log(`${tier.name}: ${samples.length} samples`);
      samples.forEach(rel => {
        console.log(`  ${rel.similarity.toFixed(3)} | ${rel.sourceType}:${rel.source} → ${rel.targetType}:${rel.target}`);
        console.log(`           "${rel.sourceTitle?.substring(0, 50)}"`);
        console.log(`           "${rel.targetTitle?.substring(0, 50)}"`);
      });
      console.log();
    }

    // Count relationships per tier
    console.log('Step 3: Distribution analysis...\n');

    for (const tier of tiers) {
      const query = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n1)
        MATCH (g)-[:CONTAINS]->(n2)
        MATCH (n1)-[r:SIMILAR_TO]->(n2)
        WHERE r.similarity >= $min AND r.similarity < $max
        RETURN count(r) AS count
      `;

      const result = await client.runScopedQuery<{ count: number }>(query, {
        min: tier.min,
        max: tier.max,
      });

      const count = Number(result[0]?.count || 0);
      const similarToTotal = Number(stats.relationships.byType.SIMILAR_TO || 0);
      const percentage = similarToTotal > 0
        ? ((count / similarToTotal) * 100).toFixed(1)
        : '0';

      console.log(`  ${tier.name}: ${count} (${percentage}%)`);
    }
    console.log();

    // Analyze typed relationships (non-SIMILAR_TO)
    console.log('Step 4: Analyzing typed relationships...\n');

    const typedQuery = `
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n1)
      MATCH (g)-[:CONTAINS]->(n2)
      MATCH (n1)-[r]->(n2)
      WHERE type(r) <> 'SIMILAR_TO'
      RETURN
        type(r) AS relType,
        labels(n1)[0] AS sourceType,
        labels(n2)[0] AS targetType,
        count(*) AS count
      ORDER BY count DESC
    `;

    const typedRels = await client.runScopedQuery<any>(typedQuery);

    console.log('Typed relationships (non-SIMILAR_TO):');
    typedRels.forEach(rel => {
      console.log(`  ${rel.relType}: ${rel.sourceType} → ${rel.targetType} (${rel.count})`);
    });
    console.log();

    // Sample some typed relationships
    console.log('Step 5: Sampling typed relationships...\n');

    const typedSampleQuery = `
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n1)
      MATCH (g)-[:CONTAINS]->(n2)
      MATCH (n1)-[r]->(n2)
      WHERE type(r) <> 'SIMILAR_TO'
      RETURN
        n1.id AS source,
        n1.title AS sourceTitle,
        labels(n1)[0] AS sourceType,
        n2.id AS target,
        n2.title AS targetTitle,
        labels(n2)[0] AS targetType,
        type(r) AS relType,
        r.similarity AS similarity
      ORDER BY type(r)
      LIMIT 10
    `;

    const typedSamples = await client.runScopedQuery<any>(typedSampleQuery);

    typedSamples.forEach(rel => {
      const simStr = rel.similarity ? `(${rel.similarity.toFixed(3)})` : '';
      console.log(`  ${rel.relType} ${simStr}`);
      console.log(`    ${rel.sourceType}:${rel.source} → ${rel.targetType}:${rel.target}`);
      console.log(`    "${rel.sourceTitle?.substring(0, 50)}"`);
      console.log(`    "${rel.targetTitle?.substring(0, 50)}"`);
      console.log();
    });

    console.log('============================================');
    console.log('✅ Analysis complete!');
    console.log('============================================\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeRelationshipQuality()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { analyzeRelationshipQuality };
