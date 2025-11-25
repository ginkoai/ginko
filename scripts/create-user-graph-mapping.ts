/**
 * Create user-to-graph mapping
 *
 * Creates a Graph node that maps a user to a graph ID for access control.
 *
 * Usage: npx tsx scripts/create-user-graph-mapping.ts [userId]
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri: NEO4J_URI, user: NEO4J_USER, password: NEO4J_PASSWORD } = config.neo4j;
const GRAPH_ID = config.graph.id;
const USER_ID = process.argv[2] || 'user_Z2tfODgx';

async function createGraphNode() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  try {
    const session = driver.session();
    console.log(`Creating Graph node: ${GRAPH_ID} for user: ${USER_ID}`);
    const result = await session.run(
      `MERGE (g:Graph {graphId: $graphId, userId: $userId})
       SET g.namespace = '/chris/ginko',
           g.visibility = 'private',
           g.createdAt = datetime(),
           g.updatedAt = datetime()
       RETURN g`,
      { graphId: GRAPH_ID, userId: USER_ID }
    );
    console.log('✓ Graph node created!', result.records[0].get('g').properties);
    await session.close();
  } finally {
    await driver.close();
  }
}

createGraphNode().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
