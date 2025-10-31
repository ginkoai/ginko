/**
 * Analyze cross-type similarities to understand relationship patterns
 */

import { neo4jClient } from '../neo4j-client.js';

async function analyzeSimilarities() {
  try {
    await neo4jClient.connect();

    // Get all documents with embeddings
    const docs = await neo4jClient.queryRecords(`
      MATCH (n)
      WHERE n.embedding IS NOT NULL
      RETURN n.id AS id,
             labels(n)[0] AS type,
             n.title AS title,
             n.embedding AS embedding
    `);

    console.log(`\nAnalyzing ${docs.length} documents...\n`);

    // Compute cross-type similarities
    const prds = docs.filter(d => d.type === 'PRD');
    const adrs = docs.filter(d => d.type === 'ADR');

    console.log(`PRDs: ${prds.length}, ADRs: ${adrs.length}\n`);

    const crossSimilarities: any[] = [];

    for (const prd of prds) {
      for (const adr of adrs) {
        const similarity = cosineSimilarity(prd.embedding, adr.embedding);
        crossSimilarities.push({
          prd: prd.title,
          adr: adr.title,
          similarity
        });
      }
    }

    // Sort by similarity
    crossSimilarities.sort((a, b) => b.similarity - a.similarity);

    console.log('Top 20 PRD-ADR similarities:');
    console.log('─'.repeat(80));
    crossSimilarities.slice(0, 20).forEach((item, i) => {
      console.log(`${i + 1}. ${item.similarity.toFixed(4)}`);
      console.log(`   PRD: ${item.prd.substring(0, 60)}`);
      console.log(`   ADR: ${item.adr.substring(0, 60)}`);
      console.log();
    });

    // Check existing relationships
    const existing = await neo4jClient.queryRecords(`
      MATCH (a)-[r:SIMILAR_TO]->(b)
      RETURN labels(a)[0] AS from_type,
             labels(b)[0] AS to_type,
             count(*) AS count
      ORDER BY count DESC
    `);

    console.log('\nExisting SIMILAR_TO relationships:');
    console.log('─'.repeat(80));
    existing.forEach(rel => {
      console.log(`${rel.from_type} → ${rel.to_type}: ${rel.count}`);
    });

    // Statistics
    const above75 = crossSimilarities.filter(s => s.similarity > 0.75).length;
    const above70 = crossSimilarities.filter(s => s.similarity > 0.70).length;
    const above65 = crossSimilarities.filter(s => s.similarity > 0.65).length;
    const above60 = crossSimilarities.filter(s => s.similarity > 0.60).length;

    console.log('\nPRD-ADR Similarity Distribution:');
    console.log('─'.repeat(80));
    console.log(`Above 0.75: ${above75} pairs`);
    console.log(`Above 0.70: ${above70} pairs`);
    console.log(`Above 0.65: ${above65} pairs`);
    console.log(`Above 0.60: ${above60} pairs`);

    console.log('\n✓ Analysis complete');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await neo4jClient.close();
  }
}

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

analyzeSimilarities();
