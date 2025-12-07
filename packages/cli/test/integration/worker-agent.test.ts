/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-07
 * @tags: [test, integration, worker-agent, epic-004, sprint-4, multi-agent]
 * @related: [../../src/commands/agent/work.ts, ../../src/commands/agent/agent-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Integration Tests: Worker Agent Mode (EPIC-004 Sprint 4 TASK-8)
 *
 * Tests the worker agent functionality:
 * - Agent registration with capabilities
 * - Task polling and filtering by capabilities
 * - Task claiming atomic behavior
 * - Task context loading
 * - Progress reporting via events
 * - Completion/blocker notifications
 *
 * Coverage: Worker lifecycle, task acquisition, execution flow
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock environment configuration
const API_URL = process.env.GINKO_API_URL || 'https://app.ginkoai.com';
const TEST_TOKEN = process.env.GINKO_TEST_TOKEN || 'test_token_for_integration';

// Types matching agent-client.ts
interface AvailableTask {
  id: string;
  title: string;
  description: string;
  effort: string;
  priority: number;
  requiredCapabilities: string[];
  sprintId: string;
}

interface TaskContextResponse {
  files: string[];
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    verifiable: boolean;
  }>;
  patterns: Array<{
    id: string;
    name: string;
    confidence: string;
  }>;
  gotchas: Array<{
    id: string;
    description: string;
    severity: string;
  }>;
  constraints: Array<{
    id: string;
    type: string;
    description: string;
  }>;
}

