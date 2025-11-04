/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-30
 * @tags: [embeddings, batch-processing, neo4j, migration]
 * @related: [embeddings-service.ts, load-all-documents.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@xenova/transformers, neo4j-driver]
 */

import { embeddingsService } from '../embeddings-service.js';
import { neo4jClient } from '../neo4j-client.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Document to embed
 */
interface DocumentToEmbed {
  id: string;
  type: 'ADR' | 'PRD' | 'Pattern' | 'Gotcha' | 'Session' | 'CodeFile' | 'ContextModule';
  text: string; // Combined title + content for embedding
}

/**
 * Generate embeddings for all documents in Neo4j
 *
 * Process:
 * 1. Load all documents from Neo4j
 * 2. Generate embeddings using all-mpnet-base-v2
 * 3. Update nodes with embedding vectors
 * 4. Create SIMILAR_TO relationships based on similarity
 *
 * Performance:
 * - ~89 documents (60 ADRs + 29 PRDs)
 * - Estimated time: ~2 seconds on CPU
 * - Memory usage: ~1GB during processing
 */
async function generateEmbeddings() {
  console.log('============================================');
  console.log('  Embedding Generation Script');
  console.log('  Model: all-mpnet-base-v2 (768 dims)');
  console.log('============================================\n');

  try {
    // 1. Connect to Neo4j
    console.log('Step 1: Connecting to Neo4j...');
    await neo4jClient.connect();

    // 2. Initialize embeddings service
    console.log('\nStep 2: Initializing embeddings model...');
    await embeddingsService.initialize();

    // 3. Load all documents
    console.log('\nStep 3: Loading documents from Neo4j...');
    const documents = await loadAllDocuments();
    console.log(`✓ Loaded ${documents.length} documents`);

    // Group by type for reporting
    const byType = documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('  Document breakdown:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });

    if (documents.length === 0) {
      console.log('\n⚠️  No documents found. Run load-all-documents.ts first.');
      return;
    }

    // 4. Generate embeddings
    console.log('\nStep 4: Generating embeddings...');
    const texts = documents.map(doc => doc.text);
    const embeddings = await embeddingsService.embedBatch(texts);

    console.log(`✓ Generated ${embeddings.length} embeddings`);

    // 5. Update Neo4j with embeddings
    console.log('\nStep 5: Updating Neo4j with embeddings...');
    let updatedCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const embedding = embeddings[i];

      await neo4jClient.query(
        `
        MATCH (n:${doc.type} {id: $id})
        SET n.embedding = $embedding,
            n.embedding_model = $model,
            n.embedding_dimensions = $dimensions,
            n.embedding_generated_at = datetime()
        RETURN n.id
        `,
        {
          id: doc.id,
          embedding: embedding.embedding,
          model: embedding.model,
          dimensions: embedding.dimensions,
        }
      );

      updatedCount++;

      if (updatedCount % 10 === 0) {
        console.log(`  Progress: ${updatedCount}/${documents.length}`);
      }
    }

    console.log(`✓ Updated ${updatedCount} nodes with embeddings`);

    // 6. Create similarity relationships
    console.log('\nStep 6: Creating SIMILAR_TO relationships...');
    const similarityCount = await createSimilarityRelationships(documents, embeddings);
    console.log(`✓ Created ${similarityCount} similarity relationships`);

    // 7. Verify
    console.log('\nStep 7: Verifying embeddings...');
    await verifyEmbeddings();

    console.log('\n============================================');
    console.log('✅ Embedding generation complete!');
    console.log('============================================\n');

    // Report statistics
    const stats = await getEmbeddingStats();
    console.log('Statistics:');
    console.log(`  Total nodes with embeddings: ${stats.totalEmbedded}`);
    console.log(`  Total similarity relationships: ${stats.totalSimilarities}`);
    console.log(`  Average similarities per node: ${stats.avgSimilarities.toFixed(1)}`);

  } catch (error) {
    console.error('\n❌ Error generating embeddings:', error);
    throw error;
  } finally {
    await neo4jClient.close();
    await embeddingsService.dispose();
  }
}

/**
 * Load all documents from Neo4j that need embeddings
 */
