/**
 * Test direct Neo4j write from dashboard codebase
 * This will help us determine if the issue is with Neo4j connection or the API code
 */

import { runQuery, verifyConnection } from './src/app/api/v1/graph/_neo4j.js';

async function testDirectWrite() {
  console.log('Testing direct Neo4j write...\n');

  try {
    // Test connection
    console.log('1. Verifying connection...');
    const isConnected = await verifyConnection();
    console.log('   Connection status:', isConnected);

    if (!isConnected) {
      console.error('   ❌ Connection failed');
      process.exit(1);
    }

    // Test simple write
    console.log('\n2. Creating test event...');
    const testEventId = 'test_direct_' + Date.now();

    const result = await runQuery(`
      CREATE (e:Event {
        id: $id,
        user_id: $userId,
        organization_id: $orgId,
        project_id: $projectId,
        timestamp: datetime($timestamp),
        category: $category,
        description: $description,
        files: [],
        impact: 'low',
        branch: 'main',
        tags: ['test'],
        shared: false
      })
      RETURN e.id as id, e.timestamp as timestamp
    `, {
      id: testEventId,
      userId: 'chris@watchhill.ai',
      orgId: 'watchhill-ai',
      projectId: 'ginko',
      timestamp: new Date().toISOString(),
      category: 'insight',
      description: 'Direct Neo4j write test'
    });

    console.log('   Query result:', result);

    if (result.length > 0) {
      console.log('   ✅ Event created:', result[0]);
    } else {
      console.log('   ❌ No result returned from CREATE query');
    }

    // Verify it exists
    console.log('\n3. Verifying event was written...');
    const verify = await runQuery(`
      MATCH (e:Event {id: $id})
      RETURN e.id, e.timestamp, e.description
    `, { id: testEventId });

    if (verify.length > 0) {
      console.log('   ✅ Event found in graph:', verify[0]);
    } else {
      console.log('   ❌ Event NOT found in graph after creation!');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

testDirectWrite();
