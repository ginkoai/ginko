/**
 * Create Project node for the graph
 *
 * Usage: npx tsx scripts/create-project-node.ts
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri: NEO4J_URI, user: NEO4J_USER, password: NEO4J_PASSWORD } = config.neo4j;
const GRAPH_ID = config.graph.id;

async function main() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();

  try {
    // Check existing
    const result = await session.run(
      'MATCH (p:Project) WHERE p.graphId = $graphId RETURN p',
      { graphId: GRAPH_ID }
    );

    console.log(`Project nodes for ${GRAPH_ID}:`, result.records.length);

    if (result.records.length === 0) {
      console.log('Creating Project node...');
      const createResult = await session.run(
        `CREATE (p:Project {
          graphId: $graphId,
          projectName: 'ginko',
          namespace: 'chris/ginko',
          visibility: 'private',
          createdAt: datetime(),
          updatedAt: datetime()
        }) RETURN p`,
        { graphId: GRAPH_ID }
      );
      console.log('Created Project node:', createResult.records[0].get('p').properties);
    } else {
      console.log('Project node already exists:', result.records[0].get('p').properties);
    }

  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
