/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-31
 * @tags: [relationships, semantic-analysis, graph-enrichment, parsing]
 * @related: [neo4j-client.ts, schema/005-semantic-relationships.cypher]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { neo4jClient } from '../neo4j-client.js';

/**
 * Relationship patterns to detect in document content
 */
const RELATIONSHIP_PATTERNS = {
  IMPLEMENTS: [
    /implements?\s+(PRD-\d+)/gi,
    /realizes?\s+(PRD-\d+)/gi,
    /satisfies\s+(PRD-\d+)/gi,
    /addresses\s+(PRD-\d+)/gi,
    /fulfills?\s+(PRD-\d+)/gi,
  ],
  REFERENCES: [
    /see\s+(ADR-\d+|PRD-\d+)/gi,
    /references?\s+(ADR-\d+|PRD-\d+)/gi,
    /based\s+on\s+(ADR-\d+|PRD-\d+)/gi,
    /builds?\s+on\s+(ADR-\d+|PRD-\d+)/gi,
    /extends?\s+(ADR-\d+|PRD-\d+)/gi,
    /related\s+to\s+(ADR-\d+|PRD-\d+)/gi,
    /depends\s+on\s+(ADR-\d+|PRD-\d+)/gi,
  ],
  SUPERSEDES: [
    /supersedes?\s+(ADR-\d+)/gi,
    /replaces?\s+(ADR-\d+)/gi,
    /obsoletes?\s+(ADR-\d+)/gi,
    /deprecates?\s+(ADR-\d+)/gi,
  ],
  CONFLICTS_WITH: [
    /conflicts?\s+with\s+(ADR-\d+)/gi,
    /contradicts?\s+(ADR-\d+)/gi,
    /incompatible\s+with\s+(ADR-\d+)/gi,
  ],
};

/**
 * Discovered relationship
 */
interface DiscoveredRelationship {
  sourceId: string;
  targetId: string;
  type: 'IMPLEMENTS' | 'REFERENCES' | 'SUPERSEDES' | 'CONFLICTS_WITH';
  context: string; // Text snippet where relationship was found
  confidence: number;
}

/**
 * Extract semantic relationships from document content
 */
async function extractSemanticRelationships() {
  console.log('============================================');
  console.log('  Semantic Relationship Extraction');
  console.log('============================================\n');

  try {
    await neo4jClient.connect();

    // Step 1: Load all documents
    console.log('Step 1: Loading documents...');
    const documents = await neo4jClient.queryRecords(`
      MATCH (n)
      WHERE n:ADR OR n:PRD
      RETURN n.id AS id,
             labels(n)[0] AS type,
             n.title AS title,
             n.content AS content,
             n.summary AS summary
      ORDER BY id
    `);

    console.log(`✓ Loaded ${documents.length} documents (ADRs + PRDs)\n`);

    // Step 2: Extract relationships from content
    console.log('Step 2: Analyzing document content...');
    const relationships: DiscoveredRelationship[] = [];

    for (const doc of documents) {
      const content = [doc.title, doc.summary, doc.content]
        .filter(Boolean)
        .join('\n\n');

      const discovered = findRelationships(doc.id, content);
      relationships.push(...discovered);
    }

    console.log(`✓ Discovered ${relationships.length} relationships\n`);

    // Step 3: Group and deduplicate
    const grouped = groupRelationships(relationships);

    console.log('Relationship breakdown:');
    Object.entries(grouped).forEach(([type, rels]) => {
      console.log(`  ${type}: ${rels.length}`);
    });
    console.log();

    // Step 4: Validate targets exist
    console.log('Step 3: Validating referenced documents...');
    const validRelationships = await validateRelationships(
      relationships.flat(),
      documents.map(d => d.id)
    );

    console.log(`✓ ${validRelationships.length} valid (${relationships.length - validRelationships.length} invalid references skipped)\n`);

    // Step 5: Create relationships in Neo4j
    console.log('Step 4: Creating relationships in Neo4j...');
    let created = 0;
    let skipped = 0;

    for (const rel of validRelationships) {
      try {
        await createRelationship(rel);
        created++;

        if (created % 10 === 0) {
          console.log(`  Progress: ${created}/${validRelationships.length}`);
        }
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          skipped++;
        } else {
          console.error(`  Failed to create ${rel.sourceId} → ${rel.targetId}:`, error.message);
        }
      }
    }

    console.log(`✓ Created ${created} new relationships (${skipped} already existed)\n`);

    // Step 6: Summary
    console.log('Step 5: Generating summary...');
    const summary = await generateSummary();

    console.log('\n============================================');
    console.log('  Results');
    console.log('============================================\n');

    console.log('Relationship counts by type:');
    summary.byType.forEach((item: any) => {
      console.log(`  ${item.type}: ${item.count}`);
    });

    console.log('\nTop connected documents:');
    summary.topDocs.forEach((item: any, i: number) => {
      console.log(`  ${i + 1}. ${item.id} - ${item.outgoing} outgoing, ${item.incoming} incoming`);
    });

    console.log('\nSample relationships:');
    summary.samples.forEach((item: any) => {
      console.log(`  ${item.source} --[${item.type}]--> ${item.target}`);
    });

    console.log('\n✅ Semantic relationship extraction complete!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await neo4jClient.close();
  }
}

