/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [neo4j, vector-indexes, embeddings, voyage-ai, adr-045]
 * @related: [_neo4j.ts, create-vector-indexes.ts, ADR-045-voyage-ai-embedding-provider.md]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, dotenv]
 */

import { getDriver, runQuery, closeDriver, verifyConnection } from '../dashboard/src/app/api/v1/graph/_neo4j.js';
import dotenv from 'dotenv';

dotenv.config();

interface VectorIndexInfo {
  name: string;
  type: string;
  labelsOrTypes: string[];
  properties: string[];
}

/**
 * Setup Neo4j vector indexes for Voyage AI embeddings (ADR-045)
 *
 * Creates knowledge_embeddings vector index on KnowledgeNode.embedding
 * Configured for 1024 dimensions with cosine similarity (Voyage AI voyage-3.5)
 *
 * Usage:
 *   npx tsx scripts/setup-vector-indexes.ts          # Create/verify indexes
 *   npx tsx scripts/setup-vector-indexes.ts --drop   # Drop and recreate
 */
async function setupVectorIndexes() {
  const shouldDrop = process.argv.includes('--drop');

  console.log('============================================');
  console.log('  Neo4j Vector Index Setup (ADR-045)');
  console.log('  Provider: Voyage AI voyage-3.5');
  console.log('  Dimensions: 1024 (recommended balance)');
  console.log('  Similarity: Cosine');
  console.log('============================================\n');

  console.log(`Target: ${process.env.NEO4J_URI || 'bolt://localhost:7687'}`);
  console.log();

  try {
    // Step 1: Verify connectivity
    console.log('Step 1: Verifying Neo4j connection...');
    const isConnected = await verifyConnection();

    if (!isConnected) {
      throw new Error('Failed to connect to Neo4j. Check NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD');
    }

    console.log('✓ Connected successfully\n');

    // Step 2: Drop existing index if --drop flag provided
    if (shouldDrop) {
      console.log('Step 2: Dropping existing vector index...');
      try {
        await runQuery('DROP INDEX knowledge_embeddings IF EXISTS');
        console.log('✓ Dropped existing index\n');
      } catch (error: any) {
        console.log('✓ No existing index to drop\n');
      }
    }

    // Step 3: Create vector index
    console.log(`Step ${shouldDrop ? '3' : '2'}: Creating vector index...`);

    const indexName = 'knowledge_embeddings';
    const nodeLabel = 'KnowledgeNode';
    const propertyName = 'embedding';
    const dimensions = 1024;
    const similarityFunction = 'cosine';

    try {
      // Neo4j 5.x vector index syntax
      const createIndexCypher = `
        CREATE VECTOR INDEX ${indexName} IF NOT EXISTS
        FOR (n:${nodeLabel})
        ON n.${propertyName}
        OPTIONS {
          indexConfig: {
            \`vector.dimensions\`: ${dimensions},
            \`vector.similarity_function\`: '${similarityFunction}'
          }
        }
      `;

      await runQuery(createIndexCypher);
      console.log(`✓ Created index: ${indexName}`);
      console.log(`  - Node label: ${nodeLabel}`);
      console.log(`  - Property: ${propertyName}`);
      console.log(`  - Dimensions: ${dimensions}`);
      console.log(`  - Similarity: ${similarityFunction}\n`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`✓ Index already exists: ${indexName}\n`);
      } else {
        throw error;
      }
    }

    // Step 4: Verify index creation
    console.log(`Step ${shouldDrop ? '4' : '3'}: Verifying vector indexes...`);

    const indexes = await runQuery<VectorIndexInfo>(`
      SHOW INDEXES
      YIELD name, type, labelsOrTypes, properties
      WHERE type = 'VECTOR'
      RETURN name, type, labelsOrTypes, properties
    `);

    if (indexes.length === 0) {
      console.log('⚠ No vector indexes found (may still be building)\n');
    } else {
      console.log(`✓ Found ${indexes.length} vector index(es):\n`);
      indexes.forEach((idx: any) => {
        console.log(`  📊 ${idx.name}`);
        console.log(`     Labels: ${idx.labelsOrTypes.join(', ')}`);
        console.log(`     Properties: ${idx.properties.join(', ')}`);
        console.log(`     Type: ${idx.type}`);
        console.log();
      });
    }

    // Step 5: Check index status
    console.log(`Step ${shouldDrop ? '5' : '4'}: Checking index status...`);

    try {
      const indexStatus = await runQuery(`
        SHOW INDEXES
        YIELD name, state, populationPercent
        WHERE name = 'knowledge_embeddings'
        RETURN name, state, populationPercent
      `);

      if (indexStatus.length > 0) {
        const status = indexStatus[0] as any;
        console.log(`✓ Index status: ${status.state}`);
        console.log(`  Population: ${status.populationPercent}%\n`);

        if (status.state === 'ONLINE') {
          console.log('✅ Index is ready for queries!\n');
        } else if (status.state === 'POPULATING') {
          console.log('⏳ Index is building... (queries will work but may be slow)\n');
        } else {
          console.log(`⚠ Index state: ${status.state}\n`);
        }
      }
    } catch (error: any) {
      console.log('⚠ Could not check index status (may not be supported)\n');
    }

    // Success summary
    console.log('============================================');
    console.log('✅ Vector index setup complete!');
    console.log('============================================\n');

    console.log('Next steps:');
    console.log('  1. Generate embeddings: npx tsx scripts/batch-embed-nodes.ts');
    console.log('  2. Verify embeddings: npx tsx scripts/verify-embeddings.ts');
    console.log('  3. Test semantic search: npx tsx scripts/debug-vector-search.ts');
    console.log();
    console.log('Configuration (ADR-045):');
    console.log('  - Embedding provider: Voyage AI voyage-3.5');
    console.log('  - Dimensions: 1024 (recommended for balance)');
    console.log('  - Free tier: 200M tokens = 119 months at 100-user scale');
    console.log('  - Cost after free tier: $0.06 per 1M tokens');
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error setting up vector indexes:', error.message);

    if (error.code === 'ServiceUnavailable') {
      console.error('\nConnection failed. Check:');
      console.error('  1. NEO4J_URI is correct');
      console.error('  2. Neo4j server is running');
      console.error('  3. Network connectivity');
    } else if (error.code === 'Neo.ClientError.Security.Unauthorized') {
      console.error('\nAuthentication failed. Check:');
      console.error('  1. NEO4J_USER is correct');
      console.error('  2. NEO4J_PASSWORD is correct');
      console.error('  3. Credentials have no trailing newlines');
    } else {
      console.error('\nStack trace:', error.stack);
    }

    process.exit(1);
  } finally {
    await closeDriver();
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupVectorIndexes()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { setupVectorIndexes };
