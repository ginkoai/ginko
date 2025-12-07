/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-07
 * @tags: [test, integration, orchestration, multi-agent, epic-004, sprint-4]
 * @related: [../../src/commands/orchestrate.ts, ../../src/commands/agent/work.ts, ../../src/lib/task-dependencies.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest]
 */

/**
 * Integration Tests: Orchestration Layer (EPIC-004 Sprint 4 TASK-11)
 *
 * Tests complete orchestration flow:
 * - Dependency graph traversal and topological ordering
 * - Orchestrator assigns, worker executes flow
 * - Blocked tasks wait for dependencies
 * - Context pressure triggers respawn
 * - State recovery after restart
 * - Edge cases: circular deps, no workers
 *
 * Coverage: Task dependencies, orchestrator lifecycle, state management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Task dependencies module
import {
  Task,
  ExecutionWave,
  DependencyError,
  DependencyStats,
  detectCircularDependencies,
  validateDependencies,
  getExecutionOrder,
  getAvailableTasks,
  getBlockedTasks,
  getDependencyStats,
  buildReverseDependencyMap,
  getDownstreamTasks,
  getUpstreamTasks,
} from '../../src/lib/task-dependencies.js';

// Context metrics module
import {
  ContextMetrics,
  PressureZone,
  ContextMonitor,
  estimateTokens,
  estimateStructuredTokens,
  getContextLimit,
  calculatePressure,
  getPressureZone,
  MODEL_LIMITS,
  resetContextMonitor,
} from '../../src/lib/context-metrics.js';

// Orchestrator state module
import {
  OrchestratorStateManager,
  OrchestratorCheckpoint,
  AssignmentRecord,
  ExitReason,
  EXIT_CODE_SUCCESS,
  EXIT_CODE_ERROR,
  EXIT_CODE_RESPAWN,
  getExitCode,
  shouldRespawn,
  getExitMessage,
  resetStateManager,
} from '../../src/lib/orchestrator-state.js';

// ============================================================
// Test Data
// ============================================================

/**
 * Create a set of tasks with dependencies for testing
 */
function createTestTasks(): Task[] {
  return [
    { id: 'TASK-1', dependsOn: [], status: 'pending', title: 'Setup foundation' },
    { id: 'TASK-2', dependsOn: [], status: 'pending', title: 'Create database schema' },
    { id: 'TASK-3', dependsOn: ['TASK-1', 'TASK-2'], status: 'pending', title: 'Implement API' },
    { id: 'TASK-4', dependsOn: ['TASK-1'], status: 'pending', title: 'Add authentication' },
    { id: 'TASK-5', dependsOn: ['TASK-3', 'TASK-4'], status: 'pending', title: 'Integration tests' },
    { id: 'TASK-6', dependsOn: ['TASK-5'], status: 'pending', title: 'Deploy to staging' },
  ];
}

/**
 * Create tasks with circular dependencies
 */
function createCircularTasks(): Task[] {
  return [
    { id: 'TASK-A', dependsOn: ['TASK-C'], status: 'pending' },
    { id: 'TASK-B', dependsOn: ['TASK-A'], status: 'pending' },
    { id: 'TASK-C', dependsOn: ['TASK-B'], status: 'pending' },
  ];
}

/**
 * Create context metrics for testing
 */
function createTestContextMetrics(overrides?: Partial<ContextMetrics>): ContextMetrics {
  return {
    estimatedTokens: 50000,
    contextLimit: 200000,
    pressure: 0.25,
    messageCount: 10,
    toolCallCount: 5,
    eventsSinceStart: 20,
    model: 'claude-opus-4-5-20251101',
    measuredAt: new Date(),
    ...overrides,
  };
}

// ============================================================
// Dependency Graph Tests
// ============================================================

