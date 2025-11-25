/**
 * Fix graphId on existing nodes
 *
 * Updates all ADRs, Sprints, Tasks, Events, etc. to have the correct graphId
 * so the API can filter them properly.
 *
 * Usage: npx tsx scripts/fix-graph-ids.ts
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri: NEO4J_URI, user: NEO4J_USER, password: NEO4J_PASSWORD } = config.neo4j;
const GRAPH_ID = config.graph.id;

interface UpdateResult {
  label: string;
  updated: number;
}

async function main() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();

  console.log('🔄 Fixing graphId on existing nodes');
  console.log(`Target graphId: ${GRAPH_ID}`);
  console.log('='.repeat(50));

  const labels = ['ADR', 'Sprint', 'Task', 'Event', 'Charter', 'Epic', 'Problem', 'Goal', 'User', 'Pattern', 'Gotcha', 'File', 'PRD'];
  const results: UpdateResult[] = [];

  try {
    for (const label of labels) {
      const result = await session.run(`
        MATCH (n:${label})
        WHERE n.graphId IS NULL OR n.graphId <> $graphId
        SET n.graphId = $graphId
        RETURN count(n) as updated
      `, { graphId: GRAPH_ID });

      const updated = result.records[0].get('updated').toNumber();
      results.push({ label, updated });

      if (updated > 0) {
        console.log(`✓ ${label}: ${updated} nodes updated`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Summary:');

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    console.log(`Total nodes updated: ${totalUpdated}`);

    // Verify
    console.log('\nVerification - counts by graphId:');
    for (const label of labels) {
      const countResult = await session.run(`
        MATCH (n:${label})
        WHERE n.graphId = $graphId
        RETURN count(n) as cnt
      `, { graphId: GRAPH_ID });

      const count = countResult.records[0].get('cnt').toNumber();
      if (count > 0) {
        console.log(`  ${label}: ${count}`);
      }
    }

  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
