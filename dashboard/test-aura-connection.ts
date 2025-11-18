import neo4j from 'neo4j-driver';

const uri = 'neo4j+s://7ae3e759.databases.neo4j.io';
const user = 'neo4j';
const password = 'u1CYINuzLrG0NcQ_4kLUCJj3TuJkPSdaMFENxNMIyW8';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
  maxConnectionPoolSize: 10,
  connectionAcquisitionTimeout: 10000,
});

async function test() {
  try {
    console.log('Testing connectivity to Neo4j Aura...');
    await driver.verifyConnectivity();
    console.log('✅ Successfully connected to Neo4j Aura');

    const session = driver.session();
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Query successful:', result.records[0].get('test'));
    await session.close();
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await driver.close();
  }
}

test();
