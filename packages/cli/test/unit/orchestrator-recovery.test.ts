/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-07
 * @tags: [test, orchestrator, recovery, state, epic-004, sprint-5, task-8]
 * @related: [../orchestrator-state.ts, ../../commands/orchestrate.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [vitest, fs-extra]
 */

/**
 * Orchestrator Recovery Tests (EPIC-004 Sprint 5 TASK-8)
 *
 * Tests for:
 * - State persistence to graph
 * - State recovery from graph
 * - Task status reconciliation
 * - Duplicate assignment prevention
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  OrchestratorStateManager,
  OrchestratorCheckpoint,
  persistStateToGraph,
  recoverStateFromGraph,
  reconcileTaskStatuses,
} from '../../src/lib/orchestrator-state.js';

// Mock graph API client
class MockGraphApiClient {
  private states: Map<string, OrchestratorCheckpoint> = new Map();

  async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    if (method === 'POST' && endpoint === '/api/v1/orchestrator/state') {
      const { graphId, orchestratorId, state } = body as any;
      const key = `${graphId}:${state.sprintId}`;
      this.states.set(key, state);
      return { success: true } as T;
    }

    if (method === 'GET' && endpoint.includes('/api/v1/orchestrator/state')) {
      const url = new URL(`http://example.com${endpoint}`);
      const graphId = url.searchParams.get('graphId');
      const epicId = url.searchParams.get('epicId');
      const key = `${graphId}:${epicId}`;
      const state = this.states.get(key);
      return { state: state || null } as T;
    }

    throw new Error(`Unsupported request: ${method} ${endpoint}`);
  }

  clear() {
    this.states.clear();
  }
}

describe('Orchestrator Recovery (TASK-8)', () => {
  let tempDir: string;
  let stateManager: OrchestratorStateManager;
  let mockClient: MockGraphApiClient;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-recovery-test-'));
    stateManager = new OrchestratorStateManager(tempDir, 'test-graph-123');
    mockClient = new MockGraphApiClient();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    mockClient.clear();
  });

  describe('persistStateToGraph', () => {
    it('should persist checkpoint to graph', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch-1',
        orchestratorName: 'test-orchestrator',
        graphId: 'test-graph-123',
        sprintId: 'EPIC-004-S5',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 0,
        completedTasks: ['TASK-1', 'TASK-2'],
        inProgressTasks: { 'TASK-3': 'agent-1' },
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 5000,
          contextLimit: 200000,
          pressure: 0.025,
          messageCount: 10,
          toolCallCount: 5,
          eventsSinceStart: 3,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      await persistStateToGraph(checkpoint, mockClient);

      // Verify state was persisted
      const recovered = await recoverStateFromGraph('test-graph-123', 'EPIC-004-S5', mockClient);
      expect(recovered).not.toBeNull();
      expect(recovered?.orchestratorId).toBe('orch-1');
      expect(recovered?.completedTasks).toEqual(['TASK-1', 'TASK-2']);
      expect(recovered?.inProgressTasks).toEqual({ 'TASK-3': 'agent-1' });
    });

    it('should include persistence timestamp', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch-1',
        orchestratorName: 'test-orchestrator',
        graphId: 'test-graph-123',
        sprintId: 'EPIC-004-S5',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 0,
        completedTasks: [],
        inProgressTasks: {},
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 1000,
          contextLimit: 200000,
          pressure: 0.005,
          messageCount: 2,
          toolCallCount: 1,
          eventsSinceStart: 1,
          model: 'claude-opus-4-5-20251101',
        },
        persistedAt: new Date().toISOString(),
        version: 1,
      };

      await persistStateToGraph(checkpoint, mockClient);

      const recovered = await recoverStateFromGraph('test-graph-123', 'EPIC-004-S5', mockClient);
      expect(recovered?.persistedAt).toBeDefined();
    });
  });

  describe('recoverStateFromGraph', () => {
    it('should recover most recent state for epic', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch-1',
        orchestratorName: 'test-orchestrator',
        graphId: 'test-graph-123',
        sprintId: 'EPIC-004-S5',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 2,
        completedTasks: ['TASK-1'],
        inProgressTasks: { 'TASK-2': 'agent-1' },
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 10000,
          contextLimit: 200000,
          pressure: 0.05,
          messageCount: 20,
          toolCallCount: 10,
          eventsSinceStart: 5,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      await persistStateToGraph(checkpoint, mockClient);

      const recovered = await recoverStateFromGraph('test-graph-123', 'EPIC-004-S5', mockClient);
      expect(recovered).not.toBeNull();
      expect(recovered?.orchestratorId).toBe('orch-1');
      expect(recovered?.cyclesWithoutProgress).toBe(2);
    });

    it('should return null if no state exists', async () => {
      const recovered = await recoverStateFromGraph('test-graph-123', 'nonexistent', mockClient);
      expect(recovered).toBeNull();
    });
  });

  describe('reconcileTaskStatuses', () => {
    it('should detect tasks completed externally', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch-1',
        orchestratorName: 'test-orchestrator',
        graphId: 'test-graph-123',
        sprintId: 'EPIC-004-S5',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 0,
        completedTasks: ['TASK-1'],
        inProgressTasks: { 'TASK-2': 'agent-1', 'TASK-3': 'agent-2' },
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 5000,
          contextLimit: 200000,
          pressure: 0.025,
          messageCount: 10,
          toolCallCount: 5,
          eventsSinceStart: 3,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      const actualTasks = [
        { id: 'TASK-1', status: 'complete' },
        { id: 'TASK-2', status: 'complete' }, // Completed externally
        { id: 'TASK-3', status: 'in_progress' },
        { id: 'TASK-4', status: 'complete' }, // New task completed
      ];

      const reconciled = await reconcileTaskStatuses(checkpoint, actualTasks, mockClient);

      expect(reconciled.completedTasks).toContain('TASK-1');
      expect(reconciled.completedTasks).toContain('TASK-2'); // Moved from in-progress
      expect(reconciled.completedTasks).toContain('TASK-4'); // Added as new
      expect(reconciled.inProgressTasks['TASK-2']).toBeUndefined(); // Removed
    });

    it('should detect tasks reverted from complete', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch-1',
        orchestratorName: 'test-orchestrator',
        graphId: 'test-graph-123',
        sprintId: 'EPIC-004-S5',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 0,
        completedTasks: ['TASK-1', 'TASK-2'],
        inProgressTasks: {},
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 5000,
          contextLimit: 200000,
          pressure: 0.025,
          messageCount: 10,
          toolCallCount: 5,
          eventsSinceStart: 3,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      const actualTasks = [
        { id: 'TASK-1', status: 'complete' },
        { id: 'TASK-2', status: 'pending' }, // Reverted externally
      ];

      const reconciled = await reconcileTaskStatuses(checkpoint, actualTasks, mockClient);

      expect(reconciled.completedTasks).toContain('TASK-1');
      expect(reconciled.completedTasks).not.toContain('TASK-2'); // Removed
    });

    it('should handle deleted tasks', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch-1',
        orchestratorName: 'test-orchestrator',
        graphId: 'test-graph-123',
        sprintId: 'EPIC-004-S5',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 0,
        completedTasks: [],
        inProgressTasks: { 'TASK-1': 'agent-1', 'TASK-2': 'agent-2' },
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 5000,
          contextLimit: 200000,
          pressure: 0.025,
          messageCount: 10,
          toolCallCount: 5,
          eventsSinceStart: 3,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      const actualTasks = [
        { id: 'TASK-1', status: 'in_progress' },
        // TASK-2 deleted
      ];

      const reconciled = await reconcileTaskStatuses(checkpoint, actualTasks, mockClient);

      expect(reconciled.inProgressTasks['TASK-1']).toBe('agent-1');
      expect(reconciled.inProgressTasks['TASK-2']).toBeUndefined(); // Removed
    });
  });

  describe('Cross-machine recovery', () => {
    it('should enable recovery from different machine', async () => {
      // Machine 1: Persist state
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch-machine-1',
        orchestratorName: 'orchestrator-machine-1',
        graphId: 'test-graph-123',
        sprintId: 'EPIC-004-S5',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 3,
        completedTasks: ['TASK-1', 'TASK-2', 'TASK-3'],
        inProgressTasks: { 'TASK-4': 'agent-1' },
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 15000,
          contextLimit: 200000,
          pressure: 0.075,
          messageCount: 30,
          toolCallCount: 15,
          eventsSinceStart: 8,
          model: 'claude-opus-4-5-20251101',
        },
        persistedAt: new Date().toISOString(),
        version: 1,
      };

      await persistStateToGraph(checkpoint, mockClient);

      // Machine 2: Recover state
      const recovered = await recoverStateFromGraph('test-graph-123', 'EPIC-004-S5', mockClient);

      expect(recovered).not.toBeNull();
      expect(recovered?.orchestratorId).toBe('orch-machine-1');
      expect(recovered?.completedTasks.length).toBe(3);
      expect(recovered?.inProgressTasks['TASK-4']).toBe('agent-1');
      expect(recovered?.persistedAt).toBeDefined();
    });
  });
});
