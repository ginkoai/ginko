import neo4j from 'neo4j-driver';

const uri = 'neo4j+s://b475ee2d.databases.neo4j.io';
const user = 'neo4j';
const password = 'znBGJwInpD-1QYA8tfx_fRAFX2ZqAMtm4FINzALoXog';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
  maxConnectionPoolSize: 10,
  connectionAcquisitionTimeout: 10000,
});

async function test() {
  try {
    console.log('Testing connectivity to new Neo4j Aura instance...');
    await driver.verifyConnectivity();
    console.log('✅ Successfully connected to Neo4j Aura');

    const session = driver.session();

    // Test query
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Query successful:', result.records[0].get('test'));

    // Check database info
    const dbInfo = await session.run('CALL dbms.components() YIELD name, versions, edition');
    console.log('✅ Database info:', dbInfo.records[0].toObject());

    await session.close();
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

test();
