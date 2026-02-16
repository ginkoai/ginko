/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [cli, orchestrate, multi-agent, supervisor, epic-004, sprint-4, task-10]
 * @related: [agent/index.ts, agent/work.ts, ../lib/task-dependencies.ts, graph/api-client.ts, ../lib/orchestrator-state.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [commander, chalk, ora, fs-extra]
 */

/**
 * Orchestrate Command (EPIC-004 Sprint 4 TASK-7, TASK-10)
 *
 * Run as supervisor agent to coordinate multi-agent task execution.
 *
 * The orchestrator:
 * 1. Registers as an orchestrator agent (or resumes from checkpoint)
 * 2. Loads sprint tasks with dependencies
 * 3. Computes execution waves (topological ordering)
 * 4. Monitors available worker agents
 * 5. Assigns tasks to workers based on capabilities
 * 6. Reacts to task completion events
 * 7. Handles blockers and reassignment
 * 8. Saves checkpoint on exit for seamless respawn (TASK-10)
 *
 * Exit Conditions (TASK-10):
 * - All tasks complete → success exit (code 0), checkpoint deleted
 * - Context pressure > 80% → checkpoint + respawn (code 75)
 * - No progress for 10 cycles → escalate + pause (code 1)
 * - Human interrupt (SIGINT) → graceful shutdown (code 0)
 * - Max runtime exceeded → checkpoint + respawn (code 75)
 *
 * Resume Flow (TASK-10):
 * - Use --resume to continue from last checkpoint
 * - Restores completed tasks, in-progress assignments, context metrics
 * - New instance seamlessly continues orchestration
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { AgentClient } from './agent/agent-client.js';
import { GraphApiClient } from './graph/api-client.js';
import { requireGinkoRoot } from '../utils/ginko-root.js';
import { loadGraphConfig } from './graph/config.js';
import { requireCloud } from '../utils/cloud-guard.js';
import { loadSprintChecklist, SprintChecklist } from '../lib/sprint-loader.js';
import {
  Task as DepTask,
  ExecutionWave,
  getExecutionOrder,
  getAvailableTasks,
  validateDependencies,
  getDependencyStats,
} from '../lib/task-dependencies.js';
import { startHeartbeat, stopHeartbeat, shutdownHeartbeat } from '../lib/agent-heartbeat.js';
import {
  ContextMonitor,
  getContextMonitor,
  resetContextMonitor,
  getPressureColor,
} from '../lib/context-metrics.js';
import {
  OrchestratorStateManager,
  OrchestratorCheckpoint,
  ExitReason,
  EXIT_CODE_SUCCESS,
  EXIT_CODE_ERROR,
  EXIT_CODE_RESPAWN,
  getExitCode,
  getExitMessage,
  persistStateToGraph,
  recoverStateFromGraph,
  reconcileTaskStatuses,
} from '../lib/orchestrator-state.js';

// ============================================================
// Types
// ============================================================

export interface OrchestrateOptions {
  epic?: string;
  sprint?: string;
  dryRun?: boolean;
  verbose?: boolean;
  maxRuntime?: number; // Max runtime in minutes
  pollInterval?: number; // Polling interval in seconds
  resume?: boolean; // TASK-10: Resume from checkpoint
}

interface OrchestratorState {
  orchestratorId: string;
  orchestratorName: string;
  graphId: string;
  sprintId: string;
  startedAt: Date;
  lastProgressAt: Date;
  cyclesWithoutProgress: number;
  completedTasks: Set<string>;
  inProgressTasks: Map<string, string>; // taskId -> agentId
  blockedTasks: Set<string>;
  assignmentHistory: Array<{
    taskId: string;
    agentId: string;
    assignedAt: Date;
    status: 'assigned' | 'completed' | 'released' | 'failed';
  }>;
  // EPIC-004 Sprint 4 TASK-9: Context pressure monitoring
  contextMonitor: ContextMonitor;
  lastPressureWarning?: Date;
  // EPIC-004 Sprint 5 TASK-8: Recovery tracking
  lastGraphPersist?: Date;
  recoveredFromCheckpointId?: string;
}

interface WorkerAgent {
  id: string;
  name: string;
  capabilities: string[];
  status: 'active' | 'idle' | 'busy' | 'offline';
}

interface OrchestratorTask {
  id: string;
  title: string;
  description?: string;
  effort?: string;
  priority?: number;
  requiredCapabilities: string[];
  dependsOn: string[];
  status: 'pending' | 'in_progress' | 'complete' | 'blocked' | 'assigned';
  assignedTo?: string;
}

// ============================================================
// Constants
// ============================================================

const MAX_CYCLES_WITHOUT_PROGRESS = 10;
const DEFAULT_POLL_INTERVAL_SECONDS = 5;
const DEFAULT_MAX_RUNTIME_MINUTES = 60;
// EXIT_CODE_RESPAWN imported from orchestrator-state.ts

// ============================================================
// Main Command
// ============================================================

/**
 * Run orchestrator agent
 */
export async function orchestrateCommand(options: OrchestrateOptions = {}): Promise<void> {
  await requireCloud('orchestrate');
  let state: OrchestratorState | null = null;
  let spinner: Ora | null = null;
  let isShuttingDown = false;
  let stateManager: OrchestratorStateManager | null = null;
  let resumedFromCheckpoint = false;

  try {
    // ============================================================
    // PHASE 1: Initialization
    // ============================================================
    spinner = ora('Initializing orchestrator...').start();

    const projectRoot = await requireGinkoRoot();
    const graphConfig = await loadGraphConfig();

    if (!graphConfig?.graphId) {
      spinner.fail(chalk.red('No graph configured'));
      console.error(chalk.red('  Run `ginko graph init` to initialize the graph first.'));
      process.exit(1);
    }

    // ============================================================
    // PHASE 2: Load Sprint & Tasks
    // ============================================================
    spinner.text = 'Loading sprint tasks...';

    const sprint = await loadSprintChecklist(projectRoot);
    if (!sprint) {
      spinner.fail(chalk.red('No active sprint found'));
      console.error(chalk.red('  Create a sprint file in docs/sprints/ first.'));
      process.exit(1);
    }

    // TASK-10: Initialize state manager
    stateManager = new OrchestratorStateManager(projectRoot, graphConfig.graphId);

    // TASK-8: Try to recover from graph first (cross-machine recovery)
    const client = new GraphApiClient();
    let graphCheckpoint: OrchestratorCheckpoint | null = null;

    // TASK-10: Check for existing checkpoint
    if (options.resume) {
      spinner.text = 'Checking for checkpoint...';

      // TASK-8: Try graph recovery first
      try {
        const epicId = options.epic || sprint.file || 'unknown';
        graphCheckpoint = await recoverStateFromGraph(graphConfig.graphId, epicId, client);

        if (graphCheckpoint) {
          spinner.succeed(chalk.green('Recovered state from graph (cross-machine recovery)'));
          console.log(chalk.dim(`  Orchestrator: ${graphCheckpoint.orchestratorName}`));
          console.log(chalk.dim(`  Last persisted: ${graphCheckpoint.persistedAt || graphCheckpoint.savedAt}`));
          console.log(chalk.dim(`  Completed: ${graphCheckpoint.completedTasks.length} tasks`));
          console.log(chalk.dim(`  In progress: ${Object.keys(graphCheckpoint.inProgressTasks).length} tasks`));
          resumedFromCheckpoint = true;
          spinner = ora('Resuming orchestration...').start();
        }
      } catch (error) {
        // Graph recovery not available, fall back to local checkpoint
        console.log(chalk.dim('  Graph recovery unavailable, checking local checkpoint...'));
      }

      // Fall back to local checkpoint if graph recovery failed
      if (!graphCheckpoint) {
        const checkpoint = await stateManager.loadCheckpoint();

        if (checkpoint) {
          graphCheckpoint = checkpoint;
          spinner.succeed(chalk.green('Found checkpoint from previous session (local recovery)'));
          console.log(chalk.dim(`  Saved at: ${checkpoint.savedAt}`));
          console.log(chalk.dim(`  Completed: ${checkpoint.completedTasks.length} tasks`));
          console.log(chalk.dim(`  In progress: ${Object.keys(checkpoint.inProgressTasks).length} tasks`));

          if (checkpoint.exitReason) {
            console.log(chalk.dim(`  Exit reason: ${getExitMessage(checkpoint.exitReason)}`));
          }

          resumedFromCheckpoint = true;
          spinner = ora('Resuming orchestration...').start();
        } else {
          spinner.warn(chalk.yellow('No checkpoint found - starting fresh'));
          console.log(chalk.dim('  Use --resume only after a previous session saved a checkpoint'));
        }
      }
    } else {
      // Check if checkpoint exists and warn user
      const hasCheckpoint = await stateManager.hasCheckpoint();
      if (hasCheckpoint) {
        spinner.info(chalk.cyan('Previous checkpoint found'));
        console.log(chalk.dim('  Use --resume to continue from last session'));
        console.log(chalk.dim('  Starting fresh will overwrite the checkpoint'));
        console.log('');
        spinner = ora('Starting fresh orchestration...').start();
      }
    }

    // Convert sprint tasks to orchestrator tasks
    const tasks = convertSprintTasks(sprint);

    if (tasks.length === 0) {
      spinner.fail(chalk.red('No tasks found in sprint'));
      process.exit(1);
    }

    // Validate dependencies
    const depTasks = tasks.map(t => ({
      id: t.id,
      dependsOn: t.dependsOn,
      status: mapStatusForDeps(t.status),
    }));

    const errors = validateDependencies(depTasks);
    const hasBlockingErrors = errors.some(e => e.type === 'circular' || e.type === 'self_reference');

    if (errors.length > 0) {
      spinner.warn(chalk.yellow('Dependency warnings:'));
      for (const error of errors) {
        console.log(chalk.yellow(`  ⚠️  ${error.details}`));
      }

      // For self-references and circular deps, remove the problematic deps to continue
      if (hasBlockingErrors) {
        console.log(chalk.dim('  Removing problematic dependencies to continue...'));
        for (const task of tasks) {
          // Remove self-references
          task.dependsOn = task.dependsOn.filter(d => d !== task.id);
          // Update depTasks too
          const depTask = depTasks.find(t => t.id === task.id);
          if (depTask) {
            depTask.dependsOn = task.dependsOn;
          }
        }
      }
    }

    // Compute execution waves
    let waves: ExecutionWave[];
    try {
      waves = getExecutionOrder(depTasks);
    } catch (waveError: any) {
      // If still failing, fallback to treating all tasks as wave 1 (no deps)
      spinner.warn(chalk.yellow('Cannot compute optimal wave order, using flat execution'));
      waves = [{
        wave: 1,
        tasks: depTasks,
      }];
    }

    const stats = getDependencyStats(depTasks);

    spinner.succeed(chalk.green(`Loaded ${tasks.length} tasks in ${waves.length} waves`));

    // ============================================================
    // PHASE 3: Display Initial Status (before registration for dry-run)
    // ============================================================
    console.log('');
    displayOrchestrationPlan(tasks, waves, stats, options.verbose);

    if (options.dryRun) {
      console.log('');
      console.log(chalk.yellow('🔍 Dry run mode - no tasks will be assigned'));
      console.log(chalk.dim('  Remove --dry-run to start orchestration'));
      return;
    }

    // ============================================================
    // PHASE 4: Register Orchestrator Agent (or restore from checkpoint)
    // ============================================================

    // TASK-10 & TASK-8: Check if resuming from checkpoint
    let checkpoint: OrchestratorCheckpoint | null = graphCheckpoint;

    if (checkpoint && resumedFromCheckpoint) {
      // TASK-8: Reconcile task statuses before restoration
      spinner.text = 'Reconciling task statuses...';

      const actualTasks = tasks.map(t => ({
        id: t.id,
        status: t.status === 'complete' ? 'complete' : t.status,
      }));

      checkpoint = await reconcileTaskStatuses(checkpoint, actualTasks, client);

      // TASK-10: Restore state from checkpoint
      spinner.text = 'Restoring state from checkpoint...';

      // Restore context monitor with previous metrics
      resetContextMonitor();
      const contextMonitor = getContextMonitor({
        model: checkpoint.contextMetrics.model || 'claude-opus-4-5-20251101',
      });

      // Restore token count from checkpoint
      contextMonitor.addTokens(checkpoint.contextMetrics.estimatedTokens);

      // Restore state
      const restored = stateManager.restoreFromCheckpoint(checkpoint);

      state = {
        orchestratorId: checkpoint.orchestratorId,
        orchestratorName: checkpoint.orchestratorName,
        graphId: checkpoint.graphId,
        sprintId: checkpoint.sprintId,
        startedAt: restored.startedAt,
        lastProgressAt: new Date(), // Reset progress timer for new session
        cyclesWithoutProgress: 0, // Reset cycle counter
        completedTasks: restored.completedTasks,
        inProgressTasks: restored.inProgressTasks,
        blockedTasks: restored.blockedTasks,
        assignmentHistory: restored.assignmentHistory,
        contextMonitor,
        recoveredFromCheckpointId: checkpoint.orchestratorId, // Track recovery source
      };

      // Update task statuses from restored state
      for (const task of tasks) {
        if (state.completedTasks.has(task.id)) {
          task.status = 'complete';
        } else if (state.inProgressTasks.has(task.id)) {
          task.status = 'assigned';
          task.assignedTo = state.inProgressTasks.get(task.id);
        }
      }

      spinner.succeed(chalk.green(`Resumed as ${chalk.bold(state.orchestratorName)}`));
      console.log(chalk.dim(`  Agent ID: ${state.orchestratorId}`));
      console.log(chalk.dim(`  Restored: ${state.completedTasks.size} completed, ${state.inProgressTasks.size} in progress`));
      if (checkpoint.persistedAt) {
        console.log(chalk.dim(`  Recovered from: ${checkpoint.recoveredFrom || 'graph state'}`));
      }

    } else {
      // Fresh start - register new orchestrator
      spinner = ora('Registering orchestrator agent...').start();

      const orchestratorName = `orchestrator-${Date.now()}`;
      let registerResponse;
      try {
        registerResponse = await AgentClient.register({
          name: orchestratorName,
          capabilities: ['task-assignment', 'task-monitoring', 'orchestration'],
          status: 'active',
        });
      } catch (regError: any) {
        spinner.warn(chalk.yellow(`Agent registration failed: ${regError.message}`));
        console.log(chalk.dim('  Continuing with local-only orchestration...'));

        // Create local-only state
        registerResponse = {
          agentId: `local-${Date.now()}`,
          name: orchestratorName,
          capabilities: ['task-assignment', 'task-monitoring', 'orchestration'],
          status: 'active',
          organizationId: 'local',
          createdAt: new Date().toISOString(),
        };
      }

      // Initialize context monitor for pressure tracking (TASK-9)
      resetContextMonitor(); // Reset any previous session
      const contextMonitor = getContextMonitor({
        model: 'claude-opus-4-5-20251101', // Default to Opus for orchestrator
      });

      state = {
        orchestratorId: registerResponse.agentId,
        orchestratorName: registerResponse.name,
        graphId: graphConfig.graphId,
        sprintId: sprint.file,
        startedAt: new Date(),
        lastProgressAt: new Date(),
        cyclesWithoutProgress: 0,
        completedTasks: new Set(),
        inProgressTasks: new Map(),
        blockedTasks: new Set(),
        assignmentHistory: [],
        contextMonitor,
      };

      // Mark already-completed tasks from sprint file
      for (const task of tasks) {
        if (task.status === 'complete') {
          state.completedTasks.add(task.id);
        }
      }

      spinner.succeed(chalk.green(`Registered as ${chalk.bold(state.orchestratorName)}`));
      console.log(chalk.dim(`  Agent ID: ${state.orchestratorId}`));
    }

    // ============================================================
    // PHASE 5: Start Heartbeat
    // ============================================================
    console.log('');
    spinner = ora('Starting heartbeat...').start();
    startHeartbeat(state.orchestratorId);
    spinner.succeed(chalk.green('Heartbeat started (30s interval)'));

    // ============================================================
    // PHASE 6: Setup Graceful Shutdown
    // ============================================================
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log('');
      console.log(chalk.yellow(`\n📡 Received ${signal}, shutting down gracefully...`));

      // TASK-10: Save checkpoint with exit reason
      if (state && stateManager) {
        const checkpoint = stateManager.createCheckpoint(state);
        await stateManager.saveCheckpoint(checkpoint, {
          exitReason: 'user_interrupt',
          exitCode: EXIT_CODE_SUCCESS,
        });
        console.log(chalk.dim('  Checkpoint saved for later resume'));
      }

      // Stop heartbeat
      await shutdownHeartbeat();

      console.log(chalk.green('✓ Orchestrator stopped'));
      displayFinalStatus(state!, tasks);
      process.exit(EXIT_CODE_SUCCESS);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // ============================================================
    // PHASE 7: Main Orchestration Loop
    // ============================================================
    console.log('');
    console.log(chalk.bold.cyan('🔄 Starting orchestration loop...'));
    console.log(chalk.dim(`  Poll interval: ${options.pollInterval || DEFAULT_POLL_INTERVAL_SECONDS}s`));
    console.log(chalk.dim(`  Max runtime: ${options.maxRuntime || DEFAULT_MAX_RUNTIME_MINUTES} minutes`));
    console.log('');

    await runOrchestrationLoop(
      state,
      tasks,
      waves,
      {
        pollInterval: (options.pollInterval || DEFAULT_POLL_INTERVAL_SECONDS) * 1000,
        maxRuntime: (options.maxRuntime || DEFAULT_MAX_RUNTIME_MINUTES) * 60 * 1000,
        verbose: options.verbose || false,
        stateManager: stateManager!, // TASK-10: Pass state manager for checkpoints
        graphClient: client, // TASK-8: Pass graph client for state persistence
      }
    );

    // ============================================================
    // PHASE 8: Success Exit
    // ============================================================
    console.log('');
    console.log(chalk.bold.green('🎉 All tasks completed!'));
    displayFinalStatus(state, tasks);

    // TASK-10: Delete checkpoint on successful completion
    if (stateManager) {
      await stateManager.deleteCheckpoint();
      console.log(chalk.dim('  Checkpoint cleared (all tasks complete)'));
    }

    await shutdownHeartbeat();
    process.exit(EXIT_CODE_SUCCESS);

  } catch (error: any) {
    if (spinner) spinner.fail(chalk.red('Orchestration failed'));
    console.error(chalk.red(`\n❌ Error: ${error.message}`));

    if (options.verbose && error.stack) {
      console.error(chalk.dim(error.stack));
    }

    // TASK-10: Save checkpoint on error for recovery
    if (state && stateManager) {
      try {
        const checkpoint = stateManager.createCheckpoint(state);
        await stateManager.saveCheckpoint(checkpoint, {
          exitReason: 'error',
          exitCode: EXIT_CODE_ERROR,
        });
        console.log(chalk.dim('  Checkpoint saved for recovery'));
      } catch {
        // Ignore checkpoint save errors
      }
    }

    // Cleanup
    if (state) {
      try {
        await shutdownHeartbeat();
      } catch {
        // Ignore cleanup errors
      }
    }

    process.exit(1);
  }
}

// ============================================================
// Orchestration Loop
// ============================================================

interface LoopOptions {
  pollInterval: number;
  maxRuntime: number;
  verbose: boolean;
  stateManager: OrchestratorStateManager; // TASK-10: State manager for checkpoints
  graphClient: GraphApiClient; // TASK-8: Graph client for state persistence
}

async function runOrchestrationLoop(
  state: OrchestratorState,
  tasks: OrchestratorTask[],
  waves: ExecutionWave[],
  options: LoopOptions
): Promise<void> {
  const client = options.graphClient;
  let lastEventId: string | null = null;
  const startTime = Date.now();
  const { stateManager, graphClient } = options;

  // TASK-8: Track last graph persistence time
  const GRAPH_PERSIST_INTERVAL = 30 * 1000; // 30 seconds
  let lastGraphPersist = Date.now();

  while (true) {
    // Check exit conditions
    const incompleteTasks = tasks.filter(t => t.status !== 'complete').length;

    if (incompleteTasks === 0) {
      // All tasks complete!
      return;
    }

    // Check max runtime
    if (Date.now() - startTime > options.maxRuntime) {
      console.log(chalk.yellow('\n⏰ Max runtime exceeded - checkpointing and exiting'));
      // TASK-10: Save checkpoint with exit reason
      const checkpoint = stateManager.createCheckpoint(state);
      await stateManager.saveCheckpoint(checkpoint, {
        exitReason: 'max_runtime',
        exitCode: EXIT_CODE_RESPAWN,
      });
      console.log(chalk.dim('  Checkpoint saved for respawn'));
      process.exit(EXIT_CODE_RESPAWN);
    }

    // TASK-9: Check context pressure (>80% triggers respawn)
    const pressure = state.contextMonitor.getPressure();
    if (state.contextMonitor.shouldRespawn()) {
      console.log(chalk.magenta(`\n📊 Context pressure critical (${(pressure * 100).toFixed(1)}%) - checkpointing and respawning`));
      // TASK-10: Save checkpoint with exit reason
      const checkpoint = stateManager.createCheckpoint(state);
      await stateManager.saveCheckpoint(checkpoint, {
        exitReason: 'context_pressure',
        exitCode: EXIT_CODE_RESPAWN,
      });
      console.log(chalk.dim('  Checkpoint saved for respawn'));
      process.exit(EXIT_CODE_RESPAWN);
    }

    // TASK-9: Warn at 70% pressure (once per 5 minutes max)
    if (state.contextMonitor.shouldWarn()) {
      const now = new Date();
      const shouldLog = !state.lastPressureWarning ||
        (now.getTime() - state.lastPressureWarning.getTime()) > 5 * 60 * 1000;

      if (shouldLog) {
        const zone = state.contextMonitor.getZone();
        const color = getPressureColor(zone);
        console.log(chalk[color as 'yellow' | 'red'](`\n⚠️  Context pressure elevated: ${state.contextMonitor.formatMetrics()}`));
        state.lastPressureWarning = now;
      }
    }

    // Check progress stall
    if (state.cyclesWithoutProgress >= MAX_CYCLES_WITHOUT_PROGRESS) {
      console.log(chalk.red('\n⚠️  No progress for 10 cycles - escalating'));
      displayBlockers(state, tasks);
      // TASK-10: Save checkpoint with exit reason
      const checkpoint = stateManager.createCheckpoint(state);
      await stateManager.saveCheckpoint(checkpoint, {
        exitReason: 'no_progress',
        exitCode: EXIT_CODE_ERROR,
      });
      console.log(chalk.dim('  Checkpoint saved for investigation'));
      process.exit(EXIT_CODE_ERROR);
    }

    try {
      // Step 1: Discover available workers
      const workers = await discoverWorkers();

      // Step 2: Find available tasks (dependencies satisfied, not assigned)
      const availableTasks = getAvailableOrchestratorTasks(tasks, state);

      // Step 3: Match and assign tasks
      const assignments = await assignTasks(
        state,
        availableTasks,
        workers,
        client,
        options.verbose
      );

      if (assignments > 0) {
        state.lastProgressAt = new Date();
        state.cyclesWithoutProgress = 0;
      }

      // Step 4: Poll for completion events
      const events = await pollCompletionEvents(
        state,
        client,
        lastEventId,
        options.pollInterval
      );

      // Step 5: Process completion events
      for (const event of events) {
        await processCompletionEvent(state, tasks, event, options.verbose);
        lastEventId = event.id;
        state.lastProgressAt = new Date();
        state.cyclesWithoutProgress = 0;
        // TASK-9: Track event processing in context metrics
        state.contextMonitor.recordEvent();
      }

      // TASK-9: Update context metrics for this cycle
      // Estimate tokens from cycle activity (API calls, events, state updates)
      const cycleTokenEstimate = 500 + (assignments * 200) + (events.length * 300);
      state.contextMonitor.addTokens(cycleTokenEstimate);

      // Update status display
      if (options.verbose) {
        displayCycleStatus(state, tasks, workers.length, availableTasks.length);
        // TASK-9: Show context pressure in verbose mode
        console.log(chalk.dim(`  📊 Context: ${state.contextMonitor.formatMetrics()}`));
      } else {
        displayProgressBar(state, tasks);
      }

      // Increment cycle counter if no progress
      if (assignments === 0 && events.length === 0) {
        state.cyclesWithoutProgress++;
      }

      // TASK-8: Persist state to graph every 30 seconds
      const now = Date.now();
      if (now - lastGraphPersist >= GRAPH_PERSIST_INTERVAL) {
        try {
          const checkpoint = stateManager.createCheckpoint(state);

          // Add persistence timestamp
          checkpoint.persistedAt = new Date().toISOString();
          checkpoint.recoveredFrom = state.recoveredFromCheckpointId;

          // Persist to graph (non-blocking)
          await persistStateToGraph(checkpoint, graphClient);

          lastGraphPersist = now;
          state.lastGraphPersist = new Date();

          if (options.verbose) {
            console.log(chalk.dim(`  💾 State persisted to graph`));
          }
        } catch (persistError: any) {
          // Log but don't fail - graph persistence is best-effort
          if (options.verbose) {
            console.log(chalk.yellow(`  ⚠️  Graph persistence failed: ${persistError.message}`));
          }
        }
      }

      // Wait before next cycle
      await sleep(options.pollInterval);

    } catch (error: any) {
      console.error(chalk.red(`\n⚠️  Error in orchestration cycle: ${error.message}`));
      console.log(chalk.dim('   Retrying in 30 seconds...'));
      await sleep(30000);
    }
  }
}

// ============================================================
// Worker Discovery
// ============================================================

async function discoverWorkers(): Promise<WorkerAgent[]> {
  try {
    const response = await AgentClient.list({
      status: 'active',
      limit: 100,
    });

    // Filter out orchestrators (only get workers)
    return response.agents.filter(
      agent => !agent.capabilities.includes('orchestration')
    ).map(agent => ({
      id: agent.id,
      name: agent.name,
      capabilities: agent.capabilities,
      status: agent.status as WorkerAgent['status'],
    }));
  } catch (error) {
    // Return empty array if can't discover workers
    return [];
  }
}

// ============================================================
// Task Assignment
// ============================================================

function getAvailableOrchestratorTasks(
  tasks: OrchestratorTask[],
  state: OrchestratorState
): OrchestratorTask[] {
  return tasks.filter(task => {
    // Must be pending (not complete, not assigned, not in progress)
    if (task.status !== 'pending') {
      return false;
    }

    // Must not already be assigned
    if (state.inProgressTasks.has(task.id)) {
      return false;
    }

    // All dependencies must be complete
    for (const depId of task.dependsOn) {
      if (!state.completedTasks.has(depId)) {
        return false;
      }
    }

    return true;
  });
}

async function assignTasks(
  state: OrchestratorState,
  availableTasks: OrchestratorTask[],
  workers: WorkerAgent[],
  client: GraphApiClient,
  verbose: boolean
): Promise<number> {
  let assignments = 0;

  // Get idle workers (not already assigned a task)
  const busyAgentIds = new Set(state.inProgressTasks.values());
  const idleWorkers = workers.filter(w => !busyAgentIds.has(w.id));

  if (idleWorkers.length === 0 || availableTasks.length === 0) {
    return 0;
  }

  // Sort tasks by priority (higher first)
  const sortedTasks = [...availableTasks].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  for (const task of sortedTasks) {
    // TASK-8: Duplicate prevention - check if task already assigned
    if (state.inProgressTasks.has(task.id)) {
      if (verbose) {
        console.log(chalk.dim(`  Skipping ${task.id} - already assigned`));
      }
      continue;
    }

    // Find a capable worker
    const capableWorker = idleWorkers.find(worker =>
      task.requiredCapabilities.every(cap => worker.capabilities.includes(cap)) ||
      task.requiredCapabilities.length === 0 // No specific requirements
    );

    if (!capableWorker) {
      if (verbose) {
        console.log(chalk.dim(`  No capable worker for ${task.id}`));
      }
      continue;
    }

    // Assign task
    try {
      // TASK-8: Double-check not already assigned (race condition protection)
      if (state.inProgressTasks.has(task.id)) {
        if (verbose) {
          console.log(chalk.dim(`  Race condition detected for ${task.id} - skipping`));
        }
        continue;
      }

      // Note: This would call the assign API in production
      // For now, we'll track locally
      console.log(chalk.green(`  → Assigned ${chalk.bold(task.id)} to ${capableWorker.name}`));

      task.status = 'assigned';
      task.assignedTo = capableWorker.id;
      state.inProgressTasks.set(task.id, capableWorker.id);
      state.assignmentHistory.push({
        taskId: task.id,
        agentId: capableWorker.id,
        assignedAt: new Date(),
        status: 'assigned',
      });

      // Remove worker from idle pool
      const workerIndex = idleWorkers.indexOf(capableWorker);
      if (workerIndex > -1) {
        idleWorkers.splice(workerIndex, 1);
      }

      assignments++;
    } catch (error: any) {
      console.error(chalk.red(`  Failed to assign ${task.id}: ${error.message}`));
    }
  }

  return assignments;
}

// ============================================================
// Event Polling & Processing
// ============================================================

interface CompletionEvent {
  id: string;
  taskId: string;
  agentId: string;
  status: 'completed' | 'failed' | 'released';
  timestamp: string;
  description?: string;
}

async function pollCompletionEvents(
  state: OrchestratorState,
  client: GraphApiClient,
  lastEventId: string | null,
  timeout: number
): Promise<CompletionEvent[]> {
  // In production, this would call GET /api/v1/events/stream
  // For now, return empty array (events would come from worker agents)
  return [];
}

async function processCompletionEvent(
  state: OrchestratorState,
  tasks: OrchestratorTask[],
  event: CompletionEvent,
  verbose: boolean
): Promise<void> {
  const task = tasks.find(t => t.id === event.taskId);
  if (!task) return;

  if (event.status === 'completed') {
    console.log(chalk.green(`  ✓ ${chalk.bold(event.taskId)} completed by ${event.agentId}`));
    task.status = 'complete';
    state.completedTasks.add(event.taskId);
    state.inProgressTasks.delete(event.taskId);

    // Update assignment history
    const assignment = state.assignmentHistory.find(
      a => a.taskId === event.taskId && a.status === 'assigned'
    );
    if (assignment) {
      assignment.status = 'completed';
    }
  } else if (event.status === 'failed' || event.status === 'released') {
    console.log(chalk.yellow(`  ⚠️  ${event.taskId} ${event.status} - returning to queue`));
    task.status = 'pending';
    task.assignedTo = undefined;
    state.inProgressTasks.delete(event.taskId);

    const assignment = state.assignmentHistory.find(
      a => a.taskId === event.taskId && a.status === 'assigned'
    );
    if (assignment) {
      assignment.status = event.status === 'failed' ? 'failed' : 'released';
    }
  }
}

// ============================================================
// Display Functions
// ============================================================

function displayOrchestrationPlan(
  tasks: OrchestratorTask[],
  waves: ExecutionWave[],
  stats: ReturnType<typeof getDependencyStats>,
  verbose?: boolean
): void {
  console.log(chalk.bold('\n📋 Orchestration Plan'));
  console.log(chalk.dim('─'.repeat(50)));

  // Summary
  const completed = tasks.filter(t => t.status === 'complete').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;

  console.log(`  Total tasks: ${chalk.bold(tasks.length.toString())}`);
  console.log(`  Completed: ${chalk.green(completed.toString())}`);
  console.log(`  Pending: ${chalk.yellow(pending.toString())}`);
  console.log(`  In progress: ${chalk.cyan(inProgress.toString())}`);
  console.log(`  Execution waves: ${chalk.bold(waves.length.toString())}`);

  if (verbose) {
    console.log('');
    console.log(chalk.bold('  Waves:'));
    for (const wave of waves) {
      console.log(`    Wave ${wave.wave}: ${wave.tasks.map(t => t.id).join(', ')}`);
    }
  }

  console.log(chalk.dim('─'.repeat(50)));
}

function displayProgressBar(state: OrchestratorState, tasks: OrchestratorTask[]): void {
  const total = tasks.length;
  const completed = state.completedTasks.size;
  const inProgress = state.inProgressTasks.size;
  const pending = total - completed - inProgress;

  const barWidth = 30;
  const completedWidth = Math.round((completed / total) * barWidth);
  const inProgressWidth = Math.round((inProgress / total) * barWidth);
  const pendingWidth = barWidth - completedWidth - inProgressWidth;

  const bar =
    chalk.green('█'.repeat(completedWidth)) +
    chalk.cyan('▓'.repeat(inProgressWidth)) +
    chalk.dim('░'.repeat(pendingWidth));

  const percent = Math.round((completed / total) * 100);

  // Clear line and print progress
  process.stdout.write(
    `\r  Progress: [${bar}] ${percent}% (${completed}/${total} complete, ${inProgress} in progress)`
  );
}

function displayCycleStatus(
  state: OrchestratorState,
  tasks: OrchestratorTask[],
  workerCount: number,
  availableTaskCount: number
): void {
  console.log(chalk.dim(`\n  Cycle: workers=${workerCount}, available=${availableTaskCount}, in_progress=${state.inProgressTasks.size}`));
}

function displayBlockers(state: OrchestratorState, tasks: OrchestratorTask[]): void {
  console.log(chalk.bold('\n⚠️  Blockers:'));

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  for (const task of pendingTasks) {
    const missingDeps = task.dependsOn.filter(d => !state.completedTasks.has(d));
    if (missingDeps.length > 0) {
      console.log(chalk.yellow(`  ${task.id} blocked by: ${missingDeps.join(', ')}`));
    }
  }

  if (state.inProgressTasks.size > 0) {
    console.log(chalk.bold('\n  In Progress (may be stuck):'));
    for (const [taskId, agentId] of state.inProgressTasks) {
      console.log(chalk.cyan(`  ${taskId} → ${agentId}`));
    }
  }
}

function displayFinalStatus(state: OrchestratorState, tasks: OrchestratorTask[]): void {
  const duration = Date.now() - state.startedAt.getTime();
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  console.log(chalk.bold('\n📊 Final Status'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(`  Duration: ${minutes}m ${seconds}s`);
  console.log(`  Completed: ${chalk.green(state.completedTasks.size.toString())}/${tasks.length}`);
  console.log(`  Assignments made: ${state.assignmentHistory.length}`);
  console.log(chalk.dim('─'.repeat(50)));
}

// ============================================================
// Task Conversion
// ============================================================

function convertSprintTasks(sprint: SprintChecklist): OrchestratorTask[] {
  const tasks: OrchestratorTask[] = [];

  for (const task of sprint.tasks) {
    tasks.push({
      id: task.id,
      title: task.title,
      description: task.title, // Could be enhanced with acceptance criteria
      effort: task.effort,
      priority: parsePriority(task.priority),
      requiredCapabilities: extractCapabilities(task),
      dependsOn: task.dependsOn || [],
      status: mapSprintStatus(task.state),
    });
  }

  return tasks;
}

/**
 * Parse priority string to number
 */
function parsePriority(priority?: string): number {
  if (!priority) return 0;

  // Handle numeric strings
  const numValue = parseInt(priority, 10);
  if (!isNaN(numValue)) return numValue;

  // Handle named priorities
  switch (priority.toLowerCase()) {
    case 'critical':
      return 100;
    case 'high':
      return 75;
    case 'medium':
      return 50;
    case 'low':
      return 25;
    default:
      return 0;
  }
}

function mapSprintStatus(state: string): OrchestratorTask['status'] {
  switch (state) {
    case 'complete':
      return 'complete';
    case 'in_progress':
      return 'in_progress';
    case 'paused':
      return 'blocked';
    default:
      return 'pending';
  }
}

function mapStatusForDeps(status: OrchestratorTask['status']): DepTask['status'] {
  switch (status) {
    case 'complete':
      return 'complete';
    case 'in_progress':
    case 'assigned':
      return 'in_progress';
    case 'blocked':
      return 'blocked';
    default:
      return 'pending';
  }
}

function extractCapabilities(task: any): string[] {
  // Extract capabilities from task metadata or files
  const capabilities: string[] = [];

  // Infer from file extensions mentioned
  const files = task.files || [];
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (!capabilities.includes('typescript')) {
        capabilities.push('typescript');
      }
    }
    if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
      if (!capabilities.includes('testing')) {
        capabilities.push('testing');
      }
    }
    if (file.includes('/api/')) {
      if (!capabilities.includes('api')) {
        capabilities.push('api');
      }
    }
  }

  return capabilities;
}

// ============================================================
// State Persistence (TASK-10: Moved to orchestrator-state.ts)
// ============================================================
// State persistence is now handled by OrchestratorStateManager

// ============================================================
// Utilities
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default orchestrateCommand;
