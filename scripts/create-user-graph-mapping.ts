import neo4j from 'neo4j-driver';

const NEO4J_URI = 'neo4j+s://b475ee2d.databases.neo4j.io';
const NEO4J_USER = 'neo4j';
const NEO4J_PASSWORD = 'znBGJwInpD-1QYA8tfx_fRAFX2ZqAMtm4FINzALoXog';
const GRAPH_ID = 'gin_1762125961056_dg4bsd';
const USER_ID = 'user_Z2tfODgx';

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