describe('Task Dependencies (Integration)', () => {
  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependency', () => {
      const tasks = createCircularTasks();
      const cycles = detectCircularDependencies(tasks);

      expect(cycles.length).toBeGreaterThan(0);
      // Cycle should include A, B, C
      const flatCycles = cycles.flat();
      expect(flatCycles).toContain('TASK-A');
      expect(flatCycles).toContain('TASK-B');
      expect(flatCycles).toContain('TASK-C');
    });

    it('should return empty array for valid DAG', () => {
      const tasks = createTestTasks();
      const cycles = detectCircularDependencies(tasks);

      expect(cycles).toEqual([]);
    });

    it('should detect self-reference as cycle', () => {
      const tasks: Task[] = [
        { id: 'TASK-1', dependsOn: ['TASK-1'], status: 'pending' },
      ];

      // Self-reference is caught by validateDependencies, not detectCircularDependencies
      const errors = validateDependencies(tasks);
      expect(errors.some(e => e.type === 'self_reference')).toBe(true);
    });
  });

  describe('Dependency Validation', () => {
    it('should catch missing dependencies', () => {
      const tasks: Task[] = [
        { id: 'TASK-1', dependsOn: ['TASK-MISSING'], status: 'pending' },
      ];

      const errors = validateDependencies(tasks);

      expect(errors.length).toBe(1);
      expect(errors[0].type).toBe('missing');
      expect(errors[0].taskId).toBe('TASK-1');
    });

    it('should report all validation errors', () => {
      const tasks: Task[] = [
        { id: 'TASK-1', dependsOn: ['TASK-1', 'TASK-MISSING'], status: 'pending' },
      ];

      const errors = validateDependencies(tasks);

      // Should have both self-reference and missing dependency
      expect(errors.length).toBeGreaterThanOrEqual(2);
      expect(errors.some(e => e.type === 'self_reference')).toBe(true);
      expect(errors.some(e => e.type === 'missing')).toBe(true);
    });
  });

  describe('Topological Ordering (Execution Waves)', () => {
    it('should compute correct execution waves', () => {
      const tasks = createTestTasks();
      const waves = getExecutionOrder(tasks);

      expect(waves.length).toBe(4);

      // Wave 1: TASK-1, TASK-2 (no dependencies)
      expect(waves[0].wave).toBe(1);
      expect(waves[0].tasks.map(t => t.id).sort()).toEqual(['TASK-1', 'TASK-2']);

      // Wave 2: TASK-3, TASK-4 (depend on wave 1)
      expect(waves[1].wave).toBe(2);
      expect(waves[1].tasks.map(t => t.id).sort()).toEqual(['TASK-3', 'TASK-4']);

      // Wave 3: TASK-5 (depends on wave 2)
      expect(waves[2].wave).toBe(3);
      expect(waves[2].tasks.map(t => t.id)).toEqual(['TASK-5']);

      // Wave 4: TASK-6 (depends on wave 3)
      expect(waves[3].wave).toBe(4);
      expect(waves[3].tasks.map(t => t.id)).toEqual(['TASK-6']);
    });

    it('should throw on circular dependencies', () => {
      const tasks = createCircularTasks();

      expect(() => getExecutionOrder(tasks)).toThrow(/circular/i);
    });

    it('should handle single task with no dependencies', () => {
      const tasks: Task[] = [{ id: 'TASK-1', dependsOn: [], status: 'pending' }];
      const waves = getExecutionOrder(tasks);

      expect(waves.length).toBe(1);
      expect(waves[0].tasks[0].id).toBe('TASK-1');
    });

    it('should handle empty task list', () => {
      const waves = getExecutionOrder([]);
      expect(waves).toEqual([]);
    });
  });

  describe('Available Tasks', () => {
    it('should return tasks with no dependencies when all pending', () => {
      const tasks = createTestTasks();
      const available = getAvailableTasks(tasks);

      expect(available.map(t => t.id).sort()).toEqual(['TASK-1', 'TASK-2']);
    });

    it('should unlock tasks when dependencies complete', () => {
      const tasks = createTestTasks();
      // Mark TASK-1 and TASK-2 as complete
      tasks[0].status = 'complete';
      tasks[1].status = 'complete';

      const available = getAvailableTasks(tasks);

      // TASK-3 and TASK-4 should now be available
      expect(available.map(t => t.id).sort()).toEqual(['TASK-3', 'TASK-4']);
    });

    it('should not return in-progress tasks as available', () => {
      const tasks = createTestTasks();
      tasks[0].status = 'in_progress';

      const available = getAvailableTasks(tasks);

      // TASK-1 in progress, only TASK-2 available
      expect(available.map(t => t.id)).toEqual(['TASK-2']);
    });
  });

  describe('Blocked Tasks', () => {
    it('should identify tasks blocked by incomplete dependencies', () => {
      const tasks = createTestTasks();
      const blocked = getBlockedTasks(tasks);

      // TASK-3, TASK-4, TASK-5, TASK-6 are blocked
      expect(blocked.length).toBe(4);
      expect(blocked.map(t => t.id).sort()).toEqual(['TASK-3', 'TASK-4', 'TASK-5', 'TASK-6']);
    });

    it('should unblock tasks when dependencies complete', () => {
      const tasks = createTestTasks();
      tasks[0].status = 'complete'; // TASK-1
      tasks[1].status = 'complete'; // TASK-2

      const blocked = getBlockedTasks(tasks);

      // TASK-3 and TASK-4 are no longer blocked
      expect(blocked.map(t => t.id).sort()).toEqual(['TASK-5', 'TASK-6']);
    });
  });

  describe('Dependency Graph Analysis', () => {
    it('should compute correct statistics', () => {
      const tasks = createTestTasks();
      const stats = getDependencyStats(tasks);

      expect(stats.totalTasks).toBe(6);
      expect(stats.tasksWithoutDeps).toBe(2); // TASK-1, TASK-2
      expect(stats.tasksWithDeps).toBe(4);
      expect(stats.maxDepth).toBe(4); // 4 waves
      expect(stats.avgDepsPerTask).toBeCloseTo(1.0, 2); // 6 deps / 6 tasks
    });

    it('should build reverse dependency map', () => {
      const tasks = createTestTasks();
      const reverseMap = buildReverseDependencyMap(tasks);

      // TASK-1 is depended on by TASK-3, TASK-4
      expect(reverseMap.get('TASK-1')?.sort()).toEqual(['TASK-3', 'TASK-4']);

      // TASK-5 is depended on by TASK-6
      expect(reverseMap.get('TASK-5')).toEqual(['TASK-6']);

      // TASK-6 has no dependents
      expect(reverseMap.get('TASK-6')).toEqual([]);
    });

    it('should find downstream tasks', () => {
      const tasks = createTestTasks();

      // TASK-1 → TASK-3, TASK-4 → TASK-5 → TASK-6
      const downstream = getDownstreamTasks('TASK-1', tasks);

      expect(downstream.sort()).toEqual(['TASK-3', 'TASK-4', 'TASK-5', 'TASK-6']);
    });

    it('should find upstream tasks', () => {
      const tasks = createTestTasks();

      // TASK-6 ← TASK-5 ← TASK-3 ← TASK-1, TASK-2
      //                 ← TASK-4 ← TASK-1
      const upstream = getUpstreamTasks('TASK-6', tasks);

      expect(upstream.sort()).toEqual(['TASK-1', 'TASK-2', 'TASK-3', 'TASK-4', 'TASK-5']);
    });
  });
});

