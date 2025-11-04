/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: [relationships, graph-enrichment, hetzner]
 * @related: [load-docs-to-hetzner.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [dotenv]
 */

import { CloudGraphClient } from '../api/v1/graph/_cloud-graph-client.js';
import dotenv from 'dotenv';

dotenv.config();

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

interface DiscoveredRelationship {
  sourceId: string;
  targetId: string;
  type: 'IMPLEMENTS' | 'REFERENCES' | 'SUPERSEDES' | 'CONFLICTS_WITH';
  context: string;
}

/**
 * Find relationships in content
 */
function findRelationships(sourceId: string, content: string): DiscoveredRelationship[] {
  const relationships: DiscoveredRelationship[] = [];

  for (const [relType, patterns] of Object.entries(RELATIONSHIP_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);

      for (const match of matches) {
        const targetId = match[1].toUpperCase();

        // Don't create self-references
        if (targetId === sourceId) continue;

        // Get context (50 chars before and after)
        const matchIndex = match.index || 0;
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(content.length, matchIndex + match[0].length + 50);
        const context = content.substring(contextStart, contextEnd).trim();

        relationships.push({
          sourceId,
          targetId,
          type: relType as any,
          context
        });
      }
    }
  }

  return relationships;
}

/**
 * Create semantic similarity relationships
 */
async function createSimilarityRelationships(
  client: CloudGraphClient,
  documents: any[]
): Promise<number> {
  console.log('Creating SIMILAR_TO relationships based on embeddings...');
  let created = 0;

  // For each document, find its top 5 most similar documents
  for (const doc of documents) {
    if (!doc.embedding) continue;

    try {
      // Use vector search to find similar documents
      const similar = await client.semanticSearch(doc.embedding, {
        limit: 6, // Get 6 (will exclude self)
        threshold: 0.60,
        types: ['ADR', 'PRD', 'Pattern']
      });

      // Create relationships to top similar documents (exclude self)
      for (const match of similar) {
        if (match.node.id === doc.id) continue; // Skip self

        try {
          await client.createRelationship(doc.id, match.node.id, {
            type: 'SIMILAR_TO',
            properties: {
              similarity: match.score,
              created_at: new Date().toISOString()
            }
          });
          created++;
        } catch (error) {
          // Relationship might already exist, continue
        }
      }

      if ((created) % 20 === 0) {
        console.log(`  ✓ Created ${created} similarity relationships...`);
      }
    } catch (error: any) {
      console.error(`  ✗ Error processing ${doc.id}: ${error.message}`);
    }
  }

  return created;
}

/**
 * Main function
 */
async function createRelationships() {
  console.log('============================================');
  console.log('  Create Document Relationships');
  console.log('  Target: Hetzner Neo4j');
  console.log('============================================\n');

  const bearerToken = process.env.GINKO_GRAPH_TOKEN || 'test_token_12345';
  const graphId = process.env.GINKO_GRAPH_ID || process.env.GRAPH_ID;

  if (!graphId) {
    console.error('❌ Error: GINKO_GRAPH_ID required');
    process.exit(1);
  }

  try {
    // Connect
    console.log('Step 1: Connecting to graph...');
    const client = await CloudGraphClient.fromBearerToken(bearerToken, graphId);
    console.log('✓ Connected\n');

    // Load documents
    console.log('Step 2: Loading documents...');
    const cypher = `
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n)
      WHERE n:ADR OR n:PRD OR n:Pattern
      RETURN n.id AS id,
             labels(n)[0] AS type,
             n.title AS title,
             n.content AS content,
             n.summary AS summary,
             n.embedding AS embedding
      ORDER BY n.id
    `;

    const documents = await client.runScopedQuery<any>(cypher);
    console.log(`✓ Loaded ${documents.length} documents\n`);

    // Extract explicit relationships from content
    console.log('Step 3: Extracting explicit relationships from content...');
    const explicitRels: DiscoveredRelationship[] = [];

    for (const doc of documents) {
      const content = [doc.title, doc.summary, doc.content]
        .filter(Boolean)
        .join('\n\n');

      const rels = findRelationships(doc.id, content);
      explicitRels.push(...rels);
    }

    console.log(`✓ Found ${explicitRels.length} explicit relationships\n`);

    // Deduplicate relationships
    const uniqueRels = new Map<string, DiscoveredRelationship>();
    for (const rel of explicitRels) {
      const key = `${rel.sourceId}-${rel.type}-${rel.targetId}`;
      if (!uniqueRels.has(key)) {
        uniqueRels.set(key, rel);
      }
    }

    console.log(`✓ ${uniqueRels.size} unique explicit relationships\n`);

    // Create explicit relationships
    console.log('Step 4: Creating explicit relationships in graph...');
    let explicitCreated = 0;
    let explicitFailed = 0;

    for (const rel of uniqueRels.values()) {
      try {
        await client.createRelationship(rel.sourceId, rel.targetId, {
          type: rel.type,
          properties: {
            context: rel.context,
            discovered_at: new Date().toISOString()
          }
        });
        explicitCreated++;
      } catch (error: any) {
        // Target might not exist or relationship already exists
        explicitFailed++;
      }
    }

    console.log(`✓ Created ${explicitCreated} explicit relationships`);
    if (explicitFailed > 0) {
      console.log(`  (${explicitFailed} failed - target not found or duplicate)\n`);
    } else {
      console.log();
    }

    // Create semantic similarity relationships
    console.log('Step 5: Creating semantic similarity relationships...');
    const similarityCreated = await createSimilarityRelationships(client, documents);
    console.log(`✓ Created ${similarityCreated} similarity relationships\n`);

    // Get final stats
    console.log('Step 6: Getting final statistics...');
    const stats = await client.getGraphStats();

    console.log('============================================');
    console.log('✅ Relationship creation complete!');
    console.log('============================================\n');

    console.log('Graph Statistics:');
    console.log(`  Nodes: ${stats.nodes.total}`);
    console.log(`  Relationships: ${stats.relationships.total}`);
    console.log('\n  Relationships by type:');
    Object.entries(stats.relationships.byType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });
    console.log();

    console.log('Next steps:');
    console.log('  1. View in Neo4j Browser: http://178.156.182.99:7474');
    console.log('  2. Run: MATCH p=(n)-[r]-(m) RETURN p LIMIT 50');
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createRelationships()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { createRelationships };