/**
 * Find relationships in document content
 */
function findRelationships(sourceId: string, content: string): DiscoveredRelationship[] {
  const found: DiscoveredRelationship[] = [];

  for (const [relType, patterns] of Object.entries(RELATIONSHIP_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);

      for (const match of matches) {
        const targetId = match[1].toUpperCase(); // Normalize to uppercase
        const context = extractContext(content, match.index!, 80);

        found.push({
          sourceId,
          targetId,
          type: relType as any,
          context,
          confidence: 0.9, // High confidence for explicit mentions
        });
      }
    }
  }

  return found;
}

/**
 * Extract context around a match
 */
function extractContext(text: string, index: number, radius: number): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  let context = text.substring(start, end);

  // Add ellipsis if truncated
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';

  return context.replace(/\s+/g, ' ').trim();
}

/**
 * Group relationships by type
 */
function groupRelationships(relationships: DiscoveredRelationship[]) {
  const grouped: Record<string, DiscoveredRelationship[]> = {};

  for (const rel of relationships) {
    if (!grouped[rel.type]) {
      grouped[rel.type] = [];
    }
    grouped[rel.type].push(rel);
  }

  return grouped;
}

/**
 * Validate that target documents exist
 */
async function validateRelationships(
  relationships: DiscoveredRelationship[],
  validIds: string[]
): Promise<DiscoveredRelationship[]> {
  const validIdSet = new Set(validIds);

  return relationships.filter(rel => {
    const valid = validIdSet.has(rel.targetId);
    if (!valid) {
      console.warn(`  ⚠️  Reference to non-existent document: ${rel.targetId} (from ${rel.sourceId})`);
    }
    return valid;
  });
}

/**
 * Create a relationship in Neo4j
 */
async function createRelationship(rel: DiscoveredRelationship): Promise<void> {
  const query = `
    MATCH (source {id: $sourceId})
    MATCH (target {id: $targetId})
    MERGE (source)-[r:${rel.type}]->(target)
    SET r.context = $context,
        r.confidence = $confidence,
        r.extracted_at = datetime()
    RETURN r
  `;

  await neo4jClient.query(query, {
    sourceId: rel.sourceId,
    targetId: rel.targetId,
    context: rel.context,
    confidence: rel.confidence,
  });
}

/**
 * Generate summary statistics
 */
async function generateSummary() {
  // Counts by type
  const byType = await neo4jClient.queryRecords(`
    MATCH ()-[r]->()
    RETURN type(r) AS type, count(r) AS count
    ORDER BY count DESC
  `);

  // Top connected documents
  const topDocs = await neo4jClient.queryRecords(`
    MATCH (n)
    WHERE n:ADR OR n:PRD
    OPTIONAL MATCH (n)-[out]->()
    OPTIONAL MATCH (n)<-[in]-()
    WITH n, count(DISTINCT out) AS outgoing, count(DISTINCT in) AS incoming
    WHERE outgoing > 0 OR incoming > 0
    RETURN n.id AS id, outgoing, incoming
    ORDER BY (outgoing + incoming) DESC
    LIMIT 10
  `);

  // Sample relationships (excluding SIMILAR_TO)
  const samples = await neo4jClient.queryRecords(`
    MATCH (source)-[r]->(target)
    WHERE type(r) <> 'SIMILAR_TO'
    RETURN source.id AS source,
           type(r) AS type,
           target.id AS target
    LIMIT 10
  `);

  return { byType, topDocs, samples };
}

/**
 * Additional enhancement: Find implicit PRD→ADR relationships
 * based on high vector similarity + matching topics
 */
async function inferImplicitRelationships(): Promise<void> {
  console.log('\nBonus: Inferring implicit IMPLEMENTS relationships...');

  const query = `
    MATCH (prd:PRD)-[s:SIMILAR_TO]->(adr:ADR)
    WHERE s.similarity > 0.80
      AND NOT exists((adr)-[:IMPLEMENTS]->(prd))
    CREATE (adr)-[:IMPLEMENTS {
      inferred: true,
      confidence: s.similarity,
      reason: 'High semantic similarity',
      created_at: datetime()
    }]->(prd)
    RETURN count(*) as count
  `;

  const result = await neo4jClient.queryRecords(query);
  const count = result[0]?.count || 0;

  console.log(`✓ Inferred ${count} implicit IMPLEMENTS relationships (similarity > 0.80)`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  extractSemanticRelationships()
    .then(async () => {
      await neo4jClient.connect();
      await inferImplicitRelationships();
      await neo4jClient.close();
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { extractSemanticRelationships };
