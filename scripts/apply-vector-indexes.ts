/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: [neo4j, vector-indexes, migration, embeddings]
 * @related: [src/graph/schema/007-vector-indexes.cypher]
 * @priority: critical
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

import neo4j from 'neo4j-driver';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Apply Vector Indexes to Production Neo4j
 *
 * Reads the 007-vector-indexes.cypher schema and creates vector indexes
 * for all node types (ADR, PRD, Pattern, Gotcha, Session, CodeFile, ContextModule)
 */
async function applyVectorIndexes() {
  console.log('🔧 Applying Vector Indexes to Production Neo4j\n');

  // Configuration
  const config = {
    uri: process.env.NEO4J_URI || 'bolt://178.156.182.99:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
  };

  if (!config.password) {
    console.error('❌ NEO4J_PASSWORD environment variable not set');
    process.exit(1);
  }

  console.log(`📍 Connecting to: ${config.uri}`);

  // Create driver
  const driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.password)
  );

  try {
    // Verify connection
    await driver.verifyConnectivity();
    console.log('✓ Connected to Neo4j\n');

    const session = driver.session();

    try {
      // Vector index definitions (768 dimensions for all-mpnet-base-v2)
      const indexes = [
        { name: 'adr_embedding_index', label: 'ADR' },
        { name: 'prd_embedding_index', label: 'PRD' },
        { name: 'pattern_embedding_index', label: 'Pattern' },
        { name: 'gotcha_embedding_index', label: 'Gotcha' },
        { name: 'session_embedding_index', label: 'Session' },
        { name: 'codefile_embedding_index', label: 'CodeFile' },
        { name: 'contextmodule_embedding_index', label: 'ContextModule' },
      ];

      console.log(`📊 Creating ${indexes.length} vector indexes...\n`);

      // Create each index
      for (const index of indexes) {
        try {
          const query = `
            CREATE VECTOR INDEX ${index.name} IF NOT EXISTS
            FOR (n:${index.label})
            ON n.embedding
            OPTIONS {
              indexConfig: {
                \`vector.dimensions\`: 768,
                \`vector.similarity_function\`: 'cosine'
              }
            }
          `;

          console.log(`  Creating: ${index.name} (${index.label})...`);
          await session.run(query);
          console.log(`  ✓ ${index.name} created`);
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log(`  ⊘ ${index.name} already exists (skipping)`);
          } else {
            console.error(`  ❌ Failed to create ${index.name}:`, error.message);
          }
        }
      }

      console.log('\n📋 Verifying indexes...\n');

      // Verify indexes were created
      const verifyQuery = `
        SHOW INDEXES YIELD name, type, labelsOrTypes, properties
        WHERE type = 'VECTOR'
        RETURN name, labelsOrTypes, properties
      `;

      const result = await session.run(verifyQuery);

      if (result.records.length === 0) {
        console.log('⚠️  No vector indexes found');
      } else {
        console.log(`✓ Found ${result.records.length} vector indexes:\n`);
        result.records.forEach(record => {
          const name = record.get('name');
          const labels = record.get('labelsOrTypes');
          const props = record.get('properties');
          console.log(`  - ${name}`);
          console.log(`    Labels: ${labels.join(', ')}`);
          console.log(`    Properties: ${props.join(', ')}`);
        });
      }

      console.log('\n✅ Vector indexes applied successfully!');

    } finally {
      await session.close();
    }
  } catch (error: any) {
    console.error('\n❌ Error applying vector indexes:', error.message);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

// Run if called directly
if (require.main === module) {
  applyVectorIndexes().catch(console.error);
}

export { applyVectorIndexes };