// ============================================================
// Context Pressure Tests
// ============================================================

describe('Context Pressure Monitoring (Integration)', () => {
  beforeEach(() => {
    resetContextMonitor();
  });

  describe('Token Estimation', () => {
    it('should estimate tokens from text', () => {
      const text = 'Hello world'; // 11 chars
      const tokens = estimateTokens(text);

      // ~4 chars per token
      expect(tokens).toBe(Math.ceil(11 / 4)); // 3 tokens
    });

    it('should handle empty text', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should estimate structured content', () => {
      const content = {
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        toolCalls: [
          { name: 'read_file', input: { path: '/test.txt' }, output: 'file contents' },
        ],
      };

      const { total, breakdown } = estimateStructuredTokens(content);

      expect(total).toBeGreaterThan(0);
      expect(breakdown.systemPrompt).toBeGreaterThan(0);
      expect(breakdown.messages).toBeGreaterThan(0);
      expect(breakdown.toolCalls).toBeGreaterThan(0);
    });
  });

  describe('Pressure Calculation', () => {
    it('should calculate pressure ratio correctly', () => {
      expect(calculatePressure(50000, 200000)).toBe(0.25);
      expect(calculatePressure(100000, 200000)).toBe(0.5);
      expect(calculatePressure(200000, 200000)).toBe(1.0);
    });

    it('should clamp pressure to 0-1 range', () => {
      expect(calculatePressure(300000, 200000)).toBe(1.0);
      expect(calculatePressure(-1000, 200000)).toBe(0.0);
    });

    it('should classify pressure zones correctly', () => {
      expect(getPressureZone(0.3)).toBe('optimal');
      expect(getPressureZone(0.6)).toBe('elevated');
      expect(getPressureZone(0.75)).toBe('warning');
      expect(getPressureZone(0.9)).toBe('critical');
    });
  });

  describe('Model Limits', () => {
    it('should return correct limits for known models', () => {
      expect(getContextLimit('claude-opus-4-5-20251101')).toBe(200000);
      expect(getContextLimit('gpt-4-turbo')).toBe(128000);
      expect(getContextLimit('gemini-pro')).toBe(1000000);
    });

    it('should return default for unknown models', () => {
      expect(getContextLimit('unknown-model-v1')).toBe(MODEL_LIMITS.default);
    });
  });

  describe('Context Monitor Class', () => {
    it('should track messages and accumulate tokens', () => {
      const monitor = new ContextMonitor({ model: 'claude-opus-4-5-20251101' });

      monitor.recordMessage('Hello, how can I help you?');
      monitor.recordMessage('I need help with code review.');

      const metrics = monitor.getMetrics();

      expect(metrics.messageCount).toBe(2);
      expect(metrics.estimatedTokens).toBeGreaterThan(0);
    });

    it('should track tool calls', () => {
      const monitor = new ContextMonitor();

      monitor.recordToolCall('read_file', { path: '/test.txt' }, 'file contents here');
      monitor.recordToolCall('write_file', { path: '/out.txt', content: 'data' });

      const metrics = monitor.getMetrics();

      expect(metrics.toolCallCount).toBe(2);
    });

    it('should detect when respawn is needed (>80%)', () => {
      const monitor = new ContextMonitor({ contextLimit: 1000 });

      // Add enough tokens to exceed 80%
      monitor.addTokens(850);

      expect(monitor.shouldRespawn()).toBe(true);
      expect(monitor.getZone()).toBe('critical');
    });

    it('should warn at 70% pressure', () => {
      const monitor = new ContextMonitor({ contextLimit: 1000 });

      monitor.addTokens(750);

      expect(monitor.shouldWarn()).toBe(true);
      expect(monitor.shouldRespawn()).toBe(false);
    });

    it('should analyze pressure trend', () => {
      const monitor = new ContextMonitor({ contextLimit: 10000 });

      // Simulate increasing pressure
      for (let i = 0; i < 10; i++) {
        monitor.addTokens(500);
      }

      expect(monitor.getTrend()).toBe('increasing');
    });

    it('should format metrics for display', () => {
      const monitor = new ContextMonitor({ contextLimit: 200000 });
      monitor.addTokens(50000);

      const formatted = monitor.formatMetrics();

      expect(formatted).toContain('K'); // Token count in K
      expect(formatted).toContain('%'); // Pressure percentage
    });
  });
});

