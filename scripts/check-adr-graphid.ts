/**
 * Check ADR graphId property
 *
 * Usage: npx tsx scripts/check-adr-graphid.ts
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri: NEO4J_URI, user: NEO4J_USER, password: NEO4J_PASSWORD } = config.neo4j;

async function main() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();

  try {
    // Check ADR graphId
    const result = await session.run(`
      MATCH (a:ADR)
      RETURN a.id as id, a.title as title, a.graphId as graphId
      LIMIT 5
    `);

    console.log('Sample ADRs:');
    result.records.forEach(r => {
      console.log(`  ${r.get('id')}: graphId=${r.get('graphId')}`);
    });

    // Count by graphId
    const countResult = await session.run(`
      MATCH (a:ADR)
      RETURN a.graphId as graphId, count(*) as cnt
    `);

    console.log('\nADR counts by graphId:');
    countResult.records.forEach(r => {
      console.log(`  ${r.get('graphId') || '(null)'}: ${r.get('cnt').toNumber()}`);
    });

    // Check Sprint graphId
    const sprintResult = await session.run(`
      MATCH (s:Sprint)
      RETURN s.graphId as graphId, count(*) as cnt
    `);

    console.log('\nSprint counts by graphId:');
    sprintResult.records.forEach(r => {
      console.log(`  ${r.get('graphId') || '(null)'}: ${r.get('cnt').toNumber()}`);
    });

  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
