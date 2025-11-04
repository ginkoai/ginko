/**
 * Example: Integrating Self-Hosted Embeddings with Ginko Graph
 *
 * This file demonstrates how to use the embeddings client to generate
 * embeddings for documents and store them in Neo4j for semantic search.
 *
 * Usage:
 *   ts-node scripts/example-embeddings-integration.ts
 */

import {
  EmbeddingsClient,
  generateEmbedding,
  generateBatchEmbeddings,
  checkEmbeddingsHealth,
} from '../src/embeddings-client';

// Example 1: Simple single embedding generation
async function example1_singleEmbedding() {
  console.log('\n=== Example 1: Single Embedding ===\n');

  const text = 'This is a document about TypeScript development best practices.';

  try {
    const result = await generateEmbedding(text);

    console.log(`✓ Generated embedding in ${result.latency}ms`);
    console.log(`✓ Dimensions: ${result.dimensions}`);
    console.log(`✓ First 5 values: [${result.embedding.slice(0, 5).map((v) => v.toFixed(4)).join(', ')}...]`);

    return result;
  } catch (error) {
    console.error('✗ Failed to generate embedding:', error);
    throw error;
  }
}

// Example 2: Batch embedding generation
async function example2_batchEmbeddings() {
  console.log('\n=== Example 2: Batch Embeddings ===\n');

  const documents = [
    'Introduction to React hooks and functional components',
    'Advanced TypeScript patterns for enterprise applications',
    'Building scalable Node.js APIs with Express',
    'Database design principles and normalization',
    'Testing strategies for modern web applications',
  ];

  try {
    const result = await generateBatchEmbeddings(documents);

    console.log(`✓ Generated ${result.count} embeddings in ${result.latency}ms`);
    console.log(`✓ Average: ${(result.latency / result.count).toFixed(2)}ms per embedding`);
    console.log(`✓ Dimensions: ${result.dimensions}`);

    // Show first embedding sample
    console.log(
      `✓ Sample embedding: [${result.embeddings[0].slice(0, 5).map((v) => v.toFixed(4)).join(', ')}...]`
    );

    return result;
  } catch (error) {
    console.error('✗ Failed to generate batch embeddings:', error);
    throw error;
  }
}

// Example 3: Custom client configuration
async function example3_customClient() {
  console.log('\n=== Example 3: Custom Client Configuration ===\n');

  const client = new EmbeddingsClient({
    apiUrl: process.env.EMBEDDINGS_API_URL || 'http://178.156.182.99:8080',
    timeout: 60000, // 60 seconds
    maxRetries: 5,
  });

  console.log('✓ Client configuration:', client.getConfig());

  const text = 'Testing with custom client configuration';
  const result = await client.generateEmbedding(text);

  console.log(`✓ Generated embedding with custom client in ${result.latency}ms`);

  return result;
}

// Example 4: Health check before operations
async function example4_healthCheck() {
  console.log('\n=== Example 4: Health Check ===\n');

  try {
    const health = await checkEmbeddingsHealth();

    console.log(`✓ Service status: ${health.status}`);
    console.log(`✓ Response time: ${health.latency}ms`);
    console.log(`✓ Model: ${health.model}`);
    console.log(`✓ Dimensions: ${health.dimensions}`);

    if (health.status !== 'ok') {
      console.warn('⚠ Service is not fully operational');
      return false;
    }

    return true;
  } catch (error) {
    console.error('✗ Health check failed:', error);
    return false;
  }
}

// Example 5: Error handling
async function example5_errorHandling() {
  console.log('\n=== Example 5: Error Handling ===\n');

  // Test with empty input
  try {
    await generateEmbedding('');
    console.error('✗ Should have thrown error for empty input');
  } catch (error) {
    console.log('✓ Correctly handled empty input error');
  }

  // Test with very long input (may hit limits)
  try {
    const longText = 'word '.repeat(10000);
    const result = await generateEmbedding(longText);
    console.log(`✓ Handled long input (${longText.length} chars) in ${result.latency}ms`);
  } catch (error) {
    console.log('✓ Correctly handled input length error');
  }
}

