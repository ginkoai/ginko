/**
 * Verify TASK-3 File nodes and MODIFIES relationships in Neo4j
 *
 * Usage: npx tsx scripts/verify-task-3-graph.ts
 */

import neo4j from 'neo4j-driver';
import { config, validateConfig } from './lib/config';

validateConfig();

const { uri: NEO4J_URI, user: NEO4J_USER, password: NEO4J_PASSWORD } = config.neo4j;
const GRAPH_ID = config.graph.id;

async function verifyTask3() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    const session = driver.session();

    console.log('🔍 Verifying TASK-3: File Nodes and MODIFIES Relationships\n');

    // Check File nodes
    console.log('1. File Nodes:');
    const fileResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(f:File)
       RETURN f.id as id, f.path as path, f.status as status
       ORDER BY f.path
       LIMIT 10`,
      { graphId: GRAPH_ID }
    );

    if (fileResult.records.length === 0) {
      console.log('   ⚠️  No File nodes found!');
      console.log('   This means TASK-3 code hasn\'t been executed yet.');
      console.log('   Solution: Re-sync the sprint to create File nodes.\n');
    } else {
      console.log(`   ✓ ${fileResult.records.length} File nodes found:\n`);
      fileResult.records.forEach((record, i) => {
        const file = record.toObject();
        console.log(`   ${i + 1}. ${file.path}`);
        console.log(`      ID: ${file.id}`);
        console.log(`      Status: ${file.status}\n`);
      });
    }

    // Check MODIFIES relationships
    console.log('2. MODIFIES Relationships:');
    const modifiesResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(t:Task)
       MATCH (t)-[r:MODIFIES]->(f:File)
       RETURN t.id as taskId, t.title as taskTitle, collect(f.path) as files
       ORDER BY t.id`,
      { graphId: GRAPH_ID }
    );

    if (modifiesResult.records.length === 0) {
      console.log('   ⚠️  No MODIFIES relationships found!');
      console.log('   This means TASK-3 code hasn\'t created the relationships yet.');
      console.log('   Solution: Re-sync the sprint to create MODIFIES relationships.\n');
    } else {
      console.log(`   ✓ ${modifiesResult.records.length} tasks with MODIFIES relationships:\n`);
      modifiesResult.records.forEach((record, i) => {
        const task = record.toObject();
        console.log(`   ${i + 1}. ${task.taskTitle}`);
        console.log(`      Task ID: ${task.taskId}`);
        console.log(`      Files: ${task.files.length}`);
        task.files.slice(0, 3).forEach((f: string) => console.log(`        - ${f}`));
        if (task.files.length > 3) {
          console.log(`        ... and ${task.files.length - 3} more`);
        }
        console.log();
      });
    }

    // Summary
    console.log('3. Summary:');
    const summaryResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})
       OPTIONAL MATCH (g)-[:CONTAINS]->(f:File)
       OPTIONAL MATCH (g)-[:CONTAINS]->(t:Task)-[r:MODIFIES]->(:File)
       RETURN count(DISTINCT f) as fileCount, count(DISTINCT r) as modifiesCount`,
      { graphId: GRAPH_ID }
    );

    const summary = summaryResult.records[0].toObject();
    console.log(`   File nodes: ${summary.fileCount}`);
    console.log(`   MODIFIES relationships: ${summary.modifiesCount}\n`);

    if (summary.fileCount === 0 || summary.modifiesCount === 0) {
      console.log('❌ TASK-3 NOT YET IMPLEMENTED IN GRAPH');
      console.log('\nNext step: Re-sync sprint with new code');
      console.log('  Command: curl -X POST https://app.ginkoai.com/api/v1/sprint/sync \\');
      console.log('             -H "Authorization: Bearer $TOKEN" \\');
      console.log('             -H "Content-Type: application/json" \\');
      console.log('             -d \'{"graphId":"gin_1762125961056_dg4bsd","sprintContent":"..."}\'');
    } else {
      console.log('✅ TASK-3 VERIFIED - File nodes and MODIFIES relationships exist!');
    }

    await session.close();
  } catch (error) {
    console.error('Error verifying TASK-3:', error);
    throw error;
  } finally {
    await driver.close();
  }
}

verifyTask3()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Verification failed:', error.message);
    process.exit(1);
  });
