import { runQuery } from './src/app/api/v1/graph/_neo4j.js';

async function verifySync() {
  console.log('Verifying synced events in Neo4j graph...\n');

  // Query for events in Nov 5-10 range (chris@watchhill.ai)
  const result = await runQuery(`
    MATCH (e:Event)
    WHERE e.user_id = 'chris@watchhill.ai'
      AND e.timestamp >= datetime('2025-11-05T00:00:00Z')
      AND e.timestamp < datetime('2025-11-14T00:00:00Z')
    RETURN e.id, e.timestamp, e.category, e.description
    ORDER BY e.timestamp ASC
  `);

  console.log(`Found ${result.length} events for chris@watchhill.ai between Nov 5-13\n`);

  if (result.length === 0) {
    console.log('❌ No events found in graph!');
    process.exit(1);
  }

  console.log('Sample of synced events:');
  for (let i = 0; i < Math.min(5, result.length); i++) {
    const event = result[i];
    console.log(`${i + 1}. ${event['e.timestamp']} - ${event['e.id']}`);
    console.log(`   Category: ${event['e.category']}`);
    console.log(`   Description: ${event['e.description']?.substring(0, 80)}...`);
    console.log('');
  }

  if (result.length > 5) {
    console.log(`... and ${result.length - 5} more events`);
  }

  console.log(`\n✅ All ${result.length} events successfully synced to Neo4j graph!`);
  process.exit(0);
}

verifySync();