async function loadAllDocuments(): Promise<DocumentToEmbed[]> {
  const nodeTypes = ['ADR', 'PRD', 'Pattern', 'Gotcha', 'Session', 'CodeFile', 'ContextModule'];
  const documents: DocumentToEmbed[] = [];

  for (const type of nodeTypes) {
    const result = await neo4jClient.query(`
      MATCH (n:${type})
      RETURN n.id AS id,
             n.title AS title,
             n.content AS content,
             n.summary AS summary,
             n.description AS description
    `);

    for (const record of result.records) {
      const id = record.get('id');
      const title = record.get('title') || '';
      const content = record.get('content') || '';
      const summary = record.get('summary') || '';
      const description = record.get('description') || '';

      // Combine title and content for embedding
      // Weight title more heavily (appears twice)
      const text = [title, title, summary, description, content]
        .filter(Boolean)
        .join('\n\n')
        .trim();

      if (text) {
        documents.push({
          id,
          type: type as DocumentToEmbed['type'],
          text,
        });
      }
    }
  }

  return documents;
}

/**
 * Create SIMILAR_TO relationships based on embedding similarity
 * Only creates relationships for similarity > 0.75 (high similarity)
 */
async function createSimilarityRelationships(
  documents: DocumentToEmbed[],
  embeddings: { embedding: number[] }[]
): Promise<number> {
  const SIMILARITY_THRESHOLD = 0.75;
  const MAX_SIMILARITIES_PER_NODE = 5;

  let relationshipCount = 0;

  // Clear existing SIMILAR_TO relationships
  await neo4jClient.query('MATCH ()-[r:SIMILAR_TO]->() DELETE r');

  // Compute pairwise similarities
  for (let i = 0; i < documents.length; i++) {
    const similarities: { docIndex: number; score: number }[] = [];

    for (let j = 0; j < documents.length; j++) {
      if (i === j) continue;

      const similarity = cosineSimilarity(
        embeddings[i].embedding,
        embeddings[j].embedding
      );

      if (similarity > SIMILARITY_THRESHOLD) {
        similarities.push({ docIndex: j, score: similarity });
      }
    }

    // Keep top K most similar
    similarities.sort((a, b) => b.score - a.score);
    const topSimilarities = similarities.slice(0, MAX_SIMILARITIES_PER_NODE);

    // Create relationships
    for (const { docIndex, score } of topSimilarities) {
      const sourceDoc = documents[i];
      const targetDoc = documents[docIndex];

      await neo4jClient.query(
        `
        MATCH (source:${sourceDoc.type} {id: $sourceId})
        MATCH (target:${targetDoc.type} {id: $targetId})
        CREATE (source)-[r:SIMILAR_TO {
          similarity: $similarity,
          computed_at: datetime()
        }]->(target)
        `,
        {
          sourceId: sourceDoc.id,
          targetId: targetDoc.id,
          similarity: score,
        }
      );

      relationshipCount++;
    }
  }

  return relationshipCount;
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Verify embeddings are created correctly
 */
async function verifyEmbeddings() {
  const result = await neo4jClient.queryRecords(`
    MATCH (n)
    WHERE n.embedding IS NOT NULL
    RETURN labels(n)[0] AS type, count(n) AS count
    ORDER BY count DESC
  `);

  console.log('\n  Embeddings by node type:');
  result.forEach(record => {
    console.log(`    - ${record.type}: ${record.count} nodes`);
  });

  // Check a sample embedding
  const sample = await neo4jClient.queryRecords(`
    MATCH (n)
    WHERE n.embedding IS NOT NULL
    RETURN n.id, size(n.embedding) AS dimensions
    LIMIT 1
  `);

  if (sample.length > 0) {
    console.log(`\n  Sample verification:`);
    console.log(`    Node: ${sample[0].id}`);
    console.log(`    Dimensions: ${sample[0].dimensions}`);
    console.log(`    Expected: 768`);
    console.log(`    Match: ${sample[0].dimensions === 768 ? '✓' : '✗'}`);
  }
}

/**
 * Get embedding statistics
 */
async function getEmbeddingStats() {
  const totalEmbedded = await neo4jClient.queryRecords(`
    MATCH (n)
    WHERE n.embedding IS NOT NULL
    RETURN count(n) AS count
  `);

  const similarityStats = await neo4jClient.queryRecords(`
    MATCH ()-[r:SIMILAR_TO]->()
    WITH count(r) AS total
    MATCH (n)
    WHERE exists((n)-[:SIMILAR_TO]->())
    WITH total, count(DISTINCT n) AS nodesWithSimilarities
    RETURN total, nodesWithSimilarities,
           toFloat(total) / toFloat(nodesWithSimilarities) AS avgSimilarities
  `);

  return {
    totalEmbedded: totalEmbedded[0]?.count || 0,
    totalSimilarities: similarityStats[0]?.total || 0,
    avgSimilarities: similarityStats[0]?.avgSimilarities || 0,
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateEmbeddings()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { generateEmbeddings };
