/**
 * @fileType: example
 * @status: current
 * @updated: 2025-12-07
 * @tags: [example, timeout, orchestrator, integration]
 * @related: [../task-timeout.ts, ../orchestrator-state.ts]
 * @priority: low
 * @complexity: low
 * @dependencies: []
 */

/**
 * Example: Task Timeout Integration with Orchestrator
 *
 * This example shows how to integrate the task timeout module
 * into the orchestrator workflow.
 */

import {
  startTaskTimeout,
  checkTimeouts,
  clearTaskTimeout,
  getActiveTimeouts,
  TimeoutMonitor,
  TimeoutConfig
} from '../task-timeout.js';

// ============================================================
// Example 1: Basic Timeout Tracking
// ============================================================

async function exampleBasicTimeout() {
  console.log('=== Example 1: Basic Timeout Tracking ===\n');

  // When assigning a task to an agent
  const taskId = 'TASK-1';
  const agentId = 'agent-001';
  const maxDuration = 30 * 60 * 1000; // 30 minutes

  console.log(`Assigning ${taskId} to ${agentId} with ${maxDuration / 1000}s timeout`);

  const timeout = await startTaskTimeout(taskId, maxDuration, agentId);

  console.log(`Timeout started: ${timeout.taskId}`);
  console.log(`  Warning at: ${timeout.warningAt?.toISOString()}`);
  console.log(`  Timeout at: ${timeout.timeoutAt.toISOString()}`);

  // ... agent works on task ...

  // When task completes successfully
  console.log(`\nTask ${taskId} completed successfully`);
  await clearTaskTimeout(taskId);

  console.log('Timeout cleared\n');
}

// ============================================================
// Example 2: Timeout Monitoring in Orchestration Loop
// ============================================================

async function exampleOrchestrationLoop() {
  console.log('=== Example 2: Orchestration Loop with Timeout Checks ===\n');

  // Start background monitor
  const monitor = new TimeoutMonitor({
    checkInterval: 30000 // Check every 30 seconds
  });

  monitor.start();
  console.log('Timeout monitor started\n');

  // Simulate orchestration loop
  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`--- Orchestration Cycle ${cycle} ---`);

    // Check for timed out tasks
    const timedOutTasks = await checkTimeouts();

    if (timedOutTasks.length > 0) {
      console.log(`Found ${timedOutTasks.length} timed out tasks:`);

      for (const task of timedOutTasks) {
        console.log(`  ${task.taskId}:`);
        console.log(`    Agent: ${task.agentId}`);
        console.log(`    Duration: ${task.duration / 1000}s`);
        console.log(`    Checkpoint: ${task.checkpointId}`);
        console.log(`    Escalation: ${task.escalationEventId}`);

        // Reassign task to different agent
        console.log(`    → Reassigning to different agent`);
      }
    } else {
      console.log('No timeouts detected');
    }

    // Check active timeouts
    const activeTimeouts = await getActiveTimeouts();
    console.log(`Active timeouts: ${activeTimeouts.length}`);

    for (const timeout of activeTimeouts) {
      const remaining = timeout.timeoutAt.getTime() - Date.now();
      console.log(`  ${timeout.taskId}: ${remaining / 1000}s remaining (${timeout.status})`);
    }

    console.log();

    // Wait before next cycle
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Stop monitor
  monitor.stop();
  console.log('Timeout monitor stopped\n');
}

// ============================================================
// Example 3: Custom Timeout Configuration
// ============================================================

async function exampleCustomConfiguration() {
  console.log('=== Example 3: Custom Timeout Configuration ===\n');

  const config: TimeoutConfig = {
    defaultTimeout: 15 * 60 * 1000,  // 15 minutes
    warningThreshold: 0.75,          // Warn at 75%
    checkInterval: 15000             // Check every 15 seconds
  };

  // Short timeout for testing tasks
  const testTimeout = await startTaskTimeout(
    'TEST-1',
    5 * 60 * 1000,  // 5 minutes
    'agent-test',
    config
  );

  console.log(`Test task timeout started:`);
  console.log(`  Max duration: ${testTimeout.maxDuration / 1000}s`);
  console.log(`  Warning at: ${testTimeout.warningAt?.toISOString()}`);

  // Long timeout for complex tasks
  const complexTimeout = await startTaskTimeout(
    'COMPLEX-1',
    2 * 60 * 60 * 1000,  // 2 hours
    'agent-senior',
    { warningThreshold: 0.9 }  // Warn at 90%
  );

  console.log(`\nComplex task timeout started:`);
  console.log(`  Max duration: ${complexTimeout.maxDuration / 1000}s`);
  console.log(`  Warning at: ${complexTimeout.warningAt?.toISOString()}`);

  // Clean up
  await clearTaskTimeout('TEST-1');
  await clearTaskTimeout('COMPLEX-1');

  console.log('\nTimeouts cleared\n');
}

