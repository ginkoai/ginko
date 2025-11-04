/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: [neo4j, vector-indexes, setup]
 * @related: [src/graph/schema/007-vector-indexes.cypher]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver, dotenv]
 */

import { getDriver, runQuery, closeDriver } from '../api/v1/graph/_neo4j.js';
import dotenv from 'dotenv';

dotenv.config();

const NODE_TYPES = [
  { name: 'adr_embedding_index', label: 'ADR' },
  { name: 'prd_embedding_index', label: 'PRD' },
  { name: 'pattern_embedding_index', label: 'Pattern' },
  { name: 'gotcha_embedding_index', label: 'Gotcha' },
  { name: 'session_embedding_index', label: 'Session' },
  { name: 'codefile_embedding_index', label: 'CodeFile' },
  { name: 'contextmodule_embedding_index', label: 'ContextModule' }
];

async function createVectorIndexes() {
  console.log('============================================');
  console.log('  Create Vector Indexes');
  console.log('  Model: all-mpnet-base-v2 (768 dims)');
  console.log('============================================\n');

  console.log('Target: Hetzner Neo4j');
  console.log(`URI: ${process.env.NEO4J_URI}`);
  console.log();

  try {
    console.log('Step 1: Connecting to Neo4j...');
    const driver = getDriver();
    await driver.verifyConnectivity();
    console.log('✓ Connected\n');

    console.log('Step 2: Creating vector indexes...');

    for (const { name, label } of NODE_TYPES) {
      try {
        const cypher = `
          CREATE VECTOR INDEX ${name} IF NOT EXISTS
          FOR (n:${label})
          ON n.embedding
          OPTIONS {
            indexConfig: {
              \`vector.dimensions\`: 768,
              \`vector.similarity_function\`: 'cosine'
            }
          }
        `;

        await runQuery(cypher);
        console.log(`  ✓ Created index: ${name} for :${label}`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`  ✓ Index exists: ${name} for :${label}`);
        } else {
          console.error(`  ✗ Failed to create ${name}: ${error.message}`);
        }
      }
    }

    console.log();
    console.log('Step 3: Verifying indexes...');

    const indexes = await runQuery(`
      SHOW INDEXES
      YIELD name, type, labelsOrTypes, properties
      WHERE type = 'VECTOR'
      RETURN name, labelsOrTypes, properties
    `);

    console.log(`✓ Found ${indexes.length} vector indexes:`);
    indexes.forEach((idx: any) => {
      console.log(`  - ${idx.name}: ${idx.labelsOrTypes.join(', ')}`);
    });

    console.log('\n============================================');
    console.log('✅ Vector indexes ready!');
    console.log('============================================\n');

    console.log('Next steps:');
    console.log('  1. Test semantic search: npx tsx scripts/verify-embeddings.ts');
    console.log('  2. Query via CLI: ginko graph query "your search term"');
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createVectorIndexes()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { createVectorIndexes };
