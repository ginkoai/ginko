/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-07
 * @tags: [test, orchestrator, state, checkpoint, lifecycle, epic-004, sprint-4, task-10]
 * @related: [../../src/lib/orchestrator-state.ts, ../../src/commands/orchestrate.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  OrchestratorStateManager,
  OrchestratorCheckpoint,
  ExitReason,
  EXIT_CODE_SUCCESS,
  EXIT_CODE_ERROR,
  EXIT_CODE_RESPAWN,
  getExitCode,
  getExitMessage,
  shouldRespawn,
  resetStateManager,
} from '../../src/lib/orchestrator-state.js';
import { ContextMetrics } from '../../src/lib/context-metrics.js';

// ============================================================
// Test Helpers
// ============================================================

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-state-test-'));
  resetStateManager();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

function createMockContextMetrics(): ContextMetrics {
  return {
    estimatedTokens: 50000,
    contextLimit: 200000,
    pressure: 0.25,
    messageCount: 10,
    toolCallCount: 25,
    eventsSinceStart: 15,
    model: 'claude-opus-4-5-20251101',
    measuredAt: new Date(),
  };
}

function createMockState() {
  return {
    orchestratorId: 'orch_test123',
    orchestratorName: 'orchestrator-1234567890',
    graphId: 'graph_abc',
    sprintId: 'SPRINT-2025-12-test.md',
    startedAt: new Date('2025-12-07T10:00:00Z'),
    lastProgressAt: new Date('2025-12-07T10:30:00Z'),
    cyclesWithoutProgress: 2,
    completedTasks: new Set(['TASK-1', 'TASK-2']),
    inProgressTasks: new Map([['TASK-3', 'agent_worker1']]),
    blockedTasks: new Set(['TASK-5']),
    assignmentHistory: [
      {
        taskId: 'TASK-1',
        agentId: 'agent_worker1',
        assignedAt: new Date('2025-12-07T10:05:00Z'),
        status: 'completed' as const,
      },
      {
        taskId: 'TASK-3',
        agentId: 'agent_worker1',
        assignedAt: new Date('2025-12-07T10:25:00Z'),
        status: 'assigned' as const,
      },
    ],
    contextMetrics: createMockContextMetrics(),
  };
}

// ============================================================
// OrchestratorStateManager Tests
// ============================================================

