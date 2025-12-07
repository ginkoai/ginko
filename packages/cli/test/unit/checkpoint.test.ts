/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-07
 * @tags: [test, checkpoint, resilience, epic-004, sprint-5, task-1]
 * @related: [../../src/lib/checkpoint.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import {
  createCheckpoint,
  getCheckpoint,
  listCheckpoints,
  deleteCheckpoint,
  checkpointExists,
  getLatestCheckpoint,
  exportCheckpoint,
  importCheckpoint,
} from '../../src/lib/checkpoint.js';

describe('checkpoint', () => {
  const testTaskId = 'TASK-1';
  const testAgentId = 'agent_test_001';
  let createdCheckpointIds: string[] = [];

  afterEach(async () => {
    // Clean up created checkpoints
    for (const checkpointId of createdCheckpointIds) {
      try {
        await deleteCheckpoint(checkpointId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    createdCheckpointIds = [];
  });

  describe('createCheckpoint', () => {
    it('creates checkpoint with all required fields', async () => {
      const checkpoint = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(checkpoint.id);

      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toMatch(/^cp_\d+_[a-f0-9]+$/);
      expect(checkpoint.taskId).toBe(testTaskId);
      expect(checkpoint.agentId).toBe(testAgentId);
      expect(checkpoint.timestamp).toBeInstanceOf(Date);
      expect(checkpoint.gitCommit).toBeDefined();
      expect(Array.isArray(checkpoint.filesModified)).toBe(true);
      expect(checkpoint.eventsSince).toBeDefined();
      expect(checkpoint.metadata).toEqual({});
    });

    it('creates checkpoint with message and metadata', async () => {
      const message = 'Before refactoring';
      const metadata = { step: 1, phase: 'implementation' };

      const checkpoint = await createCheckpoint(
        testTaskId,
        testAgentId,
        message,
        metadata
      );
      createdCheckpointIds.push(checkpoint.id);

      expect(checkpoint.message).toBe(message);
      expect(checkpoint.metadata).toEqual(metadata);
    });

    it('auto-detects agent ID if not provided', async () => {
      const checkpoint = await createCheckpoint(testTaskId);
      createdCheckpointIds.push(checkpoint.id);

      expect(checkpoint.agentId).toBeDefined();
      expect(checkpoint.agentId.length).toBeGreaterThan(0);
    });
  });

  describe('getCheckpoint', () => {
    it('retrieves existing checkpoint', async () => {
      const created = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(created.id);

      const retrieved = await getCheckpoint(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.taskId).toBe(created.taskId);
      expect(retrieved!.agentId).toBe(created.agentId);
    });

    it('returns null for non-existent checkpoint', async () => {
      const retrieved = await getCheckpoint('cp_999999_nonexistent');

      expect(retrieved).toBeNull();
    });
  });

  describe('listCheckpoints', () => {
    it('lists all checkpoints for a task', async () => {
      const cp1 = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(cp1.id);

      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const cp2 = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(cp2.id);

      const checkpoints = await listCheckpoints(testTaskId);

      expect(checkpoints.length).toBeGreaterThanOrEqual(2);
      // Should be sorted by timestamp (newest first)
      expect(checkpoints[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        checkpoints[1].timestamp.getTime()
      );
    });

    it('filters checkpoints by task ID', async () => {
      const task1Cp = await createCheckpoint('TASK-1', testAgentId);
      createdCheckpointIds.push(task1Cp.id);

      const task2Cp = await createCheckpoint('TASK-2', testAgentId);
      createdCheckpointIds.push(task2Cp.id);

      const task1Checkpoints = await listCheckpoints('TASK-1');
      const task1Ids = task1Checkpoints.map(cp => cp.id);

      expect(task1Ids).toContain(task1Cp.id);
      expect(task1Ids).not.toContain(task2Cp.id);
    });
  });

  describe('deleteCheckpoint', () => {
    it('deletes existing checkpoint', async () => {
      const checkpoint = await createCheckpoint(testTaskId, testAgentId);

      // Verify it exists
      expect(await checkpointExists(checkpoint.id)).toBe(true);

      // Delete it
      await deleteCheckpoint(checkpoint.id);

      // Verify it is gone
      expect(await checkpointExists(checkpoint.id)).toBe(false);
    });
  });

  describe('checkpointExists', () => {
    it('returns true for existing checkpoint', async () => {
      const checkpoint = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(checkpoint.id);

      expect(await checkpointExists(checkpoint.id)).toBe(true);
    });

    it('returns false for non-existent checkpoint', async () => {
      expect(await checkpointExists('cp_999999_nonexistent')).toBe(false);
    });
  });

  describe('getLatestCheckpoint', () => {
    it('returns most recent checkpoint for task', async () => {
      const cp1 = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(cp1.id);

      await new Promise(resolve => setTimeout(resolve, 10));

      const cp2 = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(cp2.id);

      const latest = await getLatestCheckpoint(testTaskId);

      expect(latest).toBeDefined();
      expect(latest!.id).toBe(cp2.id);
    });

    it('returns null when no checkpoints exist for task', async () => {
      const latest = await getLatestCheckpoint('TASK-NONEXISTENT');

      expect(latest).toBeNull();
    });
  });

  describe('export/import', () => {
    it('exports checkpoint as JSON', async () => {
      const checkpoint = await createCheckpoint(
        testTaskId,
        testAgentId,
        'Test checkpoint',
        { test: true }
      );
      createdCheckpointIds.push(checkpoint.id);

      const exported = await exportCheckpoint(checkpoint.id);
      const parsed = JSON.parse(exported);

      expect(parsed.id).toBe(checkpoint.id);
      expect(parsed.taskId).toBe(testTaskId);
      expect(parsed.agentId).toBe(testAgentId);
      expect(parsed.message).toBe('Test checkpoint');
      expect(parsed.metadata.test).toBe(true);
    });

    it('imports checkpoint from JSON', async () => {
      const checkpoint = await createCheckpoint(testTaskId, testAgentId);
      const exported = await exportCheckpoint(checkpoint.id);

      // Delete original
      await deleteCheckpoint(checkpoint.id);

      // Import it back
      const imported = await importCheckpoint(exported);
      createdCheckpointIds.push(imported.id);

      expect(imported.id).toBe(checkpoint.id);
      expect(imported.taskId).toBe(checkpoint.taskId);

      // Verify it exists
      expect(await checkpointExists(imported.id)).toBe(true);
    });

    it('rejects invalid checkpoint data', async () => {
      const invalidData = JSON.stringify({ invalid: true });

      await expect(importCheckpoint(invalidData)).rejects.toThrow();
    });
  });

  describe('checkpoint ID format', () => {
    it('generates unique IDs', async () => {
      const cp1 = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(cp1.id);

      const cp2 = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(cp2.id);

      expect(cp1.id).not.toBe(cp2.id);
    });

    it('follows cp_<timestamp>_<random> format', async () => {
      const checkpoint = await createCheckpoint(testTaskId, testAgentId);
      createdCheckpointIds.push(checkpoint.id);

      expect(checkpoint.id).toMatch(/^cp_\d{13}_[a-f0-9]{8}$/);
    });
  });
});
