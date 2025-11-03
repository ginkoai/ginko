import { getDriver, runQuery, closeDriver } from '../api/v1/graph/_neo4j.js';

async function checkNeo4j() {
  try {
    const result = await runQuery<any>('MATCH (n) RETURN labels(n)[0] as label, count(n) as count');
    console.log('Nodes in database:');
    result.forEach(r => {
      console.log(`  ${r.label}: ${r.count}`);
    });
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await closeDriver();
  }
}

checkNeo4j();
