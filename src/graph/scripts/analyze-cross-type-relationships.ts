/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-31
 * @tags: [analysis, relationships, cross-type, graph-structure]
 * @related: [analyze-similarities.ts, extract-semantic-relationships.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { neo4jClient } from '../neo4j-client.js';

/**
 * Analyze potential cross-type relationships in the knowledge graph
 */
async function analyzeCrossTypeRelationships() {
  console.log('============================================');
  console.log('  Cross-Type Relationship Analysis');
  console.log('============================================\n');

  try {
    await neo4jClient.connect();

    // 1. Show current relationship distribution
    console.log('Current Relationship Distribution:');
    console.log('─'.repeat(60));

    const relCounts = await neo4jClient.queryRecords(`
      MATCH (a)-[r]->(b)
      RETURN labels(a)[0] AS from_type,
             type(r) AS rel_type,
             labels(b)[0] AS to_type,
             count(*) AS count
      ORDER BY count DESC
      LIMIT 20
    `);

    relCounts.forEach((rel: any) => {
      console.log(`  ${rel.from_type} --[${rel.rel_type}]--> ${rel.to_type}: ${rel.count}`);
    });

    // 2. Analyze high-similarity cross-type pairs
    console.log('\n\nHigh-Similarity Cross-Type Relationships (threshold > 0.70):');
    console.log('─'.repeat(60));

    const crossTypeSimilar = await neo4jClient.queryRecords(`
      MATCH (a)-[r:SIMILAR_TO]->(b)
      WHERE labels(a)[0] <> labels(b)[0]
        AND r.similarity > 0.70
      RETURN labels(a)[0] AS from_type,
             a.id AS from_id,
             a.title AS from_title,
             labels(b)[0] AS to_type,
             b.id AS to_id,
             b.title AS to_title,
             r.similarity AS similarity
      ORDER BY similarity DESC
      LIMIT 15
    `);

    if (crossTypeSimilar.length > 0) {
      crossTypeSimilar.forEach((item: any) => {
        console.log(`  ${item.similarity.toFixed(3)} | ${item.from_type}:${item.from_id} ↔ ${item.to_type}:${item.to_id}`);
        console.log(`           "${item.from_title?.substring(0, 40)}..."`);
        console.log(`           "${item.to_title?.substring(0, 40)}..."\n`);
      });
    } else {
      console.log('  No cross-type similarities above 0.70 threshold\n');
    }

    // 3. Pattern-ADR relationships (Patterns should APPLY_TO ADRs)
    console.log('\nPotential Pattern → ADR Relationships:');
    console.log('─'.repeat(60));

    const patternAdrs = await neo4jClient.queryRecords(`
      MATCH (p:Pattern)-[r:SIMILAR_TO]->(a:ADR)
      WHERE r.similarity > 0.65
        AND NOT exists((p)-[:APPLIES_TO]->(a))
      RETURN p.id AS pattern_id,
             p.title AS pattern,
             a.id AS adr_id,
             a.title AS adr,
             r.similarity AS similarity
      ORDER BY similarity DESC
      LIMIT 10
    `);

    console.log(`  Found ${patternAdrs.length} potential APPLIES_TO relationships\n`);
    if (patternAdrs.length > 0) {
      patternAdrs.slice(0, 5).forEach((item: any) => {
        console.log(`  ${item.similarity.toFixed(3)} | ${item.pattern_id} APPLIES_TO ${item.adr_id}`);
        console.log(`           Pattern: "${item.pattern?.substring(0, 40)}..."`);
        console.log(`           ADR: "${item.adr?.substring(0, 40)}..."\n`);
      });
    }

    // 4. Gotcha-Pattern relationships (Gotchas MITIGATED_BY Patterns)
    console.log('\nPotential Gotcha → Pattern Relationships:');
    console.log('─'.repeat(60));

    const gotchaPatterns = await neo4jClient.queryRecords(`
      MATCH (g:Gotcha)-[r:SIMILAR_TO]->(p:Pattern)
      WHERE r.similarity > 0.60
        AND NOT exists((g)-[:MITIGATED_BY]->(p))
      RETURN g.id AS gotcha_id,
             g.title AS gotcha,
             p.id AS pattern_id,
             p.title AS pattern,
             r.similarity AS similarity
      ORDER BY similarity DESC
      LIMIT 10
    `);

    console.log(`  Found ${gotchaPatterns.length} potential MITIGATED_BY relationships\n`);
    if (gotchaPatterns.length > 0) {
      gotchaPatterns.forEach((item: any) => {
        console.log(`  ${item.similarity.toFixed(3)} | ${item.gotcha_id} MITIGATED_BY ${item.pattern_id}`);
        console.log(`           Gotcha: "${item.gotcha?.substring(0, 40)}..."`);
        console.log(`           Pattern: "${item.pattern?.substring(0, 40)}..."\n`);
      });
    }

    // 5. Pattern-Session relationships (Patterns LEARNED_FROM Sessions)
    console.log('\nPotential Pattern → Session Relationships:');
    console.log('─'.repeat(60));

    const patternSessions = await neo4jClient.queryRecords(`
      MATCH (p:Pattern)-[r:SIMILAR_TO]->(s:Session)
      WHERE r.similarity > 0.65
        AND NOT exists((p)-[:LEARNED_FROM]->(s))
      RETURN p.id AS pattern_id,
             p.title AS pattern,
             s.id AS session_id,
             s.title AS session,
             r.similarity AS similarity
      ORDER BY similarity DESC
      LIMIT 10
    `);

    console.log(`  Found ${patternSessions.length} potential LEARNED_FROM relationships\n`);
    if (patternSessions.length > 0) {
      patternSessions.slice(0, 5).forEach((item: any) => {
        console.log(`  ${item.similarity.toFixed(3)} | ${item.pattern_id} LEARNED_FROM ${item.session_id}`);
        console.log(`           Pattern: "${item.pattern?.substring(0, 40)}..."`);
        console.log(`           Session: "${item.session?.substring(0, 40)}..."\n`);
      });
    }

    // 6. ContextModule relationships
    console.log('\nPotential ContextModule Relationships:');
    console.log('─'.repeat(60));

    const moduleRels = await neo4jClient.queryRecords(`
      MATCH (m:ContextModule)-[r:SIMILAR_TO]->(other)
      WHERE labels(other)[0] IN ['ADR', 'PRD', 'Pattern']
        AND r.similarity > 0.65
        AND NOT exists((m)-[:APPLIES_TO]->(other))
      RETURN m.id AS module_id,
             m.title AS module,
             labels(other)[0] AS target_type,
             other.id AS target_id,
             other.title AS target,
             r.similarity AS similarity
      ORDER BY similarity DESC
      LIMIT 10
    `);

    console.log(`  Found ${moduleRels.length} potential APPLIES_TO relationships\n`);
    if (moduleRels.length > 0) {
      moduleRels.forEach((item: any) => {
        console.log(`  ${item.similarity.toFixed(3)} | ${item.module_id} APPLIES_TO ${item.target_type}:${item.target_id}`);
        console.log(`           Module: "${item.module?.substring(0, 40)}..."`);
        console.log(`           Target: "${item.target?.substring(0, 40)}..."\n`);
      });
    }

    // 7. Summary statistics
    console.log('\n\n============================================');
    console.log('  Summary');
    console.log('============================================\n');

    const summary = await neo4jClient.queryRecords(`
      MATCH (n)
      RETURN labels(n)[0] AS type,
             count(n) AS count,
             count(n.embedding) AS with_embeddings
      ORDER BY count DESC
    `);

    console.log('Node counts:');
    summary.forEach((s: any) => {
      console.log(`  ${s.type}: ${s.count} nodes (${s.with_embeddings} with embeddings)`);
    });

    const relTypes = await neo4jClient.queryRecords(`
      MATCH ()-[r]->()
      RETURN type(r) AS type, count(r) AS count
      ORDER BY count DESC
    `);

    console.log('\nRelationship counts:');
    relTypes.forEach((r: any) => {
      console.log(`  ${r.type}: ${r.count}`);
    });

    // 8. Recommendations
    console.log('\n\n============================================');
    console.log('  Recommendations');
    console.log('============================================\n');

    console.log('Based on the analysis, consider creating:');
    console.log('  1. Pattern APPLIES_TO ADR relationships (high semantic similarity)');
    console.log('  2. Gotcha MITIGATED_BY Pattern relationships (prevention strategies)');
    console.log('  3. Pattern LEARNED_FROM Session relationships (pattern origins)');
    console.log('  4. ContextModule APPLIES_TO ADR/PRD/Pattern relationships (conventions)');
    console.log('\nThese relationships would enable queries like:');
    console.log('  - "Which patterns address this gotcha?"');
    console.log('  - "Where was this pattern first discovered?"');
    console.log('  - "Which ADRs apply this architectural pattern?"');
    console.log('  - "What conventions apply to this type of decision?"\n');

    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeCrossTypeRelationships()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { analyzeCrossTypeRelationships };
