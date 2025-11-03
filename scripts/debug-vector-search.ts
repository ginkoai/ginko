import { runQuery, closeDriver } from '../api/v1/graph/_neo4j.js';
import { EmbeddingsService } from '../src/graph/embeddings-service.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugVectorSearch() {
  const embeddingsService = new EmbeddingsService();

  try {
    // Generate a query embedding
    await embeddingsService.initialize();
    const query = 'graph-based context discovery';
    const result = await embeddingsService.embed(query);

    console.log(`Query: "${query}"`);
    console.log(`Embedding dimensions: ${result.dimensions}\n`);

    // Check node structure
    console.log('Step 1: Check node structure...');
    const nodes = await runQuery(`
      MATCH (n:ADR)
      WHERE n.embedding IS NOT NULL
      RETURN n.id, n.title, n.graph_id, size(n.embedding) as dim
      LIMIT 3
    `);
    console.log('Sample nodes:', JSON.stringify(nodes, null, 2));

    // Try direct vector search
    console.log('\nStep 2: Try direct vector search...');
    try {
      const searchResults = await runQuery(`
        CALL db.index.vector.queryNodes('adr_embedding_index', 5, $queryEmbedding)
        YIELD node, score
        RETURN node.id as id, node.title as title, score
        ORDER BY score DESC
      `, { queryEmbedding: result.embedding });

      console.log(`Found ${searchResults.length} results:`);
      searchResults.forEach((r: any) => {
        console.log(`  - ${r.id}: ${r.title} (${(r.score * 100).toFixed(1)}%)`);
      });
    } catch (error: any) {
      console.error('Vector search error:', error.message);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await embeddingsService.dispose();
    await closeDriver();
  }
}

debugVectorSearch();
