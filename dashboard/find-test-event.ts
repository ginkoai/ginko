import { runQuery } from './src/app/api/v1/graph/_neo4j.js';

async function search() {
  const eventId = process.argv[2] || 'test_event_1763046234411';

  const result = await runQuery(`MATCH (e:Event {id: $id}) RETURN e`, { id: eventId });
  console.log('Searching for event:', eventId);
  console.log('Found:', result.length, 'events');

  if (result.length > 0) {
    console.log('\n✅ Event exists in graph!');
    console.log(JSON.stringify(result[0], null, 2));
  } else {
    console.log('\n❌ Event NOT found in graph');
  }

  process.exit(0);
}

search();
