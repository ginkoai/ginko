/**
 * @fileType: script
 * @status: current
 * @updated: 2025-11-24
 * @tags: [database, indexes, task-3, epic-002]
 * @priority: high
 * @complexity: low
 */

/**
 * TASK-3: Apply Sprint/Task indexes to Neo4j AuraDB
 *
 * Usage:
 *   NEO4J_URI=neo4j+s://xxx NEO4J_USER=neo4j NEO4J_PASSWORD=xxx npx tsx scripts/apply-task-indexes.ts
 */

import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI || 'neo4j+s://7ae3e759.databases.neo4j.io';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'u1CYINuzLrG0NcQ_4kLUCJj3TuJkPSdaMFENxNMIyW8';

const INDEXES_TO_CREATE = [
  // Constraints
  'CREATE CONSTRAINT sprint_id_unique IF NOT EXISTS FOR (s:Sprint) REQUIRE s.id IS UNIQUE',
  'CREATE CONSTRAINT task_id_unique IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE',
  'CREATE CONSTRAINT file_id_unique IF NOT EXISTS FOR (f:File) REQUIRE f.id IS UNIQUE',
  // Performance indexes
  'CREATE INDEX task_id_idx IF NOT EXISTS FOR (t:Task) ON (t.id)',
  'CREATE INDEX task_status_idx IF NOT EXISTS FOR (t:Task) ON (t.status)',
  'CREATE INDEX sprint_id_idx IF NOT EXISTS FOR (s:Sprint) ON (s.id)',
  'CREATE INDEX file_path_idx IF NOT EXISTS FOR (f:File) ON (f.path)',
];

async function applyIndexes(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TASK-3: Applying Sprint/Task Indexes                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();

  try {
    console.log(`Connecting to: ${NEO4J_URI}\n`);

    for (const query of INDEXES_TO_CREATE) {
      const shortName = query.match(/(?:CONSTRAINT|INDEX)\s+(\w+)/)?.[1] || 'unknown';
      process.stdout.write(`  Creating ${shortName}... `);

      try {
        await session.run(query);
        console.log('✓');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (errorMsg.includes('already exists')) {
          console.log('✓ (already exists)');
        } else {
          console.log(`✗ ${errorMsg}`);
        }
      }
    }

    console.log('\n📊 Current indexes:');
    const result = await session.run('SHOW INDEXES YIELD name, type, labelsOrTypes, properties, state');
    const indexes = result.records.map(r => ({
      name: r.get('name'),
      type: r.get('type'),
      labels: r.get('labelsOrTypes'),
      properties: r.get('properties'),
      state: r.get('state'),
    }));

    console.log('\n┌────────────────────────────┬─────────────┬────────────────┬────────────┐');
    console.log('│ Name                       │ Type        │ Labels         │ State      │');
    console.log('├────────────────────────────┼─────────────┼────────────────┼────────────┤');

    for (const idx of indexes) {
      const name = String(idx.name).padEnd(26);
      const type = String(idx.type).padEnd(11);
      const labels = (idx.labels?.join(',') || '').padEnd(14);
      const state = String(idx.state).padEnd(10);
      console.log(`│ ${name} │ ${type} │ ${labels} │ ${state} │`);
    }

    console.log('└────────────────────────────┴─────────────┴────────────────┴────────────┘');
    console.log(`\nTotal indexes: ${indexes.length}`);

    // Check for Task-specific indexes
    const taskIndexes = indexes.filter(i => i.labels?.includes('Task'));
    console.log(`Task indexes: ${taskIndexes.length}`);

    if (taskIndexes.length >= 2) {
      console.log('\n✅ Task indexes applied successfully');
    } else {
      console.log('\n⚠️  Some Task indexes may be missing');
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

applyIndexes().catch(console.error);
