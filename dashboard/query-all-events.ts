import { runQuery } from './src/app/api/v1/graph/_neo4j.js';

async function getLastEvents() {
  try {
    console.log('Querying ALL recent events...\n');

    const result = await runQuery(`
      MATCH (e:Event)
      RETURN e.id, e.timestamp, e.category, e.description, e.user_id, e.organization_id, e.project_id
      ORDER BY e.timestamp DESC
      LIMIT 5
    `);

    console.log(`Last ${result.length} events:\n`);

    for (let i = 0; i < result.length; i++) {
      const event = result[i];
      console.log(`${i + 1}. ID: ${event['e.id']}`);
      console.log(`   User: ${event['e.user_id']}`);
      console.log(`   Org: ${event['e.organization_id']}`);
      console.log(`   Project: ${event['e.project_id']}`);
      console.log(`   Category: ${event['e.category']}`);
      console.log(`   Description: ${event['e.description']?.substring(0, 80)}...`);
      console.log('');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

getLastEvents();
