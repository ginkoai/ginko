/**
 * Sync missing events from local JSONL to Neo4j graph
 * These events were marked as synced but never made it due to the transaction bug
 */

import fs from 'fs';
import { createGraphEvents } from './packages/cli/src/commands/graph/api-client.js';

async function syncMissingEvents() {
  console.log('Reading events from local JSONL...\n');

  const jsonlPath = '.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl';
  const lines = fs.readFileSync(jsonlPath, 'utf-8').trim().split('\n');

  const events = lines.map(line => JSON.parse(line));

  // Filter for events between Nov 4-13 that were marked as synced
  const startDate = new Date('2025-11-04T00:00:00Z');
  const endDate = new Date('2025-11-14T00:00:00Z');

  const missingEvents = events.filter(e => {
    const timestamp = new Date(e.timestamp);
    return timestamp >= startDate && timestamp < endDate && e.synced_to_graph === true;
  });

  console.log(`Found ${missingEvents.length} events marked as synced between Nov 4-13`);
  console.log('Date range:', missingEvents[0]?.timestamp, 'to', missingEvents[missingEvents.length - 1]?.timestamp);

  if (missingEvents.length === 0) {
    console.log('No events to sync');
    process.exit(0);
  }

  // Convert to API format
  const apiEvents = missingEvents.map(e => ({
    id: e.id,
    user_id: e.user_id,
    organization_id: e.organization_id,
    project_id: e.project_id,
    category: e.category,
    description: e.description,
    timestamp: e.timestamp,
    impact: e.impact,
    files: e.files || [],
    branch: e.branch || 'main',
    tags: e.tags || [],
    shared: e.shared || false,
    commit_hash: e.commit_hash,
    pressure: e.pressure
  }));

  console.log('\nSyncing events to Neo4j graph...');
  console.log('This will use the fixed API endpoint with proper transaction handling.\n');

  try {
    // Sync in batches of 10 to avoid overwhelming the API
    const batchSize = 10;
    let synced = 0;

    for (let i = 0; i < apiEvents.length; i += batchSize) {
      const batch = apiEvents.slice(i, i + batchSize);
      console.log(`Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(apiEvents.length / batchSize)} (${batch.length} events)...`);

      await createGraphEvents(batch);
      synced += batch.length;

      console.log(`  ✅ Synced ${synced}/${apiEvents.length} events`);

      // Small delay between batches
      if (i + batchSize < apiEvents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ Successfully synced ${synced} events to Neo4j graph!`);
  } catch (error: any) {
    console.error('\n❌ Error syncing events:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

syncMissingEvents();
