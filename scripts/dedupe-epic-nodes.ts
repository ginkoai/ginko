/**
 * Deduplicate Epic nodes - keep only the most recent one
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri, user, password } = config.neo4j;
const GRAPH_ID = config.graph.id;

async function main() {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    // Find duplicate Epic nodes
    const result = await session.run(`
      MATCH (e:Epic)
      WHERE e.graphId = $graphId
      RETURN e.id as id, e.name as name
      ORDER BY e.id DESC
    `, { graphId: GRAPH_ID });

    console.log(`Found ${result.records.length} Epic nodes for graphId ${GRAPH_ID}:`);
    result.records.forEach(r => {
      console.log(`  - ${r.get('id')}: ${r.get('name')}`);
    });

    if (result.records.length > 1) {
      // Keep the first (most recent), delete the rest
      const keepId = result.records[0].get('id');
      const deleteIds = result.records.slice(1).map(r => r.get('id'));

      console.log(`\nKeeping: ${keepId}`);
      console.log(`Deleting: ${deleteIds.join(', ')}`);

      // Delete older epics and their relationships
      for (const deleteId of deleteIds) {
        await session.run(`
          MATCH (e:Epic {id: $id})
          DETACH DELETE e
        `, { id: deleteId });
        console.log(`  Deleted: ${deleteId}`);
      }

      console.log('\n✓ Deduplication complete');
    } else {
      console.log('\nNo duplicates found');
    }

  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
