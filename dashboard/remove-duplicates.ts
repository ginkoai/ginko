import { getSession } from './src/app/api/v1/graph/_neo4j.js';

async function removeDuplicates() {
  console.log('Removing duplicate events from Neo4j graph...\n');

  const session = getSession();

  try {
    // Use a write transaction to remove duplicates
    await session.executeWrite(async (tx) => {
      // Find all duplicate event IDs
      const duplicatesResult = await tx.run(`
        MATCH (e:Event)
        WHERE e.user_id = 'chris@watchhill.ai'
          AND e.timestamp >= datetime('2025-11-05T00:00:00Z')
          AND e.timestamp < datetime('2025-11-14T00:00:00Z')
        WITH e.id as eventId, collect(e) as events
        WHERE size(events) > 1
        RETURN eventId, events
      `);

      console.log(`Found ${duplicatesResult.records.length} duplicate event IDs\n`);

      let totalDeleted = 0;

      for (const record of duplicatesResult.records) {
        const eventId = record.get('eventId');
        const events = record.get('events');

        // Keep the first event, delete the rest
        const toDelete = events.slice(1);

        console.log(`Removing ${toDelete.length} duplicate(s) of ${eventId}...`);

        for (const event of toDelete) {
          await tx.run(`
            MATCH (e:Event)
            WHERE elementId(e) = $elementId
            DETACH DELETE e
          `, { elementId: event.elementId });

          totalDeleted++;
        }
      }

      console.log(`\n✅ Removed ${totalDeleted} duplicate events`);
    });

  } finally {
    await session.close();
  }

  process.exit(0);
}

removeDuplicates();
