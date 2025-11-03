/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: [graph, database, maintenance, cleanup]
 * @related: [api/v1/graph/_cloud-graph-client.ts, scripts/batch-embed-nodes.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [dotenv]
 */

import { CloudGraphClient } from '../api/v1/graph/_cloud-graph-client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Clear all nodes from the graph database
 *
 * WARNING: This deletes ALL nodes and relationships in your graph.
 * Use with caution!
 *
 * Usage:
 *   GINKO_GRAPH_TOKEN=your_token \
 *   GINKO_GRAPH_ID=your_graph_id \
 *   tsx scripts/clear-graph.ts
 */
async function clearGraph() {
  console.log('============================================');
  console.log('  Clear Graph Database');
  console.log('  WARNING: This will delete ALL nodes!');
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

  try {
    // Connect to graph
    console.log('Step 1: Connecting to Cloud Graph API...');
    const client = await CloudGraphClient.fromBearerToken(bearerToken, graphId);
    console.log('✓ Connected to graph\n');

    // Get current stats
    console.log('Step 2: Checking current graph state...');
    const statsBefore = await client.getGraphStats();
    console.log(`✓ Current nodes: ${statsBefore.nodes.total}`);
    console.log(`✓ Current relationships: ${statsBefore.relationships.total}`);

    if (statsBefore.nodes.total === 0) {
      console.log('\n✓ Graph is already empty - nothing to clear');
      console.log('\n============================================');
      console.log('✅ No work needed - graph is empty');
      console.log('============================================\n');
      return;
    }

    console.log('\n  Nodes by type:');
    Object.entries(statsBefore.nodes.byType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });
    console.log();

    // Clear all nodes (DETACH DELETE removes relationships too)
    console.log('Step 3: Clearing all nodes and relationships...');
    const cypher = `
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n)
      DETACH DELETE n
    `;

    await client.runScopedQuery(cypher);
    console.log('✓ All nodes and relationships deleted\n');

    // Verify deletion
    console.log('Step 4: Verifying graph is empty...');
    const statsAfter = await client.getGraphStats();
    console.log(`✓ Remaining nodes: ${statsAfter.nodes.total}`);
    console.log(`✓ Remaining relationships: ${statsAfter.relationships.total}\n`);

    console.log('============================================');
    console.log('✅ Graph cleared successfully!');
    console.log('============================================\n');

    console.log('Summary:');
    console.log(`  Deleted ${statsBefore.nodes.total} nodes`);
    console.log(`  Deleted ${statsBefore.relationships.total} relationships`);
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error clearing graph:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearGraph()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { clearGraph };
