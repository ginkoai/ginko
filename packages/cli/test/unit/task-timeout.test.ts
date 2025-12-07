/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-07
 * @tags: [test, timeout, orchestrator, epic-004, sprint-5, task-6]
 * @related: [../../src/lib/task-timeout.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import {
  startTaskTimeout,
  checkTimeouts,
  clearTaskTimeout,
  getActiveTimeouts,
  getTaskTimeout,
  getAllTimeouts,
  cleanupOldTimeouts,
  handleTimeout,
  TimeoutMonitor,
} from '../../src/lib/task-timeout.js';
import { getGinkoDir } from '../../src/utils/helpers.js';

describe('task-timeout', () => {
  let timeoutDir: string;
  let createdTaskIds: string[] = [];

  beforeEach(async () => {
    // Get timeout storage directory
    const ginkoDir = await getGinkoDir();
    timeoutDir = path.join(ginkoDir, 'timeouts');
    await fs.ensureDir(timeoutDir);
  });

  afterEach(async () => {
    // Clean up created timeouts
    for (const taskId of createdTaskIds) {
      try {
        const filePath = path.join(timeoutDir, `${taskId}.json`);
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    createdTaskIds = [];
  });

  describe('startTaskTimeout', () => {
    it('creates a timeout with default configuration', async () => {
      const timeout = await startTaskTimeout(
        'TASK-1',
        60000, // 60 seconds
        'agent-123'
      );

      createdTaskIds.push('TASK-1');

      expect(timeout.taskId).toBe('TASK-1');
      expect(timeout.agentId).toBe('agent-123');
      expect(timeout.maxDuration).toBe(60000);
      expect(timeout.status).toBe('active');
      expect(timeout.startedAt).toBeInstanceOf(Date);
      expect(timeout.timeoutAt).toBeInstanceOf(Date);
      expect(timeout.warningAt).toBeInstanceOf(Date);

      // Verify warning threshold (80%)
      const expectedWarning = timeout.startedAt.getTime() + (60000 * 0.8);
      expect(timeout.warningAt!.getTime()).toBeCloseTo(expectedWarning, -1);

      // Verify timeout time
      const expectedTimeout = timeout.startedAt.getTime() + 60000;
      expect(timeout.timeoutAt.getTime()).toBeCloseTo(expectedTimeout, -1);
    });

    it('creates a timeout with custom warning threshold', async () => {
      const timeout = await startTaskTimeout(
        'TASK-2',
        60000,
        'agent-456',
        { warningThreshold: 0.5 } // 50%
      );

      createdTaskIds.push('TASK-2');

      // Verify warning at 50%
      const expectedWarning = timeout.startedAt.getTime() + (60000 * 0.5);
      expect(timeout.warningAt!.getTime()).toBeCloseTo(expectedWarning, -1);
    });

    it('saves timeout to file', async () => {
      await startTaskTimeout('TASK-3', 60000, 'agent-789');

      createdTaskIds.push('TASK-3');

      const filePath = path.join(timeoutDir, 'TASK-3.json');
      const fileExists = await fs.pathExists(filePath);

      expect(fileExists).toBe(true);

      const savedData = await fs.readJSON(filePath);
      expect(savedData.taskId).toBe('TASK-3');
      expect(savedData.agentId).toBe('agent-789');
    });
  });

  describe('getTaskTimeout', () => {
    it('retrieves timeout by task ID', async () => {
      await startTaskTimeout('TASK-4', 60000, 'agent-111');
      createdTaskIds.push('TASK-4');

      const timeout = await getTaskTimeout('TASK-4');

      expect(timeout).not.toBeNull();
      expect(timeout!.taskId).toBe('TASK-4');
      expect(timeout!.agentId).toBe('agent-111');
    });

    it('returns null for non-existent timeout', async () => {
      const timeout = await getTaskTimeout('TASK-NONEXISTENT');

      expect(timeout).toBeNull();
    });
  });

  describe('getActiveTimeouts', () => {
    it('returns all active timeouts', async () => {
      await startTaskTimeout('TASK-5', 60000, 'agent-222');
      await startTaskTimeout('TASK-6', 60000, 'agent-333');

      createdTaskIds.push('TASK-5', 'TASK-6');

      const activeTimeouts = await getActiveTimeouts();

      // Filter to only our test tasks
      const testTimeouts = activeTimeouts.filter(t =>
        t.taskId === 'TASK-5' || t.taskId === 'TASK-6'
      );

      expect(testTimeouts.length).toBeGreaterThanOrEqual(2);
      expect(testTimeouts.map(t => t.taskId)).toContain('TASK-5');
      expect(testTimeouts.map(t => t.taskId)).toContain('TASK-6');
    });

    it('does not return completed timeouts', async () => {
      await startTaskTimeout('TASK-7', 60000, 'agent-444');
      await startTaskTimeout('TASK-8', 60000, 'agent-555');

      createdTaskIds.push('TASK-7', 'TASK-8');

      // Complete one timeout
      await clearTaskTimeout('TASK-7');

      const activeTimeouts = await getActiveTimeouts();

      // Filter to our test tasks
      const testTimeouts = activeTimeouts.filter(t =>
        t.taskId === 'TASK-7' || t.taskId === 'TASK-8'
      );

      expect(testTimeouts.length).toBe(1);
      expect(testTimeouts[0].taskId).toBe('TASK-8');
    });
  });

  describe('clearTaskTimeout', () => {
    it('marks timeout as completed', async () => {
      await startTaskTimeout('TASK-9', 60000, 'agent-666');
      createdTaskIds.push('TASK-9');

      await clearTaskTimeout('TASK-9');

      const timeout = await getTaskTimeout('TASK-9');

      expect(timeout).not.toBeNull();
      expect(timeout!.status).toBe('completed');
    });

    it('removes from active timeouts', async () => {
      await startTaskTimeout('TASK-10', 60000, 'agent-777');
      createdTaskIds.push('TASK-10');

      let activeTimeouts = await getActiveTimeouts();
      let task10 = activeTimeouts.find(t => t.taskId === 'TASK-10');
      expect(task10).toBeDefined();

      await clearTaskTimeout('TASK-10');

      activeTimeouts = await getActiveTimeouts();
      task10 = activeTimeouts.find(t => t.taskId === 'TASK-10');
      expect(task10).toBeUndefined();
    });
  });

  describe('checkTimeouts', () => {
    it('detects timed out tasks', async () => {
      // Create timeout with very short duration (100ms)
      await startTaskTimeout('TASK-11', 100, 'agent-888');
      createdTaskIds.push('TASK-11');

      // Wait for timeout to expire
      await new Promise(resolve => setTimeout(resolve, 200));

      const timedOutTasks = await checkTimeouts();

      const task11 = timedOutTasks.find(t => t.taskId === 'TASK-11');
      expect(task11).toBeDefined();
      expect(task11!.agentId).toBe('agent-888');
      expect(task11!.checkpointId).toBeDefined();
      expect(task11!.escalationEventId).toBeDefined();
    }, 10000);

    it('updates status to warning at threshold', async () => {
      // Create timeout with 200ms duration, warning at 100ms (50%)
      await startTaskTimeout('TASK-12', 200, 'agent-999', { warningThreshold: 0.5 });
      createdTaskIds.push('TASK-12');

      // Wait for warning threshold
      await new Promise(resolve => setTimeout(resolve, 120));

      await checkTimeouts();

      const timeout = await getTaskTimeout('TASK-12');

      expect(timeout).not.toBeNull();
      expect(timeout!.status).toBe('warning');
    }, 10000);

    it('does not process already timed out tasks', async () => {
      // Create and timeout a task
      await startTaskTimeout('TASK-13', 100, 'agent-1010');
      createdTaskIds.push('TASK-13');

      await new Promise(resolve => setTimeout(resolve, 150));
      const firstCheck = await checkTimeouts();

      const firstTask13 = firstCheck.find(t => t.taskId === 'TASK-13');
      expect(firstTask13).toBeDefined();

      // Check again
      const secondCheck = await checkTimeouts();

      // Should not process again
      const secondTask13 = secondCheck.find(t => t.taskId === 'TASK-13');
      expect(secondTask13).toBeUndefined();
    }, 10000);
  });

  describe('handleTimeout', () => {
    it('creates checkpoint and escalation event', async () => {
      await startTaskTimeout('TASK-14', 100, 'agent-1111');
      createdTaskIds.push('TASK-14');

      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await handleTimeout('TASK-14');

      expect(result).not.toBeNull();
      expect(result!.taskId).toBe('TASK-14');
      expect(result!.checkpointId).toBeDefined();
      expect(result!.escalationEventId).toBeDefined();
    }, 10000);

    it('updates timeout status to timed_out', async () => {
      await startTaskTimeout('TASK-15', 100, 'agent-1212');
      createdTaskIds.push('TASK-15');

      await new Promise(resolve => setTimeout(resolve, 150));

      await handleTimeout('TASK-15');

      const timeout = await getTaskTimeout('TASK-15');

      expect(timeout).not.toBeNull();
      expect(timeout!.status).toBe('timed_out');
      expect(timeout!.checkpointId).toBeDefined();
      expect(timeout!.escalationEventId).toBeDefined();
    }, 10000);

    it('returns null for non-existent timeout', async () => {
      const result = await handleTimeout('TASK-NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getAllTimeouts', () => {
    it('returns all timeouts regardless of status', async () => {
      await startTaskTimeout('TASK-16', 60000, 'agent-1313');
      await startTaskTimeout('TASK-17', 100, 'agent-1414');

      createdTaskIds.push('TASK-16', 'TASK-17');

      // Complete one
      await clearTaskTimeout('TASK-16');

      // Timeout another
      await new Promise(resolve => setTimeout(resolve, 150));
      await checkTimeouts();

      const allTimeouts = await getAllTimeouts();

      // Filter to our test tasks
      const testTimeouts = allTimeouts.filter(t =>
        t.taskId === 'TASK-16' || t.taskId === 'TASK-17'
      );

      expect(testTimeouts.length).toBe(2);

      const statuses = testTimeouts.map(t => t.status).sort();
      expect(statuses).toContain('completed');
      expect(statuses).toContain('timed_out');
    }, 10000);
  });

  describe('cleanupOldTimeouts', () => {
    it('removes old completed timeouts', async () => {
      await startTaskTimeout('TASK-18', 60000, 'agent-1515');
      createdTaskIds.push('TASK-18');

      // Manually set old timestamp
      const filePath = path.join(timeoutDir, 'TASK-18.json');
      const timeout = await fs.readJSON(filePath);
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      timeout.startedAt = oldDate.toISOString();
      timeout.status = 'completed';
      await fs.writeJSON(filePath, timeout);

      // Clean up timeouts older than 7 days
      const cleanedCount = await cleanupOldTimeouts(7 * 24 * 60 * 60 * 1000);

      expect(cleanedCount).toBeGreaterThanOrEqual(1);

      const fileExists = await fs.pathExists(filePath);
      expect(fileExists).toBe(false);
    });

    it('does not remove active timeouts', async () => {
      await startTaskTimeout('TASK-19', 60000, 'agent-1616');
      createdTaskIds.push('TASK-19');

      // Manually set old timestamp but keep active
      const filePath = path.join(timeoutDir, 'TASK-19.json');
      const timeout = await fs.readJSON(filePath);
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      timeout.startedAt = oldDate.toISOString();
      // status remains 'active'
      await fs.writeJSON(filePath, timeout);

      const cleanedCount = await cleanupOldTimeouts(7 * 24 * 60 * 60 * 1000);

      // Should not clean up active tasks
      const fileExists = await fs.pathExists(filePath);
      expect(fileExists).toBe(true);
    });
  });

  describe('TimeoutMonitor', () => {
    it('starts and stops monitoring', () => {
      const monitor = new TimeoutMonitor({ checkInterval: 1000 });

      monitor.start();
      let status = monitor.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.checkInterval).toBe(1000);

      monitor.stop();
      status = monitor.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('does not start twice', () => {
      const monitor = new TimeoutMonitor();

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      monitor.start();
      monitor.start();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already started'));

      monitor.stop();
      consoleSpy.mockRestore();
    });
  });
});
