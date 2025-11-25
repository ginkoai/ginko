/**
 * Verify sprint nodes and relationships in Neo4j
 *
 * Usage: npx tsx scripts/verify-sprint-graph.ts
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri: NEO4J_URI, user: NEO4J_USER, password: NEO4J_PASSWORD } = config.neo4j;
const GRAPH_ID = config.graph.id;

async function verifySprintGraph() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    const session = driver.session();

    console.log('Verifying sprint graph in Neo4j...\n');

    // Check Sprint node
    console.log('1. Sprint Node:');
    const sprintResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)
       RETURN s.id as id, s.name as name, s.goal as goal
       ORDER BY s.createdAt DESC
       LIMIT 1`,
      { graphId: GRAPH_ID }
    );

    if (sprintResult.records.length === 0) {
      throw new Error('Sprint node not found!');
    }

    const sprint = sprintResult.records[0].toObject();
    console.log(`   ✓ Sprint: ${sprint.name}`);
    console.log(`   ID: ${sprint.id}`);
    console.log(`   Goal: ${sprint.goal}\n`);

    // Check Task nodes
    console.log('2. Task Nodes:');
    const taskResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)-[:CONTAINS]->(t:Task)
       RETURN t.id as id, t.title as title, t.status as status, t.priority as priority,
              t.files as files, t.relatedADRs as relatedADRs
       ORDER BY t.id`,
      { graphId: GRAPH_ID }
    );

    console.log(`   ✓ ${taskResult.records.length} tasks found:\n`);
    taskResult.records.forEach((record, i) => {
      const task = record.toObject();
      console.log(`   ${i + 1}. ${task.title}`);
      console.log(`      Priority: ${task.priority}`);
      console.log(`      Status: ${task.status}`);
      console.log(`      Files: ${task.files.length}`);
      if (task.files.length > 0) {
        task.files.slice(0, 3).forEach((f: string) => console.log(`        - ${f}`));
        if (task.files.length > 3) console.log(`        ... and ${task.files.length - 3} more`);
      }
      if (task.relatedADRs.length > 0) {
        console.log(`      ADRs: ${task.relatedADRs.join(', ')}`);
      }
      console.log();
    });

    // Check NEXT_TASK relationship
    console.log('3. NEXT_TASK Relationship:');
    const nextTaskResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)-[:NEXT_TASK]->(t:Task)
       RETURN t.id as id, t.title as title`,
      { graphId: GRAPH_ID }
    );

    if (nextTaskResult.records.length > 0) {
      const nextTask = nextTaskResult.records[0].toObject();
      console.log(`   ✓ Next task identified: ${nextTask.title}`);
      console.log(`     (First incomplete task in sprint)\n`);
    } else {
      console.log('   ℹ No NEXT_TASK relationship found\n');
    }

    // Check Relationships summary
    console.log('4. Relationships:');
    const relResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)
       MATCH (s)-[r]->(t:Task)
       RETURN type(r) as type, count(r) as count
       ORDER BY type`,
      { graphId: GRAPH_ID }
    );

    console.log('   ✓ Relationship counts:');
    relResult.records.forEach(record => {
      console.log(`     ${record.get('type')}: ${record.get('count')}`);
    });
    console.log();

    await session.close();
  } catch (error) {
    console.error('Error verifying graph:', error);
    throw error;
  } finally {
    await driver.close();
  }
}

verifySprintGraph()
  .then(() => {
    console.log('✓ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Verification failed:', error.message);
    process.exit(1);
  });
