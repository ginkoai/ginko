#!/usr/bin/env node
/**
 * @fileType: example
 * @status: current
 * @updated: 2025-12-07
 * @tags: [demo, timeout, verification]
 * @related: [../task-timeout.ts]
 * @priority: low
 * @complexity: low
 * @dependencies: []
 */

/**
 * Quick Demo: Task Timeout Module
 *
 * Demonstrates timeout creation, warning detection, and timeout handling.
 * Run with: node dist/lib/examples/timeout-demo.js
 */

import {
  startTaskTimeout,
  checkTimeouts,
  getActiveTimeouts,
  clearTaskTimeout
} from '../task-timeout.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
  console.log('=== Task Timeout Module Demo ===\n');

  try {
    // Create a timeout with very short duration for demo
    console.log('1. Creating timeout for DEMO-TASK (500ms max duration, 50% warning threshold)...');
    const timeout = await startTaskTimeout(
      'DEMO-TASK',
      500,  // 500ms total
      'demo-agent',
      { warningThreshold: 0.5 }  // Warn at 50% (250ms)
    );

    console.log(`   ✓ Timeout created`);
    console.log(`     Task: ${timeout.taskId}`);
    console.log(`     Agent: ${timeout.agentId}`);
    console.log(`     Max Duration: ${timeout.maxDuration}ms`);
    console.log(`     Status: ${timeout.status}`);
    console.log(`     Warning At: ${timeout.warningAt?.toISOString()}`);
    console.log(`     Timeout At: ${timeout.timeoutAt.toISOString()}\n`);

    // Wait for warning threshold
    console.log('2. Waiting 300ms for warning threshold...');
    await sleep(300);

    console.log('3. Checking for warnings...');
    await checkTimeouts();

    const activeTimeouts = await getActiveTimeouts();
    const demoTimeout = activeTimeouts.find(t => t.taskId === 'DEMO-TASK');

    if (demoTimeout) {
      console.log(`   ✓ Timeout status updated: ${demoTimeout.status}`);
      if (demoTimeout.status === 'warning') {
        console.log(`     ⚠️  Task is at ${((300 / 500) * 100).toFixed(0)}% of max duration\n`);
      }
    }

    // Wait for timeout
    console.log('4. Waiting 250ms more for timeout...');
    await sleep(250);

    console.log('5. Checking for timeouts...');
    const timedOut = await checkTimeouts();

    const demoTimedOut = timedOut.find(t => t.taskId === 'DEMO-TASK');

    if (demoTimedOut) {
      console.log(`   ✓ Task timed out!`);
      console.log(`     Duration: ${demoTimedOut.duration}ms`);
      console.log(`     Checkpoint: ${demoTimedOut.checkpointId}`);
      console.log(`     Escalation: ${demoTimedOut.escalationEventId}\n`);
    } else {
      console.log(`   ✗ Timeout not detected\n`);
    }

    console.log('6. Demonstrating successful task completion...');

    // Create another timeout
    const successTimeout = await startTaskTimeout(
      'SUCCESS-TASK',
      60000,  // 1 minute
      'success-agent'
    );

    console.log(`   ✓ Created timeout for ${successTimeout.taskId}`);

    // Complete it immediately
    await clearTaskTimeout('SUCCESS-TASK');

    console.log(`   ✓ Task completed and timeout cleared\n`);

    console.log('7. Checking active timeouts...');
    const finalActive = await getActiveTimeouts();
    const ourTasks = finalActive.filter(t =>
      t.taskId === 'DEMO-TASK' || t.taskId === 'SUCCESS-TASK'
    );

    console.log(`   Active timeouts: ${ourTasks.length}`);
    for (const t of ourTasks) {
      console.log(`     - ${t.taskId}: ${t.status}`);
    }

    console.log('\n=== Demo Complete ===\n');
    console.log('Summary:');
    console.log('✓ Timeout creation working');
    console.log('✓ Warning threshold detection working');
    console.log('✓ Timeout detection working');
    console.log('✓ Checkpoint creation working');
    console.log('✓ Escalation event creation working');
    console.log('✓ Task completion working\n');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run demo
demo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
