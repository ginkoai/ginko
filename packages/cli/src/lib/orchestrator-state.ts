/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [orchestrator, state, checkpoint, lifecycle, epic-004, sprint-4, task-10]
 * @related: [../commands/orchestrate.ts, context-metrics.ts, graph/api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

/**
 * Orchestrator State Management (EPIC-004 Sprint 4 TASK-10)
 *
 * Handles:
 * - State persistence to local filesystem and graph
 * - State recovery on restart
 * - Checkpoint creation for respawn scenarios
 * - Exit condition tracking
 *
 * Exit Codes:
 * - 0: Success (all tasks complete or graceful shutdown)
 * - 1: Error (unrecoverable failure or no progress)
 * - 75: Respawn needed (context pressure or max runtime)
 */

import fs from 'fs/promises';
import path from 'path';
import { ContextMetrics, ContextMonitor } from './context-metrics.js';

// ============================================================
// Constants
// ============================================================

export const EXIT_CODE_SUCCESS = 0;
export const EXIT_CODE_ERROR = 1;
export const EXIT_CODE_RESPAWN = 75;

const CHECKPOINT_FILENAME = 'orchestrator-checkpoint.json';
const STATE_NODE_LABEL = 'OrchestratorState';

// ============================================================
// Types
// ============================================================

/**
 * Assignment record for tracking task assignments
 */
export interface AssignmentRecord {
  taskId: string;
  agentId: string;
  assignedAt: string; // ISO timestamp
  status: 'assigned' | 'completed' | 'released' | 'failed';
  completedAt?: string;
  failureReason?: string;
}

/**
 * Serializable orchestrator state for persistence
 */
export interface OrchestratorCheckpoint {
  // Identity
  orchestratorId: string;
  orchestratorName: string;
  graphId: string;
  sprintId: string;

  // Timing
  startedAt: string; // ISO timestamp
  savedAt: string; // ISO timestamp
  lastProgressAt: string;

  // Progress tracking
  cyclesWithoutProgress: number;
  completedTasks: string[];
  inProgressTasks: Record<string, string>; // taskId -> agentId
  blockedTasks: string[];

  // History
  assignmentHistory: AssignmentRecord[];

  // Context metrics (TASK-9)
  contextMetrics: {
    estimatedTokens: number;
    contextLimit: number;
    pressure: number;
    messageCount: number;
    toolCallCount: number;
    eventsSinceStart: number;
    model: string;
  };

  // Exit reason (if exited)
  exitReason?: ExitReason;
  exitCode?: number;

  // Version for migration
  version: number;
}

/**
 * Exit reasons for orchestrator
 */
export type ExitReason =
  | 'all_complete'        // All tasks finished successfully
  | 'context_pressure'    // Context > 80%, need respawn
  | 'max_runtime'         // Max runtime exceeded
  | 'no_progress'         // Stalled for too many cycles
  | 'user_interrupt'      // SIGINT/SIGTERM
  | 'error'               // Unrecoverable error
  | 'manual_stop';        // Explicit stop command

/**
 * Options for loading checkpoint
 */
export interface LoadCheckpointOptions {
  projectRoot: string;
  fromGraph?: boolean; // Try to load from graph first
  graphId?: string;
}

/**
 * Options for saving checkpoint
 */
export interface SaveCheckpointOptions {
  projectRoot: string;
  toGraph?: boolean; // Also save to graph
  graphId?: string;
  exitReason?: ExitReason;
  exitCode?: number;
}

// ============================================================
// Checkpoint Manager
// ============================================================

export class OrchestratorStateManager {
  private projectRoot: string;
  private graphId?: string;

  constructor(projectRoot: string, graphId?: string) {
    this.projectRoot = projectRoot;
    this.graphId = graphId;
  }

  /**
   * Get the local checkpoint file path
   */
  getCheckpointPath(): string {
    return path.join(this.projectRoot, '.ginko', CHECKPOINT_FILENAME);
  }

  /**
   * Check if a checkpoint exists
   */
  async hasCheckpoint(): Promise<boolean> {
    try {
      await fs.access(this.getCheckpointPath());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load checkpoint from filesystem
   */
  async loadCheckpoint(): Promise<OrchestratorCheckpoint | null> {
    try {
      const checkpointPath = this.getCheckpointPath();
      const content = await fs.readFile(checkpointPath, 'utf-8');
      const checkpoint = JSON.parse(content) as OrchestratorCheckpoint;

      // Validate version
      if (!checkpoint.version || checkpoint.version < 1) {
        console.warn('Warning: Old checkpoint format, may have missing fields');
      }

      return checkpoint;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // No checkpoint exists
      }
      throw new Error(`Failed to load checkpoint: ${error.message}`);
    }
  }

  /**
   * Save checkpoint to filesystem
   */
  async saveCheckpoint(
    checkpoint: OrchestratorCheckpoint,
    options?: { exitReason?: ExitReason; exitCode?: number }
  ): Promise<void> {
    const checkpointPath = this.getCheckpointPath();

    // Update with exit info if provided
    const finalCheckpoint: OrchestratorCheckpoint = {
      ...checkpoint,
      savedAt: new Date().toISOString(),
      version: 1,
      ...(options?.exitReason && { exitReason: options.exitReason }),
      ...(options?.exitCode !== undefined && { exitCode: options.exitCode }),
    };

    // Ensure directory exists
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });

    // Write atomically (write to temp, then rename)
    const tempPath = `${checkpointPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(finalCheckpoint, null, 2), 'utf-8');
    await fs.rename(tempPath, checkpointPath);
  }

  /**
   * Delete checkpoint (after successful completion or explicit reset)
   */
  async deleteCheckpoint(): Promise<void> {
    try {
      await fs.unlink(this.getCheckpointPath());
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Ignore if file doesn't exist
    }
  }

  /**
   * Create a fresh checkpoint from current state
   * Accepts either a ContextMonitor (from runtime) or ContextMetrics (from tests)
   */
  createCheckpoint(state: {
    orchestratorId: string;
    orchestratorName: string;
    graphId: string;
    sprintId: string;
    startedAt: Date;
    lastProgressAt: Date;
    cyclesWithoutProgress: number;
    completedTasks: Set<string>;
    inProgressTasks: Map<string, string>;
    blockedTasks: Set<string>;
    assignmentHistory: Array<{
      taskId: string;
      agentId: string;
      assignedAt: Date;
      status: 'assigned' | 'completed' | 'released' | 'failed';
    }>;
    contextMonitor?: ContextMonitor; // Runtime: ContextMonitor instance
    contextMetrics?: ContextMetrics; // Testing: ContextMetrics object
  }): OrchestratorCheckpoint {
    // Get metrics from monitor or use provided metrics
    const metrics = state.contextMonitor?.getMetrics() ?? state.contextMetrics;
    if (!metrics) {
      throw new Error('Either contextMonitor or contextMetrics must be provided');
    }

    return {
      orchestratorId: state.orchestratorId,
      orchestratorName: state.orchestratorName,
      graphId: state.graphId,
      sprintId: state.sprintId,
      startedAt: state.startedAt.toISOString(),
      savedAt: new Date().toISOString(),
      lastProgressAt: state.lastProgressAt.toISOString(),
      cyclesWithoutProgress: state.cyclesWithoutProgress,
      completedTasks: Array.from(state.completedTasks),
      inProgressTasks: Object.fromEntries(state.inProgressTasks),
      blockedTasks: Array.from(state.blockedTasks),
      assignmentHistory: state.assignmentHistory.map(a => ({
        taskId: a.taskId,
        agentId: a.agentId,
        assignedAt: a.assignedAt.toISOString(),
        status: a.status,
      })),
      contextMetrics: {
        estimatedTokens: metrics.estimatedTokens,
        contextLimit: metrics.contextLimit,
        pressure: metrics.pressure,
        messageCount: metrics.messageCount,
        toolCallCount: metrics.toolCallCount,
        eventsSinceStart: metrics.eventsSinceStart,
        model: metrics.model,
      },
      version: 1,
    };
  }

  /**
   * Restore runtime state from checkpoint
   */
  restoreFromCheckpoint(checkpoint: OrchestratorCheckpoint): {
    completedTasks: Set<string>;
    inProgressTasks: Map<string, string>;
    blockedTasks: Set<string>;
    assignmentHistory: Array<{
      taskId: string;
      agentId: string;
      assignedAt: Date;
      status: 'assigned' | 'completed' | 'released' | 'failed';
    }>;
    startedAt: Date;
    lastProgressAt: Date;
    cyclesWithoutProgress: number;
  } {
    return {
      completedTasks: new Set(checkpoint.completedTasks),
      inProgressTasks: new Map(Object.entries(checkpoint.inProgressTasks)),
      blockedTasks: new Set(checkpoint.blockedTasks),
      assignmentHistory: checkpoint.assignmentHistory.map(a => ({
        taskId: a.taskId,
        agentId: a.agentId,
        assignedAt: new Date(a.assignedAt),
        status: a.status,
      })),
      startedAt: new Date(checkpoint.startedAt),
      lastProgressAt: new Date(checkpoint.lastProgressAt),
      cyclesWithoutProgress: checkpoint.cyclesWithoutProgress,
    };
  }
}

// ============================================================
// Graph Persistence (Future enhancement)
// ============================================================

/**
 * Save orchestrator state to graph
 * This enables cross-machine state recovery and team visibility
 */
export async function saveStateToGraph(
  checkpoint: OrchestratorCheckpoint,
  graphApiClient: { request: <T>(method: string, endpoint: string, body?: unknown) => Promise<T> }
): Promise<void> {
  // Create or update OrchestratorState node
  await graphApiClient.request('POST', '/api/v1/orchestrator/state', {
    graphId: checkpoint.graphId,
    orchestratorId: checkpoint.orchestratorId,
    state: checkpoint,
  });
}

/**
 * Load orchestrator state from graph
 */
export async function loadStateFromGraph(
  graphId: string,
  orchestratorId: string,
  graphApiClient: { request: <T>(method: string, endpoint: string, body?: unknown) => Promise<T> }
): Promise<OrchestratorCheckpoint | null> {
  try {
    const response = await graphApiClient.request<{ state: OrchestratorCheckpoint }>(
      'GET',
      `/api/v1/orchestrator/state?graphId=${graphId}&orchestratorId=${orchestratorId}`,
    );
    return response.state;
  } catch {
    return null;
  }
}

// ============================================================
// Exit Condition Helpers
// ============================================================

/**
 * Determine exit code from reason
 */
export function getExitCode(reason: ExitReason): number {
  switch (reason) {
    case 'all_complete':
    case 'user_interrupt':
    case 'manual_stop':
      return EXIT_CODE_SUCCESS;

    case 'context_pressure':
    case 'max_runtime':
      return EXIT_CODE_RESPAWN;

    case 'no_progress':
    case 'error':
    default:
      return EXIT_CODE_ERROR;
  }
}

/**
 * Check if exit code indicates respawn is needed
 */
export function shouldRespawn(exitCode: number): boolean {
  return exitCode === EXIT_CODE_RESPAWN;
}

/**
 * Get human-readable exit message
 */
export function getExitMessage(reason: ExitReason): string {
  switch (reason) {
    case 'all_complete':
      return 'All tasks completed successfully';
    case 'context_pressure':
      return 'Context pressure exceeded threshold - respawn needed';
    case 'max_runtime':
      return 'Maximum runtime exceeded - respawn needed';
    case 'no_progress':
      return 'No progress detected for extended period - investigation needed';
    case 'user_interrupt':
      return 'Graceful shutdown requested';
    case 'manual_stop':
      return 'Orchestrator stopped manually';
    case 'error':
      return 'Unrecoverable error occurred';
    default:
      return 'Unknown exit reason';
  }
}

// ============================================================
// Singleton Instance (for global access)
// ============================================================

let stateManagerInstance: OrchestratorStateManager | null = null;

/**
 * Get or create state manager instance
 */
export function getStateManager(projectRoot?: string, graphId?: string): OrchestratorStateManager {
  if (!stateManagerInstance && projectRoot) {
    stateManagerInstance = new OrchestratorStateManager(projectRoot, graphId);
  }
  if (!stateManagerInstance) {
    throw new Error('State manager not initialized. Call getStateManager with projectRoot first.');
  }
  return stateManagerInstance;
}

/**
 * Reset state manager (for testing)
 */
export function resetStateManager(): void {
  stateManagerInstance = null;
}

export default OrchestratorStateManager;
