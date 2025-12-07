#!/usr/bin/env ts-node
/**
 * Demo script for checkpoint functionality
 *
 * Usage: npx ts-node examples/checkpoint-demo.ts
 */

import {
  createCheckpoint,
  getCheckpoint,
  listCheckpoints,
  getLatestCheckpoint,
  deleteCheckpoint,
  exportCheckpoint
} from '../src/lib/checkpoint.js';

async function demo() {
  console.log('🔖 Checkpoint Demo\n');

  // Create a checkpoint
  console.log('1. Creating checkpoint for TASK-1...');
  const checkpoint1 = await createCheckpoint(
    'TASK-1',
    'agent_demo',
    'Before major refactor',
    { phase: 'implementation', step: 1 }
  );
  console.log(`   ✓ Created: ${checkpoint1.id}`);
  console.log(`   - Commit: ${checkpoint1.gitCommit.substring(0, 7)}`);
  console.log(`   - Files: ${checkpoint1.filesModified.length} modified`);
  console.log('');

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 100));

  // Create another checkpoint
  console.log('2. Creating second checkpoint...');
  const checkpoint2 = await createCheckpoint(
    'TASK-1',
    'agent_demo',
    'After refactor part 1',
    { phase: 'implementation', step: 2 }
  );
  console.log(`   ✓ Created: ${checkpoint2.id}\n`);

  // List checkpoints
  console.log('3. Listing all checkpoints for TASK-1:');
  const checkpoints = await listCheckpoints('TASK-1');
  console.log(`   Found ${checkpoints.length} checkpoints:`);
  for (const cp of checkpoints) {
    console.log(`   - ${cp.id}: ${cp.message || '(no message)'}`);
    console.log(`     Created: ${cp.timestamp.toISOString()}`);
    console.log(`     Commit: ${cp.gitCommit.substring(0, 7)}`);
  }
  console.log('');

  // Get specific checkpoint
  console.log('4. Retrieving specific checkpoint:');
  const retrieved = await getCheckpoint(checkpoint1.id);
  if (retrieved) {
    console.log(`   ✓ Retrieved: ${retrieved.id}`);
    console.log(`   - Message: ${retrieved.message}`);
    console.log(`   - Metadata:`, retrieved.metadata);
  }
  console.log('');

  // Get latest checkpoint
  console.log('5. Getting latest checkpoint for TASK-1:');
  const latest = await getLatestCheckpoint('TASK-1');
  if (latest) {
    console.log(`   ✓ Latest: ${latest.id}`);
    console.log(`   - Message: ${latest.message}`);
  }
  console.log('');

  // Export checkpoint
  console.log('6. Exporting checkpoint:');
  const exported = await exportCheckpoint(checkpoint1.id);
  console.log('   ✓ Exported as JSON:');
  console.log(exported.split('\n').slice(0, 10).join('\n'));
  console.log('   ...\n');

  // Cleanup
  console.log('7. Cleaning up demo checkpoints...');
  await deleteCheckpoint(checkpoint1.id);
  await deleteCheckpoint(checkpoint2.id);
  console.log('   ✓ Deleted demo checkpoints\n');

  console.log('✅ Demo complete!');
}

demo().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
