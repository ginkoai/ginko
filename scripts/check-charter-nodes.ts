/**
 * Check Charter nodes in graph
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri, user, password } = config.neo4j;

async function main() {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    // Check Charter nodes
    const charterResult = await session.run(`
      MATCH (c:Charter)
      RETURN c.id as id, c.name as name, substring(c.purpose, 0, 100) as purpose
    `);

    console.log('Charter nodes:');
    charterResult.records.forEach(r => {
      console.log('  ID:', r.get('id'));
      console.log('  Name:', r.get('name'));
      console.log('  Purpose:', r.get('purpose') + '...');
      console.log('---');
    });

    // Check Epic nodes (created from charter sync)
    const epicResult = await session.run(`
      MATCH (e:Epic)
      RETURN e.id as id, e.name as name, substring(e.purpose, 0, 100) as purpose
    `);

    console.log('\nEpic nodes:');
    epicResult.records.forEach(r => {
      console.log('  ID:', r.get('id'));
      console.log('  Name:', r.get('name'));
      console.log('  Purpose:', r.get('purpose') + '...');
      console.log('---');
    });

  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