describe('OrchestratorStateManager', () => {
  describe('initialization', () => {
    it('should create manager with project root', () => {
      const manager = new OrchestratorStateManager(tempDir);
      expect(manager).toBeDefined();
    });

    it('should create manager with project root and graph ID', () => {
      const manager = new OrchestratorStateManager(tempDir, 'graph_123');
      expect(manager).toBeDefined();
    });
  });

  describe('getCheckpointPath', () => {
    it('should return correct checkpoint path', () => {
      const manager = new OrchestratorStateManager(tempDir);
      const expectedPath = path.join(tempDir, '.ginko', 'orchestrator-checkpoint.json');
      expect(manager.getCheckpointPath()).toBe(expectedPath);
    });
  });

  describe('hasCheckpoint', () => {
    it('should return false when no checkpoint exists', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      expect(await manager.hasCheckpoint()).toBe(false);
    });

    it('should return true when checkpoint exists', async () => {
      const manager = new OrchestratorStateManager(tempDir);

      // Create checkpoint directory and file
      await fs.mkdir(path.join(tempDir, '.ginko'), { recursive: true });
      await fs.writeFile(manager.getCheckpointPath(), '{}');

      expect(await manager.hasCheckpoint()).toBe(true);
    });
  });

  describe('createCheckpoint', () => {
    it('should create checkpoint from state with contextMetrics', () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();

      const checkpoint = manager.createCheckpoint(mockState);

      expect(checkpoint.orchestratorId).toBe('orch_test123');
      expect(checkpoint.orchestratorName).toBe('orchestrator-1234567890');
      expect(checkpoint.graphId).toBe('graph_abc');
      expect(checkpoint.sprintId).toBe('SPRINT-2025-12-test.md');
      expect(checkpoint.completedTasks).toEqual(['TASK-1', 'TASK-2']);
      expect(checkpoint.inProgressTasks).toEqual({ 'TASK-3': 'agent_worker1' });
      expect(checkpoint.blockedTasks).toEqual(['TASK-5']);
      expect(checkpoint.cyclesWithoutProgress).toBe(2);
      expect(checkpoint.version).toBe(1);
    });

    it('should include context metrics in checkpoint', () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();

      const checkpoint = manager.createCheckpoint(mockState);

      expect(checkpoint.contextMetrics.estimatedTokens).toBe(50000);
      expect(checkpoint.contextMetrics.contextLimit).toBe(200000);
      expect(checkpoint.contextMetrics.pressure).toBe(0.25);
      expect(checkpoint.contextMetrics.messageCount).toBe(10);
      expect(checkpoint.contextMetrics.model).toBe('claude-opus-4-5-20251101');
    });

    it('should serialize assignment history with ISO timestamps', () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();

      const checkpoint = manager.createCheckpoint(mockState);

      expect(checkpoint.assignmentHistory).toHaveLength(2);
      expect(checkpoint.assignmentHistory[0].assignedAt).toBe('2025-12-07T10:05:00.000Z');
      expect(checkpoint.assignmentHistory[0].status).toBe('completed');
    });

    it('should throw error when neither contextMonitor nor contextMetrics provided', () => {
      const manager = new OrchestratorStateManager(tempDir);
      const invalidState = {
        ...createMockState(),
        contextMetrics: undefined,
        contextMonitor: undefined,
      };

      expect(() => manager.createCheckpoint(invalidState as any)).toThrow(
        'Either contextMonitor or contextMetrics must be provided'
      );
    });
  });

  describe('saveCheckpoint and loadCheckpoint', () => {
    it('should save and load checkpoint correctly', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();
      const checkpoint = manager.createCheckpoint(mockState);

      await manager.saveCheckpoint(checkpoint);
      const loaded = await manager.loadCheckpoint();

      expect(loaded).not.toBeNull();
      expect(loaded!.orchestratorId).toBe(checkpoint.orchestratorId);
      expect(loaded!.completedTasks).toEqual(checkpoint.completedTasks);
      expect(loaded!.version).toBe(1);
    });

    it('should save checkpoint with exit reason and code', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();
      const checkpoint = manager.createCheckpoint(mockState);

      await manager.saveCheckpoint(checkpoint, {
        exitReason: 'context_pressure',
        exitCode: EXIT_CODE_RESPAWN,
      });

      const loaded = await manager.loadCheckpoint();

      expect(loaded!.exitReason).toBe('context_pressure');
      expect(loaded!.exitCode).toBe(EXIT_CODE_RESPAWN);
    });

    it('should return null when no checkpoint exists', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      const loaded = await manager.loadCheckpoint();
      expect(loaded).toBeNull();
    });

    it('should create parent directories if they do not exist', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();
      const checkpoint = manager.createCheckpoint(mockState);

      // Ensure .ginko directory doesn't exist
      expect(await fs.access(path.join(tempDir, '.ginko')).then(() => true).catch(() => false)).toBe(false);

      await manager.saveCheckpoint(checkpoint);

      // Directory should now exist
      expect(await fs.access(path.join(tempDir, '.ginko')).then(() => true).catch(() => false)).toBe(true);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete existing checkpoint', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();
      const checkpoint = manager.createCheckpoint(mockState);

      await manager.saveCheckpoint(checkpoint);
      expect(await manager.hasCheckpoint()).toBe(true);

      await manager.deleteCheckpoint();
      expect(await manager.hasCheckpoint()).toBe(false);
    });

    it('should not throw when deleting non-existent checkpoint', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      await expect(manager.deleteCheckpoint()).resolves.not.toThrow();
    });
  });

  describe('restoreFromCheckpoint', () => {
    it('should restore state from checkpoint', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();
      const checkpoint = manager.createCheckpoint(mockState);

      const restored = manager.restoreFromCheckpoint(checkpoint);

      expect(restored.completedTasks).toBeInstanceOf(Set);
      expect(restored.completedTasks.has('TASK-1')).toBe(true);
      expect(restored.completedTasks.has('TASK-2')).toBe(true);

      expect(restored.inProgressTasks).toBeInstanceOf(Map);
      expect(restored.inProgressTasks.get('TASK-3')).toBe('agent_worker1');

      expect(restored.blockedTasks).toBeInstanceOf(Set);
      expect(restored.blockedTasks.has('TASK-5')).toBe(true);

      expect(restored.startedAt).toBeInstanceOf(Date);
      expect(restored.assignmentHistory).toHaveLength(2);
      expect(restored.assignmentHistory[0].assignedAt).toBeInstanceOf(Date);
    });

    it('should restore assignment history with Date objects', async () => {
      const manager = new OrchestratorStateManager(tempDir);
      const mockState = createMockState();
      const checkpoint = manager.createCheckpoint(mockState);

      const restored = manager.restoreFromCheckpoint(checkpoint);

      expect(restored.assignmentHistory[0].assignedAt).toBeInstanceOf(Date);
      expect(restored.assignmentHistory[0].assignedAt.toISOString()).toBe('2025-12-07T10:05:00.000Z');
    });
  });
});