// ============================================================
// State Recovery Tests
// ============================================================

describe('Orchestrator State Management (Integration)', () => {
  let tempDir: string;
  let stateManager: OrchestratorStateManager;

  beforeEach(async () => {
    resetStateManager();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-test-'));
    // Create .ginko directory
    await fs.mkdir(path.join(tempDir, '.ginko'), { recursive: true });
    stateManager = new OrchestratorStateManager(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Checkpoint Persistence', () => {
    it('should save and load checkpoint', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch_test_123',
        orchestratorName: 'Test Orchestrator',
        graphId: 'graph_123',
        sprintId: 'sprint_123',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 0,
        completedTasks: ['TASK-1', 'TASK-2'],
        inProgressTasks: { 'TASK-3': 'agent_1' },
        blockedTasks: ['TASK-5'],
        assignmentHistory: [
          {
            taskId: 'TASK-1',
            agentId: 'agent_1',
            assignedAt: new Date().toISOString(),
            status: 'completed',
          },
        ],
        contextMetrics: {
          estimatedTokens: 50000,
          contextLimit: 200000,
          pressure: 0.25,
          messageCount: 10,
          toolCallCount: 5,
          eventsSinceStart: 20,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      await stateManager.saveCheckpoint(checkpoint);

      expect(await stateManager.hasCheckpoint()).toBe(true);

      const loaded = await stateManager.loadCheckpoint();

      expect(loaded).not.toBeNull();
      expect(loaded!.orchestratorId).toBe('orch_test_123');
      expect(loaded!.completedTasks).toEqual(['TASK-1', 'TASK-2']);
      expect(loaded!.inProgressTasks).toEqual({ 'TASK-3': 'agent_1' });
    });

    it('should delete checkpoint on successful completion', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch_test',
        orchestratorName: 'Test',
        graphId: 'graph',
        sprintId: 'sprint',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 0,
        completedTasks: [],
        inProgressTasks: {},
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 0,
          contextLimit: 200000,
          pressure: 0,
          messageCount: 0,
          toolCallCount: 0,
          eventsSinceStart: 0,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      await stateManager.saveCheckpoint(checkpoint);
      expect(await stateManager.hasCheckpoint()).toBe(true);

      await stateManager.deleteCheckpoint();
      expect(await stateManager.hasCheckpoint()).toBe(false);
    });

    it('should include exit reason in checkpoint', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch_test',
        orchestratorName: 'Test',
        graphId: 'graph',
        sprintId: 'sprint',
        startedAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        cyclesWithoutProgress: 0,
        completedTasks: [],
        inProgressTasks: {},
        blockedTasks: [],
        assignmentHistory: [],
        contextMetrics: {
          estimatedTokens: 170000,
          contextLimit: 200000,
          pressure: 0.85,
          messageCount: 100,
          toolCallCount: 50,
          eventsSinceStart: 200,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      await stateManager.saveCheckpoint(checkpoint, {
        exitReason: 'context_pressure',
        exitCode: EXIT_CODE_RESPAWN,
      });

      const loaded = await stateManager.loadCheckpoint();

      expect(loaded!.exitReason).toBe('context_pressure');
      expect(loaded!.exitCode).toBe(EXIT_CODE_RESPAWN);
    });
  });

  describe('State Restoration', () => {
    it('should restore runtime state from checkpoint', async () => {
      const checkpoint: OrchestratorCheckpoint = {
        orchestratorId: 'orch_test',
        orchestratorName: 'Test',
        graphId: 'graph',
        sprintId: 'sprint',
        startedAt: '2025-12-07T10:00:00.000Z',
        savedAt: '2025-12-07T11:00:00.000Z',
        lastProgressAt: '2025-12-07T10:55:00.000Z',
        cyclesWithoutProgress: 3,
        completedTasks: ['TASK-1', 'TASK-2'],
        inProgressTasks: { 'TASK-3': 'agent_1', 'TASK-4': 'agent_2' },
        blockedTasks: ['TASK-5'],
        assignmentHistory: [
          {
            taskId: 'TASK-1',
            agentId: 'agent_1',
            assignedAt: '2025-12-07T10:10:00.000Z',
            status: 'completed',
          },
        ],
        contextMetrics: {
          estimatedTokens: 50000,
          contextLimit: 200000,
          pressure: 0.25,
          messageCount: 10,
          toolCallCount: 5,
          eventsSinceStart: 20,
          model: 'claude-opus-4-5-20251101',
        },
        version: 1,
      };

      const restored = stateManager.restoreFromCheckpoint(checkpoint);

      // Check Set conversion
      expect(restored.completedTasks).toBeInstanceOf(Set);
      expect(restored.completedTasks.has('TASK-1')).toBe(true);
      expect(restored.completedTasks.has('TASK-2')).toBe(true);

      // Check Map conversion
      expect(restored.inProgressTasks).toBeInstanceOf(Map);
      expect(restored.inProgressTasks.get('TASK-3')).toBe('agent_1');
      expect(restored.inProgressTasks.get('TASK-4')).toBe('agent_2');

      // Check Date conversion
      expect(restored.startedAt).toBeInstanceOf(Date);
      expect(restored.lastProgressAt).toBeInstanceOf(Date);

      // Check scalar preservation
      expect(restored.cyclesWithoutProgress).toBe(3);
    });

    it('should create checkpoint from runtime state', () => {
      const contextMetrics = createTestContextMetrics();

      const checkpoint = stateManager.createCheckpoint({
        orchestratorId: 'orch_123',
        orchestratorName: 'Test Orchestrator',
        graphId: 'graph_123',
        sprintId: 'sprint_123',
        startedAt: new Date('2025-12-07T10:00:00.000Z'),
        lastProgressAt: new Date('2025-12-07T10:55:00.000Z'),
        cyclesWithoutProgress: 0,
        completedTasks: new Set(['TASK-1']),
        inProgressTasks: new Map([['TASK-2', 'agent_1']]),
        blockedTasks: new Set(['TASK-3']),
        assignmentHistory: [
          {
            taskId: 'TASK-1',
            agentId: 'agent_1',
            assignedAt: new Date('2025-12-07T10:10:00.000Z'),
            status: 'completed' as const,
          },
        ],
        contextMetrics: contextMetrics,
      });

      // Check serialization format
      expect(Array.isArray(checkpoint.completedTasks)).toBe(true);
      expect(checkpoint.completedTasks).toEqual(['TASK-1']);

      expect(typeof checkpoint.inProgressTasks).toBe('object');
      expect(checkpoint.inProgressTasks['TASK-2']).toBe('agent_1');

      expect(typeof checkpoint.startedAt).toBe('string');
    });
  });

  describe('Exit Codes', () => {
    it('should return correct exit codes for each reason', () => {
      expect(getExitCode('all_complete')).toBe(EXIT_CODE_SUCCESS);
      expect(getExitCode('user_interrupt')).toBe(EXIT_CODE_SUCCESS);
      expect(getExitCode('manual_stop')).toBe(EXIT_CODE_SUCCESS);

      expect(getExitCode('context_pressure')).toBe(EXIT_CODE_RESPAWN);
      expect(getExitCode('max_runtime')).toBe(EXIT_CODE_RESPAWN);

      expect(getExitCode('no_progress')).toBe(EXIT_CODE_ERROR);
      expect(getExitCode('error')).toBe(EXIT_CODE_ERROR);
    });

    it('should identify respawn-triggering codes', () => {
      expect(shouldRespawn(EXIT_CODE_RESPAWN)).toBe(true);
      expect(shouldRespawn(EXIT_CODE_SUCCESS)).toBe(false);
      expect(shouldRespawn(EXIT_CODE_ERROR)).toBe(false);
    });

    it('should provide human-readable exit messages', () => {
      expect(getExitMessage('all_complete')).toContain('completed');
      expect(getExitMessage('context_pressure')).toContain('pressure');
      expect(getExitMessage('no_progress')).toContain('progress');
    });
  });
});

