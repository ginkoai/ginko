/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-31
 * @tags: [relationships, semantic-analysis, graph-enrichment, cross-type]
 * @related: [extract-semantic-relationships.ts, analyze-cross-type-relationships.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { neo4jClient } from '../neo4j-client.js';

interface RelationshipCandidate {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  targetId: string;
  targetTitle: string;
  targetType: string;
  relType: string;
  similarity: number;
  reason: string;
}

/**
 * Create explicit semantic relationships based on vector similarity
 */
async function createSemanticRelationships() {
  console.log('============================================');
  console.log('  Semantic Relationship Creation');
  console.log('============================================\n');

  try {
    await neo4jClient.connect();

    const candidates: RelationshipCandidate[] = [];
    let created = 0;

    // 1. Pattern APPLIES_TO ADR relationships (similarity > 0.75)
    console.log('Step 1: Finding Pattern → ADR relationships...');
    const patternAdrs = await neo4jClient.queryRecords(`
      MATCH (p:Pattern)-[r:SIMILAR_TO]->(a:ADR)
      WHERE r.similarity > 0.75
        AND NOT exists((p)-[:APPLIES_TO]->(a))
      RETURN p.id AS sourceId,
             p.title AS sourceTitle,
             'Pattern' AS sourceType,
             a.id AS targetId,
             a.title AS targetTitle,
             'ADR' AS targetType,
             'APPLIES_TO' AS relType,
             r.similarity AS similarity
      ORDER BY similarity DESC
    `);

    candidates.push(...patternAdrs.map((r: any) => ({
      ...r,
      reason: 'High semantic similarity indicates pattern applies to this architectural decision'
    })));
    console.log(`  ✓ Found ${patternAdrs.length} candidates\n`);

    // 2. Gotcha MITIGATED_BY Pattern relationships (similarity > 0.70)
    console.log('Step 2: Finding Gotcha → Pattern relationships...');
    const gotchaPatterns = await neo4jClient.queryRecords(`
      MATCH (g:Gotcha)-[r:SIMILAR_TO]->(p:Pattern)
      WHERE r.similarity > 0.70
        AND NOT exists((g)-[:MITIGATED_BY]->(p))
      RETURN g.id AS sourceId,
             g.title AS sourceTitle,
             'Gotcha' AS sourceType,
             p.id AS targetId,
             p.title AS targetTitle,
             'Pattern' AS targetType,
             'MITIGATED_BY' AS relType,
             r.similarity AS similarity
      ORDER BY similarity DESC
    `);

    candidates.push(...gotchaPatterns.map((r: any) => ({
      ...r,
      reason: 'Pattern provides mitigation strategy for this gotcha'
    })));
    console.log(`  ✓ Found ${gotchaPatterns.length} candidates\n`);

    // 3. Pattern LEARNED_FROM Session relationships (similarity > 0.80)
    console.log('Step 3: Finding Pattern → Session relationships...');
    const patternSessions = await neo4jClient.queryRecords(`
      MATCH (p:Pattern)-[r:SIMILAR_TO]->(s:Session)
      WHERE r.similarity > 0.80
        AND NOT exists((p)-[:LEARNED_FROM]->(s))
      RETURN p.id AS sourceId,
             p.title AS sourceTitle,
             'Pattern' AS sourceType,
             s.id AS targetId,
             s.title AS targetTitle,
             'Session' AS targetType,
             'LEARNED_FROM' AS relType,
             r.similarity AS similarity
      ORDER BY similarity DESC
    `);

    candidates.push(...patternSessions.map((r: any) => ({
      ...r,
      reason: 'Pattern was discovered or refined during this session'
    })));
    console.log(`  ✓ Found ${patternSessions.length} candidates\n`);

    // 4. ContextModule APPLIES_TO * relationships (similarity > 0.75)
    console.log('Step 4: Finding ContextModule → * relationships...');
    const moduleRels = await neo4jClient.queryRecords(`
      MATCH (m:ContextModule)-[r:SIMILAR_TO]->(other)
      WHERE labels(other)[0] IN ['ADR', 'PRD', 'Pattern', 'Gotcha']
        AND r.similarity > 0.75
        AND NOT exists((m)-[:APPLIES_TO]->(other))
      RETURN m.id AS sourceId,
             m.title AS sourceTitle,
             'ContextModule' AS sourceType,
             other.id AS targetId,
             other.title AS targetTitle,
             labels(other)[0] AS targetType,
             'APPLIES_TO' AS relType,
             r.similarity AS similarity
      ORDER BY similarity DESC
    `);

    candidates.push(...moduleRels.map((r: any) => ({
      ...r,
      reason: 'Team convention/standard applies to this document'
    })));
    console.log(`  ✓ Found ${moduleRels.length} candidates\n`);

    // Display all candidates
    console.log('============================================');
    console.log('  Relationship Candidates');
    console.log('============================================\n');

    if (candidates.length === 0) {
      console.log('No new relationships to create.\n');
      return;
    }

    console.log(`Found ${candidates.length} relationships to create:\n`);

    // Group by relationship type
    const byType: Record<string, RelationshipCandidate[]> = {};
    candidates.forEach(c => {
      if (!byType[c.relType]) byType[c.relType] = [];
      byType[c.relType].push(c);
    });

    Object.entries(byType).forEach(([relType, rels]) => {
      console.log(`${relType}: ${rels.length} relationships`);
      rels.forEach(rel => {
        console.log(`  ${rel.similarity.toFixed(3)} | ${rel.sourceId} → ${rel.targetId}`);
        console.log(`           ${rel.sourceTitle?.substring(0, 50)}...`);
        console.log(`           ${rel.targetTitle?.substring(0, 50)}...`);
      });
      console.log();
    });

    // Create relationships
    console.log('============================================');
    console.log('  Creating Relationships');
    console.log('============================================\n');

    for (const candidate of candidates) {
      try {
        await neo4jClient.query(`
          MATCH (source {id: $sourceId})
          MATCH (target {id: $targetId})
          MERGE (source)-[r:${candidate.relType}]->(target)
          SET r.similarity = $similarity,
              r.reason = $reason,
              r.inferred = true,
              r.created_at = datetime()
          RETURN r
        `, {
          sourceId: candidate.sourceId,
          targetId: candidate.targetId,
          similarity: candidate.similarity,
          reason: candidate.reason
        });

        created++;
        console.log(`  ✓ Created ${candidate.relType}: ${candidate.sourceId} → ${candidate.targetId}`);
      } catch (error: any) {
        console.error(`  ✗ Failed to create ${candidate.relType}: ${candidate.sourceId} → ${candidate.targetId}`);
        console.error(`    ${error.message}`);
      }
    }

    console.log(`\n✓ Created ${created} new semantic relationships\n`);

    // Final statistics
    console.log('============================================');
    console.log('  Updated Statistics');
    console.log('============================================\n');

    const relCounts = await neo4jClient.queryRecords(`
      MATCH ()-[r]->()
      RETURN type(r) AS type, count(r) AS count
      ORDER BY count DESC
    `);

    console.log('All relationship types:');
    relCounts.forEach((r: any) => {
      console.log(`  ${r.type}: ${r.count}`);
    });

    // Show cross-type breakdown
    console.log('\nCross-type semantic relationships:');
    const crossType = await neo4jClient.queryRecords(`
      MATCH (a)-[r]->(b)
      WHERE type(r) <> 'SIMILAR_TO'
        AND labels(a)[0] <> labels(b)[0]
      RETURN labels(a)[0] AS from_type,
             type(r) AS rel_type,
             labels(b)[0] AS to_type,
             count(*) AS count
      ORDER BY count DESC
    `);

    crossType.forEach((r: any) => {
      console.log(`  ${r.from_type} --[${r.rel_type}]--> ${r.to_type}: ${r.count}`);
    });

    console.log('\n✅ Semantic relationship creation complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSemanticRelationships()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { createSemanticRelationships };
