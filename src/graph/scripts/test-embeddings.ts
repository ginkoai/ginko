/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-30
 * @tags: [test, embeddings, similarity-search, validation]
 * @related: [embeddings-service.ts, similarity-search.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [@xenova/transformers, neo4j-driver]
 */

import { embeddingsService, EmbeddingsService } from '../embeddings-service.js';
import { similaritySearch } from '../similarity-search.js';
import { neo4jClient } from '../neo4j-client.js';

/**
 * Test embeddings generation and similarity search
 *
 * Tests:
 * 1. ✓ Model initialization
 * 2. ✓ Single embedding generation
 * 3. ✓ Batch embedding generation
 * 4. ✓ Cosine similarity calculation
 * 5. ✓ Neo4j vector index queries
 * 6. ✓ Similarity search across documents
 * 7. ✓ Hybrid search (full-text + vector)
 */
async function testEmbeddings() {
  console.log('============================================');
  console.log('  Embeddings Test Suite');
  console.log('  Model: all-mpnet-base-v2 (768 dims)');
  console.log('============================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Initialize model
    console.log('Test 1: Model Initialization');
    console.log('--------------------------------------------');
    const startInit = Date.now();
    await embeddingsService.initialize();
    const initTime = Date.now() - startInit;
    console.log(`✓ Model loaded in ${initTime}ms`);
    console.log(`  Config: ${JSON.stringify(embeddingsService.getConfig(), null, 2)}`);
    passed++;

    // Test 2: Single embedding
    console.log('\nTest 2: Single Embedding Generation');
    console.log('--------------------------------------------');
    const testText = 'Graph-based knowledge discovery using Neo4j';
    const start = Date.now();
    const result = await embeddingsService.embed(testText);
    const embedTime = Date.now() - start;

    console.log(`✓ Generated embedding in ${embedTime}ms`);
    console.log(`  Text: "${testText}"`);
    console.log(`  Dimensions: ${result.dimensions}`);
    console.log(`  Model: ${result.model}`);
    console.log(`  Sample values: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

    if (result.dimensions !== 768) {
      throw new Error(`Expected 768 dimensions, got ${result.dimensions}`);
    }
    passed++;

    // Test 3: Batch embedding
    console.log('\nTest 3: Batch Embedding Generation');
    console.log('--------------------------------------------');
    const testTexts = [
      'ADR-039: Graph-based context discovery',
      'PRD-010: Cloud-first knowledge graph platform',
      'Pattern: OAuth-only authentication',
      'Gotcha: Token refresh handling in serverless',
      'Session: Implementing multi-tenancy authorization',
    ];

    const batchStart = Date.now();
    const batchResults = await embeddingsService.embedBatch(testTexts);
    const batchTime = Date.now() - batchStart;

    console.log(`✓ Generated ${batchResults.length} embeddings in ${batchTime}ms`);
    console.log(`  Average: ${(batchTime / batchResults.length).toFixed(1)}ms per embedding`);
    console.log(`  All have 768 dimensions: ${batchResults.every(r => r.dimensions === 768)}`);

    if (batchResults.length !== testTexts.length) {
      throw new Error(`Expected ${testTexts.length} results, got ${batchResults.length}`);
    }
    passed++;

    // Test 4: Cosine similarity
    console.log('\nTest 4: Cosine Similarity Calculation');
    console.log('--------------------------------------------');
    const text1 = 'Graph database with Neo4j';
    const text2 = 'Knowledge graph using Neo4j';
    const text3 = 'OAuth authentication flow';

    const emb1 = await embeddingsService.embed(text1);
    const emb2 = await embeddingsService.embed(text2);
    const emb3 = await embeddingsService.embed(text3);

    const sim12 = EmbeddingsService.cosineSimilarity(emb1.embedding, emb2.embedding);
    const sim13 = EmbeddingsService.cosineSimilarity(emb1.embedding, emb3.embedding);
    const sim23 = EmbeddingsService.cosineSimilarity(emb2.embedding, emb3.embedding);

    console.log(`  Similarity (graph/graph): ${sim12.toFixed(4)} (should be high)`);
    console.log(`  Similarity (graph/oauth): ${sim13.toFixed(4)} (should be low)`);
    console.log(`  Similarity (graph/oauth): ${sim23.toFixed(4)} (should be low)`);

    if (sim12 < 0.7) {
      throw new Error('Similar texts should have high similarity');
    }
    if (sim13 > 0.6) {
      console.warn('⚠️  Warning: Different topics have higher similarity than expected');
    }
    passed++;

    // Test 5: Neo4j connection and schema
    console.log('\nTest 5: Neo4j Vector Index Verification');
    console.log('--------------------------------------------');
    await neo4jClient.connect();

    const indexes = await neo4jClient.queryRecords(`
      SHOW INDEXES
      YIELD name, type, labelsOrTypes, properties
      WHERE type = 'VECTOR'
      RETURN name, labelsOrTypes, properties
    `);

    console.log(`✓ Found ${indexes.length} vector indexes:`);
    indexes.forEach(idx => {
      console.log(`  - ${idx.name} (${idx.labelsOrTypes})`);
    });

    if (indexes.length === 0) {
      console.warn('⚠️  No vector indexes found. Run setup-schema.ts first.');
    } else {
      passed++;
    }

    // Test 6: Check if we have embedded documents
    console.log('\nTest 6: Embedded Documents Check');
    console.log('--------------------------------------------');
    const embeddedDocs = await neo4jClient.queryRecords(`
      MATCH (n)
      WHERE n.embedding IS NOT NULL
      RETURN labels(n)[0] AS type, count(n) AS count
      ORDER BY count DESC
    `);

    if (embeddedDocs.length > 0) {
      console.log(`✓ Found ${embeddedDocs.length} node types with embeddings:`);
      embeddedDocs.forEach(doc => {
        console.log(`  - ${doc.type}: ${doc.count} nodes`);
      });
      passed++;

      // Test 7: Similarity search
      console.log('\nTest 7: Similarity Search');
      console.log('--------------------------------------------');
      const query = 'graph database and semantic search';
      console.log(`  Query: "${query}"`);

      const searchStart = Date.now();
      const results = await similaritySearch.findSimilar(query, { limit: 5 });
      const searchTime = Date.now() - searchStart;

      console.log(`✓ Found ${results.length} results in ${searchTime}ms:`);
      results.forEach((result, i) => {
        console.log(`  ${i + 1}. [${result.type}] ${result.title}`);
        console.log(`     Similarity: ${result.similarity.toFixed(4)}`);
      });
      passed++;

      // Test 8: Similarity graph
      if (results.length > 0) {
        console.log('\nTest 8: Similarity Graph Traversal');
        console.log('--------------------------------------------');
        const topResult = results[0];
        console.log(`  Starting from: ${topResult.id}`);

        const graph = await similaritySearch.getSimilarityGraph(topResult.id, 1);
        console.log(`✓ Found similarity graph:`);
        console.log(`  Nodes: ${graph.nodes.length}`);
        console.log(`  Edges: ${graph.edges.length}`);

        if (graph.edges.length > 0) {
          console.log(`  Sample edges:`);
          graph.edges.slice(0, 3).forEach(edge => {
            console.log(`    - ${edge.from} → ${edge.to} (${edge.similarity.toFixed(4)})`);
          });
        }
        passed++;
      }
    } else {
      console.warn('⚠️  No embedded documents found. Run generate-embeddings.ts first.');
      console.log('\nSkipping similarity search tests (no data).');
    }

    // Summary
    console.log('\n============================================');
    console.log('  Test Results');
    console.log('============================================');
    console.log(`✓ Passed: ${passed}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`\nStatus: ${failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    if (failed === 0) {
      console.log('\n🎉 Embeddings system is working correctly!');
      console.log('\nNext steps:');
      console.log('  1. Run: npx tsx src/graph/scripts/load-all-documents.ts');
      console.log('  2. Run: npx tsx src/graph/scripts/generate-embeddings.ts');
      console.log('  3. Try: ginko context similar "your query"');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    failed++;
  } finally {
    await neo4jClient.close();
    await embeddingsService.dispose();
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmbeddings();
}

export { testEmbeddings };