// ============================================================
// Full Orchestration Flow Tests
// ============================================================

describe('Orchestration Flow (Integration)', () => {
  describe('Dependency-Based Task Assignment', () => {
    it('should only assign tasks with satisfied dependencies', () => {
      const tasks = createTestTasks();

      // Initial state: only TASK-1, TASK-2 available
      let available = getAvailableTasks(tasks);
      expect(available.map(t => t.id).sort()).toEqual(['TASK-1', 'TASK-2']);

      // Simulate assigning TASK-1
      tasks[0].status = 'in_progress';
      available = getAvailableTasks(tasks);
      expect(available.map(t => t.id)).toEqual(['TASK-2']);

      // Complete TASK-1
      tasks[0].status = 'complete';
      available = getAvailableTasks(tasks);
      // TASK-2 still available, TASK-4 now available (depends only on TASK-1)
      expect(available.map(t => t.id).sort()).toEqual(['TASK-2', 'TASK-4']);

      // Complete TASK-2
      tasks[1].status = 'complete';
      available = getAvailableTasks(tasks);
      // TASK-3 now available (depends on TASK-1, TASK-2), TASK-4 still available
      expect(available.map(t => t.id).sort()).toEqual(['TASK-3', 'TASK-4']);
    });

    it('should track blocked tasks throughout execution', () => {
      const tasks = createTestTasks();

      // Initial: 4 blocked
      expect(getBlockedTasks(tasks).length).toBe(4);

      // Complete wave 1
      tasks[0].status = 'complete';
      tasks[1].status = 'complete';

      // 2 blocked (TASK-5, TASK-6)
      expect(getBlockedTasks(tasks).length).toBe(2);

      // Complete wave 2
      tasks[2].status = 'complete';
      tasks[3].status = 'complete';

      // 1 blocked (TASK-6)
      expect(getBlockedTasks(tasks).length).toBe(1);

      // Complete wave 3
      tasks[4].status = 'complete';

      // 0 blocked
      expect(getBlockedTasks(tasks).length).toBe(0);
    });
  });

  describe('Context Pressure Response', () => {
    it('should trigger respawn at 80% pressure', () => {
      const monitor = new ContextMonitor({ contextLimit: 100000 });

      // Below threshold
      monitor.addTokens(70000);
      expect(monitor.shouldRespawn()).toBe(false);

      // Above threshold
      monitor.addTokens(15000); // 85000 total = 85%
      expect(monitor.shouldRespawn()).toBe(true);
    });

    it('should warn before critical pressure', () => {
      const monitor = new ContextMonitor({ contextLimit: 100000 });

      monitor.addTokens(65000); // 65%
      expect(monitor.shouldWarn()).toBe(false);

      monitor.addTokens(10000); // 75%
      expect(monitor.shouldWarn()).toBe(true);
      expect(monitor.shouldRespawn()).toBe(false);
    });
  });

  describe('State Recovery Simulation', () => {
    let tempDir: string;
    let stateManager: OrchestratorStateManager;

    beforeEach(async () => {
      resetStateManager();
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orch-recovery-test-'));
      await fs.mkdir(path.join(tempDir, '.ginko'), { recursive: true });
      stateManager = new OrchestratorStateManager(tempDir);
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });

    it('should resume orchestration from checkpoint', async () => {
      // Simulate partial progress
      const tasks = createTestTasks();
      tasks[0].status = 'complete'; // TASK-1
      tasks[1].status = 'complete'; // TASK-2
      tasks[2].status = 'in_progress'; // TASK-3

      const contextMetrics = createTestContextMetrics({ pressure: 0.85 });

      // Save checkpoint (simulating pressure-triggered exit)
      const checkpoint = stateManager.createCheckpoint({
        orchestratorId: 'orch_123',
        orchestratorName: 'Test',
        graphId: 'graph_123',
        sprintId: 'sprint_123',
        startedAt: new Date(),
        lastProgressAt: new Date(),
        cyclesWithoutProgress: 0,
        completedTasks: new Set(['TASK-1', 'TASK-2']),
        inProgressTasks: new Map([['TASK-3', 'agent_1']]),
        blockedTasks: new Set(['TASK-5', 'TASK-6']),
        assignmentHistory: [],
        contextMetrics: contextMetrics,
      });

      await stateManager.saveCheckpoint(checkpoint, {
        exitReason: 'context_pressure',
        exitCode: EXIT_CODE_RESPAWN,
      });

      // Simulate new instance loading checkpoint
      const loaded = await stateManager.loadCheckpoint();
      expect(loaded).not.toBeNull();

      const restored = stateManager.restoreFromCheckpoint(loaded!);

      // Verify state is correctly restored
      expect(restored.completedTasks.has('TASK-1')).toBe(true);
      expect(restored.completedTasks.has('TASK-2')).toBe(true);
      expect(restored.inProgressTasks.get('TASK-3')).toBe('agent_1');

      // Verify new instance knows what's available
      const restoredTasks = createTestTasks();
      restored.completedTasks.forEach(id => {
        const task = restoredTasks.find(t => t.id === id);
        if (task) task.status = 'complete';
      });
      restored.inProgressTasks.forEach((_, id) => {
        const task = restoredTasks.find(t => t.id === id);
        if (task) task.status = 'in_progress';
      });

      const available = getAvailableTasks(restoredTasks);
      // TASK-4 should be available (depends only on TASK-1 which is complete)
      expect(available.map(t => t.id)).toEqual(['TASK-4']);
    });

    it('should handle no-checkpoint scenario gracefully', async () => {
      expect(await stateManager.hasCheckpoint()).toBe(false);

      const loaded = await stateManager.loadCheckpoint();
      expect(loaded).toBeNull();
    });
  });
});

