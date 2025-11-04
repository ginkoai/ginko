/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: [embeddings, batch-processing, graph-api, migration]
 * @related: [api/v1/graph/_cloud-graph-client.ts, src/graph/embeddings-service.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@xenova/transformers, dotenv]
 */

import { CloudGraphClient } from '../api/v1/graph/_cloud-graph-client.js';
import { EmbeddingsService } from '../src/graph/embeddings-service.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Node data structure for embedding
 */
interface NodeToEmbed {
  id: string;
  type: string;
  title?: string;
  content?: string;
  summary?: string;
  description?: string;
}

/**
 * Result of embedding operation
 */
interface EmbedResult {
  nodeId: string;
  success: boolean;
  error?: string;
  dimensions?: number;
}

/**
 * Batch embed all nodes without embeddings
 *
 * Connects to Cloud Graph API and generates embeddings for all nodes
 * that don't have them yet using all-mpnet-base-v2 model.
 *
 * Usage:
 *   NEO4J_URI=bolt://your-server:7687 \
 *   NEO4J_USER=neo4j \
 *   NEO4J_PASSWORD=yourpassword \
 *   GRAPH_ID=your_graph_id \
 *   tsx scripts/batch-embed-nodes.ts
 */
async function batchEmbedNodes() {
  console.log('============================================');
  console.log('  Batch Node Embedding Script');
  console.log('  Model: all-mpnet-base-v2 (768 dims)');
  console.log('============================================\n');

  // Validate environment
  const graphApiUrl = process.env.GINKO_GRAPH_API_URL || 'https://ginko-bjob1vkom-chris-nortons-projects.vercel.app';
  const bearerToken = process.env.GINKO_GRAPH_TOKEN || 'test_token_12345';
  const graphId = process.env.GINKO_GRAPH_ID || process.env.GRAPH_ID;

  if (!graphId) {
    console.error('❌ Error: GINKO_GRAPH_ID or GRAPH_ID environment variable required');
    console.error('   Set it to your graph ID (e.g., "gin_xyz")');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Graph API: ${graphApiUrl}`);
  console.log(`  Graph ID: ${graphId}`);
  console.log(`  Token: ${bearerToken.substring(0, 10)}...`);
  console.log();

  let embeddingsService: EmbeddingsService | null = null;

  try {
    // Step 1: Initialize CloudGraphClient
    console.log('Step 1: Connecting to Cloud Graph API...');
    const client = await CloudGraphClient.fromBearerToken(bearerToken, graphId);
    console.log('✓ Connected to graph\n');

    // Step 2: Initialize embeddings service
    console.log('Step 2: Initializing embeddings model...');
    embeddingsService = new EmbeddingsService();
    await embeddingsService.initialize();
    console.log('✓ Model loaded\n');

    // Step 3: Query nodes without embeddings
    console.log('Step 3: Querying nodes without embeddings...');
    const nodesWithoutEmbeddings = await queryNodesWithoutEmbeddings(client);

    if (nodesWithoutEmbeddings.length === 0) {
      console.log('✓ All nodes already have embeddings!');
      console.log('\n============================================');
      console.log('✅ No work needed - all nodes embedded');
      console.log('============================================\n');
      return;
    }

    console.log(`✓ Found ${nodesWithoutEmbeddings.length} nodes without embeddings`);

    // Group by type for reporting
    const byType = nodesWithoutEmbeddings.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n  Nodes by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });
    console.log();

    // Step 4: Generate and update embeddings
    console.log('Step 4: Generating embeddings...\n');
    const results = await generateAndUpdateEmbeddings(
      client,
      embeddingsService,
      nodesWithoutEmbeddings
    );

    // Step 5: Report results
    console.log('\n============================================');
    console.log('✅ Batch embedding complete!');
    console.log('============================================\n');

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log('Summary:');
    console.log(`  Total nodes processed: ${results.length}`);
    console.log(`  ✓ Successfully embedded: ${successCount}`);
    if (failureCount > 0) {
      console.log(`  ✗ Failed: ${failureCount}`);
      console.log('\n  Failed nodes:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`    - ${r.nodeId}: ${r.error}`);
        });
    }
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error during batch embedding:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (embeddingsService) {
      await embeddingsService.dispose();
    }
  }
}

/**
 * Query nodes without embeddings from the graph
 */
async function queryNodesWithoutEmbeddings(
  client: CloudGraphClient
): Promise<NodeToEmbed[]> {
  // Query all node types that should have embeddings
  const nodeTypes = ['ADR', 'PRD', 'Pattern', 'Gotcha', 'Session', 'CodeFile', 'ContextModule'];

  const cypher = `
    MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n)
    WHERE n.embedding IS NULL
      AND (${nodeTypes.map(t => `n:${t}`).join(' OR ')})
    RETURN
      n.id AS id,
      labels(n)[0] AS type,
      n.title AS title,
      n.content AS content,
      n.summary AS summary,
      n.description AS description
  `;

  const results = await client.runScopedQuery<any>(cypher);

  return results.map(record => ({
    id: record.id,
    type: record.type,
    title: record.title,
    content: record.content,
    summary: record.summary,
    description: record.description,
  }));
}

/**
 * Generate embeddings and update nodes
 */
async function generateAndUpdateEmbeddings(
  client: CloudGraphClient,
  embeddingsService: EmbeddingsService,
  nodes: NodeToEmbed[]
): Promise<EmbedResult[]> {
  const results: EmbedResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const progress = i + 1;
    const percent = Math.round((progress / nodes.length) * 100);

    try {
      // Combine text fields for embedding
      // Weight title more heavily (appears twice)
      const textParts = [
        node.title,
        node.title, // Weight title
        node.summary,
        node.description,
        node.content,
      ].filter(Boolean);

      const text = textParts.join('\n\n').trim();

      if (!text) {
        throw new Error('No text content available for embedding');
      }

      // Generate embedding
      const result = await embeddingsService.embed(text);

      // Update node in graph
      await updateNodeEmbedding(client, node.id, result.embedding);

      successCount++;
      results.push({
        nodeId: node.id,
        success: true,
        dimensions: result.dimensions,
      });

      // Progress logging every 10 nodes
      if (progress % 10 === 0 || progress === nodes.length) {
        console.log(`  ✓ Embedded ${progress}/${nodes.length} nodes (${percent}%)`);
      }

    } catch (error: any) {
      failureCount++;
      console.error(`  ✗ Failed to embed ${node.id}: ${error.message}`);

      results.push({
        nodeId: node.id,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Update node with embedding vector
 */
async function updateNodeEmbedding(
  client: CloudGraphClient,
  nodeId: string,
  embedding: number[]
): Promise<void> {
  const cypher = `
    MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n {id: $nodeId})
    SET n.embedding = $embedding,
        n.embedding_model = 'Xenova/all-mpnet-base-v2',
        n.embedding_dimensions = $dimensions,
        n.embedding_generated_at = datetime()
    RETURN n.id
  `;

  const results = await client.runScopedQuery(cypher, {
    nodeId,
    embedding,
    dimensions: embedding.length,
  });

  if (results.length === 0) {
    throw new Error(`Node ${nodeId} not found or not accessible in graph`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  batchEmbedNodes()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { batchEmbedNodes };
