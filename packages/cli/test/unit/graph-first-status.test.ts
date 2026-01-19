/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-19
 * @tags: [test, graph-first, status, cache, offline, EPIC-015]
 * @related: [../../src/lib/state-cache.ts, ../../src/lib/pending-updates.ts, ../../src/lib/sprint-loader.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest, fs-extra]
 */

/**
 * EPIC-015 Sprint 2 Task 7: Integration Tests for Graph-First Flow
 *
 * Tests the complete graph-first status flow including:
 * - Online mode: fetch from graph API
 * - Offline mode: use cached state with staleness warnings
 * - Pending updates queue: queue when offline, process when online
 * - Content merging: graph status + file content
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Mock } from 'jest-mock';

// Helper to create typed mock functions
const mockFn = <T extends (...args: any[]) => any>() => jest.fn() as Mock<T>;
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  loadStateCache,
  saveStateCache,
  checkCacheStaleness,
  clearStateCache,
  formatCacheAge,
  _internal as stateCacheInternal,
  type StateCache,
  type ActiveSprintData,
  type CacheStalenessResult,
} from '../../src/lib/state-cache.js';
import {
  loadPendingUpdates,
  queueUpdate,
  removeUpdate,
  clearPendingUpdates,
  hasPendingUpdates,
  processPendingUpdates,
  _internal as pendingUpdatesInternal,
  type PendingUpdate,
  type UpdateType,
} from '../../src/lib/pending-updates.js';
import {
  loadSprintContent,
  parseSprintContent,
  type SprintContent,
  type TaskContent,
} from '../../src/lib/sprint-loader.js';

// Test directory setup
const TEST_DIR = path.join(__dirname, '..', '..', 'test-temp-graph-first');
const GINKO_DIR = path.join(TEST_DIR, '.ginko');

// Mock helpers module to return our test directory
jest.mock('../../src/utils/helpers.js', () => ({
  getGinkoDir: jest.fn(() => Promise.resolve(GINKO_DIR)),
  getUserEmail: jest.fn(() => Promise.resolve('test@example.com')),
  getProjectRoot: jest.fn(() => Promise.resolve(TEST_DIR)),
}));

// =============================================================================
// Test Data Fixtures
// =============================================================================

const mockActiveSprintData: ActiveSprintData = {
  sprintId: 'e015_s02',
  sprintName: 'Graph-First Reading',
  epicId: 'e015',
  epicName: 'EPIC-015: Graph-Authoritative Operational State',
  progress: {
    completed: 3,
    total: 7,
    percentage: 43,
  },
  currentTask: {
    taskId: 'e015_s02_t04',
    taskName: 'Implement Local State Cache',
    status: 'in_progress',
  },
  nextTask: {
    taskId: 'e015_s02_t05',
    taskName: 'Add Offline Mode with Stale Indicator',
  },
};

const mockSprintMarkdown = `# SPRINT: EPIC-015 Sprint 2 - Graph-First Reading

## Sprint Overview

**Sprint Goal**: Update \`ginko start\` to read status from graph only
**Progress:** 43% (3/7 tasks complete)

---

## Sprint Tasks

### e015_s02_t01: Enhance GET /api/v1/sprint/active Endpoint (3h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Create or enhance API endpoint to return active sprint with full task status

Related: ADR-060

---

### e015_s02_t02: Remove Status Parsing from sprint-loader.ts (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Remove markdown checkbox parsing for status, keep content loading only

Related: ADR-060

---

### e015_s02_t03: Update start-reflection.ts for Graph-Only Status (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Refactor start command to fetch status exclusively from graph

---

### e015_s02_t04: Implement Local State Cache (3h)
**Status:** [@] In Progress
**Priority:** HIGH

**Goal:** Cache graph state locally for offline use

---

### e015_s02_t05: Add Offline Mode with Stale Indicator (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Show clear offline/stale indicators in ginko start output

---

### e015_s02_t06: Add Queued Status Updates for Offline (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Queue status updates when offline, sync when back online

---

### e015_s02_t07: Integration Tests for Graph-First Flow (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** End-to-end tests for new graph-first status flow
`;

// =============================================================================
// Online Mode Tests
// =============================================================================

describe('Graph-First Status Flow', () => {
  beforeEach(async () => {
    // Create fresh test directory structure
    await fs.ensureDir(GINKO_DIR);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(TEST_DIR);
    jest.clearAllMocks();
  });

  describe('Online Mode', () => {
    it('should save state to cache after successful fetch', async () => {
      // Simulate graph API returning active sprint data
      await saveStateCache(mockActiveSprintData, 'test-graph-123');

      // Verify cache was created
      const cache = await loadStateCache();
      expect(cache).not.toBeNull();
      expect(cache?.graph_id).toBe('test-graph-123');
      expect(cache?.active_sprint.sprintId).toBe('e015_s02');
    });

    it('should update cache after successful fetch', async () => {
      // Initial cache
      await saveStateCache(mockActiveSprintData, 'test-graph-123');

      // Update with new data (simulating task completion)
      const updatedData: ActiveSprintData = {
        ...mockActiveSprintData,
        progress: {
          completed: 4,
          total: 7,
          percentage: 57,
        },
        currentTask: {
          taskId: 'e015_s02_t05',
          taskName: 'Add Offline Mode with Stale Indicator',
          status: 'in_progress',
        },
      };

      await saveStateCache(updatedData, 'test-graph-123');

      // Verify cache was updated
      const cache = await loadStateCache();
      expect(cache?.active_sprint.progress.completed).toBe(4);
      expect(cache?.active_sprint.progress.percentage).toBe(57);
      expect(cache?.active_sprint.currentTask?.taskId).toBe('e015_s02_t05');
    });

    it('should display correct progress from graph data', async () => {
      await saveStateCache(mockActiveSprintData, 'test-graph-123');
      const cache = await loadStateCache();

      expect(cache?.active_sprint.progress.completed).toBe(3);
      expect(cache?.active_sprint.progress.total).toBe(7);
      expect(cache?.active_sprint.progress.percentage).toBe(43);
    });

    it('should include current and next task in cached state', async () => {
      await saveStateCache(mockActiveSprintData, 'test-graph-123');
      const cache = await loadStateCache();

      expect(cache?.active_sprint.currentTask).toBeDefined();
      expect(cache?.active_sprint.currentTask?.taskId).toBe('e015_s02_t04');
      expect(cache?.active_sprint.currentTask?.status).toBe('in_progress');
      expect(cache?.active_sprint.nextTask?.taskId).toBe('e015_s02_t05');
    });

    it('should use atomic write to prevent partial cache writes', async () => {
      // Save cache
      await saveStateCache(mockActiveSprintData, 'test-graph-123');

      // Verify no temp files remain
      const files = await fs.readdir(GINKO_DIR);
      const tempFiles = files.filter(f => f.includes('.tmp.'));
      expect(tempFiles).toHaveLength(0);

      // Verify cache file exists and is valid
      const cache = await loadStateCache();
      expect(cache).not.toBeNull();
    });

    it('should store version and timestamp in cache', async () => {
      await saveStateCache(mockActiveSprintData, 'test-graph-123');
      const cache = await loadStateCache();

      expect(cache?.version).toBe(1);
      expect(cache?.fetched_at).toBeDefined();
      expect(new Date(cache!.fetched_at).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  // =============================================================================
  // Offline Mode with Cache Tests
  // =============================================================================

  describe('Offline Mode with Cache', () => {
    it('should load from cache when API fails', async () => {
      // Pre-populate cache (simulating previous successful fetch)
      await saveStateCache(mockActiveSprintData, 'test-graph-123');

      // Simulate being offline - just load from cache
      const cache = await loadStateCache();
      expect(cache).not.toBeNull();
      expect(cache?.active_sprint.sprintId).toBe('e015_s02');
    });

    it('should show stale warning for cache 5min-24h old', async () => {
      // Create cache with timestamp from 1 hour ago
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const staleCache: StateCache = {
        version: 1,
        fetched_at: oneHourAgo,
        graph_id: 'test-graph-123',
        active_sprint: mockActiveSprintData,
      };

      // Write directly to bypass saveStateCache's timestamp
      const cachePath = path.join(GINKO_DIR, 'state-cache.json');
      await fs.writeJSON(cachePath, staleCache, { spaces: 2 });

      const cache = await loadStateCache();
      expect(cache).not.toBeNull();

      const staleness = checkCacheStaleness(cache!);
      expect(staleness.level).toBe('stale');
      expect(staleness.showWarning).toBe(true);
      expect(staleness.isFresh).toBe(false);
    });

    it('should show expired warning for cache >24h old', async () => {
      // Create cache with timestamp from 2 days ago
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const expiredCache: StateCache = {
        version: 1,
        fetched_at: twoDaysAgo,
        graph_id: 'test-graph-123',
        active_sprint: mockActiveSprintData,
      };

      const cachePath = path.join(GINKO_DIR, 'state-cache.json');
      await fs.writeJSON(cachePath, expiredCache, { spaces: 2 });

      const cache = await loadStateCache();
      expect(cache).not.toBeNull();

      const staleness = checkCacheStaleness(cache!);
      expect(staleness.level).toBe('expired');
      expect(staleness.showWarning).toBe(true);
      expect(staleness.isFresh).toBe(false);
    });

    it('should show fresh indicator for cache <5min old', async () => {
      // Fresh cache (just created)
      await saveStateCache(mockActiveSprintData, 'test-graph-123');

      const cache = await loadStateCache();
      expect(cache).not.toBeNull();

      const staleness = checkCacheStaleness(cache!);
      expect(staleness.level).toBe('fresh');
      expect(staleness.showWarning).toBe(false);
      expect(staleness.isFresh).toBe(true);
    });

    it('should format cache age in human-readable format', () => {
      // Test various time intervals
      const now = Date.now();

      // Just now (30 seconds ago)
      const justNow = new Date(now - 30 * 1000).toISOString();
      expect(formatCacheAge(justNow)).toBe('just now');

      // Minutes ago
      const fifteenMinsAgo = new Date(now - 15 * 60 * 1000).toISOString();
      expect(formatCacheAge(fifteenMinsAgo)).toBe('15 min ago');

      // Hours ago
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      expect(formatCacheAge(twoHoursAgo)).toBe('2 hours ago');

      // Days ago
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatCacheAge(threeDaysAgo)).toBe('3 days ago');
    });

    it('should handle missing cache file gracefully', async () => {
      // Don't create any cache
      const cache = await loadStateCache();
      expect(cache).toBeNull();
    });

    it('should handle corrupt cache file gracefully', async () => {
      // Write invalid JSON to cache file
      const cachePath = path.join(GINKO_DIR, 'state-cache.json');
      await fs.writeFile(cachePath, 'not valid json {{{');

      const cache = await loadStateCache();
      expect(cache).toBeNull();
    });

    it('should reject cache with wrong version', async () => {
      const wrongVersionCache = {
        version: 99,
        fetched_at: new Date().toISOString(),
        graph_id: 'test-graph-123',
        active_sprint: mockActiveSprintData,
      };

      const cachePath = path.join(GINKO_DIR, 'state-cache.json');
      await fs.writeJSON(cachePath, wrongVersionCache, { spaces: 2 });

      const cache = await loadStateCache();
      expect(cache).toBeNull();
    });

    it('should clear cache when requested', async () => {
      await saveStateCache(mockActiveSprintData, 'test-graph-123');

      // Verify cache exists
      let cache = await loadStateCache();
      expect(cache).not.toBeNull();

      // Clear it
      await clearStateCache();

      // Verify it's gone
      cache = await loadStateCache();
      expect(cache).toBeNull();
    });
  });

  // =============================================================================
  // Pending Updates Queue Tests
  // =============================================================================

  describe('Pending Updates Queue', () => {
    it('should queue updates when offline', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      const updates = await loadPendingUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].entity_id).toBe('e015_s02_t01');
      expect(updates[0].new_status).toBe('complete');
    });

    it('should add metadata to queued updates', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      const updates = await loadPendingUpdates();
      expect(updates[0].id).toBeDefined();
      expect(updates[0].queued_at).toBeDefined();
      expect(updates[0].attempts).toBe(0);
    });

    it('should replace existing update for same entity', async () => {
      // Queue initial update
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'in_progress',
      });

      // Queue replacement update
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      const updates = await loadPendingUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].new_status).toBe('complete');
    });

    it('should queue multiple updates for different entities', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t02',
        new_status: 'in_progress',
      });

      const updates = await loadPendingUpdates();
      expect(updates).toHaveLength(2);
    });

    it('should support different update types', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      await queueUpdate({
        type: 'sprint_status',
        entity_id: 'e015_s02',
        new_status: 'active',
      });

      await queueUpdate({
        type: 'epic_status',
        entity_id: 'e015',
        new_status: 'in_progress',
      });

      const updates = await loadPendingUpdates();
      expect(updates).toHaveLength(3);
      expect(updates.map(u => u.type)).toContain('task_status');
      expect(updates.map(u => u.type)).toContain('sprint_status');
      expect(updates.map(u => u.type)).toContain('epic_status');
    });

    it('should include blocked reason for blocked status', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'blocked',
        reason: 'Waiting for API endpoint to be deployed',
      });

      const updates = await loadPendingUpdates();
      expect(updates[0].reason).toBe('Waiting for API endpoint to be deployed');
    });

    it('should remove successful updates from queue', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      const updates = await loadPendingUpdates();
      expect(updates).toHaveLength(1);

      // Remove by ID
      await removeUpdate(updates[0].id);

      const remainingUpdates = await loadPendingUpdates();
      expect(remainingUpdates).toHaveLength(0);
    });

    it('should check if pending updates exist', async () => {
      // Initially no updates
      expect(await hasPendingUpdates()).toBe(false);

      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      expect(await hasPendingUpdates()).toBe(true);
    });

    it('should clear all pending updates', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t02',
        new_status: 'complete',
      });

      await clearPendingUpdates();

      expect(await hasPendingUpdates()).toBe(false);
    });

    it('should handle empty queue gracefully', async () => {
      const updates = await loadPendingUpdates();
      expect(updates).toEqual([]);

      // Removing from empty queue should not throw
      await expect(removeUpdate('nonexistent')).resolves.not.toThrow();
    });

    it('should process updates in FIFO order', async () => {
      // Queue updates with small delay to ensure order
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t02',
        new_status: 'complete',
      });

      const updates = await loadPendingUpdates();

      // Sort by queued_at (FIFO)
      const sortedUpdates = [...updates].sort(
        (a, b) => new Date(a.queued_at).getTime() - new Date(b.queued_at).getTime()
      );

      expect(sortedUpdates[0].entity_id).toBe('e015_s02_t01');
      expect(sortedUpdates[1].entity_id).toBe('e015_s02_t02');
    });

    it('should track retry attempts', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      const updates = await loadPendingUpdates();
      expect(updates[0].attempts).toBe(0);

      // Simulate a retry by incrementing attempts
      updates[0].attempts = 1;
      await pendingUpdatesInternal.saveQueue(updates);

      const updatedQueue = await loadPendingUpdates();
      expect(updatedQueue[0].attempts).toBe(1);
    });

    it('should limit retries to MAX_ATTEMPTS', () => {
      expect(pendingUpdatesInternal.MAX_ATTEMPTS).toBe(3);
    });

    it('should use atomic write for queue file', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      // Verify no temp files remain
      const files = await fs.readdir(GINKO_DIR);
      const tempFiles = files.filter(f => f.includes('.tmp.'));
      expect(tempFiles).toHaveLength(0);
    });
  });

  // =============================================================================
  // Conflict Detection Tests (Local-Wins)
  // =============================================================================

  describe('Conflict Detection', () => {
    it('should use local-wins conflict resolution for queued updates', async () => {
      // Queue a status update
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      // Queue another update for same entity (local update should win)
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'blocked',
        reason: 'Changed mind',
      });

      // Only latest update should be in queue
      const updates = await loadPendingUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].new_status).toBe('blocked');
      expect(updates[0].reason).toBe('Changed mind');
    });

    it('should allow different update types for same entity', async () => {
      // These are conceptually different operations
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02',
        new_status: 'complete',
      });

      await queueUpdate({
        type: 'sprint_status',
        entity_id: 'e015_s02',
        new_status: 'active',
      });

      const updates = await loadPendingUpdates();
      expect(updates).toHaveLength(2);
    });
  });

  // =============================================================================
  // Content Merging Tests
  // =============================================================================

  describe('Content Merging', () => {
    const sprintsDir = path.join(TEST_DIR, 'docs', 'sprints');

    beforeEach(async () => {
      // Create sprint file
      await fs.ensureDir(sprintsDir);
      const sprintFile = path.join(sprintsDir, 'SPRINT-2026-02-e015-s02-graph-first-reading.md');
      await fs.writeFile(sprintFile, mockSprintMarkdown);
    });

    it('should extract task content from file (no status)', async () => {
      const content = parseSprintContent(mockSprintMarkdown, 'test.md');

      expect(content.name).toBe('EPIC-015 Sprint 2 - Graph-First Reading');
      expect(content.tasks).toHaveLength(7);

      // Verify task content is extracted
      const task1 = content.tasks.find(t => t.id === 'e015_s02_t01');
      expect(task1?.title).toBe('Enhance GET /api/v1/sprint/active Endpoint');
      expect(task1?.effort).toBe('3h');
      expect(task1?.priority).toBe('HIGH');
    });

    it('should not include status in TaskContent', async () => {
      const content = parseSprintContent(mockSprintMarkdown, 'test.md');

      // TaskContent interface has no 'state' field
      const task1 = content.tasks.find(t => t.id === 'e015_s02_t01');
      expect(task1).toBeDefined();
      expect('state' in (task1 as object)).toBe(false);
      expect('status' in (task1 as object)).toBe(false);
    });

    it('should preserve ADR references from file', async () => {
      const content = parseSprintContent(mockSprintMarkdown, 'test.md');

      // Task 1 mentions ADR-060
      const task1 = content.tasks.find(t => t.id === 'e015_s02_t01');
      expect(task1?.relatedADRs).toBeDefined();
      expect(task1?.relatedADRs).toContain('ADR-060');
    });

    it('should handle missing file content gracefully', async () => {
      // Try to parse empty content
      const content = parseSprintContent('', 'nonexistent.md');

      expect(content.name).toBe('nonexistent');
      expect(content.tasks).toHaveLength(0);
    });

    it('should merge graph status with file content', async () => {
      // Load content from file
      const fileContent = parseSprintContent(mockSprintMarkdown, 'test.md');

      // Simulate graph status data
      const graphStatus = {
        tasks: [
          { id: 'e015_s02_t01', status: 'complete' },
          { id: 'e015_s02_t02', status: 'complete' },
          { id: 'e015_s02_t03', status: 'complete' },
          { id: 'e015_s02_t04', status: 'in_progress' },
          { id: 'e015_s02_t05', status: 'not_started' },
          { id: 'e015_s02_t06', status: 'not_started' },
          { id: 'e015_s02_t07', status: 'not_started' },
        ],
      };

      // Merge: status from graph + content from file
      const mergedTasks = fileContent.tasks.map(task => {
        const graphTask = graphStatus.tasks.find(gt => gt.id === task.id);
        return {
          ...task,
          status: graphTask?.status || 'not_started',
        };
      });

      // Verify merged result
      expect(mergedTasks).toHaveLength(7);

      const task4 = mergedTasks.find(t => t.id === 'e015_s02_t04');
      expect(task4?.status).toBe('in_progress');
      expect(task4?.title).toBe('Implement Local State Cache');
      expect(task4?.priority).toBe('HIGH');
    });

    it('should handle task in graph but not in file', async () => {
      const fileContent = parseSprintContent(mockSprintMarkdown, 'test.md');

      // Graph has an extra task not in file
      const graphStatus = {
        tasks: [
          { id: 'e015_s02_t01', status: 'complete' },
          { id: 'e015_s02_t99', status: 'not_started' }, // Extra task
        ],
      };

      // Merging should only include tasks from file
      const mergedTasks = fileContent.tasks.map(task => {
        const graphTask = graphStatus.tasks.find(gt => gt.id === task.id);
        return {
          ...task,
          status: graphTask?.status || 'not_started',
        };
      });

      expect(mergedTasks.find(t => t.id === 'e015_s02_t99')).toBeUndefined();
    });

    it('should handle task in file but not in graph', async () => {
      const fileContent = parseSprintContent(mockSprintMarkdown, 'test.md');

      // Graph is missing some tasks
      const graphStatus = {
        tasks: [
          { id: 'e015_s02_t01', status: 'complete' },
        ],
      };

      // Tasks not in graph should default to 'not_started'
      const mergedTasks = fileContent.tasks.map(task => {
        const graphTask = graphStatus.tasks.find(gt => gt.id === task.id);
        return {
          ...task,
          status: graphTask?.status || 'not_started',
        };
      });

      const task7 = mergedTasks.find(t => t.id === 'e015_s02_t07');
      expect(task7?.status).toBe('not_started');
    });
  });

  // =============================================================================
  // Edge Cases and Error Handling
  // =============================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent cache operations', async () => {
      // Multiple concurrent saves
      const results = await Promise.allSettled([
        saveStateCache({ ...mockActiveSprintData, progress: { ...mockActiveSprintData.progress, completed: 1 } }, 'g1'),
        saveStateCache({ ...mockActiveSprintData, progress: { ...mockActiveSprintData.progress, completed: 2 } }, 'g2'),
        saveStateCache({ ...mockActiveSprintData, progress: { ...mockActiveSprintData.progress, completed: 3 } }, 'g3'),
      ]);

      // At least some should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      expect(succeeded).toBeGreaterThan(0);

      // Cache should be in valid state
      const cache = await loadStateCache();
      expect(cache).not.toBeNull();
    });

    it('should validate cache structure on load', async () => {
      // Write cache with missing required fields
      const incompleteCache = {
        version: 1,
        fetched_at: new Date().toISOString(),
        // Missing graph_id and active_sprint
      };

      const cachePath = path.join(GINKO_DIR, 'state-cache.json');
      await fs.writeJSON(cachePath, incompleteCache);

      const cache = await loadStateCache();
      expect(cache).toBeNull();
    });

    it('should validate queue structure on load', async () => {
      // Write queue with wrong structure
      const invalidQueue = {
        version: 1,
        // 'updates' should be an array
        updates: 'not an array',
      };

      const queuePath = path.join(GINKO_DIR, 'pending-updates.json');
      await fs.writeJSON(queuePath, invalidQueue);

      const updates = await loadPendingUpdates();
      expect(updates).toEqual([]);
    });

    it('should handle directory not existing for cache', async () => {
      // Remove .ginko directory
      await fs.remove(GINKO_DIR);

      // Save should create directory
      await saveStateCache(mockActiveSprintData, 'test-graph-123');

      // Verify it worked
      const cache = await loadStateCache();
      expect(cache).not.toBeNull();
    });

    it('should handle directory not existing for queue', async () => {
      // Remove .ginko directory
      await fs.remove(GINKO_DIR);

      // Queue should create directory
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      // Verify it worked
      const updates = await loadPendingUpdates();
      expect(updates).toHaveLength(1);
    });

    it('should handle special characters in reason field', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'blocked',
        reason: 'Waiting for "approval" & review <script>alert("xss")</script>',
      });

      const updates = await loadPendingUpdates();
      expect(updates[0].reason).toBe('Waiting for "approval" & review <script>alert("xss")</script>');
    });

    it('should preserve staleness calculation across cache reloads', async () => {
      // Save cache
      await saveStateCache(mockActiveSprintData, 'test-graph-123');

      // Load and check staleness
      const cache1 = await loadStateCache();
      const staleness1 = checkCacheStaleness(cache1!);

      // Reload (simulating new process)
      const cache2 = await loadStateCache();
      const staleness2 = checkCacheStaleness(cache2!);

      // Staleness should be consistent
      expect(staleness1.level).toBe(staleness2.level);
      expect(staleness1.isFresh).toBe(staleness2.isFresh);
    });
  });

  // =============================================================================
  // Process Pending Updates Tests (with mock GraphApiClient)
  // =============================================================================

  describe('Process Pending Updates', () => {
    // Original env value to restore after tests
    let originalGraphId: string | undefined;

    beforeEach(async () => {
      originalGraphId = process.env.GINKO_GRAPH_ID;
      process.env.GINKO_GRAPH_ID = 'test-graph-123';
    });

    afterEach(async () => {
      if (originalGraphId !== undefined) {
        process.env.GINKO_GRAPH_ID = originalGraphId;
      } else {
        delete process.env.GINKO_GRAPH_ID;
      }
    });

    it('should return zero counts for empty queue', async () => {
      // Mock client that would succeed but queue is empty
      const mockClient = {
        updateTaskStatus: mockFn().mockResolvedValue({ success: true }),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockClient.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('should return all failed if no graph ID', async () => {
      delete process.env.GINKO_GRAPH_ID;

      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      const mockClient = {
        updateTaskStatus: mockFn().mockResolvedValue({ success: true }),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      // Without graph ID, all updates fail
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should process task_status updates successfully', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      const mockClient = {
        updateTaskStatus: mockFn().mockResolvedValue({ success: true }),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockClient.updateTaskStatus).toHaveBeenCalledWith(
        'test-graph-123',
        'e015_s02_t01',
        'complete',
        undefined
      );

      // Queue should be empty after successful processing
      const remaining = await loadPendingUpdates();
      expect(remaining).toHaveLength(0);
    });

    it('should process sprint_status updates successfully', async () => {
      await queueUpdate({
        type: 'sprint_status',
        entity_id: 'e015_s02',
        new_status: 'active',
      });

      const mockClient = {
        updateTaskStatus: mockFn().mockResolvedValue({ success: true }),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      expect(result.succeeded).toBe(1);
      expect(mockClient.updateSprintStatus).toHaveBeenCalledWith(
        'test-graph-123',
        'e015_s02',
        'active'
      );
    });

    it('should process epic_status updates successfully', async () => {
      await queueUpdate({
        type: 'epic_status',
        entity_id: 'e015',
        new_status: 'in_progress',
      });

      const mockClient = {
        updateTaskStatus: mockFn().mockResolvedValue({ success: true }),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      expect(result.succeeded).toBe(1);
      expect(mockClient.updateEpicStatus).toHaveBeenCalledWith(
        'test-graph-123',
        'e015',
        'in_progress'
      );
    });

    it('should pass blocked reason for blocked tasks', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'blocked',
        reason: 'Waiting for API',
      });

      const mockClient = {
        updateTaskStatus: mockFn().mockResolvedValue({ success: true }),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      expect(result.succeeded).toBe(1);
      expect(mockClient.updateTaskStatus).toHaveBeenCalledWith(
        'test-graph-123',
        'e015_s02_t01',
        'blocked',
        'Waiting for API'
      );
    });

    it('should retry failed updates up to MAX_ATTEMPTS', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      const mockClient = {
        updateTaskStatus: mockFn().mockRejectedValue(new Error('Network error')),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      // First attempt
      let result = await processPendingUpdates(mockClient as any);
      expect(result.failed).toBe(1);

      // Update should still be in queue with attempts=1
      let updates = await loadPendingUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].attempts).toBe(1);

      // Second attempt
      result = await processPendingUpdates(mockClient as any);
      expect(result.failed).toBe(1);

      updates = await loadPendingUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0].attempts).toBe(2);

      // Third attempt (MAX_ATTEMPTS)
      result = await processPendingUpdates(mockClient as any);
      expect(result.failed).toBe(1);

      // Update should be removed after max attempts
      updates = await loadPendingUpdates();
      expect(updates).toHaveLength(0);
    });

    it('should process multiple updates in order', async () => {
      const callOrder: string[] = [];

      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t02',
        new_status: 'complete',
      });

      const mockClient = {
        updateTaskStatus: mockFn().mockImplementation((graphId: string, entityId: string) => {
          callOrder.push(entityId);
          return Promise.resolve({ success: true });
        }),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      // FIFO order
      expect(callOrder).toEqual(['e015_s02_t01', 'e015_s02_t02']);
    });

    it('should handle mixed success and failure', async () => {
      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t01',
        new_status: 'complete',
      });

      await queueUpdate({
        type: 'task_status',
        entity_id: 'e015_s02_t02',
        new_status: 'complete',
      });

      // First succeeds, second fails
      const mockClient = {
        updateTaskStatus: mockFn()
          .mockResolvedValueOnce({ success: true })
          .mockRejectedValueOnce(new Error('API error')),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);

      // Only failed update should remain
      const remaining = await loadPendingUpdates();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].entity_id).toBe('e015_s02_t02');
    });

    it('should handle unknown update type gracefully', async () => {
      // Manually write invalid update to queue
      const invalidUpdate: PendingUpdate = {
        id: 'test-id',
        type: 'invalid_type' as UpdateType,
        entity_id: 'test',
        new_status: 'complete',
        queued_at: new Date().toISOString(),
        attempts: 0,
      };

      await pendingUpdatesInternal.saveQueue([invalidUpdate]);

      const mockClient = {
        updateTaskStatus: mockFn().mockResolvedValue({ success: true }),
        updateSprintStatus: mockFn().mockResolvedValue({ success: true }),
        updateEpicStatus: mockFn().mockResolvedValue({ success: true }),
      };

      const result = await processPendingUpdates(mockClient as any);

      // Unknown type should fail (throws error in processUpdate)
      expect(result.failed).toBe(1);
    });
  });

  // =============================================================================
  // Internal Helper Tests (for coverage)
  // =============================================================================

  describe('Internal Helpers', () => {
    it('should validate correct cache structure', () => {
      const validCache: StateCache = {
        version: 1,
        fetched_at: new Date().toISOString(),
        graph_id: 'test',
        active_sprint: mockActiveSprintData,
      };

      expect(stateCacheInternal.isValidCache(validCache)).toBe(true);
    });

    it('should reject null cache', () => {
      expect(stateCacheInternal.isValidCache(null)).toBe(false);
    });

    it('should reject non-object cache', () => {
      expect(stateCacheInternal.isValidCache('string')).toBe(false);
    });

    it('should reject cache with missing progress', () => {
      const badCache = {
        version: 1,
        fetched_at: new Date().toISOString(),
        graph_id: 'test',
        active_sprint: {
          sprintId: 'test',
          sprintName: 'Test',
          epicId: 'e001',
          // Missing progress
        },
      };

      expect(stateCacheInternal.isValidCache(badCache)).toBe(false);
    });

    it('should validate correct queue structure', () => {
      const validQueue = {
        version: 1,
        updates: [],
      };

      expect(pendingUpdatesInternal.isValidQueue(validQueue)).toBe(true);
    });

    it('should reject queue with wrong version', () => {
      const wrongVersion = {
        version: 2,
        updates: [],
      };

      expect(pendingUpdatesInternal.isValidQueue(wrongVersion)).toBe(false);
    });
  });
});
