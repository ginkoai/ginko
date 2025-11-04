/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-04
 * @tags: [test, cursor, session, adr-043]
 * @related: [../src/lib/session-cursor.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [jest]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import {
  createCursor,
  resumeCursor,
  updateCursor,
  findCursor,
  listCursors,
  pauseCurrentCursor,
  getOrCreateCursor,
  SessionCursor
} from '../src/lib/session-cursor.js';

// Mock helpers
jest.mock('../src/utils/helpers.js', () => ({
  getGinkoDir: jest.fn(async () => '/tmp/test-ginko'),
  getUserEmail: jest.fn(async () => 'test@example.com'),
  getProjectInfo: jest.fn(async () => ({ name: 'test-project', type: 'node' }))
}));

// Mock git
jest.mock('simple-git', () => ({
  default: jest.fn(() => ({
    status: jest.fn(async () => ({ current: 'test-branch' }))
  }))
}));

describe('SessionCursor', () => {
  const testDir = '/tmp/test-ginko/sessions/test-at-example-com';

  beforeEach(async () => {
    // Clean up test directory
    await fs.remove('/tmp/test-ginko');
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // Clean up after tests
    await fs.remove('/tmp/test-ginko');
  });

  describe('createCursor', () => {
    it('should create a new cursor', async () => {
      const cursor = await createCursor({
        branch: 'feature/test',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      expect(cursor).toBeDefined();
      expect(cursor.id).toBeDefined();
      expect(cursor.branch).toBe('feature/test');
      expect(cursor.project_id).toBe('test-project');
      expect(cursor.organization_id).toBe('org_test');
      expect(cursor.status).toBe('active');
      expect(cursor.current_event_id).toMatch(/^evt_\d+_[a-z0-9]+$/);
    });

    it('should persist cursor to storage', async () => {
      const cursor = await createCursor({
        branch: 'feature/test',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      const storagePath = path.join(testDir, 'cursors.json');
      expect(await fs.pathExists(storagePath)).toBe(true);

      const storage = await fs.readJSON(storagePath);
      expect(storage.cursors[cursor.id]).toBeDefined();
    });
  });

  describe('resumeCursor', () => {
    it('should resume a paused cursor', async () => {
      // Create and pause a cursor
      const originalCursor = await createCursor({
        branch: 'feature/test',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      await updateCursor(originalCursor.id, { status: 'paused' });

      // Resume the cursor
      const resumedCursor = await resumeCursor(originalCursor.id);

      expect(resumedCursor.status).toBe('active');
      expect(resumedCursor.id).toBe(originalCursor.id);
    });

    it('should throw error for non-existent cursor', async () => {
      await expect(resumeCursor('non-existent-id')).rejects.toThrow('Cursor not found');
    });
  });

  describe('updateCursor', () => {
    it('should update cursor properties', async () => {
      const cursor = await createCursor({
        branch: 'feature/test',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      const updated = await updateCursor(cursor.id, {
        current_event_id: 'evt_123_abc',
        status: 'paused'
      });

      expect(updated.current_event_id).toBe('evt_123_abc');
      expect(updated.status).toBe('paused');
    });
  });

  describe('findCursor', () => {
    it('should find cursor by branch', async () => {
      await createCursor({
        branch: 'feature/test-1',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      const cursor = await findCursor({ branch: 'feature/test-1' });

      expect(cursor).toBeDefined();
      expect(cursor?.branch).toBe('feature/test-1');
    });

    it('should return null if no matching cursor', async () => {
      const cursor = await findCursor({ branch: 'non-existent' });
      expect(cursor).toBeNull();
    });

    it('should filter by status', async () => {
      const cursor1 = await createCursor({
        branch: 'feature/test-1',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      await updateCursor(cursor1.id, { status: 'paused' });

      const activeCursor = await findCursor({
        branch: 'feature/test-1',
        status: 'active'
      });

      expect(activeCursor).toBeNull();

      const pausedCursor = await findCursor({
        branch: 'feature/test-1',
        status: 'paused'
      });

      expect(pausedCursor).toBeDefined();
    });
  });

  describe('listCursors', () => {
    it('should list all cursors for user', async () => {
      await createCursor({
        branch: 'feature/test-1',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      await createCursor({
        branch: 'feature/test-2',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      const cursors = await listCursors();

      expect(cursors).toHaveLength(2);
      expect(cursors[0].branch).toBeDefined();
      expect(cursors[1].branch).toBeDefined();
    });

    it('should sort cursors by last_active', async () => {
      const cursor1 = await createCursor({
        branch: 'feature/test-1',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      // Wait a bit and create another cursor
      await new Promise(resolve => setTimeout(resolve, 100));

      const cursor2 = await createCursor({
        branch: 'feature/test-2',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      const cursors = await listCursors();

      expect(cursors[0].id).toBe(cursor2.id); // Most recent first
      expect(cursors[1].id).toBe(cursor1.id);
    });
  });

  describe('getOrCreateCursor', () => {
    it('should create new cursor if none exists', async () => {
      const result = await getOrCreateCursor({
        branch: 'feature/test',
        projectId: 'test-project'
      });

      expect(result.isNew).toBe(true);
      expect(result.cursor.branch).toBe('feature/test');
      expect(result.cursor.status).toBe('active');
    });

    it('should resume existing paused cursor', async () => {
      // Create and pause cursor
      const originalCursor = await createCursor({
        branch: 'feature/test',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      await updateCursor(originalCursor.id, { status: 'paused' });

      // Try to create again
      const result = await getOrCreateCursor({
        branch: 'feature/test',
        projectId: 'test-project'
      });

      expect(result.isNew).toBe(false);
      expect(result.cursor.id).toBe(originalCursor.id);
      expect(result.cursor.status).toBe('active');
    });
  });

  describe('pauseCurrentCursor', () => {
    it('should pause active cursor', async () => {
      await createCursor({
        branch: 'feature/test',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      const result = await pauseCurrentCursor({
        branch: 'feature/test',
        projectId: 'test-project'
      });

      expect(result).toBeDefined();
      expect(result?.status).toBe('paused');
    });

    it('should update event position on pause', async () => {
      await createCursor({
        branch: 'feature/test',
        projectId: 'test-project',
        organizationId: 'org_test'
      });

      const result = await pauseCurrentCursor({
        branch: 'feature/test',
        projectId: 'test-project',
        finalEventId: 'evt_999_final'
      });

      expect(result?.current_event_id).toBe('evt_999_final');
    });

    it('should return null if no active cursor', async () => {
      const result = await pauseCurrentCursor({
        branch: 'non-existent',
        projectId: 'test-project'
      });

      expect(result).toBeNull();
    });
  });

  describe('Cursor Lifecycle Integration', () => {
    it('should support complete create -> pause -> resume flow', async () => {
      // 1. Create new cursor
      const { cursor: cursor1, isNew: isNew1 } = await getOrCreateCursor({
        branch: 'feature/integration-test',
        projectId: 'test-project'
      });

      expect(isNew1).toBe(true);
      expect(cursor1.status).toBe('active');
      const originalEventId = cursor1.current_event_id;

      // 2. Pause with new event position
      const pausedCursor = await pauseCurrentCursor({
        branch: 'feature/integration-test',
        projectId: 'test-project',
        finalEventId: 'evt_123_paused'
      });

      expect(pausedCursor?.status).toBe('paused');
      expect(pausedCursor?.current_event_id).toBe('evt_123_paused');

      // 3. Resume
      const { cursor: cursor2, isNew: isNew2 } = await getOrCreateCursor({
        branch: 'feature/integration-test',
        projectId: 'test-project'
      });

      expect(isNew2).toBe(false);
      expect(cursor2.id).toBe(cursor1.id);
      expect(cursor2.status).toBe('active');
      expect(cursor2.current_event_id).toBe('evt_123_paused'); // Preserved position
    });
  });

  describe('Multi-cursor Support', () => {
    it('should support multiple cursors for different branches', async () => {
      // Create cursors for different branches
      const { cursor: cursor1 } = await getOrCreateCursor({
        branch: 'feature/branch-1',
        projectId: 'test-project'
      });

      const { cursor: cursor2 } = await getOrCreateCursor({
        branch: 'feature/branch-2',
        projectId: 'test-project'
      });

      expect(cursor1.id).not.toBe(cursor2.id);
      expect(cursor1.branch).toBe('feature/branch-1');
      expect(cursor2.branch).toBe('feature/branch-2');

      // Both should be active
      const cursors = await listCursors();
      expect(cursors).toHaveLength(2);
      expect(cursors.filter(c => c.status === 'active')).toHaveLength(2);
    });

    it('should maintain independent positions for different branches', async () => {
      // Create and pause first cursor
      await getOrCreateCursor({
        branch: 'feature/branch-1',
        projectId: 'test-project'
      });

      await pauseCurrentCursor({
        branch: 'feature/branch-1',
        projectId: 'test-project',
        finalEventId: 'evt_111_branch1'
      });

      // Create and pause second cursor
      await getOrCreateCursor({
        branch: 'feature/branch-2',
        projectId: 'test-project'
      });

      await pauseCurrentCursor({
        branch: 'feature/branch-2',
        projectId: 'test-project',
        finalEventId: 'evt_222_branch2'
      });

      // Verify independent positions
      const cursor1 = await findCursor({
        branch: 'feature/branch-1',
        status: 'paused'
      });

      const cursor2 = await findCursor({
        branch: 'feature/branch-2',
        status: 'paused'
      });

      expect(cursor1?.current_event_id).toBe('evt_111_branch1');
      expect(cursor2?.current_event_id).toBe('evt_222_branch2');
    });
  });
});
