/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-27
 * @tags: [neo4j, migration, setup, cli]
 * @related: [neo4j-client.ts, schema/001-initial-schema.cypher]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { neo4jClient } from '../neo4j-client';

/**
 * Setup Neo4j schema for Ginko knowledge graph
 *
 * Usage:
 *   npm run graph:setup
 *   npx tsx src/graph/scripts/setup-schema.ts
 */
async function setupSchema() {
  try {
    console.log('🚀 Setting up Ginko knowledge graph schema...\n');

    // Connect to Neo4j
    await neo4jClient.connect();

    // Run schema migrations
    await neo4jClient.runMigration('001-initial-schema.cypher');
    await neo4jClient.runMigration('002-pattern-gotcha-nodes.cypher');
    await neo4jClient.runMigration('003-session-codefile-nodes.cypher');
    await neo4jClient.runMigration('004-contextmodule-nodes.cypher');
    await neo4jClient.runMigration('005-semantic-relationships.cypher');
    await neo4jClient.runMigration('006-temporal-relationships.cypher');
    await neo4jClient.runMigration('007-vector-indexes.cypher');
    await neo4jClient.runMigration('008-sprint-task-indexes.cypher');
    await neo4jClient.runMigration('009-agent-schema.cypher');
    await neo4jClient.runMigration('010-task-deps.cypher');
    await neo4jClient.runMigration('011-performance-indexes.cypher');
    await neo4jClient.runMigration('012-team-membership.cypher');
    await neo4jClient.runMigration('013-billing-seats.cypher');
    await neo4jClient.runMigration('014-voyage-vector-indexes.cypher');

    // Verify schema
    await neo4jClient.verifySchema();

    // Show current database stats
    console.log('\nDatabase statistics:');
    const stats = await neo4jClient.getStats();
    if (stats.length === 0) {
      console.log('  (empty database)');
    } else {
      stats.forEach((s: any) => {
        console.log(`  ${s.labels.join(':')}: ${s.count} nodes`);
      });
    }

    console.log('\n✅ Schema setup complete!');
    console.log('\nNext steps:');
    console.log('  1. Load sample data: npm run graph:load-sample');
    console.log('  2. Test context query: npm run graph:test-query');

  } catch (error) {
    console.error('\n❌ Schema setup failed:', error);
    process.exit(1);
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (require.main === module) {
  setupSchema();
}

export { setupSchema };
