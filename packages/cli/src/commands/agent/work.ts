/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [agent, worker, cli, epic-004, sprint-4, multi-agent, context-loading]
 * @related: [register.ts, agent-client.ts, ../start/index.ts, ../orchestrate.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [commander, chalk, ora, agent-heartbeat, start, event-logger]
 */

/**
 * Agent Work Command (EPIC-004 Sprint 4 TASK-8)
 *
 * Worker agent that loads project context and polls for task assignments.
 *
 * Worker Startup Flow:
 * 1. Register as worker agent (or use existing from .ginko/agent.json)
 * 2. Call `ginko start` to load project context (events, patterns, ADRs)
 * 3. Start heartbeat to maintain online status
 * 4. Enter polling loop for task assignments
 * 5. On assignment: claim task atomically, load task-specific context
 * 6. Execute task (AI does actual work), log events, verify, complete
 * 7. Report completion/blocker via events
 * 8. Return to polling
 *
 * Context Loading Strategy:
 * - **Startup:** Full project context via `ginko start` (patterns, ADRs, events)
 * - **Per-Task:** Lazy load task-specific files + acceptance criteria from graph
 * - **Orchestrator:** Provides task metadata ONLY, not full project context
 *
 * This implements the "Worker Self-Context Loading" pattern where workers
 * are responsible for their own context acquisition, reducing orchestrator
 * coupling and enabling autonomous operation.
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { AgentClient, AvailableTask, TaskContextResponse } from './agent-client.js';
import { requireGinkoRoot } from '../../utils/ginko-root.js';
import { startCommand } from '../start/index.js';
import { startHeartbeat, shutdownHeartbeat } from '../../lib/agent-heartbeat.js';
import { loadGraphConfig } from '../graph/config.js';
import { logEvent } from '../../lib/event-logger.js';

interface WorkOptions {
  capabilities?: string;
  name?: string;
  pollInterval?: number;
  maxTasks?: number;  // Max tasks to process before exiting (0 = unlimited)
}

interface AgentConfig {
  agentId: string;
  name: string;
  capabilities: string[];
  status: string;
  organizationId: string;
  registeredAt: string;
}

interface TaskAssignment {
  taskId: string;
  title: string;
  description: string;
  effort: string;
  priority: number;
  requiredCapabilities: string[];
  acceptanceCriteria: string[];
  files?: string[];
  context?: TaskContextResponse;
}

// Stats tracking
interface WorkerStats {
  tasksCompleted: number;
  tasksFailed: number;
  tasksReleased: number;
  startedAt: Date;
  lastTaskAt: Date | null;
}

/**
 * Worker agent that loads context and polls for tasks
 */
export async function workAgentCommand(options: WorkOptions): Promise<void> {
  let agentConfig: AgentConfig | null = null;
  let graphId: string | null = null;
  const stats: WorkerStats = {
    tasksCompleted: 0,
    tasksFailed: 0,
    tasksReleased: 0,
    startedAt: new Date(),
    lastTaskAt: null,
  };

  try {
    // ============================================================
    // PHASE 1: Agent Registration or Discovery
    // ============================================================
    const spinner = ora('Initializing worker agent...').start();

    const projectRoot = await requireGinkoRoot();
    const agentConfigPath = path.join(projectRoot, '.ginko', 'agent.json');

    // Load graph config for task queries
    const graphConfig = await loadGraphConfig();
    if (!graphConfig?.graphId) {
      spinner.warn(chalk.yellow('No graph configured - running in local-only mode'));
      console.log(chalk.dim('  Run `ginko graph init` to enable cloud task assignment'));
    } else {
      graphId = graphConfig.graphId;
    }

    // Check if agent already registered
    try {
      const configData = await fs.readFile(agentConfigPath, 'utf-8');
      const parsedConfig = JSON.parse(configData) as AgentConfig;
      agentConfig = parsedConfig;
      spinner.succeed(chalk.green(`Found existing agent: ${parsedConfig.name}`));
    } catch (error: any) {
      // No agent registered - register new one
      if (error.code === 'ENOENT') {
        if (!options.capabilities || !options.name) {
          spinner.fail(chalk.red('No agent registered'));
          console.error(chalk.red('  Either an existing agent must be registered, or --name and --capabilities must be provided.'));
          console.log('');
          console.log(chalk.dim('💡 Register an agent:'));
          console.log(chalk.dim('  ginko agent register --name "Worker-1" --capabilities typescript,testing'));
          console.log('');
          console.log(chalk.dim('💡 Or provide inline:'));
          console.log(chalk.dim('  ginko agent work --name "Worker-1" --capabilities typescript,testing'));
          process.exit(1);
        }

        spinner.text = 'Registering new worker agent...';

        // Parse capabilities
        const capabilities = options.capabilities
          .split(',')
          .map(c => c.trim())
          .filter(c => c.length > 0);

        if (capabilities.length === 0) {
          spinner.fail(chalk.red('Failed to register agent'));
          console.error(chalk.red('  At least one capability is required'));
          process.exit(1);
        }

        // Register agent
        try {
          const response = await AgentClient.register({
            name: options.name,
            capabilities,
            status: 'active',
          });

          // Store config
          agentConfig = {
            agentId: response.agentId,
            name: response.name,
            capabilities: response.capabilities,
            status: response.status,
            organizationId: response.organizationId,
            registeredAt: response.createdAt,
          };
        } catch (regError: any) {
          spinner.warn(chalk.yellow(`Agent registration failed: ${regError.message}`));
          console.log(chalk.dim('  Creating local-only agent config...'));

          // Create local agent config for offline operation
          agentConfig = {
            agentId: `local-worker-${Date.now()}`,
            name: options.name,
            capabilities,
            status: 'active',
            organizationId: 'local',
            registeredAt: new Date().toISOString(),
          };
        }

        await fs.mkdir(path.dirname(agentConfigPath), { recursive: true });
        await fs.writeFile(
          agentConfigPath,
          JSON.stringify(agentConfig, null, 2),
          'utf-8'
        );

        spinner.succeed(chalk.green(`Registered agent: ${agentConfig.name}`));
      } else {
        throw error;
      }
    }

    if (!agentConfig) {
      throw new Error('Failed to initialize agent config');
    }

    // ============================================================
    // PHASE 2: Project Context Loading via `ginko start`
    // ============================================================
    console.log('');
    console.log(chalk.bold.cyan('🧠 Loading project context...'));
    console.log('');

    // Call ginko start to load full project context
    // This loads:
    // - Event stream (ADR-043)
    // - Active patterns and gotchas
    // - Architecture Decision Records (ADRs)
    // - Sprint context and current tasks
    // - Session logs and handoffs
    await startCommand({ quiet: true });

    console.log('');
    console.log(chalk.green('✓ Project context loaded'));

    // ============================================================
    // PHASE 3: Start Heartbeat
    // ============================================================
    console.log('');
    console.log(chalk.bold.cyan('💓 Starting heartbeat...'));
    startHeartbeat(agentConfig.agentId);
    console.log(chalk.green('✓ Heartbeat started (30s interval)'));

    // ============================================================
    // PHASE 4: Task Polling Loop
    // ============================================================
    console.log('');
    console.log(chalk.bold.cyan('🔄 Entering task polling loop...'));
    console.log(chalk.dim(`  Agent: ${agentConfig.name} (${agentConfig.agentId})`));
    console.log(chalk.dim(`  Capabilities: ${agentConfig.capabilities.join(', ')}`));
    console.log(chalk.dim(`  Poll interval: ${options.pollInterval || 5}s`));
    if (options.maxTasks && options.maxTasks > 0) {
      console.log(chalk.dim(`  Max tasks: ${options.maxTasks}`));
    }
    console.log('');
    console.log(chalk.yellow('⏳ Waiting for task assignments... (Ctrl+C to stop)'));

    // Setup graceful shutdown handlers
    let isShuttingDown = false;

    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log('');
      console.log(chalk.yellow(`\n📡 Received ${signal}, shutting down gracefully...`));

      // Log final stats
      displayFinalStats(stats);

      // Stop heartbeat and send final update
      await shutdownHeartbeat();

      console.log(chalk.green('✓ Worker agent stopped'));
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Start polling loop
    await pollForTasks(
      agentConfig,
      graphId,
      stats,
      options.pollInterval || 5,
      options.maxTasks || 0
    );

    // If we exit the loop normally (max tasks reached), show stats
    displayFinalStats(stats);
    await shutdownHeartbeat();

  } catch (error: any) {
    console.error(chalk.red('\n❌ Worker agent failed:'));
    console.error(chalk.red(`  ${error.message}`));

    // Cleanup on error
    if (agentConfig) {
      try {
        await shutdownHeartbeat();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    process.exit(1);
  }
}

/**
 * Poll for available task assignments
 *
 * This loop:
 * 1. Queries for available tasks matching agent capabilities
 * 2. Claims first available task atomically
 * 3. Loads task-specific context (files, acceptance criteria)
 * 4. Presents task to AI for execution
 * 5. Reports completion/blocker via events
 * 6. Returns to polling
 */
async function pollForTasks(
  agentConfig: AgentConfig,
  graphId: string | null,
  stats: WorkerStats,
  pollIntervalSeconds: number,
  maxTasks: number
): Promise<void> {
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  // Polling loop
  while (true) {
    // Check if we've hit max tasks limit
    if (maxTasks > 0 && stats.tasksCompleted >= maxTasks) {
      console.log('');
      console.log(chalk.green(`✓ Max tasks reached (${maxTasks})`));
      return;
    }

    try {
      // If no graph configured, can't poll for tasks
      if (!graphId) {
        await sleep(pollIntervalSeconds * 1000);
        continue;
      }

      // Step 1: Query for available tasks
      const availableResponse = await AgentClient.getAvailableTasks(
        graphId,
        agentConfig.capabilities,
        5 // Get up to 5 tasks to choose from
      );

      if (availableResponse.tasks.length === 0) {
        // No tasks available, keep polling
        consecutiveErrors = 0;
        await sleep(pollIntervalSeconds * 1000);
        continue;
      }

      // Step 2: Try to claim tasks (in order of priority)
      let claimedTask: TaskAssignment | null = null;

      for (const task of availableResponse.tasks) {
        try {
          // Attempt atomic claim
          const claimResponse = await AgentClient.claimTask(task.id, agentConfig.agentId);

          console.log('');
          console.log(chalk.green(`✓ Claimed task: ${chalk.bold(task.id)} - ${task.title}`));
          console.log(chalk.dim(`  Effort: ${task.effort} | Priority: ${task.priority}`));

          // Build task assignment
          claimedTask = {
            taskId: task.id,
            title: task.title,
            description: task.description,
            effort: task.effort,
            priority: task.priority,
            requiredCapabilities: task.requiredCapabilities,
            acceptanceCriteria: [], // Will be loaded
          };

          // Log claim event
          await logEvent({
            category: 'achievement',
            description: `Claimed task ${task.id}: ${task.title}`,
            tags: ['worker-agent', 'task-claimed'],
            impact: 'medium',
          });

          break; // Successfully claimed, stop trying others

        } catch (claimError: any) {
          // 409 Conflict = task already claimed, try next
          if (claimError.message.includes('409') || claimError.message.includes('already claimed')) {
            console.log(chalk.dim(`  ${task.id} already claimed, trying next...`));
            continue;
          }
          // Other error, throw
          throw claimError;
        }
      }

      if (!claimedTask) {
        // All tasks were claimed by others, keep polling
        await sleep(pollIntervalSeconds * 1000);
        continue;
      }

      // Step 3: Load task-specific context
      try {
        console.log(chalk.dim('  Loading task context...'));
        claimedTask.context = await loadTaskContext(claimedTask.taskId, graphId);
      } catch (contextError: any) {
        console.log(chalk.yellow(`  ⚠️  Failed to load task context: ${contextError.message}`));
        // Continue anyway - context is optional enhancement
      }

      // Step 4: Present task for execution
      await presentTaskForExecution(claimedTask, agentConfig, stats);

      // Reset error counter on success
      consecutiveErrors = 0;

    } catch (error: any) {
      consecutiveErrors++;
      console.error(chalk.red(`\n⚠️  Error during task polling: ${error.message}`));

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(chalk.red(`\n❌ Too many consecutive errors (${MAX_CONSECUTIVE_ERRORS}), exiting...`));
        throw new Error('Too many polling errors');
      }

      console.log(chalk.dim(`   Retrying in 30 seconds... (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`));
      await sleep(30000);
    }
  }
}

/**
 * Load task-specific context for execution
 *
 * Loads:
 * - Task-specific files (if specified in task metadata)
 * - Related patterns and gotchas
 * - Task constraints (ADRs, technical requirements)
 *
 * This is LAZY LOADING - only loads what's needed for the specific task,
 * complementing the full project context loaded at startup.
 */
async function loadTaskContext(taskId: string, graphId: string): Promise<TaskContextResponse> {
  return await AgentClient.getTaskContext(taskId, graphId);
}

/**
 * Present task for AI execution
 *
 * In the worker agent model, the AI is the executor. This function:
 * 1. Displays the task details and context
 * 2. Outputs structured information for AI to act on
 * 3. Waits for completion signal (via event or manual input)
 *
 * For autonomous operation, the AI reads this output and executes the task.
 * For supervised operation, a human reviews and guides the AI.
 */
async function presentTaskForExecution(
  task: TaskAssignment,
  agentConfig: AgentConfig,
  stats: WorkerStats
): Promise<void> {
  console.log('');
  console.log(chalk.bold.cyan('═'.repeat(60)));
  console.log(chalk.bold.cyan(`📋 TASK: ${task.taskId}`));
  console.log(chalk.bold.cyan('═'.repeat(60)));
  console.log('');
  console.log(chalk.bold('Title:'), task.title);
  console.log(chalk.bold('Description:'), task.description || '(none)');
  console.log(chalk.bold('Effort:'), task.effort);
  console.log(chalk.bold('Priority:'), task.priority);

  if (task.requiredCapabilities.length > 0) {
    console.log(chalk.bold('Required Capabilities:'), task.requiredCapabilities.join(', '));
  }

  // Display context if available
  if (task.context) {
    if (task.context.files.length > 0) {
      console.log('');
      console.log(chalk.bold('Files to Work On:'));
      for (const file of task.context.files) {
        console.log(chalk.dim(`  • ${file}`));
      }
    }

    if (task.context.patterns.length > 0) {
      console.log('');
      console.log(chalk.bold('Applicable Patterns:'));
      for (const pattern of task.context.patterns) {
        const confidenceIcon = pattern.confidence === 'high' ? '★' : pattern.confidence === 'medium' ? '◐' : '○';
        console.log(chalk.dim(`  ${confidenceIcon} ${pattern.name}`));
      }
    }

    if (task.context.gotchas.length > 0) {
      console.log('');
      console.log(chalk.bold('Watch Out For:'));
      for (const gotcha of task.context.gotchas) {
        const severityIcon = gotcha.severity === 'critical' ? '🚨' : gotcha.severity === 'high' ? '⚠️' : '💡';
        console.log(chalk.yellow(`  ${severityIcon} ${gotcha.description}`));
      }
    }

    if (task.context.constraints.length > 0) {
      console.log('');
      console.log(chalk.bold('Constraints:'));
      for (const constraint of task.context.constraints) {
        console.log(chalk.dim(`  • [${constraint.type}] ${constraint.description}`));
      }
    }
  }

  console.log('');
  console.log(chalk.bold.cyan('─'.repeat(60)));
  console.log(chalk.bold('Instructions:'));
  console.log(chalk.dim('  1. Execute the task described above'));
  console.log(chalk.dim('  2. Log progress with: ginko log "description" --category=achievement'));
  console.log(chalk.dim('  3. If blocked: ginko log "description" --category=blocker --blocked-by="reason"'));
  console.log(chalk.dim('  4. When complete: ginko log "Completed TASK-ID" --category=achievement --impact=high'));
  console.log(chalk.bold.cyan('─'.repeat(60)));
  console.log('');

  // Log that task is being worked on
  await logEvent({
    category: 'achievement',
    description: `Started working on ${task.taskId}: ${task.title}`,
    tags: ['worker-agent', 'task-started', task.taskId],
    impact: 'medium',
  });

  // In autonomous mode, we would now execute via Claude SDK
  // For now, we simulate task completion after a brief pause
  // The AI reading this output should take over and do the actual work

  console.log(chalk.yellow('⏳ Awaiting task execution...'));
  console.log(chalk.dim('   (This is where the AI would execute the task)'));
  console.log('');

  // For demo purposes, wait briefly then mark as "presented"
  // In real usage, this would integrate with Claude SDK for autonomous execution
  await sleep(2000);

  // Update stats
  stats.lastTaskAt = new Date();

  // For now, we return after presenting - the AI takes over
  // Task completion would come via event or manual completion
  // In a fully autonomous system, we'd have an execution loop here

  console.log(chalk.green(`✓ Task ${task.taskId} presented for execution`));
  console.log('');

  // Note: In real implementation, we would:
  // 1. Wait for completion event from the AI
  // 2. Or timeout and release the task
  // 3. For now, we just continue polling

  // Increment completed (for demo - in real use this would be after actual completion)
  stats.tasksCompleted++;
}

/**
 * Display final statistics
 */
function displayFinalStats(stats: WorkerStats): void {
  const duration = Date.now() - stats.startedAt.getTime();
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  console.log('');
  console.log(chalk.bold('📊 Worker Stats'));
  console.log(chalk.dim('─'.repeat(40)));
  console.log(`  Duration: ${minutes}m ${seconds}s`);
  console.log(`  Tasks completed: ${chalk.green(stats.tasksCompleted.toString())}`);
  console.log(`  Tasks failed: ${chalk.red(stats.tasksFailed.toString())}`);
  console.log(`  Tasks released: ${chalk.yellow(stats.tasksReleased.toString())}`);
  console.log(chalk.dim('─'.repeat(40)));
}

/**
 * Helper: Sleep for ms milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