// Example 6: Integration with Neo4j (pseudo-code)
async function example6_neo4jIntegration() {
  console.log('\n=== Example 6: Neo4j Integration (Pseudo-code) ===\n');

  // This is a conceptual example - actual implementation would use neo4j-driver
  const document = {
    id: 'doc-123',
    content: 'A comprehensive guide to building REST APIs with Node.js and Express',
    title: 'Node.js REST API Guide',
  };

  // Generate embedding
  const embeddingResult = await generateEmbedding(document.content);

  console.log(`✓ Generated embedding for document: ${document.id}`);

  // Store in Neo4j (conceptual)
  const cypher = `
    MERGE (d:Document {id: $id})
    SET d.title = $title,
        d.content = $content,
        d.embedding = $embedding,
        d.updated = datetime()
  `;

  console.log('✓ Cypher query prepared:');
  console.log(`  - Document ID: ${document.id}`);
  console.log(`  - Embedding dimensions: ${embeddingResult.dimensions}`);
  console.log(`  - Generation time: ${embeddingResult.latency}ms`);

  // Example semantic search query
  const searchCypher = `
    MATCH (d:Document)
    WHERE d.embedding IS NOT NULL
    WITH d,
         gds.similarity.cosine(d.embedding, $queryEmbedding) AS similarity
    WHERE similarity > 0.8
    RETURN d.id, d.title, similarity
    ORDER BY similarity DESC
    LIMIT 10
  `;

  console.log('\n✓ Semantic search query prepared');
  console.log('  - Finds documents with >80% similarity');
  console.log('  - Returns top 10 results');
  console.log('  - Uses cosine similarity');
}

// Example 7: Batch processing with progress tracking
async function example7_batchWithProgress() {
  console.log('\n=== Example 7: Batch Processing with Progress ===\n');

  const documents = Array.from(
    { length: 25 },
    (_, i) => `Document ${i + 1}: Sample content for semantic indexing`
  );

  const batchSize = 10;
  const totalBatches = Math.ceil(documents.length / batchSize);

  console.log(`Processing ${documents.length} documents in ${totalBatches} batches...\n`);

  let totalLatency = 0;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    const result = await generateBatchEmbeddings(batch);
    totalLatency += result.latency;

    console.log(
      `  Batch ${batchNum}/${totalBatches}: ${result.count} embeddings in ${result.latency}ms (${(result.latency / result.count).toFixed(2)}ms avg)`
    );
  }

  console.log(`\n✓ Total time: ${totalLatency}ms`);
  console.log(`✓ Average: ${(totalLatency / documents.length).toFixed(2)}ms per document`);
}

// Main execution
async function main() {
  console.log('=========================================');
  console.log('  Embeddings Integration Examples');
  console.log('=========================================');

  try {
    // Check service health first
    const isHealthy = await example4_healthCheck();

    if (!isHealthy) {
      console.error('\n✗ Service is not healthy. Please check deployment.\n');
      console.error('Troubleshooting steps:');
      console.error('  1. Verify service is running: docker ps | grep embeddings-service');
      console.error('  2. Check logs: docker logs embeddings-service');
      console.error('  3. Test connectivity: curl http://178.156.182.99:8080/health');
      process.exit(1);
    }

    // Run examples
    await example1_singleEmbedding();
    await example2_batchEmbeddings();
    await example3_customClient();
    await example5_errorHandling();
    await example6_neo4jIntegration();
    await example7_batchWithProgress();

    console.log('\n=========================================');
    console.log('  All Examples Completed Successfully!');
    console.log('=========================================\n');
  } catch (error) {
    console.error('\n✗ Examples failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_singleEmbedding,
  example2_batchEmbeddings,
  example3_customClient,
  example4_healthCheck,
  example5_errorHandling,
  example6_neo4jIntegration,
  example7_batchWithProgress,
};
