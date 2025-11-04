import { neo4jClient } from '../neo4j-client.js';

async function analyzeDocumentTypes() {
  await neo4jClient.connect();

  console.log('Document counts by type:');
  const counts = await neo4jClient.queryRecords(`
    MATCH (n)
    RETURN labels(n)[0] AS type, count(n) AS count
    ORDER BY count DESC
  `);
  counts.forEach(c => console.log('  ' + c.type + ':', c.count));

  console.log('\nDocuments with embeddings:');
  const embedded = await neo4jClient.queryRecords(`
    MATCH (n)
    WHERE n.embedding IS NOT NULL
    RETURN labels(n)[0] AS type, count(n) AS count
    ORDER BY count DESC
  `);
  embedded.forEach(c => console.log('  ' + c.type + ':', c.count));

  console.log('\nSample Patterns:');
  const patterns = await neo4jClient.queryRecords(`
    MATCH (n:Pattern)
    RETURN n.id, n.title
    LIMIT 5
  `);
  if (patterns.length > 0) {
    patterns.forEach(p => console.log('  -', p.id, ':', p.title));
  } else {
    console.log('  (none)');
  }

  console.log('\nSample Gotchas:');
  const gotchas = await neo4jClient.queryRecords(`
    MATCH (n:Gotcha)
    RETURN n.id, n.title
    LIMIT 5
  `);
  if (gotchas.length > 0) {
    gotchas.forEach(g => console.log('  -', g.id, ':', g.title));
  } else {
    console.log('  (none)');
  }

  console.log('\nSample Sessions:');
  const sessions = await neo4jClient.queryRecords(`
    MATCH (n:Session)
    RETURN n.id, n.summary
    LIMIT 5
  `);
  if (sessions.length > 0) {
    sessions.forEach(s => console.log('  -', s.id, ':', s.summary?.substring(0, 60)));
  } else {
    console.log('  (none)');
  }

  console.log('\nSample ContextModules:');
  const modules = await neo4jClient.queryRecords(`
    MATCH (n:ContextModule)
    RETURN n.id, n.title
    LIMIT 5
  `);
  if (modules.length > 0) {
    modules.forEach(m => console.log('  -', m.id, ':', m.title));
  } else {
    console.log('  (none)');
  }

  await neo4jClient.close();
}

analyzeDocumentTypes();
