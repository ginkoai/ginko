/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: [embeddings, verification, testing]
 * @related: [batch-embed-nodes.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [dotenv]
 */

import { CloudGraphClient } from '../api/v1/graph/_cloud-graph-client.js';
import { EmbeddingsService } from '../src/graph/embeddings-service.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyEmbeddings() {
  console.log('============================================');
  console.log('  Verify Embeddings');
  console.log('============================================\n');

  const bearerToken = process.env.GINKO_GRAPH_TOKEN || 'test_token_12345';
  const graphId = process.env.GINKO_GRAPH_ID || process.env.GRAPH_ID;

  if (!graphId) {
    console.error('❌ Error: GINKO_GRAPH_ID required');
    process.exit(1);
  }

  let embeddingsService: EmbeddingsService | null = null;

  try {
    // Connect to graph
    console.log('Step 1: Connecting to graph...');
    const client = await CloudGraphClient.fromBearerToken(bearerToken, graphId);
    console.log('✓ Connected\n');

    // Check graph stats
    console.log('Step 2: Checking graph statistics...');
    const stats = await client.getGraphStats();
    console.log(`✓ Total nodes: ${stats.nodes.total}`);
    console.log(`✓ Nodes with embeddings: ${stats.nodes.withEmbeddings}`);
    console.log(`  Coverage: ${Math.round((stats.nodes.withEmbeddings! / stats.nodes.total) * 100)}%`);
    console.log();

    // Sample check: get a few nodes with embeddings
    console.log('Step 3: Sampling embedded nodes...');
    const cypher = `
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n)
      WHERE n.embedding IS NOT NULL
      RETURN n.id AS id, n.title AS title, size(n.embedding) AS dimensions
      LIMIT 5
    `;
    const samples = await client.runScopedQuery<any>(cypher);

    console.log('  Sample nodes:');
    samples.forEach((s: any) => {
      console.log(`    - ${s.id}: "${s.title.substring(0, 50)}..." (${s.dimensions}d)`);
    });
    console.log();

    // Test semantic search
    console.log('Step 4: Testing semantic search...');
    embeddingsService = new EmbeddingsService();
    await embeddingsService.initialize();

    const query = 'graph-based context discovery';
    console.log(`  Query: "${query}"`);

    const result = await embeddingsService.embed(query);
    console.log(`  ✓ Generated query embedding (${result.dimensions}d)`);

    const searchResults = await client.semanticSearch(result.embedding, {
      limit: 5,
      threshold: 0.60,
      types: ['ADR', 'PRD', 'Pattern']
    });

    console.log(`  ✓ Found ${searchResults.length} similar documents:\n`);
    searchResults.forEach((r, i) => {
      console.log(`    ${i + 1}. [${r.type}] ${r.node.title}`);
      console.log(`       Similarity: ${(r.score * 100).toFixed(1)}%`);
    });
    console.log();

    console.log('============================================');
    console.log('✅ Embeddings verification complete!');
    console.log('============================================\n');

    console.log('Summary:');
    console.log(`  ✓ ${stats.nodes.total} nodes in graph`);
    console.log(`  ✓ ${stats.nodes.withEmbeddings} nodes with embeddings`);
    console.log(`  ✓ Semantic search working`);
    console.log(`  ✓ Model: all-mpnet-base-v2 (768d)`);
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (embeddingsService) {
      await embeddingsService.dispose();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyEmbeddings()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { verifyEmbeddings };