// ============================================================
// Example 4: Handling Timeout Events
// ============================================================

async function exampleTimeoutHandling() {
  console.log('=== Example 4: Handling Timeout Events ===\n');

  // Create a timeout with very short duration for demonstration
  const timeout = await startTaskTimeout(
    'DEMO-1',
    200, // 200ms (very short for demo)
    'agent-demo',
    { warningThreshold: 0.5 } // 50% for demo
  );

  console.log(`Created demo timeout: ${timeout.taskId}`);

  // Wait for warning threshold
  await new Promise(resolve => setTimeout(resolve, 120));
  console.log('\nChecking for warnings...');
  await checkTimeouts();

  let currentTimeout = await getActiveTimeouts();
  const warningTimeout = currentTimeout.find(t => t.taskId === 'DEMO-1');
  if (warningTimeout) {
    console.log(`Status: ${warningTimeout.status}`);
  }

  // Wait for timeout
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('\nChecking for timeouts...');
  const timedOut = await checkTimeouts();

  const demoTimeout = timedOut.find(t => t.taskId === 'DEMO-1');
  if (demoTimeout) {
    console.log('\nTask timed out!');
    console.log(`  Checkpoint created: ${demoTimeout.checkpointId}`);
    console.log(`  Escalation created: ${demoTimeout.escalationEventId}`);
    console.log(`  Duration: ${demoTimeout.duration}ms`);
  }

  console.log();
}

// ============================================================
// Example 5: Integration with Orchestrator State
// ============================================================

interface OrchestratorTask {
  id: string;
  agentId?: string;
  max_duration?: number;
  status: 'pending' | 'assigned' | 'completed' | 'timed_out';
}

async function exampleOrchestratorIntegration() {
  console.log('=== Example 5: Orchestrator Integration ===\n');

  const tasks: OrchestratorTask[] = [
    { id: 'TASK-1', status: 'pending', max_duration: 30 * 60 * 1000 },
    { id: 'TASK-2', status: 'pending', max_duration: 15 * 60 * 1000 },
    { id: 'TASK-3', status: 'pending', max_duration: 45 * 60 * 1000 }
  ];

  console.log('Assigning tasks to agents...\n');

  // Assign tasks to agents
  for (const task of tasks) {
    const agentId = `agent-${Math.floor(Math.random() * 100)}`;
    task.agentId = agentId;
    task.status = 'assigned';

    // Start timeout tracking
    await startTaskTimeout(
      task.id,
      task.max_duration || 30 * 60 * 1000,
      agentId
    );

    console.log(`${task.id} assigned to ${agentId} (${task.max_duration! / 1000}s timeout)`);
  }

  console.log('\nMonitoring tasks...\n');

  // Simulate orchestration loop
  for (let i = 0; i < 3; i++) {
    console.log(`--- Check ${i + 1} ---`);

    // Check for timeouts
    const timedOut = await checkTimeouts();

    // Update task status for timed out tasks
    for (const timeout of timedOut) {
      const task = tasks.find(t => t.id === timeout.taskId);
      if (task) {
        task.status = 'timed_out';
        console.log(`${task.id} timed out - checkpoint: ${timeout.checkpointId}`);
      }
    }

    // Simulate some tasks completing
    if (i === 1 && tasks[0].status === 'assigned') {
      tasks[0].status = 'completed';
      await clearTaskTimeout(tasks[0].id);
      console.log(`${tasks[0].id} completed successfully`);
    }

    // Show active timeouts
    const active = await getActiveTimeouts();
    const myActiveTimeouts = active.filter(t =>
      tasks.some(task => task.id === t.taskId)
    );

    console.log(`Active timeouts: ${myActiveTimeouts.length}`);
    for (const timeout of myActiveTimeouts) {
      const remaining = Math.floor((timeout.timeoutAt.getTime() - Date.now()) / 1000);
      console.log(`  ${timeout.taskId}: ${remaining}s remaining`);
    }

    console.log();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Clean up remaining tasks
  for (const task of tasks) {
    if (task.status === 'assigned') {
      await clearTaskTimeout(task.id);
    }
  }

  console.log('Example complete\n');
}

// ============================================================
// Run Examples
// ============================================================

async function runExamples() {
  try {
    // Uncomment to run specific examples:

    // await exampleBasicTimeout();
    // await exampleOrchestrationLoop();
    // await exampleCustomConfiguration();
    // await exampleTimeoutHandling();
    // await exampleOrchestratorIntegration();

    console.log('All examples completed!');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export for use in other modules
export {
  exampleBasicTimeout,
  exampleOrchestrationLoop,
  exampleCustomConfiguration,
  exampleTimeoutHandling,
  exampleOrchestratorIntegration
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}
