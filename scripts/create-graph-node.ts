/**
 * Create Graph node for user/token access to enable charter sync
 */

import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI || 'neo4j+s://b475ee2d.databases.neo4j.io';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'znBGJwInpD-1QYA8tfx_fRAFX2ZqAMtm4FINzALoXog';

const GRAPH_ID = 'gin_1762125961056_dg4bsd';
const USER_ID = 'user_dGVzdF90'; // Derived from token: test_token_12345

async function createGraphNode() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    const session = driver.session();

    console.log('Creating Graph node...');
    console.log(`  graphId: ${GRAPH_ID}`);
    console.log(`  userId: ${USER_ID}`);

    const result = await session.run(
      `
      MERGE (g:Graph {
        graphId: $graphId,
        userId: $userId
      })
      SET g.namespace = $namespace,
          g.visibility = $visibility,
          g.createdAt = datetime(),
          g.updatedAt = datetime()
      RETURN g
      `,
      {
        graphId: GRAPH_ID,
        userId: USER_ID,
        namespace: '/chris/ginko',
        visibility: 'private',
      }
    );

    if (result.records.length > 0) {
      console.log('✓ Graph node created successfully!');
      const graphNode = result.records[0].get('g').properties;
      console.log('Graph properties:', JSON.stringify(graphNode, null, 2));
    }

    await session.close();
  } catch (error) {
    console.error('Error creating graph node:', error);
    throw error;
  } finally {
    await driver.close();
  }
}

createGraphNode()
  .then(() => {
    console.log('\n✓ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Setup failed:', error.message);
    process.exit(1);
  });
