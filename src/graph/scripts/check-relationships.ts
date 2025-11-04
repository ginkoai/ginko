import { neo4jClient } from '../neo4j-client.js';

async function checkRelationships() {
  await neo4jClient.connect();

  console.log('Relationship types in database:');
  const types = await neo4jClient.queryRecords('CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType');
  types.forEach(t => console.log('  -', t.relationshipType));

  console.log('\nRelationship counts:');
  const counts = await neo4jClient.queryRecords('MATCH ()-[r]->() RETURN type(r) as type, count(r) as count ORDER BY count DESC');
  counts.forEach(c => console.log('  ', c.type + ':', c.count));

  await neo4jClient.close();
}

checkRelationships();
