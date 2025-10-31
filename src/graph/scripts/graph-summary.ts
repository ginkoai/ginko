/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-31
 * @tags: [analysis, summary, statistics, knowledge-graph]
 * @related: [analyze-document-types.ts, check-relationships.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

import { neo4jClient } from '../neo4j-client.js';

async function generateGraphSummary() {
  try {
    await neo4jClient.connect();

    console.log('='.repeat(60));
    console.log('  Knowledge Graph Summary');
    console.log('='.repeat(60));
    console.log();

    // Node counts
    const nodes = await neo4jClient.queryRecords(`
      MATCH (n)
      RETURN labels(n)[0] AS type, count(n) AS count
      ORDER BY count DESC
    `);

    console.log('📊 Document Types:');
    let totalNodes = 0;
    nodes.forEach((n: any) => {
      const count = typeof n.count === 'object' ? Number(n.count) : n.count;
      console.log(`  ${n.type}: ${count} nodes`);
      totalNodes += count;
    });
    console.log(`  TOTAL: ${totalNodes} nodes`);
    console.log();

    // Relationship counts
    const rels = await neo4jClient.queryRecords(`
      MATCH ()-[r]->()
      RETURN type(r) AS type, count(r) AS count
      ORDER BY count DESC
    `);

    console.log('🔗 Relationship Types:');
    let totalRels = 0;
    rels.forEach((r: any) => {
      const count = typeof r.count === 'object' ? Number(r.count) : r.count;
      console.log(`  ${r.type}: ${count}`);
      totalRels += count;
    });
    console.log(`  TOTAL: ${totalRels} relationships`);
    console.log();

    // Cross-type semantic relationships (non-SIMILAR_TO)
    const semantic = await neo4jClient.queryRecords(`
      MATCH (a)-[r]->(b)
      WHERE type(r) <> 'SIMILAR_TO'
      RETURN labels(a)[0] AS from_type,
             type(r) AS rel_type,
             labels(b)[0] AS to_type,
             count(*) AS count
      ORDER BY count DESC
    `);

    console.log('🎯 Semantic Relationships (explicit):');
    semantic.forEach((s: any) => {
      console.log(`  ${s.from_type} --[${s.rel_type}]--> ${s.to_type}: ${s.count}`);
    });
    console.log();

    // Cross-type SIMILAR_TO relationships
    const crossSimilar = await neo4jClient.queryRecords(`
      MATCH (a)-[r:SIMILAR_TO]->(b)
      WHERE labels(a)[0] <> labels(b)[0]
      RETURN labels(a)[0] AS from_type,
             labels(b)[0] AS to_type,
             count(*) AS count
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log('🔍 Cross-Type Similarity Relationships:');
    crossSimilar.forEach((s: any) => {
      console.log(`  ${s.from_type} ↔ ${s.to_type}: ${s.count}`);
    });
    console.log();

    // Most connected documents
    const connected = await neo4jClient.queryRecords(`
      MATCH (n)
      WHERE n:ADR OR n:PRD OR n:Pattern
      OPTIONAL MATCH (n)-[out]->()
      OPTIONAL MATCH (n)<-[in]-()
      WITH n, labels(n)[0] AS type, count(DISTINCT out) AS outgoing, count(DISTINCT in) AS incoming
      WHERE outgoing + incoming > 5
      RETURN type, n.id AS id, n.title AS title, outgoing, incoming
      ORDER BY (outgoing + incoming) DESC
      LIMIT 5
    `);

    console.log('⭐ Most Connected Documents:');
    connected.forEach((d: any) => {
      console.log(`  ${d.type}:${d.id} - ${d.outgoing} out, ${d.incoming} in`);
      console.log(`     "${d.title?.substring(0, 50)}..."`);
    });
    console.log();

    // Example queries enabled by the graph
    console.log('🚀 Enabled Query Examples:');
    console.log('  1. "Which patterns address this gotcha?"');
    console.log('     MATCH (g:Gotcha)-[:MITIGATED_BY]->(p:Pattern)');
    console.log();
    console.log('  2. "Where was this pattern discovered?"');
    console.log('     MATCH (p:Pattern)-[:LEARNED_FROM]->(s:Session)');
    console.log();
    console.log('  3. "Which ADRs apply this pattern?"');
    console.log('     MATCH (p:Pattern)-[:APPLIES_TO]->(a:ADR)');
    console.log();
    console.log('  4. "What conventions apply to this document?"');
    console.log('     MATCH (m:ContextModule)-[:APPLIES_TO]->(doc)');
    console.log();
    console.log('  5. "Find semantically similar cross-type documents"');
    console.log('     MATCH (a)-[r:SIMILAR_TO]->(b)');
    console.log('     WHERE labels(a)[0] <> labels(b)[0] AND r.similarity > 0.80');
    console.log();

    console.log('='.repeat(60));
    console.log('✅ Knowledge graph is fully operational!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateGraphSummary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { generateGraphSummary };
