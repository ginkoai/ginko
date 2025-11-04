#!/usr/bin/env node
/**
 * Test Neo4j connection to Hetzner VPS
 */

const neo4j = require('neo4j-driver');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing Neo4j connection to Hetzner VPS...');
  console.log(`   URI: ${process.env.NEO4J_URI}`);
  console.log(`   User: ${process.env.NEO4J_USER}`);

  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
  );

  try {
    // Test connection
    const session = driver.session();

    console.log('\n✅ Connection established!');

    // Test query
    const result = await session.run('RETURN "Connection successful!" AS message, datetime() AS timestamp');
    const record = result.records[0];

    console.log('\n📊 Test Query Result:');
    console.log(`   Message: ${record.get('message')}`);
    console.log(`   Timestamp: ${record.get('timestamp')}`);

    // Get server info
    const serverInfo = await driver.getServerInfo();
    console.log('\n🖥️  Server Information:');
    console.log(`   Address: ${serverInfo.address}`);
    console.log(`   Version: ${serverInfo.agent}`);

    // Check database status
    const statusResult = await session.run(`
      CALL dbms.components() YIELD name, versions, edition
      RETURN name, versions[0] AS version, edition
    `);

    console.log('\n💾 Database Status:');
    statusResult.records.forEach(record => {
      console.log(`   ${record.get('name')}: ${record.get('version')} (${record.get('edition')})`);
    });

    await session.close();
    console.log('\n✨ All tests passed! Neo4j on Hetzner is ready.');

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

testConnection();
