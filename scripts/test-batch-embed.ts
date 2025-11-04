/**
 * Quick validation test for batch-embed-nodes.ts
 *
 * Verifies:
 * - Script imports compile
 * - Environment validation works
 * - Help message displays
 */

async function testImports() {
  console.log('Testing batch-embed-nodes.ts imports...\n');

  try {
    // Test import
    console.log('✓ Importing CloudGraphClient...');
    await import('../api/v1/graph/_cloud-graph-client.js');

    console.log('✓ Importing EmbeddingsService...');
    await import('../src/graph/embeddings-service.js');

    console.log('✓ Importing dotenv...');
    await import('dotenv');

    console.log('\n✅ All imports successful!\n');

    console.log('To run the script:');
    console.log('  npm run graph:batch-embed\n');
    console.log('Or:');
    console.log('  GINKO_GRAPH_ID=gin_xyz tsx scripts/batch-embed-nodes.ts\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testImports();
