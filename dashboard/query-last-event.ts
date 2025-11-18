/**
 * Query for the last event in the Neo4j graph
 * Uses the dashboard's Neo4j connection (via app.ginkoai.com environment)
 */

import { runQuery } from './src/app/api/v1/graph/_neo4j.js';

async function getLastEvent() {
  try {
    console.log('Querying Neo4j for last event...\n');

    const result = await runQuery(`
      MATCH (e:Event)
      WHERE e.organization_id = 'watchhill-ai'
        AND e.project_id = 'ginko'
      RETURN e.id, e.timestamp, e.category, e.description, e.synced_to_graph
      ORDER BY e.timestamp DESC
      LIMIT 3
    `);

    if (result.length === 0) {
      console.log('❌ No events found in Neo4j graph');
      console.log('   (Events may not be syncing to the graph)');
      return;
    }

    console.log(`✅ Last ${result.length} events in Neo4j graph:\n`);

    for (let i = 0; i < result.length; i++) {
      const event = result[i];
      const timestamp = event['e.timestamp'];
      const now = new Date();
      const eventDate = new Date(timestamp);
      const minutesAgo = Math.floor((now.getTime() - eventDate.getTime()) / 1000 / 60);

      console.log(`${i + 1}. ID: ${event['e.id']}`);
      console.log(`   Timestamp: ${timestamp} (${minutesAgo} min ago)`);
      console.log(`   Category: ${event['e.category']}`);
      console.log(`   Description: ${event['e.description']?.substring(0, 100)}...`);
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ Error querying Neo4j graph:', error.message);
    console.error('   Check NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env');
  }
  process.exit(0);
}

getLastEvent();