// ============================================================
// Exit Code Helper Tests
// ============================================================

describe('Exit Code Helpers', () => {
  describe('getExitCode', () => {
    it('should return SUCCESS for all_complete', () => {
      expect(getExitCode('all_complete')).toBe(EXIT_CODE_SUCCESS);
    });

    it('should return SUCCESS for user_interrupt', () => {
      expect(getExitCode('user_interrupt')).toBe(EXIT_CODE_SUCCESS);
    });

    it('should return SUCCESS for manual_stop', () => {
      expect(getExitCode('manual_stop')).toBe(EXIT_CODE_SUCCESS);
    });

    it('should return RESPAWN for context_pressure', () => {
      expect(getExitCode('context_pressure')).toBe(EXIT_CODE_RESPAWN);
    });

    it('should return RESPAWN for max_runtime', () => {
      expect(getExitCode('max_runtime')).toBe(EXIT_CODE_RESPAWN);
    });

    it('should return ERROR for no_progress', () => {
      expect(getExitCode('no_progress')).toBe(EXIT_CODE_ERROR);
    });

    it('should return ERROR for error', () => {
      expect(getExitCode('error')).toBe(EXIT_CODE_ERROR);
    });
  });

  describe('shouldRespawn', () => {
    it('should return true for EXIT_CODE_RESPAWN', () => {
      expect(shouldRespawn(EXIT_CODE_RESPAWN)).toBe(true);
    });

    it('should return false for EXIT_CODE_SUCCESS', () => {
      expect(shouldRespawn(EXIT_CODE_SUCCESS)).toBe(false);
    });

    it('should return false for EXIT_CODE_ERROR', () => {
      expect(shouldRespawn(EXIT_CODE_ERROR)).toBe(false);
    });
  });

  describe('getExitMessage', () => {
    it('should return appropriate message for all_complete', () => {
      expect(getExitMessage('all_complete')).toBe('All tasks completed successfully');
    });

    it('should return appropriate message for context_pressure', () => {
      expect(getExitMessage('context_pressure')).toBe('Context pressure exceeded threshold - respawn needed');
    });

    it('should return appropriate message for max_runtime', () => {
      expect(getExitMessage('max_runtime')).toBe('Maximum runtime exceeded - respawn needed');
    });

    it('should return appropriate message for no_progress', () => {
      expect(getExitMessage('no_progress')).toBe('No progress detected for extended period - investigation needed');
    });

    it('should return appropriate message for user_interrupt', () => {
      expect(getExitMessage('user_interrupt')).toBe('Graceful shutdown requested');
    });

    it('should return appropriate message for error', () => {
      expect(getExitMessage('error')).toBe('Unrecoverable error occurred');
    });
  });
});