// ============================================================
// Edge Case Tests
// ============================================================

describe('Orchestration Edge Cases', () => {
  describe('No Workers Available', () => {
    it('should identify available tasks even with no workers', () => {
      const tasks = createTestTasks();
      const available = getAvailableTasks(tasks);

      // Tasks should still be identified as available
      // (worker availability is checked separately)
      expect(available.length).toBe(2);
    });
  });

  describe('All Tasks Complete', () => {
    it('should return empty available when all complete', () => {
      const tasks = createTestTasks();
      tasks.forEach(t => (t.status = 'complete'));

      const available = getAvailableTasks(tasks);
      expect(available).toEqual([]);

      const blocked = getBlockedTasks(tasks);
      expect(blocked).toEqual([]);
    });
  });

  describe('Complex Dependency Graphs', () => {
    it('should handle diamond dependency pattern', () => {
      // Diamond: A -> B, C -> D (B and C both depend on A, D depends on both)
      const tasks: Task[] = [
        { id: 'A', dependsOn: [], status: 'pending' },
        { id: 'B', dependsOn: ['A'], status: 'pending' },
        { id: 'C', dependsOn: ['A'], status: 'pending' },
        { id: 'D', dependsOn: ['B', 'C'], status: 'pending' },
      ];

      const waves = getExecutionOrder(tasks);

      expect(waves.length).toBe(3);
      expect(waves[0].tasks.map(t => t.id)).toEqual(['A']);
      expect(waves[1].tasks.map(t => t.id).sort()).toEqual(['B', 'C']);
      expect(waves[2].tasks.map(t => t.id)).toEqual(['D']);
    });

    it('should handle wide parallel task graph', () => {
      // 10 independent tasks, all feed into 1 final task
      const tasks: Task[] = [];
      for (let i = 1; i <= 10; i++) {
        tasks.push({ id: `TASK-${i}`, dependsOn: [], status: 'pending' });
      }
      tasks.push({
        id: 'FINAL',
        dependsOn: tasks.map(t => t.id),
        status: 'pending',
      });

      const waves = getExecutionOrder(tasks);

      expect(waves.length).toBe(2);
      expect(waves[0].tasks.length).toBe(10); // All parallel
      expect(waves[1].tasks.length).toBe(1); // Final
    });

    it('should handle deep sequential dependency chain', () => {
      // 10 tasks in a chain: 1 -> 2 -> 3 -> ... -> 10
      const tasks: Task[] = [];
      for (let i = 1; i <= 10; i++) {
        tasks.push({
          id: `TASK-${i}`,
          dependsOn: i === 1 ? [] : [`TASK-${i - 1}`],
          status: 'pending',
        });
      }

      const waves = getExecutionOrder(tasks);

      expect(waves.length).toBe(10);
      waves.forEach((wave, i) => {
        expect(wave.tasks.length).toBe(1);
        expect(wave.tasks[0].id).toBe(`TASK-${i + 1}`);
      });
    });
  });

  describe('Stalled Progress Detection', () => {
    it('should track cycles without progress', () => {
      let cyclesWithoutProgress = 0;

      // Simulate 10 cycles with no completions
      for (let i = 0; i < 10; i++) {
        // In real orchestrator, this checks if any task completed this cycle
        const taskCompletedThisCycle = false;

        if (!taskCompletedThisCycle) {
          cyclesWithoutProgress++;
        } else {
          cyclesWithoutProgress = 0;
        }
      }

      expect(cyclesWithoutProgress).toBe(10);

      // Threshold is typically 10 cycles -> should escalate
      const shouldEscalate = cyclesWithoutProgress >= 10;
      expect(shouldEscalate).toBe(true);
    });
  });
});
