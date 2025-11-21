/**
 * Verify charter nodes and relationships in Neo4j
 */

import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI || 'neo4j+s://b475ee2d.databases.neo4j.io';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'znBGJwInpD-1QYA8tfx_fRAFX2ZqAMtm4FINzALoXog';
const GRAPH_ID = 'gin_1762125961056_dg4bsd';
const USER_ID = 'user_dGVzdF90';

async function verifyCharterGraph() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    const session = driver.session();

    console.log('Verifying charter graph in Neo4j...\n');

    // Check Graph node
    console.log('1. Graph Node:');
    const graphResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId, userId: $userId})
       RETURN g`,
      { graphId: GRAPH_ID, userId: USER_ID }
    );

    if (graphResult.records.length === 0) {
      throw new Error('Graph node not found!');
    }
    console.log('   ✓ Graph node exists\n');

    // Check Epic node
    console.log('2. Epic Node:');
    const epicResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(e:Epic)
       RETURN e.id as id, e.name as name, e.vision as vision`,
      { graphId: GRAPH_ID }
    );

    if (epicResult.records.length === 0) {
      throw new Error('Epic node not found!');
    }

    const epic = epicResult.records[0].toObject();
    console.log(`   ✓ Epic: ${epic.name}`);
    console.log(`   ID: ${epic.id}`);
    console.log(`   Vision: ${epic.vision.substring(0, 100)}...\n`);

    // Check Problem nodes
    console.log('3. Problem Nodes:');
    const problemResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(p:Problem)
       RETURN p.id as id, p.description as description
       ORDER BY p.id`,
      { graphId: GRAPH_ID }
    );

    console.log(`   ✓ ${problemResult.records.length} problems found:`);
    problemResult.records.forEach((record, i) => {
      const problem = record.toObject();
      console.log(`     ${i + 1}. ${problem.description}`);
    });
    console.log();

    // Check Goal nodes
    console.log('4. Goal Nodes:');
    const goalResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(goal:Goal)
       RETURN goal.id as id, goal.text as text, goal.type as type
       ORDER BY goal.type, goal.id`,
      { graphId: GRAPH_ID }
    );

    console.log(`   ✓ ${goalResult.records.length} goals found:`);
    const qualitative = goalResult.records.filter(r => r.get('type') === 'qualitative');
    const quantitative = goalResult.records.filter(r => r.get('type') === 'quantitative');

    console.log(`     Qualitative (${qualitative.length}):`);
    qualitative.forEach((record, i) => {
      console.log(`       ${i + 1}. ${record.get('text')}`);
    });

    console.log(`     Quantitative (${quantitative.length}):`);
    quantitative.forEach((record, i) => {
      console.log(`       ${i + 1}. ${record.get('text')}`);
    });
    console.log();

    // Check User nodes
    console.log('5. User Nodes:');
    const userResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(u:User)
       RETURN u.id as id, u.description as description, u.segment as segment
       ORDER BY u.segment, u.id`,
      { graphId: GRAPH_ID }
    );

    console.log(`   ✓ ${userResult.records.length} user segments found:`);
    const primary = userResult.records.filter(r => r.get('segment') === 'primary');
    const secondary = userResult.records.filter(r => r.get('segment') === 'secondary');
    const longTerm = userResult.records.filter(r => r.get('segment') === 'long-term');

    if (primary.length > 0) {
      console.log(`     Primary (${primary.length}):`);
      primary.forEach((record, i) => {
        console.log(`       ${i + 1}. ${record.get('description')}`);
      });
    }

    if (secondary.length > 0) {
      console.log(`     Secondary (${secondary.length}):`);
      secondary.forEach((record, i) => {
        console.log(`       ${i + 1}. ${record.get('description')}`);
      });
    }

    if (longTerm.length > 0) {
      console.log(`     Long-term (${longTerm.length}):`);
      longTerm.forEach((record, i) => {
        console.log(`       ${i + 1}. ${record.get('description')}`);
      });
    }
    console.log();

    // Check Relationships
    console.log('6. Relationships:');
    const relResult = await session.run(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n)
       MATCH (n)-[r]-(m)
       WHERE m.id IS NOT NULL
       RETURN type(r) as type, count(r) as count
       ORDER BY type`,
      { graphId: GRAPH_ID }
    );

    console.log('   ✓ Relationship counts:');
    relResult.records.forEach(record => {
      console.log(`     ${record.get('type')}: ${record.get('count')}`);
    });
    console.log();

    // Summary
    const totalNodes = 1 + epicResult.records.length + problemResult.records.length +
                      goalResult.records.length + userResult.records.length;
    const totalRels = relResult.records.reduce((sum, r) => sum + r.get('count').toNumber(), 0);

    console.log('Summary:');
    console.log(`  Total nodes: ${totalNodes} (1 Graph + 1 Epic + ${problemResult.records.length} Problems + ${goalResult.records.length} Goals + ${userResult.records.length} Users)`);
    console.log(`  Total relationships: ${totalRels}`);

    await session.close();
  } catch (error) {
    console.error('Error verifying graph:', error);
    throw error;
  } finally {
    await driver.close();
  }
}

verifyCharterGraph()
  .then(() => {
    console.log('\n✓ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Verification failed:', error.message);
    process.exit(1);
  });
