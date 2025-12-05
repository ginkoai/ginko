/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agent, worker, cli, epic-004, multi-agent, context-loading]
 * @related: [register.ts, agent-client.ts, ../start/index.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [commander, chalk, ora, agent-heartbeat, start]
 */

/**
 * Agent Work Command (EPIC-004 Sprint 1 TASK-7)
 *
 * Worker agent that loads project context and polls for task assignments.
 *
 * Worker Startup Flow:
 * 1. Register as worker agent (or use existing from .ginko/agent.json)
 * 2. Call `ginko start` to load project context (events, patterns, ADRs)
 * 3. Start heartbeat to maintain online status
 * 4. Enter polling loop for task assignments
 * 5. On assignment: load task-specific files + acceptance criteria
 * 6. Execute task, log events, verify, complete
 * 7. Return to polling
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
import { AgentClient } from './agent-client.js';
import { requireGinkoRoot } from '../../utils/ginko-root.js';
import { startCommand } from '../start/index.js';
import { startHeartbeat, stopHeartbeat, shutdownHeartbeat } from '../../lib/agent-heartbeat.js';

interface WorkOptions {
  capabilities?: string;
  name?: string;
  pollInterval?: number;
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
  acceptanceCriteria: string[];
  files?: string[];
  dependencies?: string[];
}

/**
 * Worker agent that loads context and polls for tasks
 */
export async function workAgentCommand(options: WorkOptions): Promise<void> {
  let agentConfig: AgentConfig | null = null;

  try {
    // ============================================================
    // PHASE 1: Agent Registration or Discovery
    // ============================================================
    const spinner = ora('Initializing worker agent...').start();

    const projectRoot = await requireGinkoRoot();
    const agentConfigPath = path.join(projectRoot, '.ginko', 'agent.json');

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

        await fs.mkdir(path.dirname(agentConfigPath), { recursive: true });
        await fs.writeFile(
          agentConfigPath,
          JSON.stringify(agentConfig, null, 2),
          'utf-8'
        );

        spinner.succeed(chalk.green(`Registered new agent: ${agentConfig.name}`));
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
    console.log('');
    console.log(chalk.yellow('⏳ Waiting for task assignments... (Ctrl+C to stop)'));

    // Setup graceful shutdown handlers
    let isShuttingDown = false;

    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log('');
      console.log(chalk.yellow(`\n📡 Received ${signal}, shutting down gracefully...`));

      // Stop heartbeat and send final update
      await shutdownHeartbeat();

      console.log(chalk.green('✓ Worker agent stopped'));
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Start polling loop
    await pollForTasks(agentConfig, options.pollInterval || 5);

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
 * 4. Executes task
 * 5. Verifies completion against acceptance criteria
 * 6. Marks task complete
 * 7. Returns to polling
 */
async function pollForTasks(
  agentConfig: AgentConfig,
  pollIntervalSeconds: number
): Promise<void> {
  // Polling loop
  while (true) {
    try {
      // TODO (EPIC-004 Sprint 2): Implement task polling and claiming
      // 1. Query GET /api/v1/task/available with agent capabilities
      // 2. If tasks available, attempt atomic claim via POST /api/v1/task/:id/claim
      // 3. On successful claim (200), load task context and execute
      // 4. On conflict (409), continue to next available task
      // 5. After execution, verify and complete task
      //
      // For now, just wait - this will be implemented in Sprint 2 TASK-1

      // Wait for next poll
      await sleep(pollIntervalSeconds * 1000);

    } catch (error: any) {
      console.error(chalk.red(`\n⚠️  Error during task polling: ${error.message}`));
      console.log(chalk.dim('   Retrying in 30 seconds...'));
      await sleep(30000);
    }
  }
}

/**
 * Load task-specific context for execution
 *
 * Loads:
 * - Task acceptance criteria from graph
 * - Task-specific files (if specified in task metadata)
 * - Related patterns and gotchas
 * - Task constraints (ADRs, technical requirements)
 *
 * This is LAZY LOADING - only loads what's needed for the specific task,
 * complementing the full project context loaded at startup.
 */
async function loadTaskContext(taskId: string): Promise<void> {
  // TODO (EPIC-004 Sprint 2): Implement task-specific context loading
  // 1. GET /api/v1/task/:id/criteria - acceptance criteria
  // 2. GET /api/v1/task/:id/files - task-specific files to read
  // 3. GET /api/v1/task/:id/patterns - applicable patterns
  // 4. GET /api/v1/task/:id/gotchas - known issues to avoid
  // 5. GET /api/v1/task/:id/constraints - ADRs and requirements
  //
  // For now, no-op
}

/**
 * Execute a task assignment
 */
async function executeTask(task: TaskAssignment, agentConfig: AgentConfig): Promise<void> {
  // TODO (EPIC-004 Sprint 3): Implement task execution
  // 1. Load task context (files, criteria, patterns)
  // 2. Execute task using Claude SDK
  // 3. Log events via ginko log
  // 4. Verify against acceptance criteria
  // 5. POST /api/v1/task/:id/complete
  //
  // For now, no-op
}

/**
 * Helper: Sleep for ms milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
