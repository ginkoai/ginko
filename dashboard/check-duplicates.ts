import { runQuery } from './src/app/api/v1/graph/_neo4j.js';

async function checkDuplicates() {
  console.log('Checking for duplicate events...\n');

  const result = await runQuery(`
    MATCH (e:Event)
    WHERE e.user_id = 'chris@watchhill.ai'
      AND e.timestamp >= datetime('2025-11-05T00:00:00Z')
      AND e.timestamp < datetime('2025-11-14T00:00:00Z')
    WITH e.id as eventId, count(*) as count
    WHERE count > 1
    RETURN eventId, count
    ORDER BY count DESC
  `);

  if (result.length === 0) {
    console.log('✅ No duplicates found');
  } else {
    console.log(`⚠️  Found ${result.length} duplicate event IDs:\n`);
    for (const row of result) {
      console.log(`  ${row.eventId}: ${row.count} copies`);
    }
  }

  process.exit(0);
}

checkDuplicates();
