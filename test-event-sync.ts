/**
 * Test script to manually trigger event sync to graph
 * This will help us identify why events aren't syncing
 */

import { createGraphEvents } from './packages/cli/src/commands/graph/api-client.js';
import { GraphApiClient } from './packages/cli/src/commands/graph/api-client.js';

async function testSync() {
  console.log('Testing event sync to graph...\n');

  // Check what URL will be used
  const client = new GraphApiClient();
  console.log('API URL:', (client as any).apiUrl);
  console.log('GINKO_GRAPH_API_URL:', process.env.GINKO_GRAPH_API_URL);
  console.log('GINKO_API_URL:', process.env.GINKO_API_URL);
  console.log('GINKO_GRAPH_ID:', process.env.GINKO_GRAPH_ID);
  console.log('');

  // Create a test event
  const testEvent = {
    id: 'test_event_' + Date.now(),
    user_id: 'chris@watchhill.ai',
    organization_id: 'watchhill-ai',
    project_id: 'ginko',
    category: 'insight',
    description: 'Test event to debug sync issue',
    timestamp: new Date().toISOString(),
    impact: 'low',
    files: [],
    branch: 'main',
    tags: ['test'],
    shared: false,
    pressure: 0.5
  };

  console.log('Test event:', testEvent);
  console.log('\nAttempting to sync to graph via createGraphEvents()...\n');

  try {
    await createGraphEvents([testEvent]);
    console.log('✅ SUCCESS: Event synced to graph');
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    console.error('\nFull error:', error);

    // Check for specific error patterns
    if (error.message.includes('Not authenticated')) {
      console.log('\n🔍 Auth check failed - ~/.ginko/auth.json may be missing or invalid');
    } else if (error.message.includes('GINKO_GRAPH_ID')) {
      console.log('\n🔍 GINKO_GRAPH_ID not set in environment');
    } else if (error.message.includes('404') || error.message.includes('405')) {
      console.log('\n🔍 API endpoint not found or method not allowed');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n🔍 Authentication/authorization failed');
    }
  }

  process.exit(0);
}

testSync();
