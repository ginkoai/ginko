/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-05
 * @tags: [test, verification, graph-storage, epic-004, sprint-3, task-7]
 * @related: [../verification-storage.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Verification Storage Tests (EPIC-004 Sprint 3 TASK-7)
 *
 * Tests for storing and retrieving verification results in Neo4j graph.
 * These tests demonstrate the API but require a running Neo4j instance.
 */

import {
  storeVerificationResult,
  getVerificationHistory,
  getRecentVerifications,
  getVerificationStats,
  type VerificationResult,
} from '../verification-storage';

describe('Verification Storage', () => {
  // Mock verification result
  const mockVerificationResult: VerificationResult = {
    taskId: 'TASK-1',
    taskTitle: 'Implement user authentication',
    passed: true,
    timestamp: new Date('2025-12-05T10:00:00Z'),
    criteria: [
      {
        id: 'crit-1',
        description: 'Unit tests pass',
        passed: true,
        details: '142 passed, 0 failed',
        duration_ms: 3500,
      },
      {
        id: 'crit-2',
        description: 'Build succeeds',
        passed: true,
        details: '12.3s',
        duration_ms: 12300,
      },
      {
        id: 'crit-3',
        description: 'No new lint errors',
        passed: true,
        details: '0 new errors',
        duration_ms: 1200,
      },
    ],
    summary: 'PASSED (3/3 criteria passed)',
  };

  describe('storeVerificationResult', () => {
    it('should store verification result and return ID', async () => {
      // This test requires a running Neo4j instance
      // In actual use, this would be integration tested with test database
      const verificationId = await storeVerificationResult(mockVerificationResult, 'agent-123');

      expect(verificationId).toBeDefined();
      expect(verificationId).toMatch(/^ver_TASK-1_\d+$/);
    });

    it('should store verification result without agent ID', async () => {
      const verificationId = await storeVerificationResult(mockVerificationResult);

      expect(verificationId).toBeDefined();
    });

    it('should handle failed verifications', async () => {
      const failedResult: VerificationResult = {
        ...mockVerificationResult,
        passed: false,
        criteria: [
          ...mockVerificationResult.criteria,
          {
            id: 'crit-4',
            description: 'API response < 200ms',
            passed: false,
            details: 'actual: 342ms',
          },
        ],
        summary: 'FAILED (3/4 criteria passed)',
      };

      const verificationId = await storeVerificationResult(failedResult);

      expect(verificationId).toBeDefined();
    });
  });

  describe('getVerificationHistory', () => {
    it('should retrieve verification history for a task', async () => {
      const history = await getVerificationHistory('TASK-1', 10);

      expect(Array.isArray(history)).toBe(true);
      // History should be ordered by timestamp DESC (newest first)
      if (history.length > 1) {
        const timestamps = history.map(h => new Date(h.timestamp).getTime());
        expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
      }
    });

    it('should respect limit parameter', async () => {
      const history = await getVerificationHistory('TASK-1', 5);

      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for task with no verifications', async () => {
      const history = await getVerificationHistory('TASK-NONEXISTENT');

      expect(history).toEqual([]);
    });
  });

  describe('getRecentVerifications', () => {
    it('should retrieve recent verifications across all tasks', async () => {
      const recent = await getRecentVerifications(20);

      expect(Array.isArray(recent)).toBe(true);
      expect(recent.length).toBeLessThanOrEqual(20);
    });

    it('should filter by agent ID', async () => {
      const recent = await getRecentVerifications(20, 'agent-123');

      expect(Array.isArray(recent)).toBe(true);
      recent.forEach(v => {
        expect(v.agent_id).toBe('agent-123');
      });
    });

    it('should filter by passed status', async () => {
      const recent = await getRecentVerifications(20, undefined, true);

      expect(Array.isArray(recent)).toBe(true);
      recent.forEach(v => {
        expect(v.passed).toBe(true);
      });
    });

    it('should combine filters', async () => {
      const recent = await getRecentVerifications(20, 'agent-123', false);

      expect(Array.isArray(recent)).toBe(true);
      recent.forEach(v => {
        expect(v.agent_id).toBe('agent-123');
        expect(v.passed).toBe(false);
      });
    });
  });

  describe('getVerificationStats', () => {
    it('should return statistics for a task', async () => {
      const stats = await getVerificationStats('TASK-1');

      expect(stats).toHaveProperty('total_attempts');
      expect(stats).toHaveProperty('passed_attempts');
      expect(stats).toHaveProperty('failed_attempts');
      expect(stats).toHaveProperty('last_attempt_passed');
      expect(stats).toHaveProperty('last_attempt_timestamp');

      expect(typeof stats.total_attempts).toBe('number');
      expect(typeof stats.passed_attempts).toBe('number');
      expect(typeof stats.failed_attempts).toBe('number');
    });

    it('should return zero stats for task with no verifications', async () => {
      const stats = await getVerificationStats('TASK-NONEXISTENT');

      expect(stats.total_attempts).toBe(0);
      expect(stats.passed_attempts).toBe(0);
      expect(stats.failed_attempts).toBe(0);
      expect(stats.last_attempt_passed).toBeNull();
      expect(stats.last_attempt_timestamp).toBeNull();
    });

    it('should correctly count passed and failed attempts', async () => {
      const stats = await getVerificationStats('TASK-1');

      expect(stats.total_attempts).toBe(stats.passed_attempts + stats.failed_attempts);
    });
  });
});

/**
 * Example usage scenarios
 */
describe('Verification Storage - Usage Examples', () => {
  it('Example: Store verification from CLI command', async () => {
    // This is how the CLI would use the API
    const cliResult: VerificationResult = {
      taskId: 'TASK-42',
      taskTitle: 'Add password reset flow',
      passed: true,
      timestamp: new Date(),
      criteria: [
        {
          id: 'test',
          description: 'Unit tests pass',
          passed: true,
          details: '28 passed, 0 failed',
        },
        {
          id: 'build',
          description: 'Build succeeds',
          passed: true,
          details: '8.2s',
        },
      ],
      summary: 'PASSED (2/2 criteria passed)',
    };

    const verificationId = await storeVerificationResult(cliResult);

    console.log('Stored verification:', verificationId);
    expect(verificationId).toBeDefined();
  });

  it('Example: Agent stores verification with agent ID', async () => {
    // This is how an autonomous agent would use the API
    const agentResult: VerificationResult = {
      taskId: 'TASK-43',
      taskTitle: 'Optimize database queries',
      passed: false,
      timestamp: new Date(),
      criteria: [
        {
          id: 'test',
          description: 'Unit tests pass',
          passed: true,
          details: '156 passed, 0 failed',
        },
        {
          id: 'perf',
          description: 'Query time < 100ms',
          passed: false,
          details: 'actual: 234ms',
        },
      ],
      summary: 'FAILED (1/2 criteria passed)',
    };

    const verificationId = await storeVerificationResult(agentResult, 'agent-optimizer-001');

    console.log('Agent verification stored:', verificationId);
    expect(verificationId).toBeDefined();
  });

  it('Example: Query verification history for dashboard', async () => {
    // This is how a dashboard would display verification history
    const taskId = 'TASK-42';

    // Get recent history
    const history = await getVerificationHistory(taskId, 5);

    console.log(`Recent verifications for ${taskId}:`, history.length);

    // Get stats
    const stats = await getVerificationStats(taskId);

    console.log(`Verification stats for ${taskId}:`, {
      total: stats.total_attempts,
      passed: stats.passed_attempts,
      failed: stats.failed_attempts,
      lastPassed: stats.last_attempt_passed,
    });

    expect(history).toBeDefined();
    expect(stats).toBeDefined();
  });

  it('Example: Get all failed verifications for review', async () => {
    // This is how a team lead would review failed verifications
    const failedVerifications = await getRecentVerifications(50, undefined, false);

    console.log('Failed verifications requiring attention:', failedVerifications.length);

    failedVerifications.forEach(v => {
      console.log(`- ${v.task_id}: ${v.summary}`);
    });

    expect(Array.isArray(failedVerifications)).toBe(true);
  });
});