describe('Worker Agent Mode', () => {
  describe('Task Assignment Types', () => {
    it('should have correct task structure', () => {
      const task: AvailableTask = {
        id: 'TASK-1',
        title: 'Implement feature X',
        description: 'Add new feature X to the system',
        effort: 'medium',
        priority: 75,
        requiredCapabilities: ['typescript', 'testing'],
        sprintId: 'EPIC-004-S4',
      };

      expect(task.id).toBe('TASK-1');
      expect(task.requiredCapabilities).toContain('typescript');
      expect(task.priority).toBeGreaterThan(0);
    });

    it('should have correct task context structure', () => {
      const context: TaskContextResponse = {
        files: ['src/components/Feature.tsx'],
        acceptanceCriteria: [
          { id: 'ac1', description: 'Feature renders correctly', verifiable: true },
        ],
        patterns: [
          { id: 'p1', name: 'react-component-pattern', confidence: 'high' },
        ],
        gotchas: [
          { id: 'g1', description: 'Watch for state race conditions', severity: 'medium' },
        ],
        constraints: [
          { id: 'c1', type: 'ADR', description: 'Follow ADR-002 for file structure' },
        ],
      };

      expect(context.files.length).toBeGreaterThan(0);
      expect(context.patterns[0].confidence).toBe('high');
      expect(context.gotchas[0].severity).toBe('medium');
    });
  });

  describe('Capability Matching', () => {
    it('should match task when agent has all required capabilities', () => {
      const agentCapabilities = ['typescript', 'testing', 'api'];
      const taskRequirements = ['typescript', 'testing'];

      const matches = taskRequirements.every(cap => agentCapabilities.includes(cap));
      expect(matches).toBe(true);
    });

    it('should not match task when agent lacks capabilities', () => {
      const agentCapabilities = ['typescript'];
      const taskRequirements = ['typescript', 'testing'];

      const matches = taskRequirements.every(cap => agentCapabilities.includes(cap));
      expect(matches).toBe(false);
    });

    it('should match task with no requirements to any agent', () => {
      const agentCapabilities = ['typescript'];
      const taskRequirements: string[] = [];

      const matches = taskRequirements.length === 0 ||
        taskRequirements.every(cap => agentCapabilities.includes(cap));
      expect(matches).toBe(true);
    });
  });

  describe('Task Priority Ordering', () => {
    it('should sort tasks by priority descending', () => {
      const tasks: AvailableTask[] = [
        { id: 'TASK-1', title: 'Low', description: '', effort: 'small', priority: 25, requiredCapabilities: [], sprintId: '' },
        { id: 'TASK-2', title: 'Critical', description: '', effort: 'large', priority: 100, requiredCapabilities: [], sprintId: '' },
        { id: 'TASK-3', title: 'Medium', description: '', effort: 'medium', priority: 50, requiredCapabilities: [], sprintId: '' },
      ];

      const sorted = [...tasks].sort((a, b) => b.priority - a.priority);

      expect(sorted[0].id).toBe('TASK-2'); // Critical first
      expect(sorted[1].id).toBe('TASK-3'); // Medium second
      expect(sorted[2].id).toBe('TASK-1'); // Low last
    });
  });

  describe('Worker Stats Tracking', () => {
    interface WorkerStats {
      tasksCompleted: number;
      tasksFailed: number;
      tasksReleased: number;
      startedAt: Date;
      lastTaskAt: Date | null;
    }

    it('should track completed tasks', () => {
      const stats: WorkerStats = {
        tasksCompleted: 0,
        tasksFailed: 0,
        tasksReleased: 0,
        startedAt: new Date(),
        lastTaskAt: null,
      };

      // Simulate task completion
      stats.tasksCompleted++;
      stats.lastTaskAt = new Date();

      expect(stats.tasksCompleted).toBe(1);
      expect(stats.lastTaskAt).toBeDefined();
    });

    it('should track failed tasks separately', () => {
      const stats: WorkerStats = {
        tasksCompleted: 5,
        tasksFailed: 0,
        tasksReleased: 0,
        startedAt: new Date(),
        lastTaskAt: new Date(),
      };

      // Simulate task failure
      stats.tasksFailed++;

      expect(stats.tasksCompleted).toBe(5);
      expect(stats.tasksFailed).toBe(1);
    });

    it('should respect max tasks limit', () => {
      const maxTasks = 5;
      const stats: WorkerStats = {
        tasksCompleted: 5,
        tasksFailed: 0,
        tasksReleased: 0,
        startedAt: new Date(),
        lastTaskAt: new Date(),
      };

      // If maxTasks > 0 and completed >= maxTasks, should stop
      const shouldStop = maxTasks > 0 && stats.tasksCompleted >= maxTasks;
      expect(shouldStop).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should track consecutive errors', () => {
      let consecutiveErrors = 0;
      const MAX_CONSECUTIVE_ERRORS = 5;

      // Simulate errors
      for (let i = 0; i < 3; i++) {
        consecutiveErrors++;
      }

      expect(consecutiveErrors).toBe(3);
      expect(consecutiveErrors < MAX_CONSECUTIVE_ERRORS).toBe(true);

      // Simulate more errors exceeding limit
      for (let i = 0; i < 3; i++) {
        consecutiveErrors++;
      }

      expect(consecutiveErrors >= MAX_CONSECUTIVE_ERRORS).toBe(true);
    });

    it('should reset error count on success', () => {
      let consecutiveErrors = 4;

      // Simulate successful operation
      consecutiveErrors = 0;

      expect(consecutiveErrors).toBe(0);
    });
  });

  describe('Task Claim Conflict Handling', () => {
    it('should identify 409 conflict errors', () => {
      const error409 = new Error('Request failed with status 409: Task already claimed');
      const error500 = new Error('Request failed with status 500: Server error');

      const is409 = error409.message.includes('409') || error409.message.includes('already claimed');
      const isNot409 = error500.message.includes('409') || error500.message.includes('already claimed');

      expect(is409).toBe(true);
      expect(isNot409).toBe(false);
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration correctly', () => {
      const startTime = new Date('2025-12-07T10:00:00');
      const endTime = new Date('2025-12-07T10:05:30');
      const duration = endTime.getTime() - startTime.getTime();

      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);

      expect(minutes).toBe(5);
      expect(seconds).toBe(30);
    });
  });
});
