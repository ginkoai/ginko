/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-27
 * @tags: [neo4j, query, testing, performance]
 * @related: [neo4j-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

import { neo4jClient } from '../neo4j-client';

/**
 * Simulate context loading for a task
 * This is what happens when a dev runs: ginko start --task="Implement OAuth refresh tokens"
 */
async function testContextQuery() {
  try {
    console.log('🔍 Testing context loading query...\n');

    // Connect to Neo4j
    await neo4jClient.connect();

    // ========================================================================
    // Test Case 1: Full-text search for relevant ADRs
    // ========================================================================
    console.log('📋 Test 1: Full-text search for "graph" and "knowledge"');
    const start1 = Date.now();

    const query1 = `
      CALL db.index.fulltext.queryNodes('adr_fulltext', $searchTerm)
      YIELD node, score
      WHERE node.project_id = $projectId AND score > 0.5
      RETURN node.id as id,
             node.title as title,
             node.summary as summary,
             node.status as status,
             node.tags as tags,
             score
      ORDER BY score DESC
      LIMIT 5
    `;

    const result1 = await neo4jClient.queryRecords(query1, {
      searchTerm: 'graph knowledge context',
      projectId: 'ginko-local'
    });

    const time1 = Date.now() - start1;
    console.log(`⏱️  Query time: ${time1}ms`);
    console.log(`📊 Found ${result1.length} relevant ADRs:\n`);

    result1.forEach((r: any) => {
      console.log(`  ${r.id}: ${r.title}`);
      console.log(`    Score: ${r.score.toFixed(2)}`);
      console.log(`    Tags: [${r.tags.join(', ')}]`);
      console.log(`    Summary: ${r.summary.substring(0, 100)}...`);
      console.log();
    });

    // ========================================================================
    // Test Case 2: Tag-based filtering
    // ========================================================================
    console.log('\n📋 Test 2: Find ADRs with "graph" tag');
    const start2 = Date.now();

    const query2 = `
      MATCH (a:ADR)
      WHERE a.project_id = $projectId
        AND $tag IN a.tags
        AND a.status = 'accepted'
      RETURN a.id as id,
             a.title as title,
             a.tags as tags
      LIMIT 10
    `;

    const result2 = await neo4jClient.queryRecords(query2, {
      projectId: 'ginko-local',
      tag: 'graph'
    });

    const time2 = Date.now() - start2;
    console.log(`⏱️  Query time: ${time2}ms`);
    console.log(`📊 Found ${result2.length} ADRs with "graph" tag:\n`);

    result2.forEach((r: any) => {
      console.log(`  ${r.id}: ${r.title}`);
      console.log(`    Tags: [${r.tags.join(', ')}]\n`);
    });

    // ========================================================================
    // Test Case 3: Cross-document query (ADRs implementing PRDs)
    // ========================================================================
    console.log('\n📋 Test 3: Find relationship between ADRs and PRDs');
    const start3 = Date.now();

    const query3 = `
      MATCH (prd:PRD)
      WHERE prd.project_id = $projectId
      WITH prd
      MATCH (adr:ADR)
      WHERE adr.project_id = $projectId
        AND any(tag IN adr.tags WHERE tag IN prd.tags)
      RETURN prd.id as prd_id,
             prd.title as prd_title,
             collect({id: adr.id, title: adr.title}) as related_adrs
      LIMIT 5
    `;

    const result3 = await neo4jClient.queryRecords(query3, {
      projectId: 'ginko-local'
    });

    const time3 = Date.now() - start3;
    console.log(`⏱️  Query time: ${time3}ms`);
    console.log(`📊 Found ${result3.length} PRDs with related ADRs:\n`);

    result3.forEach((r: any) => {
      console.log(`  ${r.prd_id}: ${r.prd_title}`);
      console.log(`    Related ADRs: ${r.related_adrs.length}`);
      r.related_adrs.forEach((adr: any) => {
        console.log(`      - ${adr.id}: ${adr.title}`);
      });
      console.log();
    });

    // ========================================================================
    // Test Case 4: Composite context loading (what ginko start would do)
    // ========================================================================
    console.log('\n📋 Test 4: Full context loading (simulating `ginko start --task="Build knowledge graph"`)');
    const start4 = Date.now();

    const taskDescription = 'Build knowledge graph for AI context loading';

    // Step 1: Full-text search for relevant docs
    const contextQuery = `
      // Find relevant ADRs via full-text search
      CALL db.index.fulltext.queryNodes('adr_fulltext', $searchTerm)
      YIELD node as adr, score as adr_score
      WHERE adr:ADR AND adr.project_id = $projectId AND adr_score > 0.5
      WITH collect({
        type: 'ADR',
        id: adr.id,
        title: adr.title,
        summary: adr.summary,
        tags: adr.tags,
        relevance: adr_score
      })[..5] as adrs

      // Find relevant PRDs via full-text search
      CALL db.index.fulltext.queryNodes('prd_fulltext', $searchTerm)
      YIELD node as prd, score as prd_score
      WHERE prd:PRD AND prd.project_id = $projectId AND prd_score > 0.5
      WITH adrs, collect({
        type: 'PRD',
        id: prd.id,
        title: prd.title,
        summary: prd.summary,
        tags: prd.tags,
        relevance: prd_score
      })[..3] as prds

      RETURN adrs, prds
    `;

    const contextResult = await neo4jClient.queryRecords(contextQuery, {
      searchTerm: taskDescription,
      projectId: 'ginko-local'
    });

    const time4 = Date.now() - start4;
    console.log(`⏱️  Total context loading time: ${time4}ms`);

    if (contextResult.length > 0) {
      const context = contextResult[0];
      const totalDocs = context.adrs.length + context.prds.length;
      console.log(`📊 Loaded ${totalDocs} relevant documents\n`);

      if (context.adrs.length > 0) {
        console.log('  Relevant ADRs:');
        context.adrs.forEach((doc: any) => {
          console.log(`    ${doc.id}: ${doc.title} (relevance: ${doc.relevance.toFixed(2)})`);
        });
      }

      if (context.prds.length > 0) {
        console.log('\n  Relevant PRDs:');
        context.prds.forEach((doc: any) => {
          console.log(`    ${doc.id}: ${doc.title} (relevance: ${doc.relevance.toFixed(2)})`);
        });
      }
    }

    // ========================================================================
    // Performance Summary
    // ========================================================================
    console.log('\n\n📊 Performance Summary:');
    console.log('─'.repeat(60));
    console.log(`  Full-text search (ADRs):        ${time1}ms`);
    console.log(`  Tag-based filtering:            ${time2}ms`);
    console.log(`  Cross-document relationship:    ${time3}ms`);
    console.log(`  Full context loading:           ${time4}ms`);
    console.log('─'.repeat(60));

    const avgTime = Math.round((time1 + time2 + time3 + time4) / 4);
    console.log(`  Average query time:             ${avgTime}ms`);

    // Check against target
    const targetMs = 100;
    if (time4 < targetMs) {
      console.log(`\n✅ PASS: Context loading under ${targetMs}ms target!`);
    } else {
      console.log(`\n⚠️  NOTICE: Context loading is ${time4}ms (target: ${targetMs}ms)`);
      console.log(`   This is still acceptable for MVP. Optimize if needed.`);
    }

    console.log('\n💡 Next steps:');
    console.log('  - Add more sample data to test scaling');
    console.log('  - Implement vector embeddings for semantic search');
    console.log('  - Create IMPLEMENTS relationships between ADRs and PRDs');

  } catch (error) {
    console.error('\n❌ Context query test failed:', error);
    process.exit(1);
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (require.main === module) {
  testContextQuery();
}

export { testContextQuery };
