/**
 * Check Neo4j Instance State
 *
 * Checks the Neo4j instance to understand where the data resides.
 *
 * Usage: npx tsx scripts/check-neo4j-state.ts
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri: NEO4J_URI, user: NEO4J_USER, password: NEO4J_PASSWORD } = config.neo4j;

async function checkInstance(name: string, uri: string, user: string, password: string) {
  console.log(`\n📊 Checking ${name}: ${uri}`);
  console.log('='.repeat(60));

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  try {
    const session = driver.session();

    // Get all node labels and counts
    const labelsResult = await session.run(`
      CALL db.labels() YIELD label
      CALL {
        WITH label
        MATCH (n) WHERE label IN labels(n)
        RETURN count(n) as cnt
      }
      RETURN label, cnt
      ORDER BY cnt DESC
    `);

    console.log('\nNode Labels:');
    labelsResult.records.forEach(record => {
      const label = record.get('label');
      const count = record.get('cnt').toNumber();
      console.log(`  ${label}: ${count}`);
    });

    // Check Graph nodes specifically
    const graphsResult = await session.run(`
      MATCH (g:Graph)
      RETURN g.graphId as graphId, g.userId as userId, g.namespace as namespace
    `);

    console.log('\nGraph Nodes:');
    if (graphsResult.records.length === 0) {
      console.log('  (none)');
    } else {
      graphsResult.records.forEach(record => {
        console.log(`  - graphId: ${record.get('graphId')}`);
        console.log(`    userId: ${record.get('userId')}`);
        console.log(`    namespace: ${record.get('namespace')}`);
      });
    }

    // Check Project nodes
    const projectsResult = await session.run(`
      MATCH (p:Project)
      RETURN p.projectName as name, p.graphId as graphId
    `);

    console.log('\nProject Nodes:');
    if (projectsResult.records.length === 0) {
      console.log('  (none)');
    } else {
      projectsResult.records.forEach(record => {
        console.log(`  - ${record.get('name')} (graphId: ${record.get('graphId')})`);
      });
    }

    // Get total relationship count
    const relsResult = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) as type, count(r) as cnt
      ORDER BY cnt DESC
      LIMIT 10
    `);

    console.log('\nRelationship Types (top 10):');
    relsResult.records.forEach(record => {
      console.log(`  ${record.get('type')}: ${record.get('cnt').toNumber()}`);
    });

    await session.close();
    console.log('\n✓ Connection successful');

  } catch (error) {
    console.log(`\n✗ Connection failed: ${error instanceof Error ? error.message : error}`);
  } finally {
    await driver.close();
  }
}

async function main() {
  console.log('🔍 Neo4j Instance State Check');
  console.log('='.repeat(60));

  await checkInstance('Neo4j Instance', NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD);
}

main().catch(console.error);