// ============================================================
// Constants Tests
// ============================================================

describe('Exit Code Constants', () => {
  it('should have correct EXIT_CODE_SUCCESS value', () => {
    expect(EXIT_CODE_SUCCESS).toBe(0);
  });

  it('should have correct EXIT_CODE_ERROR value', () => {
    expect(EXIT_CODE_ERROR).toBe(1);
  });

  it('should have correct EXIT_CODE_RESPAWN value', () => {
    expect(EXIT_CODE_RESPAWN).toBe(75);
  });
});

// ============================================================
// Integration-like Tests
// ============================================================

describe('Checkpoint Lifecycle', () => {
  it('should handle full save-restore cycle', async () => {
    const manager = new OrchestratorStateManager(tempDir, 'graph_test');

    // Create initial state
    const originalState = createMockState();
    originalState.completedTasks = new Set(['TASK-1', 'TASK-2', 'TASK-3']);
    originalState.inProgressTasks = new Map([['TASK-4', 'worker_1'], ['TASK-5', 'worker_2']]);
    originalState.cyclesWithoutProgress = 5;

    // Create and save checkpoint
    const checkpoint = manager.createCheckpoint(originalState);
    await manager.saveCheckpoint(checkpoint, {
      exitReason: 'max_runtime',
      exitCode: EXIT_CODE_RESPAWN,
    });

    // Verify checkpoint exists
    expect(await manager.hasCheckpoint()).toBe(true);

    // Load checkpoint
    const loadedCheckpoint = await manager.loadCheckpoint();
    expect(loadedCheckpoint).not.toBeNull();

    // Restore state
    const restoredState = manager.restoreFromCheckpoint(loadedCheckpoint!);

    // Verify restored state matches original
    expect(restoredState.completedTasks.size).toBe(3);
    expect(restoredState.completedTasks.has('TASK-1')).toBe(true);
    expect(restoredState.completedTasks.has('TASK-3')).toBe(true);

    expect(restoredState.inProgressTasks.size).toBe(2);
    expect(restoredState.inProgressTasks.get('TASK-4')).toBe('worker_1');
    expect(restoredState.inProgressTasks.get('TASK-5')).toBe('worker_2');

    expect(restoredState.cyclesWithoutProgress).toBe(5);

    // Verify exit reason was saved
    expect(loadedCheckpoint!.exitReason).toBe('max_runtime');
    expect(loadedCheckpoint!.exitCode).toBe(EXIT_CODE_RESPAWN);
  });

  it('should handle checkpoint update (overwrite)', async () => {
    const manager = new OrchestratorStateManager(tempDir);

    // Create first checkpoint
    const state1 = createMockState();
    state1.completedTasks = new Set(['TASK-1']);
    const checkpoint1 = manager.createCheckpoint(state1);
    await manager.saveCheckpoint(checkpoint1);

    // Create second checkpoint with more progress
    const state2 = createMockState();
    state2.completedTasks = new Set(['TASK-1', 'TASK-2', 'TASK-3']);
    const checkpoint2 = manager.createCheckpoint(state2);
    await manager.saveCheckpoint(checkpoint2);

    // Load should return latest checkpoint
    const loaded = await manager.loadCheckpoint();
    expect(loaded!.completedTasks).toEqual(['TASK-1', 'TASK-2', 'TASK-3']);
  });

  it('should clean up checkpoint after successful completion', async () => {
    const manager = new OrchestratorStateManager(tempDir);

    // Save checkpoint
    const state = createMockState();
    const checkpoint = manager.createCheckpoint(state);
    await manager.saveCheckpoint(checkpoint);
    expect(await manager.hasCheckpoint()).toBe(true);

    // Delete checkpoint (simulating successful completion)
    await manager.deleteCheckpoint();
    expect(await manager.hasCheckpoint()).toBe(false);

    // Load should return null
    const loaded = await manager.loadCheckpoint();
    expect(loaded).toBeNull();
  });
});
